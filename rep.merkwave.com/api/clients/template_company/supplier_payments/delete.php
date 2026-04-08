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
    
    // Check permissions - only admin and cash role can delete supplier payments
    if (!in_array($users_role, ['admin', 'cash'])) {
        print_failure("Error: Insufficient permissions. Only admin can delete supplier payments.");
        exit;
    }

    // Get payment ID
    $payment_id = $_POST['supplier_payments_id'] ?? null;
    
    if (empty($payment_id) || !is_numeric($payment_id)) {
        print_failure("Error: Valid supplier payment ID is required.");
        exit;
    }

    // Get payment data before deletion
    $sql_payment = "
        SELECT 
            supplier_payments_supplier_id,
            supplier_payments_amount,
            supplier_payments_safe_transaction_id,
            supplier_payments_status
        FROM supplier_payments 
        WHERE supplier_payments_id = ?
    ";
    
    $stmt_payment = $conn->prepare($sql_payment);
    $stmt_payment->bind_param("i", $payment_id);
    $stmt_payment->execute();
    $payment_result = $stmt_payment->get_result();
    
    if ($payment_result->num_rows === 0) {
        print_failure("Error: Supplier payment not found.");
        exit;
    }
    
    $payment_data = $payment_result->fetch_assoc();
    $stmt_payment->close();

    // Start transaction
    $conn->autocommit(false);

    try {
        // Reverse the supplier balance (add back the payment amount)
        if ($payment_data['supplier_payments_status'] === 'approved') {
            $sql_update_balance = "UPDATE suppliers SET supplier_balance = supplier_balance + ? WHERE supplier_id = ?";
            $stmt_balance = $conn->prepare($sql_update_balance);
            $stmt_balance->bind_param("di", $payment_data['supplier_payments_amount'], $payment_data['supplier_payments_supplier_id']);
            
            if (!$stmt_balance->execute()) {
                throw new Exception("Failed to update supplier balance: " . $stmt_balance->error);
            }
            $stmt_balance->close();
        }

        // Delete associated safe transaction if it exists
        if ($payment_data['supplier_payments_safe_transaction_id']) {
            $sql_delete_safe = "DELETE FROM safe_transactions WHERE safe_transactions_id = ?";
            $stmt_safe = $conn->prepare($sql_delete_safe);
            $stmt_safe->bind_param("i", $payment_data['supplier_payments_safe_transaction_id']);
            
            if (!$stmt_safe->execute()) {
                throw new Exception("Failed to delete safe transaction: " . $stmt_safe->error);
            }
            $stmt_safe->close();
        }

        // Delete the supplier payment
        $sql_delete = "DELETE FROM supplier_payments WHERE supplier_payments_id = ?";
        $stmt_delete = $conn->prepare($sql_delete);
        $stmt_delete->bind_param("i", $payment_id);
        
        if (!$stmt_delete->execute()) {
            throw new Exception("Failed to delete supplier payment: " . $stmt_delete->error);
        }
        
        if ($stmt_delete->affected_rows === 0) {
            throw new Exception("No supplier payment was deleted. Payment may not exist.");
        }
        
        $stmt_delete->close();

        // Commit transaction
        $conn->commit();

        print_success("Supplier payment deleted successfully.", null);

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
