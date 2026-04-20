<?php
// File: /sales_returns/add.php
// Description: Creates a new sales return and its associated items.

require_once '../db_connect.php'; // Contains connection, print_success, print_failure, and authorization functions
require_once '../notifications/notify_helpers.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // --- Authorization ---
    $auth_user_id = get_user_id_from_uuid_local();
     // Assuming rep authorization is sufficient

    // --- INPUT GATHERING from $_POST ---
    $client_id = $_POST['returns_client_id'] ?? null;
    $sales_order_id = $_POST['returns_sales_order_id'] ?? null;
    $return_date = date('Y-m-d H:i:s');
    $reason = $_POST['returns_reason'] ?? null;
    $total_amount = $_POST['returns_total_amount'] ?? 0;
    $status = $_POST['returns_status'] ?? 'Processed'; // Default status
    $notes = $_POST['returns_notes'] ?? null;
    $manual_discount = $_POST['manual_discount'] ?? null; // NEW: Manual discount override
    $created_by_user_id = $_POST['returns_created_by_user_id'] ?? $auth_user_id; // Default to logged-in user
    $visit_id = $_POST['sales_returns_visit_id'] ?? null; // For visit tracking
    $items_json = $_POST['items'] ?? '[]';
    $items = json_decode($items_json, true);

    // Handle empty strings for nullable fields
    if ($sales_order_id === "" || $sales_order_id === "0") $sales_order_id = null;
    if ($reason === "") $reason = null;
    if ($notes === "") $notes = null;
    if ($visit_id === "" || $visit_id === "0") $visit_id = null;

    // --- VALIDATION ---
    if (empty($client_id) || !is_numeric($client_id)) print_failure("Error: Valid Client ID is required.");
    if (empty($return_date)) print_failure("Error: Return Date is required.");
    if (!is_array($items) || count($items) == 0) print_failure("Error: At least one return item is required.");

    // Start a transaction
    $conn->begin_transaction();

    // --- Quantity Validation for Return Items ---
    // Aggregate requested return quantities per sales_order_item_id to handle duplicate lines in the same request
    $requested_returns = [];
    foreach ($items as $item) {
        $so_item_id = $item['return_items_sales_order_item_id'] ?? null;
        $return_quantity = $item['return_items_quantity'] ?? 0;

        if (empty($so_item_id) || !is_numeric($so_item_id)) {
            $conn->rollback();
            print_failure("Error: Valid Sales Order Item ID is required for each return item.");
        }
        if (!is_numeric($return_quantity) || $return_quantity <= 0) {
            $conn->rollback();
            print_failure("Error: Valid quantity (greater than 0) is required for each return item.");
        }

        $so_item_id = (int)$so_item_id;
        $qty = (float)$return_quantity;
        if (!isset($requested_returns[$so_item_id])) $requested_returns[$so_item_id] = 0;
        $requested_returns[$so_item_id] += $qty;
    }

    // Validate each unique sales_order_item_id against original qty and already returned qty
    foreach ($requested_returns as $so_item_id => $requested_qty) {
        // 1. Get original quantity from sales_order_items
        $original_qty_stmt = $conn->prepare("SELECT sales_order_items_quantity FROM sales_order_items WHERE sales_order_items_id = ?");
        $original_qty_stmt->bind_param("i", $so_item_id);
        $original_qty_stmt->execute();
        $original_qty_result = $original_qty_stmt->get_result()->fetch_assoc();
        $original_qty_stmt->close();

        if (!$original_qty_result) {
            $conn->rollback();
            print_failure("Error: Sales Order Item with ID $so_item_id not found.");
        }
        $original_quantity = (float)$original_qty_result['sales_order_items_quantity'];

        // 2. Sum up already returned quantity for this sales_order_item_id
        $returned_qty_stmt = $conn->prepare("SELECT SUM(return_items_quantity) as total_returned FROM sales_return_items WHERE return_items_sales_order_item_id = ?");
        $returned_qty_stmt->bind_param("i", $so_item_id);
        $returned_qty_stmt->execute();
        $returned_qty_result = $returned_qty_stmt->get_result()->fetch_assoc();
        $returned_qty_stmt->close();

        $total_returned_quantity = (float)($returned_qty_result['total_returned'] ?? 0);

        // 3. Check if new requested total exceeds remaining original quantity
        $remaining_quantity = $original_quantity - $total_returned_quantity;

        if ($requested_qty > $remaining_quantity) {
            $conn->rollback();
            print_failure("Error: Cannot return total of $requested_qty for item ID $so_item_id. Only $remaining_quantity remaining from original order.");
        }
    }


    // --- INSERT SALES RETURN ---
    $columns = [
        'returns_client_id',
        'returns_date',
        'returns_reason',
        'returns_total_amount',
        'returns_status',
        'returns_notes',
        'returns_created_by_user_id'
    ];
    $placeholders = array_fill(0, count($columns), '?');
    // Corrected bind_types: i (client_id), s (date), s (reason), d (total_amount), s (status), s (notes), i (created_by_user_id)
    $bind_types = "issdssi"; 
    $bind_values = [
        $client_id,
        $return_date,
        $reason,
        $total_amount,
        $status,
        $notes,
        $created_by_user_id
    ];

    // Conditionally add returns_sales_order_id
    if ($sales_order_id !== null) {
        array_splice($columns, 1, 0, 'returns_sales_order_id'); // Insert after client_id
        array_splice($placeholders, 1, 0, '?');
        $bind_types = substr_replace($bind_types, 'i', 1, 0); // Insert 'i' for integer type
        array_splice($bind_values, 1, 0, $sales_order_id);
    }

    // Conditionally add manual_discount
    // Only add manual_discount if the column exists in the sales_returns table to avoid SQL errors
    $has_manual_discount_column = false;
    try {
        $schema_stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_returns' AND column_name = 'manual_discount'");
        $schema_stmt->execute();
        $schema_result = $schema_stmt->get_result()->fetch_assoc();
        $schema_stmt->close();
        if (!empty($schema_result) && isset($schema_result['cnt']) && intval($schema_result['cnt']) > 0) {
            $has_manual_discount_column = true;
        }
    } catch (Exception $e) {
        // If the check fails for any reason, default to not adding the column
        $has_manual_discount_column = false;
    }

    if ($manual_discount !== null && $has_manual_discount_column) {
        $columns[] = 'manual_discount';
        $placeholders[] = '?';
        $bind_types .= 'd'; // Add double type for manual_discount
        $bind_values[] = $manual_discount;
    }

    // Conditionally add sales_returns_visit_id for visit tracking
    if ($visit_id !== null) {
        $columns[] = 'sales_returns_visit_id';
        $placeholders[] = '?';
        $bind_types .= 'i'; // Add integer type for visit_id
        $bind_values[] = $visit_id;
    }

    $sql_columns = implode(', ', $columns);
    $sql_placeholders = implode(', ', $placeholders);

    $stmt = $conn->prepare(
        "INSERT INTO sales_returns 
        ($sql_columns)
        VALUES ($sql_placeholders)"
    );
    $stmt->bind_param($bind_types, ...$bind_values);
    $stmt->execute();
    $returns_id = $stmt->insert_id;
    $stmt->close();

    // --- INSERT SALES RETURN ITEMS ---
    $item_stmt = $conn->prepare(
        "INSERT INTO sales_return_items 
        (return_items_return_id, return_items_sales_order_item_id, return_items_quantity, return_items_unit_price, return_items_total_price, return_items_notes, return_items_tax_amount, return_items_tax_rate, return_items_has_tax)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    foreach ($items as $item) {
        $so_item_id = $item['return_items_sales_order_item_id'] ?? null;
        $quantity = $item['return_items_quantity'] ?? 0;
        $unit_price = $item['return_items_unit_price'] ?? 0;
        $total_price = $item['return_items_total_price'] ?? 0;
        $item_notes = $item['return_items_notes'] ?? null;

        // Get tax information from the original sales order item
        $tax_query = "SELECT sales_order_items_tax_amount, sales_order_items_tax_rate, sales_order_items_has_tax, sales_order_items_quantity 
                      FROM sales_order_items 
                      WHERE sales_order_items_id = ?";
        $tax_stmt = $conn->prepare($tax_query);
        $tax_stmt->bind_param("i", $so_item_id);
        $tax_stmt->execute();
        $tax_result = $tax_stmt->get_result();
        
        if ($tax_row = $tax_result->fetch_assoc()) {
            $original_tax_amount = $tax_row['sales_order_items_tax_amount'] ?? 0;
            $original_tax_rate = $tax_row['sales_order_items_tax_rate'];
            $original_has_tax = $tax_row['sales_order_items_has_tax'] ?? 0;
            $original_quantity = $tax_row['sales_order_items_quantity'] ?? 1;
            
            // Calculate proportional tax for return quantity
            if ($original_has_tax && $original_quantity > 0) {
                $tax_per_unit = $original_tax_amount / $original_quantity;
                $return_tax_amount = $tax_per_unit * $quantity;
            } else {
                $return_tax_amount = 0;
                $original_tax_rate = null;
                $original_has_tax = 0;
            }
        } else {
            // Fallback if sales order item not found
            $return_tax_amount = 0;
            $original_tax_rate = null;
            $original_has_tax = 0;
        }
        $tax_stmt->close();

        // No need for re-validation here, already done above
        
        $item_stmt->bind_param(
            "iidddsddi",
            $returns_id,
            $so_item_id,
            $quantity,
            $unit_price,
            $total_price,
            $item_notes,
            $return_tax_amount,
            $original_tax_rate,
            $original_has_tax
        );
        $item_stmt->execute();
    }
    $item_stmt->close();

    // --- RESTOCK INVENTORY FOR RETURNED ITEMS ---
    // If this return is linked to a sales order, attempt to put items back into the original warehouse.
    if ($sales_order_id !== null) {
        // Get warehouse id from the linked sales order
        $wh_stmt = $conn->prepare("SELECT sales_orders_warehouse_id FROM sales_orders WHERE sales_orders_id = ?");
        if ($wh_stmt) {
            $wh_stmt->bind_param("i", $sales_order_id);
            $wh_stmt->execute();
            $wh_row = $wh_stmt->get_result()->fetch_assoc();
            $wh_stmt->close();
            $warehouse_to = $wh_row['sales_orders_warehouse_id'] ?? null;
        } else {
            $warehouse_to = null;
        }

        if ($warehouse_to !== null) {
            // Prepare statements for inventory lookup/update/insert
            $stmt_find_inv = $conn->prepare("SELECT inventory_id, inventory_quantity FROM inventory WHERE variant_id = ? AND warehouse_id = ? AND packaging_type_id <=> ? ORDER BY inventory_production_date DESC LIMIT 1 FOR UPDATE");
            $stmt_update_inv = $conn->prepare("UPDATE inventory SET inventory_quantity = inventory_quantity + ?, inventory_last_movement_at = NOW() WHERE inventory_id = ?");
            $stmt_insert_inv = $conn->prepare("INSERT INTO inventory (variant_id, warehouse_id, packaging_type_id, inventory_quantity, inventory_production_date, inventory_last_movement_at) VALUES (?, ?, ?, ?, NOW(), NOW())");

            // Prepare statement to compute previous returned qty for this sales_order_item (exclude current return)
            $stmt_prev_returns = $conn->prepare("SELECT COALESCE(SUM(return_items_quantity),0) as prev_returned FROM sales_return_items WHERE return_items_sales_order_item_id = ? AND return_items_return_id != ?");
            $stmt_get_delivered = $conn->prepare("SELECT COALESCE(sales_order_items_quantity_delivered,0) as qty_delivered FROM sales_order_items WHERE sales_order_items_id = ?");

            // Prepare statements to lock and update sales_order_items quantities
            $stmt_lock_soi = $conn->prepare("SELECT sales_order_items_quantity, sales_order_items_quantity_delivered, COALESCE(sales_order_items_quantity_returned,0) as sales_order_items_quantity_returned FROM sales_order_items WHERE sales_order_items_id = ? FOR UPDATE");
            // We'll update returned and delivered counters; do not alter original ordered quantity
            $stmt_update_soi_returned = $conn->prepare("UPDATE sales_order_items SET sales_order_items_quantity_returned = sales_order_items_quantity_returned + ? WHERE sales_order_items_id = ?");
            $stmt_update_soi_delivered = $conn->prepare("UPDATE sales_order_items SET sales_order_items_quantity_delivered = ? WHERE sales_order_items_id = ?");

            foreach ($items as $item) {
                $so_item_id = $item['return_items_sales_order_item_id'] ?? null;
                $returned_qty = isset($item['return_items_quantity']) ? (float)$item['return_items_quantity'] : 0;
                if (empty($so_item_id) || $returned_qty <= 0) continue;

                // Fetch variant & packaging info from the original sales order item
                $vstmt = $conn->prepare("SELECT sales_order_items_variant_id, sales_order_items_packaging_type_id FROM sales_order_items WHERE sales_order_items_id = ?");
                if (!$vstmt) continue;
                $vstmt->bind_param("i", $so_item_id);
                $vstmt->execute();
                $vrow = $vstmt->get_result()->fetch_assoc();
                $vstmt->close();
                if (!$vrow) continue;

                $variant_id = (int)$vrow['sales_order_items_variant_id'];
                $packaging_id = $vrow['sales_order_items_packaging_type_id'] !== null ? (int)$vrow['sales_order_items_packaging_type_id'] : null;

                // Determine how much of this returned qty was actually delivered and therefore must be restocked.
                // Use the locked sales_order_items row's current delivered quantity; previously we subtracted prior returns which
                // caused delivered units to be considered unavailable when earlier returns were undelivered. Using the current
                // delivered value ensures that delivered items are restocked correctly.

                // Lock the sales_order_items row to safely modify quantities
                if ($stmt_lock_soi) {
                    $stmt_lock_soi->bind_param("i", $so_item_id);
                    $stmt_lock_soi->execute();
                    $soi_row = $stmt_lock_soi->get_result()->fetch_assoc();
                } else {
                    $soi_row = null;
                }

                if ($soi_row) {
                    $current_total_ordered = (float)($soi_row['sales_order_items_quantity'] ?? 0);
                    $current_delivered = (float)($soi_row['sales_order_items_quantity_delivered'] ?? 0);
                    $current_returned = (float)($soi_row['sales_order_items_quantity_returned'] ?? 0);

                    // Restock amount: cannot exceed what is currently marked as delivered
                    $to_restock = min($returned_qty, $current_delivered);

                    // The undelivered portion simply becomes part of the returned counter
                    $undelivered_part = max(0.0, $returned_qty - $to_restock);

                    // New delivered after restock
                    $new_delivered = max(0.0, $current_delivered - $to_restock);

                    // Persist updates: increment returned counter (full returned_qty) if column exists and update delivered
                    $has_returned_col = false;
                    try {
                        $col_check_stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_order_items' AND COLUMN_NAME = 'sales_order_items_quantity_returned'");
                        $col_check_stmt->execute();
                        $col_check_res = $col_check_stmt->get_result()->fetch_assoc();
                        $col_check_stmt->close();
                        if (!empty($col_check_res) && intval($col_check_res['cnt']) > 0) $has_returned_col = true;
                    } catch (Exception $e) {
                        $has_returned_col = false;
                    }

                    if ($has_returned_col && $stmt_update_soi_returned) {
                        // increment returned by the full returned_qty
                        $stmt_update_soi_returned->bind_param("di", $returned_qty, $so_item_id);
                        $stmt_update_soi_returned->execute();
                    }

                    if ($to_restock > 0 && $stmt_update_soi_delivered) {
                        $stmt_update_soi_delivered->bind_param("di", $new_delivered, $so_item_id);
                        $stmt_update_soi_delivered->execute();
                    }
                }

                // If nothing to restock and nothing to adjust on order, continue
                if ($to_restock <= 0 && $undelivered_part <= 0) continue;

                // Try to find an existing inventory record to update (lock with FOR UPDATE)
                if ($stmt_find_inv) {
                    $stmt_find_inv->bind_param("iii", $variant_id, $warehouse_to, $packaging_id);
                    $stmt_find_inv->execute();
                    $inv_row = $stmt_find_inv->get_result()->fetch_assoc();
                } else {
                    $inv_row = null;
                }

                if ($inv_row) {
                    // Update existing inventory (increment quantity)
                    $inv_id = (int)$inv_row['inventory_id'];
                    if ($stmt_update_inv) {
                        $stmt_update_inv->bind_param("di", $to_restock, $inv_id);
                        $stmt_update_inv->execute();
                    }
                    // Optional logging
                    if (function_exists('log_inventory_movement_internal')) {
                        $resulting_qty = ((float)$inv_row['inventory_quantity']) + $to_restock;
                        log_inventory_movement_internal($variant_id, $packaging_id, $warehouse_to, 'return', $to_restock, $resulting_qty, $created_by_user_id, $returns_id, "Restocked from sales return $returns_id", $conn);
                    }
                } else {
                    // Insert new inventory row for this returned quantity
                    if ($stmt_insert_inv) {
                        $stmt_insert_inv->bind_param("iiid", $variant_id, $warehouse_to, $packaging_id, $to_restock);
                        $stmt_insert_inv->execute();
                        $new_inv_id = $stmt_insert_inv->insert_id;
                        if (function_exists('log_inventory_movement_internal')) {
                            log_inventory_movement_internal($variant_id, $packaging_id, $warehouse_to, 'return', $to_restock, $to_restock, $created_by_user_id, $returns_id, "Created new inventory batch from sales return $returns_id", $conn);
                        }
                    }
                }
            }

            if ($stmt_prev_returns) $stmt_prev_returns->close();
            if ($stmt_get_delivered) $stmt_get_delivered->close();
            if ($stmt_lock_soi) $stmt_lock_soi->close();
            if ($stmt_update_soi_total) $stmt_update_soi_total->close();
            if ($stmt_update_soi_delivered) $stmt_update_soi_delivered->close();

            if ($stmt_find_inv) $stmt_find_inv->close();
            if ($stmt_update_inv) $stmt_update_inv->close();
            if ($stmt_insert_inv) $stmt_insert_inv->close();
        }
    }

    if ($sales_order_id !== null) {
        $remaining_stmt = $conn->prepare("
            SELECT SUM(
                GREATEST(
                    0,
                    soi.sales_order_items_quantity
                    - COALESCE(soi.sales_order_items_quantity_delivered, 0)
                    - COALESCE(sri.total_returned, 0)
                )
            ) AS remaining_qty
            FROM sales_order_items soi
            LEFT JOIN (
                SELECT return_items_sales_order_item_id, SUM(return_items_quantity) AS total_returned
                FROM sales_return_items
                GROUP BY return_items_sales_order_item_id
            ) sri ON sri.return_items_sales_order_item_id = soi.sales_order_items_id
            WHERE soi.sales_order_items_sales_order_id = ?
        ");
        if ($remaining_stmt) {
            $remaining_stmt->bind_param("i", $sales_order_id);
            $remaining_stmt->execute();
            $remaining_result = $remaining_stmt->get_result()->fetch_assoc();
            $remaining_qty = (float)($remaining_result['remaining_qty'] ?? 0);
            $remaining_stmt->close();

            if ($remaining_qty <= 0) {
                $new_delivery_status = 'Delivered';
                $update_delivery_stmt = $conn->prepare("UPDATE sales_orders SET sales_orders_delivery_status = ? WHERE sales_orders_id = ?");
                if ($update_delivery_stmt) {
                    $update_delivery_stmt->bind_param("si", $new_delivery_status, $sales_order_id);
                    $update_delivery_stmt->execute();
                    $update_delivery_stmt->close();
                }
            }
        }
    }

    // --- UPDATE CLIENT CREDIT BALANCE (increase by return total) ---
    if ($status === 'Processed') {
        // Use the provided total_amount (should be numeric) to update client's credit balance.
        $return_amount = is_numeric($total_amount) ? (float)$total_amount : 0.0;

        // First verify the client exists to avoid false negatives when return amount is zero
        $client_check_stmt = $conn->prepare("SELECT clients_id FROM clients WHERE clients_id = ?");
        if (!$client_check_stmt) {
            $conn->rollback();
            print_failure("Internal Error: Failed to prepare client existence check.");
        }
        $client_check_stmt->bind_param("i", $client_id);
        $client_check_stmt->execute();
        $client_check_result = $client_check_stmt->get_result();
        $client_exists = $client_check_result && $client_check_result->fetch_assoc();
        $client_check_stmt->close();

        if (!$client_exists) {
            $conn->rollback();
            print_failure("Error: Client with ID $client_id not found.");
        }

        // Prepare and execute update (we already confirmed client exists)
        $balance_update_stmt = $conn->prepare("UPDATE clients SET clients_credit_balance = clients_credit_balance + ? WHERE clients_id = ?");
        if (!$balance_update_stmt) {
            $conn->rollback();
            print_failure("Internal Error: Failed to prepare client balance update statement.");
        }
        $balance_update_stmt->bind_param("di", $return_amount, $client_id);
        $balance_update_stmt->execute();
        $balance_update_stmt->close();
    }

    // Commit transaction
    $conn->commit();

    // Notify admins when a pending sales return is created
    if ($status === 'Pending') {
        try {
            $title = 'New Sales Return Pending Approval';
            $body = 'Sales return #' . $returns_id . ' requires review.';
            $data = [
                'sales_returns_id' => (int)$returns_id,
                'client_id' => (int)$client_id,
                'total_amount' => (float)$total_amount,
                'status' => $status,
                'created_by_user_id' => $created_by_user_id !== null ? (int)$created_by_user_id : null,
                'returns_date' => $return_date
            ];
            create_notification_for_role($conn, 'admin', $title, $body, $data, 'in_app', 'normal', 'sales_returns', (int)$returns_id);
        } catch (Throwable $notify_error) {
            error_log('Pending sales return notification failed: ' . $notify_error->getMessage());
        }
    }

    // --- FETCH THE NEWLY CREATED SALES RETURN FOR RESPONSE ---
    $fetch_stmt = $conn->prepare("
        SELECT
            sr.*,
            c.clients_company_name,
            so.sales_orders_id AS sales_order_link_id,
            u.users_name AS created_by_user_name
        FROM sales_returns sr
        LEFT JOIN clients c ON sr.returns_client_id = c.clients_id
        LEFT JOIN sales_orders so ON sr.returns_sales_order_id = so.sales_orders_id
        LEFT JOIN users u ON sr.returns_created_by_user_id = u.users_id
        WHERE sr.returns_id = ?
    ");
    $fetch_stmt->bind_param("i", $returns_id);
    $fetch_stmt->execute();
    $result = $fetch_stmt->get_result();
    $new_sales_return_data = $result->fetch_assoc();
    $fetch_stmt->close();

    // Fetch sales return items for the newly created return
    $items_fetch_stmt = $conn->prepare(
        "SELECT
            sri.*,
            soi.sales_order_items_variant_id,
            soi.sales_order_items_quantity_delivered AS delivered_quantity,
            COALESCE(soi.sales_order_items_quantity_returned, (
                SELECT COALESCE(SUM(r2.return_items_quantity),0) FROM sales_return_items r2 WHERE r2.return_items_sales_order_item_id = soi.sales_order_items_id
            )) AS returned_quantity,
            pv.variant_name,
            pt.packaging_types_name
        FROM sales_return_items sri
        LEFT JOIN sales_order_items soi ON sri.return_items_sales_order_item_id = soi.sales_order_items_id
        LEFT JOIN product_variants pv ON soi.sales_order_items_variant_id = pv.variant_id
        LEFT JOIN packaging_types pt ON soi.sales_order_items_packaging_type_id = pt.packaging_types_id
        WHERE sri.return_items_return_id = ?"
    );
    $items_fetch_stmt->bind_param("i", $returns_id);
    $items_fetch_stmt->execute();
    $items_result = $items_fetch_stmt->get_result();
    $new_sales_return_data['items'] = [];
    while ($item_row = $items_result->fetch_assoc()) {
        $new_sales_return_data['items'][] = $item_row;
    }
    $items_fetch_stmt->close();

    print_success("Sales return created successfully.", $new_sales_return_data);

} catch (Exception | TypeError $e) {
    $conn->rollback(); // Rollback on any exception
    print_failure("Internal Error: " . $e->getMessage() . " on line " . $e->getLine()); // Added line number
}
?>
