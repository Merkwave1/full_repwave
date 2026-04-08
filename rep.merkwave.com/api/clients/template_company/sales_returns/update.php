<?php
// File: /sales_returns/update.php
// Description: Updates an existing sales return and its associated items.

require_once '../db_connect.php'; // Contains connection, print_success, print_failure, and authorization functions
require_once '../notifications/notify_helpers.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // --- Authorization ---
    $auth_user_id = get_user_id_from_uuid_local();
     // Assuming rep authorization is sufficient

    // --- INPUT GATHERING from $_POST ---
    $returns_id = $_POST['returns_id'] ?? null;
    $client_id = $_POST['returns_client_id'] ?? null; // Can be updated? Usually not for returns.
    $sales_order_id = $_POST['returns_sales_order_id'] ?? null; // Can be updated?
    $return_date = $_POST['returns_date'] ?? null;
    $reason = $_POST['returns_reason'] ?? null;
    $total_amount = $_POST['returns_total_amount'] ?? null;
    $status = $_POST['returns_status'] ?? null;
    $notes = $_POST['returns_notes'] ?? null;
    $manual_discount = $_POST['manual_discount'] ?? null; // NEW: Manual discount override
    $created_by_user_id = $_POST['returns_created_by_user_id'] ?? null; // Can be updated?
    $items_json = $_POST['items'] ?? '[]';
    $items = json_decode($items_json, true);

    // Handle empty strings for nullable fields
    if ($reason === "") $reason = null;
    if ($notes === "") $notes = null;
    if ($sales_order_id === "" || $sales_order_id === "0") $sales_order_id = null;

    // --- VALIDATION ---
    if (empty($returns_id) || !is_numeric($returns_id)) {
        print_failure("Error: Valid Sales Return ID is required for update.");
    }
    // Define allowed statuses for validation (should match your ENUM in DB)
    $allowed_statuses = ['Draft', 'Cancelled', 'Pending', 'Approved', 'Rejected', 'Processed'];
    if ($status !== null && !in_array($status, $allowed_statuses)) {
        print_failure("Error: Invalid status provided. Allowed statuses are: " . implode(', ', $allowed_statuses));
    }

    // Start a transaction
    $conn->begin_transaction();

    // Lock the existing sales return to capture previous state for balance adjustments
    $existing_stmt = $conn->prepare("SELECT returns_status, returns_client_id, returns_total_amount, returns_created_by_user_id FROM sales_returns WHERE returns_id = ? FOR UPDATE");
    $existing_stmt->bind_param("i", $returns_id);
    $existing_stmt->execute();
    $existing_result = $existing_stmt->get_result();
    $existing_row = $existing_result->fetch_assoc();
    $existing_stmt->close();

    if (!$existing_row) {
        $conn->rollback();
        print_failure("Error: Sales return not found.");
    }

    $previous_status = $existing_row['returns_status'] ?? null;
    $previous_client_id = $existing_row['returns_client_id'] ?? null;
    $previous_total_amount = isset($existing_row['returns_total_amount']) ? (float)$existing_row['returns_total_amount'] : 0.0;
    $previous_created_by_user_id = isset($existing_row['returns_created_by_user_id']) ? (int)$existing_row['returns_created_by_user_id'] : null;

    // --- BUILD UPDATE QUERY FOR SALES RETURN DYNAMICALLY ---
    $update_fields = [];
    $bind_types = "";
    $bind_values = [];

    if ($client_id !== null) {
        $update_fields[] = 'returns_client_id = ?';
        $bind_types .= 'i';
        $bind_values[] = $client_id;
    }
    if (isset($_POST['returns_sales_order_id'])) { // Check if key exists in POST
        $update_fields[] = 'returns_sales_order_id = ?';
        $bind_types .= 'i';
        $bind_values[] = $sales_order_id;
    }
    if ($return_date !== null) {
        $update_fields[] = 'returns_date = ?';
        $bind_types .= 's';
        $bind_values[] = $return_date;
    }
    if ($reason !== null) {
        $update_fields[] = 'returns_reason = ?';
        $bind_types .= 's';
        $bind_values[] = $reason;
    }
    if ($total_amount !== null) {
        $update_fields[] = 'returns_total_amount = ?';
        $bind_types .= 'd';
        $bind_values[] = $total_amount;
    }
    if ($status !== null) {
        $update_fields[] = 'returns_status = ?';
        $bind_types .= 's';
        $bind_values[] = $status;
    }
    if ($notes !== null) {
        $update_fields[] = 'returns_notes = ?';
        $bind_types .= 's';
        $bind_values[] = $notes;
    }
    if ($manual_discount !== null) {
        $update_fields[] = 'manual_discount = ?';
        $bind_types .= 'd';
        $bind_values[] = $manual_discount;
    }
    if ($created_by_user_id !== null) {
        $update_fields[] = 'returns_created_by_user_id = ?';
        $bind_types .= 'i';
        $bind_values[] = $created_by_user_id;
    }

    $rows_affected_main_return = 0;
    if (!empty($update_fields)) {
        $update_query = "UPDATE sales_returns SET " . implode(', ', $update_fields) . ", returns_updated_at = CURRENT_TIMESTAMP WHERE returns_id = ?";
        $bind_types .= 'i'; // Add type for returns_id
        $bind_values[] = $returns_id; // Add returns_id to bind values

        $stmt = $conn->prepare($update_query);
        $stmt->bind_param($bind_types, ...$bind_values);
        $stmt->execute();
        $rows_affected_main_return = $stmt->affected_rows;
        $stmt->close();
    }

    // --- UPDATE SALES RETURN ITEMS ---
    $items_affected = 0;

    // 1. Delete existing items for this sales return
    $delete_stmt = $conn->prepare("DELETE FROM sales_return_items WHERE return_items_return_id = ?");
    $delete_stmt->bind_param("i", $returns_id);
    $delete_stmt->execute();
    $delete_stmt->close();

    // 2. Insert new/updated items
    if (!empty($items)) {
        $item_insert_stmt = $conn->prepare(
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

            if (empty($so_item_id) || !is_numeric($so_item_id)) {
                $conn->rollback();
                print_failure("Error: Valid Sales Order Item ID is required for each return item.");
            }

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

            $item_insert_stmt->bind_param(
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
            $item_insert_stmt->execute();
            $items_affected += $item_insert_stmt->affected_rows;
        }
        $item_insert_stmt->close();
    }

    // --- HANDLE CLIENT BALANCE UPDATE BASED ON STATUS CHANGE ---
    $final_status = $status ?? $previous_status;
    $final_client_id = $client_id ?? $previous_client_id;
    $final_total_amount = $total_amount !== null ? (float)$total_amount : $previous_total_amount;
    $final_created_by_user_id = $created_by_user_id !== null ? (int)$created_by_user_id : $previous_created_by_user_id;

    if ($previous_status === 'Processed' && $previous_client_id !== null && $previous_total_amount != 0) {
        $balance_update_stmt = $conn->prepare("UPDATE clients SET clients_credit_balance = clients_credit_balance - ? WHERE clients_id = ?");
        $balance_update_stmt->bind_param("di", $previous_total_amount, $previous_client_id);
        $balance_update_stmt->execute();
        $balance_update_stmt->close();
    }

    if ($final_status === 'Processed' && $final_client_id !== null && $final_total_amount != 0) {
        $balance_update_stmt = $conn->prepare("UPDATE clients SET clients_credit_balance = clients_credit_balance + ? WHERE clients_id = ?");
        $balance_update_stmt->bind_param("di", $final_total_amount, $final_client_id);
        $balance_update_stmt->execute();
        $balance_update_stmt->close();
    }

    // Commit transaction
    $conn->commit();

    // Notify admins when a sales return moves into Pending status
    if ($final_status === 'Pending' && $previous_status !== 'Pending') {
        try {
            $title = 'Sales Return Pending Approval';
            $body = 'Sales return #' . $returns_id . ' requires review.';
            $data = [
                'sales_returns_id' => (int)$returns_id,
                'client_id' => $final_client_id !== null ? (int)$final_client_id : null,
                'total_amount' => (float)$final_total_amount,
                'status' => $final_status,
                'previous_status' => $previous_status,
                'updated_by_user_id' => $auth_user_id
            ];
            create_notification_for_role($conn, 'admin', $title, $body, $data, 'in_app', 'normal', 'sales_returns', (int)$returns_id);
        } catch (Throwable $notify_error) {
            error_log('Pending sales return update notification failed: ' . $notify_error->getMessage());
        }
    }

    if ($previous_status === 'Pending' && $final_status !== 'Pending' && $final_created_by_user_id !== null) {
        try {
            $statusLabels = [
                'Approved' => 'معتمد',
                'Processed' => 'تمت معالجته',
                'Cancelled' => 'ملغى',
                'Draft' => 'مسودة',
                'Rejected' => 'مرفوض',
                'Pending' => 'قيد الانتظار'
            ];
            $localizedStatus = $statusLabels[$final_status] ?? $final_status;
            $title = 'تحديث حالة مرتجع البيع';
            $body = 'تم تحديث حالة المرتجع رقم #' . $returns_id . ' إلى "' . $localizedStatus . '".';
            $data = [
                'sales_returns_id' => (int)$returns_id,
                'status' => $final_status,
                'status_label' => $localizedStatus,
                'previous_status' => $previous_status,
                'updated_by_user_id' => $auth_user_id
            ];
            create_notification($conn, $final_created_by_user_id, $title, $body, $data, 'in_app', 'normal', 'sales_returns', (int)$returns_id);
        } catch (Throwable $notify_error) {
            error_log('Creator notification for sales return update failed: ' . $notify_error->getMessage());
        }
    }

    // Check if any changes were made to the main return or its items
    if ($rows_affected_main_return > 0 || $items_affected > 0) {
        // --- FETCH THE UPDATED SALES RETURN FOR RESPONSE ---
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
        $updated_sales_return_data = $result->fetch_assoc();
        $fetch_stmt->close();

        // Fetch sales return items for the updated return
        $items_fetch_stmt = $conn->prepare("
            SELECT
                sri.*,
                soi.sales_order_items_variant_id,
                pv.variant_name,
                pt.packaging_types_name
            FROM sales_return_items sri
            LEFT JOIN sales_order_items soi ON sri.return_items_sales_order_item_id = soi.sales_order_items_id
            LEFT JOIN product_variants pv ON soi.sales_order_items_variant_id = pv.variant_id
            LEFT JOIN packaging_types pt ON soi.sales_order_items_packaging_type_id = pt.packaging_types_id
            WHERE sri.return_items_return_id = ?
        ");
        $items_fetch_stmt->bind_param("i", $returns_id);
        $items_fetch_stmt->execute();
        $items_result = $items_fetch_stmt->get_result();
        $updated_sales_return_data['items'] = [];
        while ($item_row = $items_result->fetch_assoc()) {
            $updated_sales_return_data['items'][] = $item_row;
        }
        $items_fetch_stmt->close();

        print_success("Sales return updated successfully.", $updated_sales_return_data);
    } else {
        print_failure("No changes made to sales return or its items, or sales return not found.");
    }

} catch (Exception | TypeError $e) {
    $conn->rollback(); // Rollback on any exception
    print_failure("Internal Error: " . $e->getMessage());
}
?>
