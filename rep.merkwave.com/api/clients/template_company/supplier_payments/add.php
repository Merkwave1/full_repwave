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
    
    // Check permissions - only admin, manager, employee, and cash role can add supplier payments
    if (!in_array($users_role, ['admin', 'manager', 'employee', 'cash'])) {
        print_failure("Error: Insufficient permissions.");
        exit;
    }

    // Get and validate input data
    $supplier_id = $_POST['supplier_payments_supplier_id'] ?? null;
    $method_id = $_POST['supplier_payments_method_id'] ?? null;
    $amount = $_POST['supplier_payments_amount'] ?? null;
    $date = $_POST['supplier_payments_date'] ?? null;
    $transaction_id = $_POST['supplier_payments_transaction_id'] ?? null;
    $notes = $_POST['supplier_payments_notes'] ?? null;
    $safe_id = $_POST['supplier_payments_safe_id'] ?? null;
    $purchase_order_id = $_POST['supplier_payments_purchase_order_id'] ?? null;
    $payment_type = $_POST['supplier_payments_type'] ?? 'Payment';
    $status = $_POST['supplier_payments_status'] ?? 'Completed';

    // Validate required fields
    if (empty($supplier_id) || !is_numeric($supplier_id)) {
        print_failure("Error: Valid supplier ID is required.");
        exit;
    }

    if (empty($method_id) || !is_numeric($method_id)) {
        print_failure("Error: Valid payment method ID is required.");
        exit;
    }

    if (empty($amount) || !is_numeric($amount) || (float)$amount <= 0) {
        print_failure("Error: Valid payment amount is required.");
        exit;
    }

    if (empty($safe_id) || !is_numeric($safe_id)) {
        print_failure("Error: Valid safe ID is required.");
        exit;
    }

    // If user is cash, verify they are assigned to this safe
    if ($users_role === 'cash') {
        $stmt_check = $conn->prepare("SELECT 1 FROM user_safes WHERE user_id = ? AND safe_id = ?");
        $stmt_check->bind_param("ii", $users_id, $safe_id);
        $stmt_check->execute();
        if ($stmt_check->get_result()->num_rows === 0) {
            print_failure("Error: Access denied. You are not assigned to this safe.");
            exit;
        }
        $stmt_check->close();
    }

    // Validate date format - accept both YYYY-MM-DD and YYYY-MM-DDTHH:MM formats
    if ($date) {
        $date_valid = false;
        
        // Try YYYY-MM-DD format first
        if (DateTime::createFromFormat('Y-m-d', $date)) {
            $date_valid = true;
        }
        // Try YYYY-MM-DDTHH:MM format (datetime-local input)
        elseif (DateTime::createFromFormat('Y-m-d\TH:i', $date)) {
            $date_valid = true;
        }
        
        if (!$date_valid) {
            print_failure("Error: Invalid date format. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM.");
            exit;
        }
    }

    // Validate payment type
    $valid_types = ['Payment', 'Advance', 'Refund'];
    if (!in_array($payment_type, $valid_types)) {
        print_failure("Error: Invalid payment type.");
        exit;
    }

    // Validate status
    $valid_statuses = ['Pending', 'Completed', 'Failed', 'Cancelled'];
    if (!in_array($status, $valid_statuses)) {
        print_failure("Error: Invalid payment status.");
        exit;
    }

    // Check if supplier exists
    $sql_supplier = "SELECT supplier_id, supplier_name, supplier_balance FROM suppliers WHERE supplier_id = ?";
    $stmt_supplier = $conn->prepare($sql_supplier);
    $stmt_supplier->bind_param("i", $supplier_id);
    $stmt_supplier->execute();
    $supplier_result = $stmt_supplier->get_result();
    
    if ($supplier_result->num_rows === 0) {
        print_failure("Error: Supplier not found.");
        exit;
    }
    
    $supplier_data = $supplier_result->fetch_assoc();
    $stmt_supplier->close();

    // Check if payment method exists
    $sql_method = "SELECT payment_methods_id FROM payment_methods WHERE payment_methods_id = ?";
    $stmt_method = $conn->prepare($sql_method);
    $stmt_method->bind_param("i", $method_id);
    $stmt_method->execute();
    $method_result = $stmt_method->get_result();
    
    if ($method_result->num_rows === 0) {
        print_failure("Error: Payment method not found.");
        exit;
    }
    $stmt_method->close();

    // Check if safe exists
    $sql_safe = "SELECT safes_id FROM safes WHERE safes_id = ?";
    $stmt_safe = $conn->prepare($sql_safe);
    $stmt_safe->bind_param("i", $safe_id);
    $stmt_safe->execute();
    $safe_result = $stmt_safe->get_result();
    
    if ($safe_result->num_rows === 0) {
        print_failure("Error: Safe not found.");
        exit;
    }
    $stmt_safe->close();

    // If purchase order is specified, validate it
    if ($purchase_order_id && is_numeric($purchase_order_id)) {
        $sql_po = "SELECT purchase_orders_id FROM purchase_orders WHERE purchase_orders_id = ? AND purchase_orders_supplier_id = ?";
        $stmt_po = $conn->prepare($sql_po);
        $stmt_po->bind_param("ii", $purchase_order_id, $supplier_id);
        $stmt_po->execute();
        $po_result = $stmt_po->get_result();
        
        if ($po_result->num_rows === 0) {
            print_failure("Error: Purchase order not found or doesn't belong to this supplier.");
            exit;
        }
        $stmt_po->close();
    } else {
        $purchase_order_id = null;
    }

    // Start transaction
    $conn->autocommit(false);

    try {
        // Lock safe row and capture balances for transaction logging
        $sql_safe_balance = "SELECT safes_balance FROM safes WHERE safes_id = ? FOR UPDATE";
        $stmt_safe_balance = $conn->prepare($sql_safe_balance);
        if (!$stmt_safe_balance) {
            throw new Exception("Prepare failed for safe balance query: " . $conn->error);
        }
        $stmt_safe_balance->bind_param("i", $safe_id);
        $stmt_safe_balance->execute();
        $safe_balance_result = $stmt_safe_balance->get_result();
        $safe_balance_row = $safe_balance_result->fetch_assoc();
        $stmt_safe_balance->close();

        if (!$safe_balance_row) {
            throw new Exception("Unable to determine safe balance.");
        }

        $balance_before = isset($safe_balance_row['safes_balance']) ? (float)$safe_balance_row['safes_balance'] : 0.0;
        $balance_after = $balance_before - (float)$amount;

        // Normalize safe transaction date
        $safe_transaction_date = null;
        if (!empty($date)) {
            $date_time = DateTime::createFromFormat('Y-m-d\\TH:i', $date) ?: DateTime::createFromFormat('Y-m-d', $date);
            if ($date_time) {
                $safe_transaction_date = $date_time->format('Y-m-d H:i:s');
            }
        }
        if (!$safe_transaction_date) {
            $safe_transaction_date = date('Y-m-d H:i:s');
        }

        // Insert supplier payment
        $sql_insert = "
            INSERT INTO supplier_payments (
                supplier_payments_supplier_id,
                supplier_payments_method_id,
                supplier_payments_amount,
                supplier_payments_date,
                supplier_payments_transaction_id,
                supplier_payments_notes,
                supplier_payments_rep_user_id,
                supplier_payments_safe_id,
                supplier_payments_purchase_order_id,
                supplier_payments_type,
                supplier_payments_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";

        $stmt_insert = $conn->prepare($sql_insert);
        if (!$stmt_insert) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt_insert->bind_param(
            "iidsssiisss",
            $supplier_id,
            $method_id,
            $amount,
            $date,
            $transaction_id,
            $notes,
            $users_id,
            $safe_id,
            $purchase_order_id,
            $payment_type,
            $status
        );

        if (!$stmt_insert->execute()) {
            throw new Exception("Failed to insert supplier payment: " . $stmt_insert->error);
        }

        $payment_id = $conn->insert_id;
        $stmt_insert->close();

        // Update supplier balance (subtract payment amount)
        $sql_update_balance = "UPDATE suppliers SET supplier_balance = supplier_balance - ? WHERE supplier_id = ?";
        $stmt_balance = $conn->prepare($sql_update_balance);
        $stmt_balance->bind_param("di", $amount, $supplier_id);
        
        if (!$stmt_balance->execute()) {
            throw new Exception("Failed to update supplier balance: " . $stmt_balance->error);
        }
        $stmt_balance->close();

        // Create safe transaction record (supplier payment)
        $safe_transaction_type = 'supplier_payment';
        $safe_transaction_description = "دفعة للمورد: " . $supplier_data['supplier_name'] . " (رقم الدفع: " . $payment_id . ")";
        $safe_transaction_reference = 'supplier_payment#' . $payment_id;
        $safe_related_table = 'supplier_payments';
        
        $sql_safe_transaction = "
            INSERT INTO safe_transactions (
                safe_transactions_safe_id,
                safe_transactions_type,
                safe_transactions_amount,
                safe_transactions_balance_before,
                safe_transactions_balance_after,
                safe_transactions_description,
                safe_transactions_reference,
                safe_transactions_date,
                safe_transactions_created_by,
                safe_transactions_related_table,
                safe_transactions_related_id,
                safe_transactions_created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ";
        
        $stmt_safe = $conn->prepare($sql_safe_transaction);
        $stmt_safe->bind_param(
            "isdddsssisi",
            $safe_id,
            $safe_transaction_type,
            $amount,
            $balance_before,
            $balance_after,
            $safe_transaction_description,
            $safe_transaction_reference,
            $safe_transaction_date,
            $users_id,
            $safe_related_table,
            $payment_id
        );
        
        if (!$stmt_safe->execute()) {
            throw new Exception("Failed to create safe transaction: " . $stmt_safe->error);
        }
        
        $safe_transaction_id = $conn->insert_id;
        $stmt_safe->close();

        // Update safe balance (subtract payment amount since money is going out)
        $sql_update_safe = "UPDATE safes SET safes_balance = safes_balance - ? WHERE safes_id = ?";
        $stmt_safe_balance_update = $conn->prepare($sql_update_safe);
        $stmt_safe_balance_update->bind_param("di", $amount, $safe_id);
        
        if (!$stmt_safe_balance_update->execute()) {
            throw new Exception("Failed to update safe balance: " . $stmt_safe_balance_update->error);
        }
        $stmt_safe_balance_update->close();

        // Update supplier payment with safe transaction ID
        $sql_update_payment = "UPDATE supplier_payments SET supplier_payments_safe_transaction_id = ? WHERE supplier_payments_id = ?";
        $stmt_update = $conn->prepare($sql_update_payment);
        $stmt_update->bind_param("ii", $safe_transaction_id, $payment_id);
        $stmt_update->execute();
        $stmt_update->close();

        // Commit transaction
        $conn->commit();

        $response_data = [
            'supplier_payment_id' => $payment_id,
            'safe_transaction_id' => $safe_transaction_id
        ];

        print_success("Supplier payment added successfully.", $response_data);

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
