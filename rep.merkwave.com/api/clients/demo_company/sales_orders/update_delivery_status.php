<?php
require_once '../db_connect.php'; // Contains connection, print_success, print_failure, and authorization functions

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Authorization (adjust as needed)
    

    // --- INPUT GATHERING from $_POST ---
    $sales_order_id = $_POST['sales_orders_id'] ?? null;
    $delivery_status = $_POST['sales_orders_delivery_status'] ?? null;
    $notes = $_POST['notes'] ?? null; // Optional notes about the delivery status change

    // --- VALIDATION ---
    if (empty($sales_order_id) || !is_numeric($sales_order_id)) {
        print_failure("Error: Valid Sales Order ID is required.");
    }

    // Define allowed delivery statuses
    $allowed_delivery_statuses = ['لم يتم التسليم', 'تم التسليم', 'تسليم جزئى'];
    if (empty($delivery_status) || !in_array($delivery_status, $allowed_delivery_statuses)) {
        print_failure("Error: Invalid delivery status. Allowed statuses are: " . implode(', ', $allowed_delivery_statuses));
    }

    // Start a transaction
    $conn->begin_transaction();

    // --- FETCH CURRENT ORDER INFO ---
    $current_stmt = $conn->prepare("
        SELECT sales_orders_delivery_status, sales_orders_status, sales_orders_client_id 
        FROM sales_orders 
        WHERE sales_orders_id = ?
    ");
    $current_stmt->bind_param("i", $sales_order_id);
    $current_stmt->execute();
    $current_result = $current_stmt->get_result();
    $current_order = $current_result->fetch_assoc();
    $current_stmt->close();

    if (!$current_order) {
        $conn->rollback();
        print_failure("Sales order not found.");
    }

    $old_delivery_status = $current_order['sales_orders_delivery_status'];
    
    // --- UPDATE DELIVERY STATUS ---
    $update_stmt = $conn->prepare("
        UPDATE sales_orders 
        SET sales_orders_delivery_status = ?, 
            sales_orders_updated_at = CURRENT_TIMESTAMP
        WHERE sales_orders_id = ?
    ");
    $update_stmt->bind_param("si", $delivery_status, $sales_order_id);
    $update_stmt->execute();
    $rows_affected = $update_stmt->affected_rows;
    $update_stmt->close();

    if ($rows_affected === 0) {
        $conn->rollback();
        print_failure("No changes made to the delivery status.");
    }

    // --- UPDATE RELATED DELIVERY RECORDS (if they exist) ---
    try {
        // Check if there are delivery records for this sales order
        $delivery_check_stmt = $conn->prepare("
            SELECT delivery_id 
            FROM deliveries 
            WHERE delivery_sales_order_id = ?
        ");
        $delivery_check_stmt->bind_param("i", $sales_order_id);
        $delivery_check_stmt->execute();
        $delivery_result = $delivery_check_stmt->get_result();
        $delivery_records = $delivery_result->fetch_all(MYSQLI_ASSOC);
        $delivery_check_stmt->close();

        if (!empty($delivery_records)) {
            // Update delivery status based on sales order delivery status
            $delivery_status_mapping = [
                'لم يتم التسليم' => 'Scheduled',
                'تسليم جزئى' => 'In Transit',
                'تم التسليم' => 'Delivered'
            ];

            $new_delivery_status = $delivery_status_mapping[$delivery_status];

            foreach ($delivery_records as $delivery_record) {
                $delivery_id = $delivery_record['delivery_id'];

                // Update delivery status
                $update_delivery_stmt = $conn->prepare("
                    UPDATE deliveries 
                    SET delivery_status = ?, delivery_updated_at = CURRENT_TIMESTAMP
                    WHERE delivery_id = ?
                ");
                $update_delivery_stmt->bind_param("si", $new_delivery_status, $delivery_id);
                $update_delivery_stmt->execute();
                $update_delivery_stmt->close();

                // Add status history entry
                $history_stmt = $conn->prepare("
                    INSERT INTO delivery_status_history (
                        delivery_status_history_delivery_id,
                        delivery_status_history_status,
                        delivery_status_history_notes,
                        delivery_status_history_timestamp,
                        delivery_status_history_updated_by_user_id
                    ) VALUES (?, ?, ?, NOW(), ?)
                ");
                $history_notes = "Status updated from sales order: $old_delivery_status → $delivery_status" . ($notes ? " | $notes" : "");
                    
    $uuid = $_POST['uuid'] ?? null;
    $user_id = get_user_id_from_uuid_local($uuid) ?? null;
                $history_stmt->bind_param("issi", $delivery_id, $new_delivery_status, $history_notes, $user_id);
                $history_stmt->execute();
                $history_stmt->close();
            }
        }
    } catch (Exception $delivery_error) {
        // Log the error but don't fail the sales order update
        error_log("Warning: Could not update related delivery records for sales order $sales_order_id: " . $delivery_error->getMessage());
    }

    // --- GET UPDATED ORDER DATA ---
    $final_stmt = $conn->prepare("
        SELECT so.*, 
               c.clients_company_name, 
               u.users_name as representative_name, 
               w.warehouse_name
        FROM sales_orders so
        JOIN clients c ON so.sales_orders_client_id = c.clients_id
        JOIN users u ON so.sales_orders_representative_id = u.users_id
        JOIN warehouse w ON so.sales_orders_warehouse_id = w.warehouse_id
        WHERE so.sales_orders_id = ?
    ");
    $final_stmt->bind_param("i", $sales_order_id);
    $final_stmt->execute();
    $updated_order = $final_stmt->get_result()->fetch_assoc();
    $final_stmt->close();

    $conn->commit();

    $response_data = [
        'order' => $updated_order,
        'old_delivery_status' => $old_delivery_status,
        'new_delivery_status' => $delivery_status,
        'delivery_records_updated' => count($delivery_records ?? [])
    ];

    print_success("Delivery status updated successfully.", $response_data);

} catch (Exception | TypeError $e) {
    $conn->rollback();
    print_failure("Internal Error: " . $e->getMessage() . " on line " . $e->getLine());
}
?>
