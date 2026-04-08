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

    $payments_id             = $_POST['payments_id']             ?? null;
    $payments_client_id      = $_POST['payments_client_id']      ?? null; // Can be updated, but handled carefully
    $payments_method_id      = $_POST['payments_method_id']      ?? null;
    $payments_amount         = $_POST['payments_amount']         ?? null;
    $payments_date           = $_POST['payments_date']           ?? null;
    $payments_transaction_id = $_POST['payments_transaction_id'] ?? null;
    $payments_notes          = $_POST['payments_notes']          ?? null;

    // Handle empty strings for nullable fields
    if (array_key_exists('payments_transaction_id', $_POST) && $_POST['payments_transaction_id'] === "") {$payments_transaction_id = null;}
    if (array_key_exists('payments_notes', $_POST) && $_POST['payments_notes'] === "") {$payments_notes = null;}

    // Basic Validation
    if (empty($payments_id) || !is_numeric($payments_id) || $payments_id <= 0) {
        print_failure("Error: Valid Payment ID is required for update.");
    }

    $conn->begin_transaction();

    try {
        // 1. Fetch current payment details for comparison and balance adjustment
        $stmt_fetch_current = $conn->prepare("
            SELECT payments_client_id, payments_amount
            FROM payments
            WHERE payments_id = ?
        ");
        if (!$stmt_fetch_current) {
            throw new Exception("Prepare failed to fetch current payment: " . $conn->error);
        }
        $stmt_fetch_current->bind_param("i", $payments_id);
        $stmt_fetch_current->execute();
        $result_current = $stmt_fetch_current->get_result();
        $current_payment_data = $result_current->fetch_assoc();
        $stmt_fetch_current->close();

        if (!$current_payment_data) {
            $conn->rollback();
            print_failure("Error: Payment with ID " . $payments_id . " not found.");
        }

        $old_amount = (float)$current_payment_data['payments_amount'];
        $old_client_id = (int)$current_payment_data['payments_client_id'];

        $update_fields = [];
        $bind_types = "";
        $bind_params = [];
        $amount_changed = false;
        $client_changed = false;

        if (!empty($payments_client_id) && is_numeric($payments_client_id) && $payments_client_id > 0) {
            $update_fields[] = "payments_client_id = ?";
            $bind_types .= "i";
            $bind_params[] = $payments_client_id;
            if ($payments_client_id != $old_client_id) {
                $client_changed = true;
            }
        } else if (isset($_POST['payments_client_id']) && ($payments_client_id === '' || $payments_client_id <= 0)) {
            print_failure("Error: Invalid client ID.");
        }

        if (!empty($payments_method_id) && is_numeric($payments_method_id) && $payments_method_id > 0) {
            $update_fields[] = "payments_method_id = ?";
            $bind_types .= "i";
            $bind_params[] = $payments_method_id;
        } else if (isset($_POST['payments_method_id']) && ($payments_method_id === '' || $payments_method_id <= 0)) {
            print_failure("Error: Invalid payment method ID.");
        }

        if (isset($payments_amount) && is_numeric($payments_amount) && $payments_amount >= 0) {
            $update_fields[] = "payments_amount = ?";
            $bind_types .= "d";
            $bind_params[] = $payments_amount;
            if ((float)$payments_amount != $old_amount) {
                $amount_changed = true;
            }
        } else if (isset($_POST['payments_amount']) && ($payments_amount === '' || $payments_amount < 0)) {
            print_failure("Error: Invalid payment amount.");
        }

        if (!empty($payments_date) && strtotime($payments_date)) {
            $update_fields[] = "payments_date = ?";
            $bind_types .= "s";
            $bind_params[] = $payments_date;
        } else if (isset($_POST['payments_date']) && $payments_date === '') {
            print_failure("Error: Invalid payment date format.");
        }

        if (array_key_exists('payments_transaction_id', $_POST)) {
            $update_fields[] = "payments_transaction_id = ?";
            $bind_types .= "s";
            $bind_params[] = $payments_transaction_id;
        }

        if (array_key_exists('payments_notes', $_POST)) {
            $update_fields[] = "payments_notes = ?";
            $bind_types .= "s";
            $bind_params[] = $payments_notes;
        }

        if (empty($update_fields)) {
            print_failure("Error: No valid fields provided for update.");
        }

        // 2. Update payment record
        $sql = "UPDATE payments SET " . implode(", ", $update_fields) . ", payments_updated_at = NOW() WHERE payments_id = ?";
        $bind_types .= "i"; 
        $bind_params[] = $payments_id;

        $stmt_update_payment = $conn->prepare($sql);

        if (!$stmt_update_payment) {
            throw new Exception("Prepare failed for payment update: " . $conn->error);
        }

        $stmt_update_payment->bind_param($bind_types, ...$bind_params);

        if (!$stmt_update_payment->execute()) {
            throw new Exception("Error updating payment: " . $stmt_update_payment->error);
        }

        if ($stmt_update_payment->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Payment with ID " . $payments_id . " not found or no changes were made.");
        }
        $stmt_update_payment->close();

        // 3. Adjust client credit balance(s)
        if ($amount_changed || $client_changed) {
            // Revert old amount from old client's balance
            $stmt_revert_old_balance = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance - ?
                WHERE clients_id = ?
            ");
            if (!$stmt_revert_old_balance) {
                throw new Exception("Prepare failed for reverting old balance: " . $conn->error);
            }
            $stmt_revert_old_balance->bind_param("di", $old_amount, $old_client_id);
            if (!$stmt_revert_old_balance->execute()) {
                throw new Exception("Error reverting old client balance: " . $stmt_revert_old_balance->error);
            }
            $stmt_revert_old_balance->close();

            // Apply new amount to new/same client's balance
            $target_client_id = $client_changed ? $payments_client_id : $old_client_id;
            $target_amount = $amount_changed ? $payments_amount : $old_amount;

            $stmt_apply_new_balance = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance + ?
                WHERE clients_id = ?
            ");
            if (!$stmt_apply_new_balance) {
                throw new Exception("Prepare failed for applying new balance: " . $conn->error);
            }
            $stmt_apply_new_balance->bind_param("di", $target_amount, $target_client_id);
            if (!$stmt_apply_new_balance->execute()) {
                throw new Exception("Error applying new client balance: " . $stmt_apply_new_balance->error);
            }
            $stmt_apply_new_balance->close();
        }

        $conn->commit();
        print_success("Payment updated successfully and client balance(s) adjusted.", ['payments_id' => $payments_id]);

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
