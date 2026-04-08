<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get user UUID and validate
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
        exit;
    }

    // Validate user UUID and get user information
    $sql_user = "SELECT users_id, users_role FROM users WHERE users_uuid = ?";
    $stmt_user = $conn->prepare($sql_user);
    if (!$stmt_user) {
        throw new Exception("Prepare failed for user query: " . $conn->error);
    }
    
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();
    
    if (!$user_data) {
        print_failure("Error: Invalid user UUID.");
        exit;
    }
    
    $users_id = $user_data['users_id'];
    $users_role = $user_data['users_role'];
    
    // Check permissions - only admin, manager, and cash role can update supplier payments
    if (!in_array($users_role, ['admin', 'manager', 'cash'])) {
        print_failure("Error: Insufficient permissions. Only admin and manager can update supplier payments.");
        exit;
    }

    // Get payment ID
    $payment_id = $_POST['supplier_payments_id'] ?? null;
    
    if (empty($payment_id) || !is_numeric($payment_id)) {
        print_failure("Error: Valid supplier payment ID is required.");
        exit;
    }

    // Get current payment data
    $sql_current = "
        SELECT 
            supplier_payments_supplier_id,
            supplier_payments_amount,
            supplier_payments_status,
            supplier_payments_safe_transaction_id
        FROM supplier_payments 
        WHERE supplier_payments_id = ?
    ";
    
    $stmt_current = $conn->prepare($sql_current);
    $stmt_current->bind_param("i", $payment_id);
    $stmt_current->execute();
    $current_result = $stmt_current->get_result();
    
    if ($current_result->num_rows === 0) {
        print_failure("Error: Supplier payment not found.");
        exit;
    }
    
    $current_data = $current_result->fetch_assoc();
    $stmt_current->close();

    // Get and validate input data
    $method_id = $_POST['supplier_payments_method_id'] ?? null;
    $amount = $_POST['supplier_payments_amount'] ?? null;
    $date = $_POST['supplier_payments_date'] ?? null;
    $transaction_id = $_POST['supplier_payments_transaction_id'] ?? null;
    $notes = $_POST['supplier_payments_notes'] ?? null;
    $safe_id = $_POST['supplier_payments_safe_id'] ?? null;
    $purchase_order_id = $_POST['supplier_payments_purchase_order_id'] ?? null;
    $payment_type = $_POST['supplier_payments_type'] ?? null;
    $status = $_POST['supplier_payments_status'] ?? null;

    // Validate payment method if provided
    if ($method_id && (!is_numeric($method_id))) {
        print_failure("Error: Valid payment method ID is required.");
        exit;
    }

    // Validate amount if provided
    if ($amount && (!is_numeric($amount) || (float)$amount <= 0)) {
        print_failure("Error: Valid payment amount is required.");
        exit;
    }

    // Validate safe if provided
    if ($safe_id && (!is_numeric($safe_id))) {
        print_failure("Error: Valid safe ID is required.");
        exit;
    }

    // Validate date format if provided
    if ($date && !DateTime::createFromFormat('Y-m-d', $date)) {
        print_failure("Error: Invalid date format. Use YYYY-MM-DD.");
        exit;
    }

    // Validate payment type if provided
    if ($payment_type) {
        $valid_types = ['Payment', 'Advance', 'Refund'];
        if (!in_array($payment_type, $valid_types)) {
            print_failure("Error: Invalid payment type.");
            exit;
        }
    }

    // Validate status if provided
    if ($status) {
        $valid_statuses = ['Pending', 'Completed', 'Failed', 'Cancelled'];
        if (!in_array($status, $valid_statuses)) {
            print_failure("Error: Invalid payment status.");
            exit;
        }
    }

    // If purchase order is specified, validate it
    if ($purchase_order_id && is_numeric($purchase_order_id)) {
        $sql_po = "SELECT purchase_orders_id FROM purchase_orders WHERE purchase_orders_id = ? AND purchase_orders_supplier_id = ?";
        $stmt_po = $conn->prepare($sql_po);
        $stmt_po->bind_param("ii", $purchase_order_id, $current_data['supplier_payments_supplier_id']);
        $stmt_po->execute();
        $po_result = $stmt_po->get_result();
        
        if ($po_result->num_rows === 0) {
            print_failure("Error: Purchase order not found or doesn't belong to this supplier.");
            exit;
        }
        $stmt_po->close();
    } else if ($purchase_order_id === '') {
        $purchase_order_id = null;
    }

    // Start transaction
    $conn->autocommit(false);

    try {
        // Prepare update query dynamically
        $update_fields = [];
        $update_params = [];
        $update_types = "";

        if ($method_id !== null) {
            $update_fields[] = "supplier_payments_method_id = ?";
            $update_params[] = $method_id;
            $update_types .= "i";
        }

        if ($amount !== null) {
            $update_fields[] = "supplier_payments_amount = ?";
            $update_params[] = $amount;
            $update_types .= "d";
        }

        if ($date !== null) {
            $update_fields[] = "supplier_payments_date = ?";
            $update_params[] = $date;
            $update_types .= "s";
        }

        if ($transaction_id !== null) {
            $update_fields[] = "supplier_payments_transaction_id = ?";
            $update_params[] = $transaction_id;
            $update_types .= "s";
        }

        if ($notes !== null) {
            $update_fields[] = "supplier_payments_notes = ?";
            $update_params[] = $notes;
            $update_types .= "s";
        }

        if ($safe_id !== null) {
            $update_fields[] = "supplier_payments_safe_id = ?";
            $update_params[] = $safe_id;
            $update_types .= "i";
        }

        if ($purchase_order_id !== null) {
            $update_fields[] = "supplier_payments_purchase_order_id = ?";
            $update_params[] = $purchase_order_id;
            $update_types .= "i";
        }

        if ($payment_type !== null) {
            $update_fields[] = "supplier_payments_type = ?";
            $update_params[] = $payment_type;
            $update_types .= "s";
        }

        if ($status !== null) {
            $update_fields[] = "supplier_payments_status = ?";
            $update_params[] = $status;
            $update_types .= "s";
        }

        if (empty($update_fields)) {
            print_failure("Error: No fields to update.");
            exit;
        }

        // Add payment ID to parameters
        $update_params[] = $payment_id;
        $update_types .= "i";

        $sql_update = "UPDATE supplier_payments SET " . implode(", ", $update_fields) . " WHERE supplier_payments_id = ?";
        
        $stmt_update = $conn->prepare($sql_update);
        if (!$stmt_update) {
            throw new Exception("Prepare failed for update: " . $conn->error);
        }

        $stmt_update->bind_param($update_types, ...$update_params);
        
        if (!$stmt_update->execute()) {
            throw new Exception("Failed to update supplier payment: " . $stmt_update->error);
        }
        $stmt_update->close();

        // If amount changed, update supplier balance
        if ($amount !== null && $amount != $current_data['supplier_payments_amount']) {
            $amount_difference = (float)$amount - (float)$current_data['supplier_payments_amount'];
            
            // Subtract the difference from supplier balance
            $sql_update_balance = "UPDATE suppliers SET supplier_balance = supplier_balance - ? WHERE supplier_id = ?";
            $stmt_balance = $conn->prepare($sql_update_balance);
            $stmt_balance->bind_param("di", $amount_difference, $current_data['supplier_payments_supplier_id']);
            
            if (!$stmt_balance->execute()) {
                throw new Exception("Failed to update supplier balance: " . $stmt_balance->error);
            }
            $stmt_balance->close();

            // Update safe transaction if it exists
            if ($current_data['supplier_payments_safe_transaction_id']) {
                $sql_update_safe = "UPDATE safe_transactions SET safe_transactions_amount = ? WHERE safe_transactions_id = ?";
                $stmt_safe = $conn->prepare($sql_update_safe);
                $stmt_safe->bind_param("di", $amount, $current_data['supplier_payments_safe_transaction_id']);
                $stmt_safe->execute();
                $stmt_safe->close();
            }
        }

        // Commit transaction
        $conn->commit();

        print_success("Supplier payment updated successfully.", null);

    } catch (Exception $e) {
        // Rollback transaction
        $conn->rollback();
        throw $e;
    }

} catch (Exception $e) {
    print_failure( $e->getMessage());
} finally {
    $conn->autocommit(true);
    if (isset($conn)) {
        $conn->close();
    }
}

?>
