<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // UUID-based authentication
    $users_uuid = $_POST['users_uuid'] ?? null;
    
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }
    
    // Get user ID from UUID
    $stmt_user = $conn->prepare("SELECT users_id FROM users WHERE users_uuid = ?");
    if (!$stmt_user) {
        throw new Exception("Prepare failed for user lookup: " . $conn->error);
    }
    
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $user_result = $stmt_user->get_result();
    
    if ($user_result->num_rows === 0) {
        print_failure("Error: You are not authorized to perform this action.");
    }
    
    $user_data = $user_result->fetch_assoc();
    $user_id = $user_data['users_id'];
    $stmt_user->close();

    $payments_id = $_POST['payments_id'] ?? null;

    if (empty($payments_id) || !is_numeric($payments_id) || $payments_id <= 0) {
        print_failure("Error: Valid Payment ID is required.");
    }

    $conn->begin_transaction();

    try {
        // 1. Retrieve payment details before deletion for balance adjustment
        $stmt_get_payment = $conn->prepare("
            SELECT payments_client_id, payments_amount
            FROM payments
            WHERE payments_id = ?
        ");
        if (!$stmt_get_payment) {
            throw new Exception("Prepare failed to get payment for deletion: " . $conn->error);
        }
        $stmt_get_payment->bind_param("i", $payments_id);
        $stmt_get_payment->execute();
        $result_get_payment = $stmt_get_payment->get_result();
        $payment_data = $result_get_payment->fetch_assoc();
        $stmt_get_payment->close();

        if (!$payment_data) {
            $conn->rollback();
            print_failure("Error: Payment with ID " . $payments_id . " not found.");
        }

        // 2. Delete payment record
        $stmt_delete_payment = $conn->prepare("
            DELETE FROM payments
            WHERE payments_id = ?
        ");

        if (!$stmt_delete_payment) {
            throw new Exception("Prepare failed for payment delete: " . $conn->error);
        }

        $stmt_delete_payment->bind_param("i", $payments_id);

        if (!$stmt_delete_payment->execute()) {
            throw new Exception("Error deleting payment: " . $stmt_delete_payment->error);
        }

        if ($stmt_delete_payment->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Payment with ID " . $payments_id . " not found.");
        }
        $stmt_delete_payment->close();

        // 3. Adjust client's credit_balance back (add the amount)
        $stmt_update_client_balance = $conn->prepare("
            UPDATE clients
            SET clients_credit_balance = clients_credit_balance + ?
            WHERE clients_id = ?
        ");

        if (!$stmt_update_client_balance) {
            throw new Exception("Prepare failed for client balance adjustment: " . $conn->error);
        }

        $stmt_update_client_balance->bind_param("di", $payment_data['payments_amount'], $payment_data['payments_client_id']);

        if (!$stmt_update_client_balance->execute()) {
            throw new Exception("Error adjusting client credit balance: " . $stmt_update_client_balance->error);
        }
        $stmt_update_client_balance->close();

        $conn->commit();
        print_success("Payment deleted successfully and client balance adjusted.");

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
