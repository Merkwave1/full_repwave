<?php

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../db_connect.php';

// Include Odoo inventory sync (optional - won't fail if not available)
if (file_exists(__DIR__ . '/../odoo/sync_inventory.php')) {
    require_once __DIR__ . '/../odoo/sync_inventory.php';
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Test if basic functionality works
if (!function_exists('json_encode')) {
    die('{"status":"error","message":"JSON functions not available"}');
}

// Test database connection
if (!isset($conn) || $conn->connect_error) {
    die('{"status":"error","message":"Database connection failed"}');
}

try {
    // Get user UUID from request (GET or POST)
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) {
        print_error("Error: User UUID is required.");
    }

    // Validate user and get user ID
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    $stmt_user->bind_param('s', $users_uuid);
    $stmt_user->execute();
    $user = $stmt_user->get_result()->fetch_assoc();
    $stmt_user->close();
    if (!$user) {
        print_error('Error: Invalid user UUID.');
    }

    // --- Main Delivery Data ---
    $sales_order_id = $_POST['sales_order_id'] ?? null;
    $warehouse_id = $_POST['warehouse_id'] ?? null;
    // Delivery date is now set automatically to current timestamp in SQL
    $delivery_status = $_POST['delivery_status'] ?? 'Preparing';
    $delivery_notes = $_POST['delivery_notes'] ?? null;
    $delivery_address = $_POST['delivery_address'] ?? null;
    $items_json = $_POST['items'] ?? '[]';
    $items = json_decode($items_json, true);

    // Debug logging
    error_log("Sales Delivery Debug - Received data:");
    error_log("sales_order_id: " . $sales_order_id);
    error_log("warehouse_id: " . $warehouse_id);
    error_log("items_json: " . $items_json);
    error_log("items parsed: " . print_r($items, true));

    // --- User & Validation ---
    $delivered_by_user_id = $user['users_id'];

    if (empty($sales_order_id) || !is_numeric($sales_order_id)) {
        print_error("Error: A valid Sales Order ID is required.");
    }
    if (empty($warehouse_id) || !is_numeric($warehouse_id)) {
        print_error("Error: A valid Warehouse ID is required.");
    }
    if (empty($items) || !is_array($items)) {
        print_error("Error: At least one item is required to process a delivery.");
    }
    if (!in_array($delivery_status, ['Preparing', 'Shipped', 'Delivered', 'Failed'])) {
        print_error("Error: Invalid delivery status.");
    }

    $conn->begin_transaction();

    try {
        // --- 1. Validate Sales Order Status ---
        $stmt_so = $conn->prepare("SELECT sales_orders_status, sales_orders_delivery_status FROM sales_orders WHERE sales_orders_id = ?");
        $stmt_so->bind_param("i", $sales_order_id);
        $stmt_so->execute();
        $so_data = $stmt_so->get_result()->fetch_assoc();
        $stmt_so->close();

        if (!$so_data) {
            throw new Exception("Sales Order ID {$sales_order_id} not found.");
        }
        if (!in_array($so_data['sales_orders_status'], ['Approved', 'Invoiced'])) {
            throw new Exception("Cannot deliver items for Sales Order {$sales_order_id} with status '{$so_data['sales_orders_status']}'.");
        }

        // --- 2. Create the main Sales Delivery record ---
        $stmt_sd = $conn->prepare("
            INSERT INTO sales_deliveries (
                sales_deliveries_sales_order_id, 
                sales_deliveries_warehouse_id, 
                sales_deliveries_delivery_date, 
                sales_deliveries_delivered_by_user_id, 
                sales_deliveries_delivery_status,
                sales_deliveries_delivery_notes,
                sales_deliveries_delivery_address
            ) VALUES (?, ?, NOW(), ?, ?, ?, ?)
        ");
        if (!$stmt_sd) throw new Exception("Prepare failed for sales delivery.");
        
        $stmt_sd->bind_param("iissss", $sales_order_id, $warehouse_id, $delivered_by_user_id, $delivery_status, $delivery_notes, $delivery_address);
        if (!$stmt_sd->execute()) throw new Exception("Error creating sales delivery record.");
        
        $parent_delivery_id = $conn->insert_id;
        $stmt_sd->close();

        $affected_so_ids = [];

        // --- 3. Process each delivery item ---
        foreach ($items as $item) {
            $so_item_id = (int)($item['sales_order_items_id'] ?? 0);
            $quantity_delivered = (float)($item['quantity'] ?? 0);
            $item_notes = $item['notes'] ?? null;
            $batch_date = $item['batch_date'] ?? null; // Selected batch date

            if ($so_item_id <= 0) throw new Exception("Invalid Sales Order Item ID.");
            if ($quantity_delivered <= 0) throw new Exception("Delivery quantity must be greater than 0.");

            // --- Get Sales Order Item Info ---
            $stmt_so_item = $conn->prepare("
                SELECT soi.*, so.sales_orders_id, so.sales_orders_status, so.sales_orders_warehouse_id 
                FROM sales_order_items soi 
                JOIN sales_orders so ON soi.sales_order_items_sales_order_id = so.sales_orders_id 
                WHERE soi.sales_order_items_id = ?
            ");
            $stmt_so_item->bind_param("i", $so_item_id);
            $stmt_so_item->execute();
            $so_item_data = $stmt_so_item->get_result()->fetch_assoc();
            $stmt_so_item->close();

            if (!$so_item_data) throw new Exception("Sales Order Item ID {$so_item_id} not found.");
            if ($so_item_data['sales_orders_warehouse_id'] != $warehouse_id) {
                throw new Exception("Sales Order Item {$so_item_id} belongs to a different warehouse.");
            }
            
            $affected_so_ids[] = (int)$so_item_data['sales_orders_id'];

            // --- Validate quantity ---
            $current_delivered = (float)$so_item_data['sales_order_items_quantity_delivered'];
            $total_ordered = (float)$so_item_data['sales_order_items_quantity'];
            $remaining_to_deliver = $total_ordered - $current_delivered;
            $new_total_delivered = $current_delivered + (float)$quantity_delivered;
            
            if ($quantity_delivered > $remaining_to_deliver) {
                throw new Exception("Delivery quantity for item ID {$so_item_id} exceeds remaining quantity. Ordered: {$total_ordered}, Already delivered: {$current_delivered}, Remaining: {$remaining_to_deliver}, Requested: {$quantity_delivered}");
            }
            if ($new_total_delivered > $total_ordered) {
                throw new Exception("Total delivery quantity for item ID {$so_item_id} would exceed amount ordered. Total ordered: {$total_ordered}, Would deliver: {$new_total_delivered}");
            }

            // --- Check inventory availability ---
            $variant_id = (int)$so_item_data['sales_order_items_variant_id'];
            $packaging_id = $so_item_data['sales_order_items_packaging_type_id'] ? (int)$so_item_data['sales_order_items_packaging_type_id'] : null;

            // Build inventory query based on whether batch_date is specified
            if ($batch_date) {
                // Use specific batch if selected
                $stmt_check_inv = $conn->prepare("
                    SELECT inventory_id, inventory_quantity, inventory_production_date 
                    FROM inventory 
                    WHERE variant_id = ? AND warehouse_id = ? AND packaging_type_id <=> ? AND inventory_production_date = ?
                    LIMIT 1
                ");
                $stmt_check_inv->bind_param("iiis", $variant_id, $warehouse_id, $packaging_id, $batch_date);
            } else {
                // Use oldest batch (FIFO) if no specific batch selected
                $stmt_check_inv = $conn->prepare("
                    SELECT inventory_id, inventory_quantity, inventory_production_date 
                    FROM inventory 
                    WHERE variant_id = ? AND warehouse_id = ? AND packaging_type_id <=> ? 
                    ORDER BY inventory_production_date ASC 
                    LIMIT 1
                ");
                $stmt_check_inv->bind_param("iii", $variant_id, $warehouse_id, $packaging_id);
            }
            
            $stmt_check_inv->execute();
            $inv_row = $stmt_check_inv->get_result()->fetch_assoc();
            $stmt_check_inv->close();

            if (!$inv_row || (float)$inv_row['inventory_quantity'] < (float)$quantity_delivered) {
                $available_qty = $inv_row['inventory_quantity'] ?? 0;
                $batch_info = $batch_date ? " for batch {$batch_date}" : "";
                throw new Exception("Insufficient inventory for variant {$variant_id} in warehouse {$warehouse_id}{$batch_info}. Available: {$available_qty}, Required: {$quantity_delivered}");
            }

            // --- Create Sales Delivery Item record ---
            $stmt_sdi = $conn->prepare("
                INSERT INTO sales_delivery_items (
                    sales_delivery_items_delivery_id, 
                    sales_delivery_items_sales_order_item_id, 
                    sales_delivery_items_quantity_delivered,
                    sales_delivery_items_notes,
                    sales_delivery_items_batch_date
                ) VALUES (?, ?, ?, ?, ?)
            ");
            if (!$stmt_sdi) throw new Exception("Prepare failed for sales delivery item.");
            
            $batch_date_to_record = $batch_date ?: $inv_row['inventory_production_date'];
            $stmt_sdi->bind_param("iidss", $parent_delivery_id, $so_item_id, $quantity_delivered, $item_notes, $batch_date_to_record);
            if (!$stmt_sdi->execute()) throw new Exception("Error creating sales delivery item for SO item {$so_item_id}.");
            $stmt_sdi->close();

            // --- Update Sales Order Item quantity delivered ---
            $stmt_update_soi = $conn->prepare("UPDATE sales_order_items SET sales_order_items_quantity_delivered = ? WHERE sales_order_items_id = ?");
            if (!$stmt_update_soi) throw new Exception("Prepare failed for SO item update.");
            $stmt_update_soi->bind_param("di", $new_total_delivered, $so_item_id);
            if (!$stmt_update_soi->execute()) throw new Exception("Error updating delivered quantity for SO item {$so_item_id}.");
            $stmt_update_soi->close();
            
            // --- Update Inventory (Decrease quantity) ---
            $qty_after_op = (float)$inv_row['inventory_quantity'] - (float)$quantity_delivered;
            $stmt_update_inv = $conn->prepare("UPDATE inventory SET inventory_quantity = ?, inventory_last_movement_at = NOW() WHERE inventory_id = ?");
            $stmt_update_inv->bind_param("di", $qty_after_op, $inv_row['inventory_id']);
            $stmt_update_inv->execute();
            $stmt_update_inv->close();

            // --- Log Movement ---
            if (function_exists('log_inventory_movement_internal')) {
                log_inventory_movement_internal($variant_id, $packaging_id, $warehouse_id, 'sale', -$quantity_delivered, $qty_after_op, $delivered_by_user_id, $parent_delivery_id, "Delivered for SO Item ID: {$so_item_id}", $conn);
            } else {
                error_log("Warning: log_inventory_movement_internal function not found");
            }
        }

        // --- 4. Update delivery status of affected Sales Orders ---
        $unique_so_ids = array_unique($affected_so_ids);
        foreach ($unique_so_ids as $so_id) {
            $stmt_check_so = $conn->prepare("
                SELECT 
                    SUM(sales_order_items_quantity) AS total_ordered, 
                    SUM(sales_order_items_quantity_delivered) AS total_delivered 
                FROM sales_order_items 
                WHERE sales_order_items_sales_order_id = ?
            ");
            $stmt_check_so->bind_param("i", $so_id);
            $stmt_check_so->execute();
            $so_totals = $stmt_check_so->get_result()->fetch_assoc();
            $stmt_check_so->close();

            $new_delivery_status = null;
            if ($so_totals['total_ordered'] > 0 && $so_totals['total_ordered'] <= $so_totals['total_delivered']) {
                $new_delivery_status = 'Delivered';
            } elseif ($so_totals['total_delivered'] > 0) {
                $new_delivery_status = 'Partially_Delivered';
            } else {
                $new_delivery_status = 'Not_Delivered';
            }

            if ($new_delivery_status) {
                $delivery_date_sql = ($new_delivery_status === 'Delivered') ? ", sales_orders_actual_delivery_date = NOW()" : "";
                $stmt_update_so_status = $conn->prepare("UPDATE sales_orders SET sales_orders_delivery_status = ? {$delivery_date_sql} WHERE sales_orders_id = ?");
                $stmt_update_so_status->bind_param("si", $new_delivery_status, $so_id);
                $stmt_update_so_status->execute();
                $stmt_update_so_status->close();
            }
        }

        $conn->commit();
        
        // --- 5. Sync to Odoo (after successful commit) ---
        $odoo_sync_result = null;
        if (function_exists('syncDeliveryToOdoo') && function_exists('isOdooIntegrationEnabled') && isOdooIntegrationEnabled()) {
            try {
                $odoo_picking_id = syncDeliveryToOdoo($parent_delivery_id);
                if ($odoo_picking_id) {
                    $odoo_sync_result = ['odoo_picking_id' => $odoo_picking_id, 'sync_status' => 'success'];
                    error_log("Delivery $parent_delivery_id synced to Odoo: Picking ID $odoo_picking_id");
                } else {
                    $odoo_sync_result = ['sync_status' => 'failed', 'message' => 'Sync failed'];
                }
            } catch (Exception $sync_e) {
                error_log("Odoo sync error for delivery $parent_delivery_id: " . $sync_e->getMessage());
                $odoo_sync_result = ['sync_status' => 'failed', 'message' => $sync_e->getMessage()];
            }
        }
        
        print_success("Sales delivery created successfully.", [
            'sales_delivery_id' => $parent_delivery_id, 
            'items_processed' => count($items),
            'odoo_sync' => $odoo_sync_result
        ]);

    } catch (Exception | TypeError $e) {
        $conn->rollback();
        print_error("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
    }

} catch (Exception | TypeError $e) {
    if (isset($conn) && $conn instanceof mysqli) {
       $conn->rollback();
    }
    error_log("Sales Delivery Error: " . $e->getMessage() . " at line " . $e->getLine() . " in file " . $e->getFile());
    print_error("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}

// Custom error function that returns "error" status instead of "failure"
function print_error($message) {
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

?>
