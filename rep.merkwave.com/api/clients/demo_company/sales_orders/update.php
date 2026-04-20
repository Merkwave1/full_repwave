<?php
require_once '../db_connect.php'; // Contains connection, print_success, print_failure, and authorization functions
require_once '../notifications/notify_helpers.php'; // Notification helpers
require_once '../odoo/sync_sales_orders.php'; // Odoo sales order sync

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Authorization (adjust as needed)
    

    // --- INPUT GATHERING from $_POST ---
    $sales_order_id = $_POST['sales_orders_id'] ?? null;
    $new_status = $_POST['sales_orders_status'] ?? null;
    $delivery_status = $_POST['sales_orders_delivery_status'] ?? null; // New delivery status field
    $notes = $_POST['sales_orders_notes'] ?? null; // Allow notes to be updated
    $expected_delivery_date = $_POST['sales_orders_expected_delivery_date'] ?? null;
    $actual_delivery_date = $_POST['sales_orders_actual_delivery_date'] ?? null;
    $client_id = $_POST['sales_orders_client_id'] ?? null;
    $representative_id = $_POST['sales_orders_representative_id'] ?? null;
    $warehouse_id = $_POST['sales_orders_warehouse_id'] ?? null;
    $visit_id = $_POST['sales_orders_visit_id'] ?? null;
    $subtotal = $_POST['sales_orders_subtotal'] ?? null;
    $discount_amount = $_POST['sales_orders_discount_amount'] ?? null;
    $tax_amount = $_POST['sales_orders_tax_amount'] ?? null;
    $total_amount = $_POST['sales_orders_total_amount'] ?? null;
    $items_json = $_POST['items'] ?? '[]'; // Get items JSON
    $items = json_decode($items_json, true); // Decode items JSON

    // Handle empty strings for nullable fields, converting them to actual null
    if ($notes === "") $notes = null;
    if ($expected_delivery_date === "") $expected_delivery_date = null;
    if ($actual_delivery_date === "") $actual_delivery_date = null;
    if ($visit_id === "" || $visit_id === 0 || $visit_id === "0") $visit_id = null;
    if ($delivery_status === "") $delivery_status = null; // Handle empty delivery status


    // --- VALIDATION ---
    if (empty($sales_order_id) || !is_numeric($sales_order_id)) {
        print_failure("Error: Valid Sales Order ID is required for update.");
    }

    // Define allowed statuses for validation (should match your ENUM in DB)
    $allowed_statuses = ['Draft', 'Pending', 'Approved', 'Invoiced', 'Cancelled'];
    if ($new_status !== null && !in_array($new_status, $allowed_statuses)) {
        print_failure("Error: Invalid status provided. Allowed statuses are: " . implode(', ', $allowed_statuses));
    }

    // Define allowed delivery statuses for validation (only validate if not null)
    $allowed_delivery_statuses = ['Not_Delivered', 'Processing_Delivery', 'Shipped', 'Partially_Delivered', 'Delivered'];
    if ($delivery_status !== null && !in_array($delivery_status, $allowed_delivery_statuses)) {
        print_failure("Error: Invalid delivery status provided. Allowed delivery statuses are: " . implode(', ', $allowed_delivery_statuses));
    }

    // Start a transaction to ensure atomicity of updates
    $conn->begin_transaction();

    // --- FETCH OLD STATUS AND CLIENT_ID (if new status is provided or client_id is missing) ---
    $old_status = null;
    // Fetch current client_id and subtotal/discount/tax/total if not provided in POST
    $current_order_data_stmt = $conn->prepare("SELECT sales_orders_status, sales_orders_client_id, sales_orders_subtotal, sales_orders_discount_amount, sales_orders_tax_amount, sales_orders_total_amount, sales_orders_notes FROM sales_orders WHERE sales_orders_id = ?");
    $current_order_data_stmt->bind_param("i", $sales_order_id);
    $current_order_data_stmt->execute();
    $current_order_data = $current_order_data_stmt->get_result()->fetch_assoc();
    $current_order_data_stmt->close();

    if ($current_order_data) {
        $old_status = $current_order_data['sales_orders_status'];
        // If client_id was not provided in POST, use the one from the existing order
        if ($client_id === null) $client_id = $current_order_data['sales_orders_client_id'];
        // If subtotal/discount/tax/total were not provided in POST, use the ones from the existing order
        if ($subtotal === null) $subtotal = $current_order_data['sales_orders_subtotal'];
        if ($discount_amount === null) $discount_amount = $current_order_data['sales_orders_discount_amount'];
        if ($tax_amount === null) $tax_amount = $current_order_data['sales_orders_tax_amount'];
        if ($total_amount === null) $total_amount = $current_order_data['sales_orders_total_amount'];
        if ($notes === null) $notes = $current_order_data['sales_orders_notes']; // Use existing notes if not provided
    } else {
        $conn->rollback();
        print_failure("Error: Sales order not found.");
    }

    // --- CREDIT LIMIT VALIDATION ---
    $effective_new_status = $new_status ?? $old_status;
    if ($effective_new_status === 'Invoiced') {
        $target_total_amount = (float)($total_amount ?? $current_order_data['sales_orders_total_amount']);
        $old_total_amount = (float)$current_order_data['sales_orders_total_amount'];
        $required_amount = 0.0;

        if ($old_status !== 'Invoiced') {
            $required_amount = $target_total_amount;
        } else {
            $required_amount = max(0.0, $target_total_amount - $old_total_amount);
        }

        if ($required_amount > 0) {
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

            if ($available_credit < $required_amount) {
                $conn->rollback();
                $available_formatted = number_format($available_credit, 2, '.', '');
                $required_formatted = number_format($required_amount, 2, '.', '');
                print_failure("Credit limit exceeded. Available credit: {$available_formatted}, required: {$required_formatted}.");
            }
        }
    }


    // --- BUILD UPDATE QUERY FOR SALES ORDER DYNAMICALLY ---
    $update_fields = [];
    $bind_types = "";
    $bind_values = [];

    // Add fields to update if they are provided in the POST request
    if (isset($_POST['sales_orders_client_id'])) { // Only update if explicitly sent
        $update_fields[] = 'sales_orders_client_id = ?';
        $bind_types .= 'i';
        $bind_values[] = $client_id;
    }
    if ($representative_id !== null) {
        $update_fields[] = 'sales_orders_representative_id = ?';
        $bind_types .= 'i';
        $bind_values[] = $representative_id;
    }
    if ($warehouse_id !== null) {
        $update_fields[] = 'sales_orders_warehouse_id = ?';
        $bind_types .= 'i';
        $bind_values[] = $warehouse_id;
    }
    // visit_id needs special handling for NULL, as it's a foreign key
    if (isset($_POST['sales_orders_visit_id'])) { // Check if key exists in POST
        $update_fields[] = 'sales_orders_visit_id = ?';
        $bind_types .= 'i'; // Bind as integer, will handle null correctly
        $bind_values[] = $visit_id;
    }
    if ($new_status !== null) {
        $update_fields[] = 'sales_orders_status = ?';
        $bind_types .= 's';
        $bind_values[] = $new_status;
    }
    if ($delivery_status !== null) {
        $update_fields[] = 'sales_orders_delivery_status = ?';
        $bind_types .= 's';
        $bind_values[] = $delivery_status;
    }
    if (isset($_POST['sales_orders_notes'])) { // Only update if explicitly sent (can be null)
        $update_fields[] = 'sales_orders_notes = ?';
        $bind_types .= 's';
        $bind_values[] = $notes;
    }
    if ($expected_delivery_date !== null) {
        $update_fields[] = 'sales_orders_expected_delivery_date = ?';
        $bind_types .= 's';
        $bind_values[] = $expected_delivery_date;
    }
    if ($actual_delivery_date !== null) {
        $update_fields[] = 'sales_orders_actual_delivery_date = ?';
        $bind_types .= 's';
        $bind_values[] = $actual_delivery_date;
    }
    if ($subtotal !== null) {
        $update_fields[] = 'sales_orders_subtotal = ?';
        $bind_types .= 'd';
        $bind_values[] = $subtotal;
    }
    if ($discount_amount !== null) {
        $update_fields[] = 'sales_orders_discount_amount = ?';
        $bind_types .= 'd';
        $bind_values[] = $discount_amount;
    }
    if ($tax_amount !== null) {
        $update_fields[] = 'sales_orders_tax_amount = ?';
        $bind_types .= 'd';
        $bind_values[] = $tax_amount;
    }
    if ($total_amount !== null) {
        $update_fields[] = 'sales_orders_total_amount = ?';
        $bind_types .= 'd';
        $bind_values[] = $total_amount;
    }

    $rows_affected_main_order = 0;
    if (!empty($update_fields)) {
        $update_query = "UPDATE sales_orders SET " . implode(', ', $update_fields) . ", sales_orders_updated_at = CURRENT_TIMESTAMP WHERE sales_orders_id = ?";
        $bind_types .= 'i'; // Add type for sales_order_id
        $bind_values[] = $sales_order_id; // Add sales_order_id to bind values

        $stmt = $conn->prepare($update_query);
        $stmt->bind_param($bind_types, ...$bind_values);
        $stmt->execute();
        $rows_affected_main_order = $stmt->affected_rows;
        $stmt->close();
    }

    // --- UPDATE SALES ORDER ITEMS ---
    $items_affected = 0;

    // 1. Check if there are any return items referencing the sales order items
    $check_returns_stmt = $conn->prepare("
        SELECT COUNT(*) as return_count 
        FROM sales_return_items sri 
        INNER JOIN sales_order_items soi ON sri.return_items_sales_order_item_id = soi.sales_order_items_id 
        WHERE soi.sales_order_items_sales_order_id = ?
    ");
    $check_returns_stmt->bind_param("i", $sales_order_id);
    $check_returns_stmt->execute();
    $return_count_result = $check_returns_stmt->get_result()->fetch_assoc();
    $check_returns_stmt->close();

    $return_count = $return_count_result['return_count'];
    error_log("DEBUG - Checking for returns on sales order $sales_order_id: found $return_count return items");

    if ($return_count > 0) {
        // If there are returns, we cannot delete/recreate items, so we'll try to update in place
        error_log("DEBUG - Found returns, attempting in-place updates for sales order $sales_order_id");
        
        // Get current items
        $current_items_stmt = $conn->prepare("SELECT sales_order_items_id FROM sales_order_items WHERE sales_order_items_sales_order_id = ?");
        $current_items_stmt->bind_param("i", $sales_order_id);
        $current_items_stmt->execute();
        $current_items_result = $current_items_stmt->get_result();
        $current_item_ids = [];
        while ($row = $current_items_result->fetch_assoc()) {
            $current_item_ids[] = $row['sales_order_items_id'];
        }
        $current_items_stmt->close();
        
        // Check if new items match current items exactly (same count and IDs)
        $new_item_ids = array_column($items, 'sales_order_items_id');
        $new_item_ids = array_filter($new_item_ids); // Remove nulls/empties
        
        if (count($current_item_ids) !== count($items) || !empty(array_diff($current_item_ids, $new_item_ids))) {
            $conn->rollback();
            print_failure("Cannot modify sales order structure (add/remove items) because there are $return_count existing return items that reference them. You can only update quantities and prices of existing items, or cancel the returns first.");
        }
        
        // Update existing items in place
        $item_update_stmt = $conn->prepare(
            "UPDATE sales_order_items SET 
            sales_order_items_quantity = ?, 
            sales_order_items_unit_price = ?, 
            sales_order_items_subtotal = ?, 
            sales_order_items_discount_amount = ?, 
            sales_order_items_tax_amount = ?, 
            sales_order_items_tax_rate = ?, 
            sales_order_items_has_tax = ?, 
            sales_order_items_total_price = ?, 
            sales_order_items_notes = ?
            WHERE sales_order_items_id = ? AND sales_order_items_sales_order_id = ?"
        );

        foreach ($items as $item) {
            $item_id = $item['sales_order_items_id'] ?? null;
            if (!$item_id || !in_array($item_id, $current_item_ids)) {
                $conn->rollback();
                print_failure("Invalid item ID or item does not belong to this sales order.");
            }
            
            $quantity = $item['sales_order_items_quantity'] ?? 0;
            $unit_price = $item['sales_order_items_unit_price'] ?? 0;
            $subtotal_item = $item['sales_order_items_subtotal'] ?? 0;
            $discount_amount_item = $item['sales_order_items_discount_amount'] ?? 0;
            $tax_amount_item = $item['sales_order_items_tax_amount'] ?? 0;
            $tax_rate_item = $item['sales_order_items_tax_rate'] ?? null;
            $has_tax_item = isset($item['sales_order_items_has_tax']) ? ($item['sales_order_items_has_tax'] ? 1 : 0) : 0;
            $total_price_item = $item['sales_order_items_total_price'] ?? 0;
            $item_notes = $item['sales_order_items_notes'] ?? null;

            $item_update_stmt->bind_param(
                "ddddddiisi",
                $quantity,
                $unit_price,
                $subtotal_item,
                $discount_amount_item,
                $tax_amount_item,
                $tax_rate_item,
                $has_tax_item,
                $total_price_item,
                $item_notes,
                $item_id,
                $sales_order_id
            );
            $item_update_stmt->execute();
            $items_affected += $item_update_stmt->affected_rows;
        }
        $item_update_stmt->close();
        
    } else {

    // 2. Delete existing items (safe now that we've checked for returns)
    $delete_stmt = $conn->prepare("DELETE FROM sales_order_items WHERE sales_order_items_sales_order_id = ?");
    $delete_stmt->bind_param("i", $sales_order_id);
    $delete_stmt->execute();
    $delete_stmt->close();

    // 3. Insert new/updated items
    if (!empty($items)) {
        $item_insert_stmt = $conn->prepare(
            "INSERT INTO sales_order_items 
            (sales_order_items_sales_order_id, sales_order_items_variant_id, sales_order_items_packaging_type_id, sales_order_items_quantity, sales_order_items_unit_price, sales_order_items_subtotal, sales_order_items_discount_amount, sales_order_items_tax_amount, sales_order_items_tax_rate, sales_order_items_has_tax, sales_order_items_total_price, sales_order_items_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );

        foreach ($items as $item) {
            $variant_id = $item['sales_order_items_variant_id'] ?? null;
            $packaging_type_id = $item['sales_order_items_packaging_type_id'] ?? null;
            $quantity = $item['sales_order_items_quantity'] ?? 0;
            $unit_price = $item['sales_order_items_unit_price'] ?? 0;
            $subtotal_item = $item['sales_order_items_subtotal'] ?? 0;
            $discount_amount_item = $item['sales_order_items_discount_amount'] ?? 0;
            $tax_amount_item = $item['sales_order_items_tax_amount'] ?? 0;
            $tax_rate_item = $item['sales_order_items_tax_rate'] ?? null;
            $has_tax_item = isset($item['sales_order_items_has_tax']) ? ($item['sales_order_items_has_tax'] ? 1 : 0) : 0;
            $total_price_item = $item['sales_order_items_total_price'] ?? 0;
            $item_notes = $item['sales_order_items_notes'] ?? null;

            if (empty($variant_id) || !is_numeric($variant_id)) {
                $conn->rollback(); // Rollback transaction on item validation failure
                print_failure("Error: Valid Variant ID is required for each item.");
            }

            $item_insert_stmt->bind_param(
                "iiiddddddids",
                $sales_order_id,
                $variant_id,
                $packaging_type_id,
                $quantity,
                $unit_price,
                $subtotal_item,
                $discount_amount_item,
                $tax_amount_item,
                $tax_rate_item,
                $has_tax_item,
                $total_price_item,
                $item_notes
            );
            $item_insert_stmt->execute();
            $items_affected += $item_insert_stmt->affected_rows;
        }
        $item_insert_stmt->close();
    }
    } // End of else block (when no returns exist)

    // --- UPDATE CLIENT BALANCE BASED ON STATUS CHANGE ---
    if ($new_status !== null && $new_status !== $old_status) {
        // Handle balance changes when order becomes invoiced or stops being invoiced
        if ($old_status !== 'Invoiced' && $new_status === 'Invoiced') {
            // Order became invoiced - subtract total from client balance
            $balance_update_success = update_client_balance($conn, $client_id, -$total_amount, "Sales Order #$sales_order_id Invoiced (status change)");
            if (!$balance_update_success) {
                error_log("Warning: Failed to update client balance for order #$sales_order_id (invoiced)");
            }
        } elseif ($old_status === 'Invoiced' && $new_status !== 'Invoiced') {
            // Order was invoiced but now isn't - add total back to client balance
            $balance_update_success = update_client_balance($conn, $client_id, $total_amount, "Sales Order #$sales_order_id Un-invoiced (status change from $old_status to $new_status)");
            if (!$balance_update_success) {
                error_log("Warning: Failed to update client balance for order #$sales_order_id (un-invoiced)");
            }
        }
        // If both old and new status are Invoiced, check if total amount changed
        elseif ($old_status === 'Invoiced' && $new_status === 'Invoiced') {
            // Get the old total amount to calculate the difference
            $old_total_amount = $current_order_data['sales_orders_total_amount'];
            $total_difference = $total_amount - $old_total_amount;
            
            if (abs($total_difference) > 0.01) { // Only update if difference is significant (avoid floating point precision issues)
                // Subtract the difference (if total increased, subtract more; if decreased, add back)
                $balance_update_success = update_client_balance($conn, $client_id, -$total_difference, "Sales Order #$sales_order_id total changed from $old_total_amount to $total_amount");
                if (!$balance_update_success) {
                    error_log("Warning: Failed to update client balance for order #$sales_order_id (total change)");
                }
            }
        }
    }

    // Commit transaction if all operations were successful
    $conn->commit();

    // Check if any changes were made to the main order or its items
    if ($rows_affected_main_order > 0 || $items_affected > 0) {
        // --- FETCH THE UPDATED SALES ORDER FOR RESPONSE ---
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
        $updated_sales_order_data = $result->fetch_assoc();
        $fetch_stmt->close();

        // Fetch sales order items for the updated order
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
        $updated_sales_order_data['items'] = [];
        while ($item_row = $items_result->fetch_assoc()) {
            $updated_sales_order_data['items'][] = $item_row;
        }
        $items_fetch_stmt->close();

        // After successful update, handle notifications for status changes
        if ($new_status !== null && $new_status !== $old_status) {
            try {
                // Representative to notify: use updated order's representative id
                $rep_user_id = $updated_sales_order_data['sales_orders_representative_id'] ?? null;
                if ($rep_user_id) {
                    $title = '';
                    $body = '';
                    $priority = 'normal';
                    
                    // Customize notification based on status change
                    switch ($new_status) {
                        case 'Approved':
                            $title = 'Order #' . $sales_order_id . ' Approved by Admin';
                            $body = 'Your sales order #' . $sales_order_id . ' has been approved by the admin. You can now proceed with delivery preparation.';
                            $priority = 'high';
                            break;
                            
                        case 'Rejected':
                        case 'Cancelled':
                            $title = 'Order #' . $sales_order_id . ' ' . $new_status . ' by Admin';
                            $body = 'Your sales order #' . $sales_order_id . ' has been ' . strtolower($new_status) . ' by the admin.';
                            if (!empty($notes)) {
                                $body .= ' Reason: ' . $notes;
                            }
                            $priority = 'high';
                            break;
                            
                        case 'Invoiced':
                            $title = 'Order #' . $sales_order_id . ' Invoiced';
                            $body = 'Your sales order #' . $sales_order_id . ' has been invoiced. The invoice is ready for delivery.';
                            $priority = 'normal';
                            break;
                            
                        case 'Draft':
                            $title = 'Order #' . $sales_order_id . ' Moved to Draft';
                            $body = 'Sales order #' . $sales_order_id . ' has been moved back to draft status.';
                            $priority = 'normal';
                            break;
                            
                        default:
                            // For any other status changes
                            $title = 'Order #' . $sales_order_id . ' Status Updated';
                            $body = 'Your sales order #' . $sales_order_id . ' status has been updated from "' . $old_status . '" to "' . $new_status . '".';
                            $priority = 'normal';
                            break;
                    }
                    
                    $data = [
                        'sales_orders_id' => $sales_order_id,
                        'old_status' => $old_status,
                        'new_status' => $new_status,
                        'client_id' => $client_id,
                        'total_amount' => $total_amount,
                        'action' => $new_status === 'Approved' ? 'proceed_delivery' : 'view_order'
                    ];
                    
                    create_notification($conn, (int)$rep_user_id, $title, $body, $data, 'in_app', $priority, 'sales_orders', $sales_order_id);
                }
            } catch (Throwable $nex) {
                error_log('Status change notification failed: ' . $nex->getMessage());
            }

            if ($new_status === 'Pending' && $old_status !== 'Pending') {
                try {
                    $clientName = $updated_sales_order_data['clients_company_name'] ?? ('Client #' . $client_id);
                    $repName = $updated_sales_order_data['representative_name'] ?? null;
                    $orderTotal = isset($updated_sales_order_data['sales_orders_total_amount']) ? (float)$updated_sales_order_data['sales_orders_total_amount'] : (float)$total_amount;
                    $amountFormatted = number_format($orderTotal, 2, '.', '');
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
                        'total_amount' => $orderTotal,
                        'requested_by_user_id' => $updated_sales_order_data['sales_orders_representative_id'] ?? null,
                        'status' => 'Pending',
                        'updated_at' => date('Y-m-d H:i:s'),
                    ];
                    create_notification_for_role($conn, 'admin', $title, $body, $data, 'in_app', 'high', 'sales_orders', $sales_order_id);
                } catch (Throwable $adminNotifyEx) {
                    error_log('Pending sales order admin notification failed: ' . $adminNotifyEx->getMessage());
                }
            }

            // --- SYNC TO ODOO ---
            // Sync to Odoo only when status is Invoiced
            if ($new_status === 'Invoiced') {
                try {
                    $odoo_result = syncSalesOrderToOdoo($updated_sales_order_data, $sales_order_id, $updated_sales_order_data['items'] ?? []);
                    if ($odoo_result && is_array($odoo_result)) {
                        if (!empty($odoo_result['order_id'])) {
                            $updated_sales_order_data['odoo_order_id'] = $odoo_result['order_id'];
                            $updated_sales_order_data['sales_orders_odoo_order_id'] = $odoo_result['order_id'];
                            error_log("Sales order #$sales_order_id synced to Odoo: Order ID {$odoo_result['order_id']}");
                        }
                        if (!empty($odoo_result['invoice_id'])) {
                            $updated_sales_order_data['odoo_invoice_id'] = $odoo_result['invoice_id'];
                            $updated_sales_order_data['sales_orders_odoo_invoice_id'] = $odoo_result['invoice_id'];
                            error_log("Sales order #$sales_order_id Odoo invoice: {$odoo_result['invoice_id']}");
                        }
                    }
                } catch (Throwable $odooEx) {
                    error_log('Odoo sales order sync failed: ' . $odooEx->getMessage());
                }
            }
        }

        print_success("Sales order updated successfully.", $updated_sales_order_data);
    } else {
        print_failure("No changes made to sales order or its items, or sales order not found.");
    }

} catch (Exception | TypeError $e) {
    $conn->rollback(); // Rollback on any exception
    print_failure("Internal Error: " . $e->getMessage() . " on line " . $e->getLine());
}
?>
