<?php
require_once '../db_connect.php'; // Contains connection, print_success, print_failure, and authorization functions
require_once '../notifications/notify_helpers.php'; // Notification helpers
require_once '../odoo/sync_sales_orders.php'; // Odoo sales order sync

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Authorization (adjust as needed)
    

    // --- INPUT GATHERING from $_POST ---
    $uuid = $_POST['uuid'] ?? null;
    $user_id = get_user_id_from_uuid_local($uuid) ?? null;

    $client_id = $_POST['sales_orders_client_id'] ?? null;
    $representative_id = $_POST['sales_orders_representative_id'] ?? get_user_id_from_uuid_local($uuid);
    $warehouse_id = $_POST['sales_orders_warehouse_id'] ?? null;
    $visit_id = $_POST['sales_orders_visit_id'] ?? null;
    $status = $_POST['sales_orders_status'] ?? 'Draft';
    $delivery_status = $_POST['sales_orders_delivery_status'] ?? 'Not_Delivered'; // New delivery status field
    $notes = $_POST['sales_orders_notes'] ?? null;
    $order_date = $_POST['sales_orders_order_date'] ?? date('Y-m-d H:i:s');
    $expected_delivery_date = $_POST['sales_orders_expected_delivery_date'] ?? null;
    $actual_delivery_date = $_POST['sales_orders_actual_delivery_date'] ?? null;
    $subtotal = $_POST['sales_orders_subtotal'] ?? 0;
    $discount_amount = $_POST['sales_orders_discount_amount'] ?? 0;
    $tax_amount = $_POST['sales_orders_tax_amount'] ?? 0;
    $total_amount = $_POST['sales_orders_total_amount'] ?? 0;
    $created_at = $_POST['sales_orders_created_at'] ?? date('Y-m-d H:i:s');
    $updated_at = $_POST['sales_orders_updated_at'] ?? date('Y-m-d H:i:s');
    $items_json = $_POST['items'] ?? '[]';
    $items = json_decode($items_json, true);

    // Handle empty strings for nullable fields
    if ($notes === "") $notes = null;
    if ($visit_id === ""  || $visit_id === 0  || $visit_id === "0" ) $visit_id = null; // This line is crucial for setting to actual null
    if ($expected_delivery_date === "") $expected_delivery_date = null;
    if ($actual_delivery_date === "") $actual_delivery_date = null;

    // --- VALIDATION ---
    if (empty($client_id) || !is_numeric($client_id)) print_failure("Error: Valid Client ID is required.");
    if (empty($representative_id) || !is_numeric($representative_id)) print_failure("Error: Valid Representative ID is required.");
    if (empty($warehouse_id) || !is_numeric($warehouse_id)) print_failure("Error: Valid Warehouse ID is required.");
    if (!is_array($items) || count($items) == 0) print_failure("Error: At least one order item is required.");

    // Start a transaction to ensure atomicity
    $conn->begin_transaction();

    // --- CREDIT LIMIT VALIDATION (only when creating invoiced orders) ---
    if ($status === 'Invoiced') {
        $credit_stmt = $conn->prepare("SELECT clients_credit_balance, clients_credit_limit FROM clients WHERE clients_id = ? FOR UPDATE");
        if (!$credit_stmt) {
            throw new Exception("Prepare failed for client credit lookup: " . $conn->error);
        }
        $credit_stmt->bind_param("i", $client_id);
        $credit_stmt->execute();
        $credit_result = $credit_stmt->get_result();
        $client_credit = $credit_result ? $credit_result->fetch_assoc() : null;
        $credit_stmt->close();

        if (!$client_credit) {
            $conn->rollback();
            print_failure("Error: Client not found for credit validation.");
        }

        $available_credit = (float)($client_credit['clients_credit_balance'] ?? 0) + (float)($client_credit['clients_credit_limit'] ?? 0);
        $order_total = (float)$total_amount;

        if ($order_total > $available_credit) {
            $conn->rollback();
            $available_formatted = number_format($available_credit, 2, '.', '');
            $order_formatted = number_format($order_total, 2, '.', '');
            print_failure("Credit limit exceeded. Available credit: {$available_formatted}, required: {$order_formatted}.");
        }
    }

    // --- INSERT SALES ORDER ---
        // Dynamically build the INSERT statement based on whether visit_id is null
    $columns = [
        'sales_orders_client_id',
        'sales_orders_representative_id',
        'sales_orders_warehouse_id',
        'sales_orders_status',
        'sales_orders_delivery_status', // New delivery status column
        'sales_orders_order_date',
        'sales_orders_expected_delivery_date',
        'sales_orders_actual_delivery_date',
        'sales_orders_subtotal',
        'sales_orders_discount_amount',
        'sales_orders_tax_amount',
        'sales_orders_total_amount',
        'sales_orders_notes',
        'sales_orders_created_at',
        'sales_orders_updated_at'
    ];

    $values = [
        $client_id,
        $representative_id,
        $warehouse_id,
        $status,
        $delivery_status, // New delivery status value
        $order_date,
        $expected_delivery_date,
        $actual_delivery_date,
        $subtotal,
        $discount_amount,
        $tax_amount,
        $total_amount,
        $notes,
        $created_at,
        $updated_at
    ];

    $placeholders = str_repeat('?,', count($values) - 1) . '?';
    $types = 'iiisssssddddsss'; // Updated type string: i=int, s=string, d=decimal/double

    // If visit_id is not null, insert it into the columns and values
    if ($visit_id !== null) {
        array_splice($columns, 3, 0, 'sales_orders_visit_id');
        array_splice($values, 3, 0, $visit_id);
        $placeholders = str_repeat('?,', count($values) - 1) . '?';
        $types = 'iiiisssssddddsss'; // Updated type string with visit_id included
    }

    $sql_columns = implode(', ', $columns);

    $stmt = $conn->prepare(
        "INSERT INTO sales_orders 
        ($sql_columns)
        VALUES ($placeholders)"
    );
    $stmt->bind_param($types, ...$values);
    $stmt->execute();
    $sales_order_id = $stmt->insert_id;
    $stmt->close();

    // --- INSERT SALES ORDER ITEMS ---
    $item_stmt = $conn->prepare(
        "INSERT INTO sales_order_items 
        (sales_order_items_sales_order_id, sales_order_items_variant_id, sales_order_items_packaging_type_id, sales_order_items_quantity, sales_order_items_unit_price, sales_order_items_subtotal, sales_order_items_discount_amount, sales_order_items_tax_amount, sales_order_items_tax_rate, sales_order_items_has_tax, sales_order_items_total_price, sales_order_items_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    foreach ($items as $item) {
        $variant_id = $item['sales_order_items_variant_id'] ?? null;
        $packaging_type_id = $item['sales_order_items_packaging_type_id'] ?? null;
        $quantity = $item['sales_order_items_quantity'] ?? 0;
        $unit_price = $item['sales_order_items_unit_price'] ?? 0;
        $subtotal_item = $item['sales_order_items_subtotal'] ?? 0; // Renamed to avoid conflict
        $discount_amount_item = $item['sales_order_items_discount_amount'] ?? 0; // Renamed
        $tax_amount_item = $item['sales_order_items_tax_amount'] ?? 0; // Tax amount for this item
        $tax_rate_item = $item['sales_order_items_tax_rate'] ?? null; // Tax rate percentage
        $has_tax_item = isset($item['sales_order_items_has_tax']) ? ($item['sales_order_items_has_tax'] ? 1 : 0) : 0; // Convert boolean to int
        $total_price_item = $item['sales_order_items_total_price'] ?? 0; // Renamed
        $item_notes = $item['sales_order_items_notes'] ?? null;

        if (empty($variant_id) || !is_numeric($variant_id)) {
            $conn->rollback();
            print_failure("Error: Valid Variant ID is required for each item.");
        }

        $item_stmt->bind_param(
            "iiiddddddids",
            $sales_order_id,          // i
            $variant_id,             // i
            $packaging_type_id,      // i (nullable handled as null => 0 acceptable or adjust schema)
            $quantity,               // d
            $unit_price,             // d
            $subtotal_item,          // d
            $discount_amount_item,   // d
            $tax_amount_item,        // d
            $tax_rate_item,          // d
            $has_tax_item,           // i
            $total_price_item,       // d
            $item_notes              // s
        );
        $item_stmt->execute();
    }
    $item_stmt->close();

    // --- UPDATE CLIENT BALANCE IF INVOICED ---
    if ($status == 'Invoiced') {
        // Subtract the total amount from client balance (negative amount = deduction)
        $balance_update_success = update_client_balance($conn, $client_id, -$total_amount, "Sales Order #$sales_order_id Invoiced");
        if (!$balance_update_success) {
            error_log("Warning: Failed to update client balance for order #$sales_order_id");
        }
    }

    // Commit transaction if all operations were successful
    $conn->commit();

    // --- FETCH THE NEWLY CREATED SALES ORDER FOR RESPONSE ---
    // Fetch the complete sales order details to return to the client
    $fetch_stmt = $conn->prepare("
        SELECT
            so.*,
            c.clients_company_name,
            c.clients_address,
            c.clients_city,
            c.clients_contact_phone_1,
            u.users_name AS representative_name,
            w.warehouse_name
        FROM sales_orders so
        LEFT JOIN clients c ON so.sales_orders_client_id = c.clients_id
        LEFT JOIN users u ON so.sales_orders_representative_id = u.users_id
        LEFT JOIN warehouse w ON so.sales_orders_warehouse_id = w.warehouse_id
        WHERE so.sales_orders_id = ?
    ");
    $fetch_stmt->bind_param("i", $sales_order_id);
    $fetch_stmt->execute();
    $result = $fetch_stmt->get_result();
    $new_sales_order_data = $result->fetch_assoc();
    $fetch_stmt->close();

    // Fetch sales order items for the newly created order
    $items_fetch_stmt = $conn->prepare("
        SELECT
            soi.*,
            pv.variant_name,
            pt.packaging_types_name
        FROM sales_order_items soi
        LEFT JOIN product_variants pv ON soi.sales_order_items_variant_id = pv.variant_id
        LEFT JOIN packaging_types pt ON soi.sales_order_items_packaging_type_id = pt.packaging_types_id
        WHERE soi.sales_order_items_sales_order_id = ?
    ");
    $items_fetch_stmt->bind_param("i", $sales_order_id);
    $items_fetch_stmt->execute();
    $items_result = $items_fetch_stmt->get_result();
    $new_sales_order_data['items'] = [];
    $sales_order_items = [];
    while ($item_row = $items_result->fetch_assoc()) {
        $new_sales_order_data['items'][] = $item_row;
        $sales_order_items[] = $item_row; // Store for delivery creation
    }
    $items_fetch_stmt->close();

    // --- AUTO FULFILLMENT (Single-call full delivery) ---
    // If the order is created as Invoiced AND delivery_status explicitly set to Delivered, attempt full fulfillment now.
    if ($status === 'Invoiced' && $delivery_status === 'Delivered') {
        try {
            // Validate inventory for each item first (aggregate) to ensure atomicity.
            foreach ($sales_order_items as $item) {
                $variant_id_chk = (int)$item['sales_order_items_variant_id'];
                $packaging_id_chk = $item['sales_order_items_packaging_type_id'] !== null ? (int)$item['sales_order_items_packaging_type_id'] : null;
                $qty_needed = (float)$item['sales_order_items_quantity'];
                $inv_sum_sql = "SELECT COALESCE(SUM(inventory_quantity),0) AS total_available FROM inventory WHERE variant_id = ? AND warehouse_id = ? AND packaging_type_id <=> ?";
                $stmt_inv_sum = $conn->prepare($inv_sum_sql);
                $stmt_inv_sum->bind_param("iii", $variant_id_chk, $warehouse_id, $packaging_id_chk);
                $stmt_inv_sum->execute();
                $inv_sum_res = $stmt_inv_sum->get_result()->fetch_assoc();
                $stmt_inv_sum->close();
                if ($inv_sum_res['total_available'] < $qty_needed) {
                    throw new Exception("Insufficient inventory to fully deliver variant {$variant_id_chk}. Required {$qty_needed}, Available {$inv_sum_res['total_available']}");
                }
            }

            // Create sales_deliveries parent record (Delivered).
            $sd_stmt = $conn->prepare("INSERT INTO sales_deliveries (sales_deliveries_sales_order_id, sales_deliveries_warehouse_id, sales_deliveries_delivery_date, sales_deliveries_delivered_by_user_id, sales_deliveries_delivery_status, sales_deliveries_delivery_notes) VALUES (?, ?, NOW(), ?, 'Delivered', 'Auto full delivery on creation')");
            $sd_stmt->bind_param("iii", $sales_order_id, $warehouse_id, $representative_id);
            $sd_stmt->execute();
            $auto_delivery_id = $sd_stmt->insert_id;
            $sd_stmt->close();

            // Prepare statements reused in loop
            $stmt_fetch_batches = $conn->prepare("SELECT inventory_id, inventory_quantity, inventory_production_date FROM inventory WHERE variant_id = ? AND warehouse_id = ? AND packaging_type_id <=> ? ORDER BY inventory_production_date ASC");
            $stmt_update_inventory = $conn->prepare("UPDATE inventory SET inventory_quantity = ?, inventory_last_movement_at = NOW() WHERE inventory_id = ?");
            $stmt_update_so_item = $conn->prepare("UPDATE sales_order_items SET sales_order_items_quantity_delivered = ? WHERE sales_order_items_id = ?");
            $stmt_insert_delivery_item = $conn->prepare("INSERT INTO sales_delivery_items (sales_delivery_items_delivery_id, sales_delivery_items_sales_order_item_id, sales_delivery_items_quantity_delivered, sales_delivery_items_notes, sales_delivery_items_batch_date) VALUES (?, ?, ?, ?, ?)");

            foreach ($sales_order_items as $item) {
                $so_item_id = (int)$item['sales_order_items_id'];
                $variant_id = (int)$item['sales_order_items_variant_id'];
                $packaging_id = $item['sales_order_items_packaging_type_id'] !== null ? (int)$item['sales_order_items_packaging_type_id'] : null;
                $qty_to_deliver = (float)$item['sales_order_items_quantity'];
                $remaining = $qty_to_deliver;
                $delivered_total = 0.0;
                $first_batch_date = null;

                $stmt_fetch_batches->bind_param("iii", $variant_id, $warehouse_id, $packaging_id);
                $stmt_fetch_batches->execute();
                $batches_res = $stmt_fetch_batches->get_result();
                while ($remaining > 0 && ($batch = $batches_res->fetch_assoc())) {
                    $available = (float)$batch['inventory_quantity'];
                    if ($available <= 0) continue;
                    $take = min($available, $remaining);
                    $new_qty = $available - $take;
                    $stmt_update_inventory->bind_param("di", $new_qty, $batch['inventory_id']);
                    $stmt_update_inventory->execute();
                    $remaining -= $take;
                    $delivered_total += $take;
                    if ($first_batch_date === null) { $first_batch_date = $batch['inventory_production_date']; }
                    // Optional: log movement if helper exists
                    if (function_exists('log_inventory_movement_internal')) {
                        log_inventory_movement_internal($variant_id, $packaging_id, $warehouse_id, 'sale', -$take, $new_qty, $representative_id, $auto_delivery_id, "Auto full delivery creation SO Item {$so_item_id}", $conn);
                    }
                    if ($remaining <= 0) break;
                }
                if ($remaining > 0) {
                    throw new Exception("Unexpected inventory shortfall during fulfillment for SO item {$so_item_id}.");
                }
                // Update delivered qty on SO item
                $stmt_update_so_item->bind_param("di", $delivered_total, $so_item_id);
                $stmt_update_so_item->execute();
                // Insert single delivery item record (aggregated)
                $batch_date_record = $first_batch_date ?: date('Y-m-d');
                $notes_item = 'Auto full delivery';
                // i (delivery_id), i (so_item_id), d (quantity_delivered), s (notes), s (batch_date)
                $stmt_insert_delivery_item->bind_param("iidss", $auto_delivery_id, $so_item_id, $delivered_total, $notes_item, $batch_date_record);
                $stmt_insert_delivery_item->execute();
            }

            // Close reusable statements
            $stmt_fetch_batches->close();
            $stmt_update_inventory->close();
            $stmt_update_so_item->close();
            $stmt_insert_delivery_item->close();

            // Update sales order actual delivery date (full delivery)
            $stmt_update_so_delivery = $conn->prepare("UPDATE sales_orders SET sales_orders_actual_delivery_date = NOW(), sales_orders_delivery_status = 'Delivered' WHERE sales_orders_id = ?");
            $stmt_update_so_delivery->bind_param("i", $sales_order_id);
            $stmt_update_so_delivery->execute();
            $stmt_update_so_delivery->close();

            $new_sales_order_data['auto_sales_delivery_id'] = $auto_delivery_id;
        } catch (Exception $fulfill_error) {
            $conn->rollback();
            print_failure('Error auto-fulfilling delivered order: ' . $fulfill_error->getMessage());
        }
    }

    // Notifications: if newly created order is Pending -> notify all admins
    if ($status === 'Pending') {
        try {
            // $title = 'New Sales Order Pending Approval';
            // $body = 'Sales Order #' . $sales_order_id . ' requires approval.';
            // $data = [
            //     'sales_orders_id' => $sales_order_id,
            //     'client_id' => $client_id,
            //     'representative_id' => $representative_id,
            //     'status' => $status
            // ];
            // create_notification_for_role($conn, 'admin', $title, $body, $data, 'in_app', 'normal', 'sales_orders', $sales_order_id);

        // --- ADMIN NOTIFICATION FOR PENDING ORDERS ---
        if ($status === 'Pending') {
            try {
                $clientName = $new_sales_order_data['clients_company_name'] ?? ('Client #' . $client_id);
                $repName = $new_sales_order_data['representative_name'] ?? null;
                $amountFormatted = number_format((float)$total_amount, 2, '.', '');
                $title = 'Sales Order #' . $sales_order_id . ' Pending Approval';
                $body = sprintf(
                    '%s submitted sales order #%d for %s totaling %s. Approval is required.',
                    $repName ? $repName : 'A representative',
                    $sales_order_id,
                    $clientName,
                    $amountFormatted
                );
                $data = [
                    'sales_orders_id' => $sales_order_id,
                    'client_id' => (int)$client_id,
                    'client_name' => $clientName,
                    'total_amount' => (float)$total_amount,
                    'requested_by_user_id' => $new_sales_order_data['sales_orders_representative_id'] ?? null,
                    'status' => 'Pending',
                    'submitted_at' => $created_at,
                ];
                create_notification_for_role($conn, 'admin', $title, $body, $data, 'in_app', 'high', 'sales_orders', $sales_order_id);
            } catch (Throwable $notifyEx) {
                error_log('Pending sales order notification failed: ' . $notifyEx->getMessage());
            }
        }
        } catch (Throwable $nex) {
            error_log('Pending order notification failed: ' . $nex->getMessage());
        }
    }

    // --- SYNC TO ODOO ---
    // Sync to Odoo only when status is Invoiced
    if ($status === 'Invoiced') {
        try {
            $odoo_result = syncSalesOrderToOdoo($new_sales_order_data, $sales_order_id, $new_sales_order_data['items'] ?? []);
            if ($odoo_result && is_array($odoo_result)) {
                if (!empty($odoo_result['order_id'])) {
                    $new_sales_order_data['odoo_order_id'] = $odoo_result['order_id'];
                    $new_sales_order_data['sales_orders_odoo_order_id'] = $odoo_result['order_id'];
                    error_log("Sales order #$sales_order_id synced to Odoo: Order ID {$odoo_result['order_id']}");
                }
                if (!empty($odoo_result['invoice_id'])) {
                    $new_sales_order_data['odoo_invoice_id'] = $odoo_result['invoice_id'];
                    $new_sales_order_data['sales_orders_odoo_invoice_id'] = $odoo_result['invoice_id'];
                    error_log("Sales order #$sales_order_id Odoo invoice: {$odoo_result['invoice_id']}");
                }
            }
        } catch (Throwable $odooEx) {
            error_log('Odoo sales order sync failed: ' . $odooEx->getMessage());
        }
    }

    // Return the complete sales order data
    print_success("Sales order created successfully.", $new_sales_order_data);

} catch (Exception | TypeError $e) {
    $conn->rollback(); // Rollback on any exception
    print_failure("Internal Error: " . $e->getMessage() . " on line " . $e->getLine());
}
?>
