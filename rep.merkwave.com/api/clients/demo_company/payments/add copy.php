<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $payments_client_id      = $_POST['payments_client_id']      ?? null;
    $payments_method_id      = $_POST['payments_method_id']      ?? null;
    $payments_amount         = $_POST['payments_amount']         ?? null;
    $payments_date           = $_POST['payments_date']           ?? date('Y-m-d H:i:s'); // Default to current time
    $payments_transaction_id = $_POST['payments_transaction_id'] ?? null;
    $payments_notes          = $_POST['payments_notes']          ?? null;

    // Handle empty strings for nullable fields
    if ($payments_transaction_id === "") {$payments_transaction_id = null;}
    if ($payments_notes === "") {$payments_notes = null;}

    // Basic Validation
    if (empty($payments_client_id) || !is_numeric($payments_client_id) || $payments_client_id <= 0) {
        print_failure("Error: Valid Client ID is required.");
    }
    if (empty($payments_method_id) || !is_numeric($payments_method_id) || $payments_method_id <= 0) {
        print_failure("Error: Valid Payment Method ID is required.");
    }
    if (empty($payments_amount) || !is_numeric($payments_amount) || $payments_amount <= 0) {
        print_failure("Error: Valid Payment Amount is required and must be positive.");
    }
    if (!strtotime($payments_date)) {
        print_failure("Error: Invalid payment date format.");
    }

    $conn->begin_transaction();

    try {
        // 1. Insert into payments table
        $stmt_payment = $conn->prepare("
            INSERT INTO payments (
                payments_client_id, payments_method_id, payments_amount, payments_date, 
                payments_transaction_id, payments_notes, payments_created_at, payments_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        if (!$stmt_payment) {
            throw new Exception("Prepare failed for payment insert: " . $conn->error);
        }

        $stmt_payment->bind_param("iidsss", 
            $payments_client_id, $payments_method_id, $payments_amount, $payments_date,
            $payments_transaction_id, $payments_notes
        );

        if (!$stmt_payment->execute()) {
            throw new Exception("Error inserting payment: " . $stmt_payment->error);
        }

        $new_payment_id = $stmt_payment->insert_id;
        $stmt_payment->close();

        // 2. Update client's credit_balance
        $stmt_update_client_balance = $conn->prepare("
            UPDATE clients
            SET clients_credit_balance = clients_credit_balance + ?
            WHERE clients_id = ?
        ");

        if (!$stmt_update_client_balance) {
            throw new Exception("Prepare failed for client balance update: " . $conn->error);
        }

        $stmt_update_client_balance->bind_param("di", $payments_amount, $payments_client_id);

        if (!$stmt_update_client_balance->execute()) {
            throw new Exception("Error updating client credit balance: " . $stmt_update_client_balance->error);
        }
        $stmt_update_client_balance->close();

        $conn->commit();
        print_success("Payment added successfully and client balance updated.", ['payments_id' => $new_payment_id, 'payments_amount' => $payments_amount]);

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
