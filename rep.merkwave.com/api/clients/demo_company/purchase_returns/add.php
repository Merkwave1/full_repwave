<?php

require_once '../db_connect.php'; 
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Check if user is authenticated using UUID
    $users_uuid = $_POST['users_uuid'] ?? $_GET['users_uuid'] ?? null;
    
    if (!$users_uuid) {
        print_failure("Error: User UUID is required. Please log in first.");
        exit;
    }
    
    // Get user ID and role using UUID
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ? LIMIT 1");
    if (!$stmt_user) {
        throw new Exception("Prepare failed for user check: " . $conn->error);
    }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();
    
    if (!$user_data) {
        print_failure("Error: Invalid user session. Please log in again.");
        exit;
    }
    
    $purchase_returns_created_by_user_id = $user_data['users_id'];
    $user_role = $user_data['users_role'];
    
        // Check permissions - only admin, manager, employee, and cash role can add purchase returns
    if (!in_array($user_role, ['admin', 'manager', 'employee', 'cash'])) {
        print_failure("Error: Insufficient permissions to create purchase returns.");
        exit;
    }

    $purchase_returns_supplier_id          = $_POST['purchase_returns_supplier_id']          ?? null;
    $purchase_returns_purchase_order_id    = $_POST['purchase_returns_purchase_order_id']    ?? null; // Optional
    $purchase_returns_date                 = $_POST['purchase_returns_date']                 ?? date('Y-m-d H:i:s');
    $purchase_returns_reason               = $_POST['purchase_returns_reason']               ?? null;
    $purchase_returns_status               = 'Approved'; // Set to Approved, will be delivered later through delivery system
    $purchase_returns_notes                = $_POST['purchase_returns_notes']                ?? null;
    $purchase_return_items_data            = json_decode($_POST['purchase_return_items'] ?? '[]', true); // Array of items

    // Handle empty strings for nullable fields
    if ($purchase_returns_purchase_order_id === "") {$purchase_returns_purchase_order_id = null;}
    if ($purchase_returns_reason === "") {$purchase_returns_reason = null;}
    if ($purchase_returns_notes === "") {$purchase_returns_notes = null;}

    // Basic Validation
    if (empty($purchase_returns_supplier_id) || !is_numeric($purchase_returns_supplier_id) || $purchase_returns_supplier_id <= 0) {
        print_failure("Error: Valid Supplier ID is required.");
        exit;
    }
    if ($purchase_returns_purchase_order_id !== null && (!is_numeric($purchase_returns_purchase_order_id) || $purchase_returns_purchase_order_id <= 0)) {
        print_failure("Error: Invalid Purchase Order ID provided.");
        exit;
    }
    if (!strtotime($purchase_returns_date)) {
        print_failure("Error: Invalid return date format.");
        exit;
    }
    if (empty($purchase_return_items_data) || !is_array($purchase_return_items_data)) {
        print_failure("Error: At least one purchase return item is required.");
        exit;
    }
    if (empty($purchase_returns_created_by_user_id)) {
        print_failure("Invalid session. Please login again.");
        exit;
    }

    $calculated_total_amount = 0.00;
    $processed_return_items = [];

    // --- Purchase Order and Item Quantity Validation ---
    $original_po_items = [];
    
    // If linked to a purchase order, validate it
    if ($purchase_returns_purchase_order_id !== null) {
        // Fetch purchase order details and status
        $stmt_po_check = $conn->prepare("
            SELECT purchase_orders_supplier_id, purchase_orders_status
            FROM purchase_orders
            WHERE purchase_orders_id = ?
            LIMIT 1
        ");
        if (!$stmt_po_check) {
            throw new Exception("Prepare failed for purchase order check: " . $conn->error);
        }
        $stmt_po_check->bind_param("i", $purchase_returns_purchase_order_id);
        $stmt_po_check->execute();
        $result_po_check = $stmt_po_check->get_result();
        $po_data = $result_po_check->fetch_assoc();
        $stmt_po_check->close();

        if (!$po_data) {
            print_failure("Error: Linked Purchase Order with ID " . $purchase_returns_purchase_order_id . " not found.");
            exit;
        }
        if ($po_data['purchase_orders_supplier_id'] != $purchase_returns_supplier_id) {
            print_failure("Error: Linked Purchase Order does not belong to the specified supplier.");
            exit;
        }
        if (!in_array($po_data['purchase_orders_status'], ['Ordered', 'Shipped', 'Received', 'Partially Received'])) {
            print_failure("Error: Returns can only be linked to 'Ordered', 'Shipped', 'Received' or 'Partially Received' purchase orders.");
            exit;
        }

        // Fetch original purchase order items quantities received
        $stmt_original_items = $conn->prepare("
            SELECT purchase_order_items_id, purchase_order_items_variant_id, 
                   purchase_order_items_packaging_type_id, purchase_order_items_quantity_received, 
                   purchase_order_items_unit_cost, purchase_order_items_discount_amount,
                   purchase_order_items_tax_rate, purchase_order_items_has_tax
            FROM purchase_order_items
            WHERE purchase_order_items_purchase_order_id = ?
        ");
        if (!$stmt_original_items) {
            throw new Exception("Prepare failed for original purchase order items fetch: " . $conn->error);
        }
        $stmt_original_items->bind_param("i", $purchase_returns_purchase_order_id);
        $stmt_original_items->execute();
        $result_original_items = $stmt_original_items->get_result();
        while ($row = $result_original_items->fetch_assoc()) {
            $raw_unit_cost = (float)$row['purchase_order_items_unit_cost'];
            $discount_amount = (float)$row['purchase_order_items_discount_amount'];
            $tax_rate = (float)$row['purchase_order_items_tax_rate'];
            $has_tax = (bool)$row['purchase_order_items_has_tax'];
            
            // Calculate final unit cost including discount and tax
            $discounted_unit_cost = $raw_unit_cost - $discount_amount;
            $final_unit_cost = $has_tax ? $discounted_unit_cost * (1 + ($tax_rate / 100)) : $discounted_unit_cost;
            
            $original_po_items[$row['purchase_order_items_id']] = [
                'variant_id' => (int)$row['purchase_order_items_variant_id'],
                'packaging_type_id' => $row['purchase_order_items_packaging_type_id'],
                'quantity_received' => (float)$row['purchase_order_items_quantity_received'],
                'unit_cost' => $final_unit_cost
            ];
        }
        $stmt_original_items->close();

        if (empty($original_po_items)) {
            print_failure("Error: Linked purchase order has no items.");
            exit;
        }
    }

    foreach ($purchase_return_items_data as $item) {
        if (empty($item['purchase_order_item_id']) || !is_numeric($item['purchase_order_item_id']) || $item['purchase_order_item_id'] <= 0 ||
            empty($item['quantity']) || !is_numeric($item['quantity']) || $item['quantity'] <= 0) {
            print_failure("Error: Invalid item data (purchase order item ID or quantity).");
            exit;
        }

        $current_po_item_id = $item['purchase_order_item_id'];
        $returned_quantity = (float)$item['quantity'];
        
        // If we have a linked PO, validate against original PO item quantities
        if ($purchase_returns_purchase_order_id !== null) {
            if (!isset($original_po_items[$current_po_item_id])) {
                print_failure("Error: Purchase Order Item ID " . $current_po_item_id . " is not found in the linked purchase order.");
                exit;
            }
            $original_qty_received = $original_po_items[$current_po_item_id]['quantity_received'];
            $fetched_unit_cost = $original_po_items[$current_po_item_id]['unit_cost'];
        } else {
            // If no linked PO, fetch the item details directly
            $stmt_po_item = $conn->prepare("
                SELECT poi.purchase_order_items_variant_id, poi.purchase_order_items_packaging_type_id,
                       poi.purchase_order_items_quantity_received, poi.purchase_order_items_unit_cost,
                       poi.purchase_order_items_discount_amount, poi.purchase_order_items_tax_rate,
                       poi.purchase_order_items_has_tax,
                       po.purchase_orders_supplier_id
                FROM purchase_order_items poi
                JOIN purchase_orders po ON poi.purchase_order_items_purchase_order_id = po.purchase_orders_id
                WHERE poi.purchase_order_items_id = ?
                LIMIT 1
            ");
            if (!$stmt_po_item) {
                throw new Exception("Prepare failed for purchase order item fetch: " . $conn->error);
            }
            $stmt_po_item->bind_param("i", $current_po_item_id);
            $stmt_po_item->execute();
            $result_po_item = $stmt_po_item->get_result();
            $po_item_data = $result_po_item->fetch_assoc();
            $stmt_po_item->close();

            if (!$po_item_data) {
                print_failure("Error: Purchase Order Item ID " . $current_po_item_id . " not found.");
                exit;
            }
            if ($po_item_data['purchase_orders_supplier_id'] != $purchase_returns_supplier_id) {
                print_failure("Error: Purchase Order Item ID " . $current_po_item_id . " does not belong to the specified supplier.");
                exit;
            }
            
            $original_qty_received = (float)$po_item_data['purchase_order_items_quantity_received'];
            $raw_unit_cost = (float)$po_item_data['purchase_order_items_unit_cost'];
            $discount_amount = (float)$po_item_data['purchase_order_items_discount_amount'];
            $tax_rate = (float)$po_item_data['purchase_order_items_tax_rate'];
            $has_tax = (bool)$po_item_data['purchase_order_items_has_tax'];
            
            // Calculate final unit cost including discount and tax
            $discounted_unit_cost = $raw_unit_cost - $discount_amount;
            $fetched_unit_cost = $has_tax ? $discounted_unit_cost * (1 + ($tax_rate / 100)) : $discounted_unit_cost;
        }

        // Calculate already returned quantity for this purchase order item
        $stmt_already_returned = $conn->prepare("
            SELECT SUM(pri.purchase_return_items_quantity) AS total_returned
            FROM purchase_returns pr
            JOIN purchase_return_items pri ON pr.purchase_returns_id = pri.purchase_return_items_return_id
            WHERE pri.purchase_return_items_purchase_order_item_id = ?
            AND pr.purchase_returns_status IN ('Pending', 'Approved', 'Processed') -- Consider only non-cancelled/rejected returns
        ");
        if (!$stmt_already_returned) {
            throw new Exception("Prepare failed for already returned quantity: " . $conn->error);
        }
        $stmt_already_returned->bind_param("i", $current_po_item_id);
        $stmt_already_returned->execute();
        $result_already_returned = $stmt_already_returned->get_result();
        $row_already_returned = $result_already_returned->fetch_assoc();
        $already_returned_qty = (float)$row_already_returned['total_returned'];
        $stmt_already_returned->close();

        $available_for_return = $original_qty_received - $already_returned_qty;

        if ($returned_quantity > $available_for_return) {
            print_failure("Error: Quantity for purchase order item ID " . $current_po_item_id . " exceeds available quantity for return (Available: " . $available_for_return . ").");
            exit;
        }

        $item_total = $returned_quantity * $fetched_unit_cost;
        $calculated_total_amount += $item_total;

        // Store processed item data
        $processed_return_items[] = [
            'purchase_order_item_id' => (int)$current_po_item_id,
            'quantity' => $returned_quantity,
            'unit_cost' => $fetched_unit_cost,
            'total_cost' => $item_total,
            'notes' => $item['notes'] ?? null,
        ];
    }

    $conn->begin_transaction();

    try {
        // Check if supplier exists
        $stmt_check_supplier = $conn->prepare("SELECT supplier_id FROM suppliers WHERE supplier_id = ? LIMIT 1");
        if (!$stmt_check_supplier) throw new Exception("Prepare failed for supplier check: " . $conn->error);
        $stmt_check_supplier->bind_param("i", $purchase_returns_supplier_id);
        $stmt_check_supplier->execute();
        if ($stmt_check_supplier->get_result()->num_rows === 0) {
            print_failure("Error: Supplier ID " . $purchase_returns_supplier_id . " does not exist.");
        }
        $stmt_check_supplier->close();

        // 1. Insert into `purchase_returns` table
        $stmt_pr = $conn->prepare("
            INSERT INTO purchase_returns (
                purchase_returns_supplier_id, purchase_returns_purchase_order_id, purchase_returns_date, 
                purchase_returns_reason, purchase_returns_total_amount, purchase_returns_status, 
                purchase_returns_notes, purchase_returns_created_by_user_id,
                purchase_returns_created_at, purchase_returns_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        if (!$stmt_pr) {
            throw new Exception("Prepare failed for purchase return insert: " . $conn->error);
        }

        $stmt_pr->bind_param("iissdssi", 
            $purchase_returns_supplier_id, 
            $purchase_returns_purchase_order_id, 
            $purchase_returns_date, 
            $purchase_returns_reason, 
            $calculated_total_amount, 
            $purchase_returns_status, 
            $purchase_returns_notes,
            $purchase_returns_created_by_user_id
        );

        if (!$stmt_pr->execute()) {
            throw new Exception("Error inserting purchase return: " . $stmt_pr->error);
        }

        $new_pr_id = $stmt_pr->insert_id;
        $stmt_pr->close();

    // 2. Insert into `purchase_return_items` table + adjust inventory & log movement
        $stmt_pr_item_insert = $conn->prepare("
            INSERT INTO purchase_return_items (
                purchase_return_items_return_id, purchase_return_items_purchase_order_item_id, 
                purchase_return_items_quantity, purchase_return_items_unit_cost, 
                purchase_return_items_total_cost, purchase_return_items_notes
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");

        if (!$stmt_pr_item_insert) {
            throw new Exception("Prepare failed for purchase return item insert: " . $conn->error);
        }

    foreach ($processed_return_items as $item) {
            $item_notes_val = $item['notes'] ?? null;
            if ($item_notes_val === "") {$item_notes_val = null;}

            $stmt_pr_item_insert->bind_param("iiddds", 
                $new_pr_id, 
                $item['purchase_order_item_id'], 
                $item['quantity'], 
                $item['unit_cost'], 
                $item['total_cost'], 
                $item_notes_val
            );
            if (!$stmt_pr_item_insert->execute()) {
                throw new Exception("Error inserting purchase return item for PO item ID " . $item['purchase_order_item_id'] . ": " . $stmt_pr_item_insert->error);
            }

            // Fetch PO item again to get variant + packaging + warehouse for inventory adjustment
            $stmt_fetch_variants = $conn->prepare("
                SELECT 
                    poi.purchase_order_items_variant_id, 
                    poi.purchase_order_items_packaging_type_id, 
                    poi.purchase_order_items_quantity_received,
                    po.purchase_orders_warehouse_id,
                    po.purchase_orders_status 
                FROM purchase_order_items poi 
                JOIN purchase_orders po ON poi.purchase_order_items_purchase_order_id = po.purchase_orders_id 
                WHERE poi.purchase_order_items_id = ? 
                LIMIT 1
            ");
            if (!$stmt_fetch_variants) throw new Exception("Prepare failed for variant fetch during return: " . $conn->error);
            $stmt_fetch_variants->bind_param("i", $item['purchase_order_item_id']);
            $stmt_fetch_variants->execute();
            $variant_row = $stmt_fetch_variants->get_result()->fetch_assoc();
            $stmt_fetch_variants->close();

            if ($variant_row) {
                $variant_id   = (int)$variant_row['purchase_order_items_variant_id'];
                $packaging_id = $variant_row['purchase_order_items_packaging_type_id'] ? (int)$variant_row['purchase_order_items_packaging_type_id'] : null;
                $warehouse_id = (int)$variant_row['purchase_orders_warehouse_id'];
                $po_status    = $variant_row['purchase_orders_status'];
                $qty_received = (float)$variant_row['purchase_order_items_quantity_received'];

                // Update inventory immediately when return is approved
                $return_quantity = (float)$item['quantity'];
                $qty_received = (float)$variant_row['purchase_order_items_quantity_received'];
                
                // Only deduct from inventory for items that were actually received
                // We cannot return more than what was received, validation should already ensure this
                $warehouse_return_qty = min($return_quantity, $qty_received);
                
                // Update inventory immediately when return is approved
                $return_quantity = (float)$item['quantity'];
                $qty_received = (float)$variant_row['purchase_order_items_quantity_received'];
                
                // Only deduct from inventory for items that were actually received
                // We cannot return more than what was received, validation should already ensure this
                $warehouse_return_qty = min($return_quantity, $qty_received);
                
                if ($warehouse_return_qty > 0) {
                    // First, check current inventory quantity and get the specific inventory record
                    $stmt_check_inventory = $conn->prepare("
                        SELECT inventory_id, inventory_quantity, inventory_production_date
                        FROM inventory 
                        WHERE variant_id = ? AND warehouse_id = ? 
                        AND (packaging_type_id = ? OR (packaging_type_id IS NULL AND ? IS NULL))
                        ORDER BY inventory_created_at DESC
                        LIMIT 1
                    ");
                    if (!$stmt_check_inventory) {
                        throw new Exception("Prepare failed for inventory check: " . $conn->error);
                    }
                    $stmt_check_inventory->bind_param("iiii", $variant_id, $warehouse_id, $packaging_id, $packaging_id);
                    $stmt_check_inventory->execute();
                    $result_check = $stmt_check_inventory->get_result();
                    $inventory_row = $result_check->fetch_assoc();
                    $stmt_check_inventory->close();
                    
                    if (!$inventory_row) {
                        // No inventory record exists - this could happen if the item was never received
                        // In this case, we cannot return from warehouse inventory, so just log it
                        if (function_exists('log_inventory_movement_internal')) {
                            log_inventory_movement_internal($variant_id, $packaging_id, $warehouse_id, 'return', 0, 0, $purchase_returns_created_by_user_id, $new_pr_id, "Purchase return - no inventory record found (never received): $warehouse_return_qty", $conn);
                        }
                    } else {
                        $current_inventory = (float)$inventory_row['inventory_quantity'];
                        $inventory_id = (int)$inventory_row['inventory_id'];
                        
                        if ($current_inventory < $warehouse_return_qty) {
                            throw new Exception("Insufficient inventory quantity for return. Available: $current_inventory, Requested: $warehouse_return_qty");
                        }
                        
                        // Calculate new quantity after return
                        $new_inventory_qty = $current_inventory - $warehouse_return_qty;
                        
                        // Update inventory table using specific inventory_id to avoid unique constraint issues
                        $stmt_update_inventory = $conn->prepare("
                            UPDATE inventory 
                            SET inventory_quantity = ?,
                                inventory_status = CASE 
                                    WHEN ? <= 0 THEN 'Out of Stock'
                                    WHEN ? <= 10 THEN 'Low Stock' 
                                    ELSE inventory_status 
                                END,
                                inventory_last_movement_at = NOW(),
                                inventory_updated_at = NOW()
                            WHERE inventory_id = ?
                        ");
                        if (!$stmt_update_inventory) {
                            throw new Exception("Prepare failed for inventory update: " . $conn->error);
                        }
                        $stmt_update_inventory->bind_param("dddi", $new_inventory_qty, $new_inventory_qty, $new_inventory_qty, $inventory_id);
                        
                        if (!$stmt_update_inventory->execute()) {
                            throw new Exception("Error updating inventory for return: " . $stmt_update_inventory->error);
                        }
                        
                        // Check if the inventory was actually updated
                        if ($stmt_update_inventory->affected_rows == 0) {
                            $stmt_update_inventory->close();
                            throw new Exception("Failed to update inventory. Inventory record may have been modified by another process.");
                        }
                        $stmt_update_inventory->close();
                        
                        // Log inventory movement for warehouse return
                        if (function_exists('log_inventory_movement_internal')) {
                            log_inventory_movement_internal($variant_id, $packaging_id, $warehouse_id, 'return', -$warehouse_return_qty, $new_inventory_qty, $purchase_returns_created_by_user_id, $new_pr_id, "Purchase return - deducted from warehouse inventory", $conn);
                        }
                    }
                }
                
                // Log any items that couldn't be returned from inventory (for tracking purposes)
                $pending_return_qty = $return_quantity - $warehouse_return_qty;
                if ($pending_return_qty > 0 && function_exists('log_inventory_movement_internal')) {
                    log_inventory_movement_internal($variant_id, $packaging_id, $warehouse_id, 'return', 0, 0, $purchase_returns_created_by_user_id, $new_pr_id, "Purchase return - pending items (never received): $pending_return_qty", $conn);
                }
                
                // Update purchase_order_items_quantity_returned to track total returned quantity
                $stmt_update_po_item = $conn->prepare("
                    UPDATE purchase_order_items 
                    SET purchase_order_items_quantity_returned = purchase_order_items_quantity_returned + ?,
                        purchase_order_items_updated_at = NOW()
                    WHERE purchase_order_items_id = ?
                ");
                if (!$stmt_update_po_item) {
                    throw new Exception("Prepare failed for purchase order item return quantity update: " . $conn->error);
                }
                $stmt_update_po_item->bind_param("di", $return_quantity, $item['purchase_order_item_id']);
                
                if (!$stmt_update_po_item->execute()) {
                    throw new Exception("Error updating purchase order item return quantity: " . $stmt_update_po_item->error);
                }
                $stmt_update_po_item->close();
            }
        }
        $stmt_pr_item_insert->close();

        // 3. Update supplier's balance if return status is 'Approved' or 'Processed' (credit supplier)
        if (in_array($purchase_returns_status, ['Approved', 'Processed'])) {
            $stmt_update_supplier_balance = $conn->prepare("
                UPDATE suppliers
                SET supplier_balance = supplier_balance - ?
                WHERE supplier_id = ?
            ");
            if (!$stmt_update_supplier_balance) throw new Exception("Prepare failed for supplier balance update: " . $conn->error);
            $stmt_update_supplier_balance->bind_param("di", $calculated_total_amount, $purchase_returns_supplier_id);
            if (!$stmt_update_supplier_balance->execute()) throw new Exception("Error updating supplier balance: " . $stmt_update_supplier_balance->error);
            $stmt_update_supplier_balance->close();
        }

        $conn->commit();
        print_success("Purchase Return created successfully.", [
            'purchase_returns_id' => $new_pr_id, 
            'total_amount' => $calculated_total_amount, 
            'items_count' => count($processed_return_items)
        ]);

    } catch (Exception | TypeError $e) {
        $conn->rollback();
        print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
    }

} catch (Exception | TypeError $e) {
    if (isset($conn) && $conn !== false) {
        $conn->rollback();
    }
    print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
