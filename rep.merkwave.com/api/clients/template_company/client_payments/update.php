<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) { print_failure('Error: User UUID is required.'); }

    $stmt_user = $conn->prepare('SELECT users_id FROM users WHERE users_uuid = ?');
    if (!$stmt_user) { throw new Exception('Prepare failed for user lookup: ' . $conn->error); }
    $stmt_user->bind_param('s', $users_uuid);
    $stmt_user->execute();
    $res_user = $stmt_user->get_result();
    $user = $res_user->fetch_assoc();
    $stmt_user->close();
    if (!$user) { print_failure('Error: Invalid user.'); }

    $payments_id = $_POST['client_payments_id'] ?? null;
    if (empty($payments_id) || !is_numeric($payments_id) || $payments_id <= 0) { print_failure('Error: Valid Client Payment ID is required.'); }

    $payments_client_id = $_POST['client_payments_client_id'] ?? null;
    $payments_method_id = $_POST['client_payments_method_id'] ?? null;
    $payments_amount    = $_POST['client_payments_amount'] ?? null;
    $payments_date      = $_POST['client_payments_date'] ?? null;
    $payments_notes     = $_POST['client_payments_notes'] ?? null;

    if (array_key_exists('client_payments_notes', $_POST) && $_POST['client_payments_notes'] === '') { $payments_notes = null; }

    $conn->begin_transaction();

    // Fetch old
    $fetch = $conn->prepare('SELECT payments_client_id, payments_amount FROM payments WHERE payments_id = ?');
    $fetch->bind_param('i', $payments_id);
    $fetch->execute();
    $old = $fetch->get_result()->fetch_assoc();
    $fetch->close();
    if (!$old) { $conn->rollback(); print_failure('Error: Payment not found.'); }

    $update_fields = [];
    $types = '';
    $params = [];

    $client_changed = false;
    $amount_changed = false;

    if (!empty($payments_client_id) && is_numeric($payments_client_id) && $payments_client_id > 0) { $update_fields[] = 'payments_client_id = ?'; $types .= 'i'; $params[] = (int)$payments_client_id; if ((int)$payments_client_id !== (int)$old['payments_client_id']) { $client_changed = true; } }
    if (!empty($payments_method_id) && is_numeric($payments_method_id) && $payments_method_id > 0) { $update_fields[] = 'payments_method_id = ?'; $types .= 'i'; $params[] = (int)$payments_method_id; }
    if (isset($payments_amount) && is_numeric($payments_amount) && $payments_amount >= 0) { $update_fields[] = 'payments_amount = ?'; $types .= 'd'; $params[] = (float)$payments_amount; if ((float)$payments_amount != (float)$old['payments_amount']) { $amount_changed = true; } }
    if (!empty($payments_date) && strtotime($payments_date)) { $update_fields[] = 'payments_date = ?'; $types .= 's'; $params[] = $payments_date; }
    if (array_key_exists('client_payments_notes', $_POST)) { $update_fields[] = 'payments_notes = ?'; $types .= 's'; $params[] = $payments_notes; }

    if (empty($update_fields)) { print_failure('Error: No valid fields provided for update.'); }

    $sql = 'UPDATE payments SET ' . implode(', ', $update_fields) . ', payments_updated_at = NOW() WHERE payments_id = ?';
    $types .= 'i';
    $params[] = (int)$payments_id;

    $stmt = $conn->prepare($sql);
    if (!$stmt) { throw new Exception('Prepare failed for update: ' . $conn->error); }
    $stmt->bind_param($types, ...$params);
    if (!$stmt->execute()) { throw new Exception('Error updating payment: ' . $stmt->error); }
    $stmt->close();

    if ($client_changed || $amount_changed) {
        // revert old
        $revert = $conn->prepare('UPDATE clients SET clients_credit_balance = clients_credit_balance - ? WHERE clients_id = ?');
        $revert->bind_param('di', $old_amount, $old_client_id);
        $old_amount = (float)$old['payments_amount'];
        $old_client_id = (int)$old['payments_client_id'];
        if (!$revert->execute()) { throw new Exception('Error reverting client balance: ' . $revert->error); }
        $revert->close();

        $target_client_id = $client_changed ? (int)$payments_client_id : (int)$old['payments_client_id'];
        $target_amount = $amount_changed ? (float)$payments_amount : (float)$old['payments_amount'];

        $apply = $conn->prepare('UPDATE clients SET clients_credit_balance = clients_credit_balance + ? WHERE clients_id = ?');
        $apply->bind_param('di', $target_amount, $target_client_id);
        if (!$apply->execute()) { throw new Exception('Error applying client balance: ' . $apply->error); }
        $apply->close();
    }

    $conn->commit();
    print_success('Client payment updated successfully.', ['client_payments_id' => (int)$payments_id]);

} catch (Exception $e) {
    $conn->rollback();
    print_failure('Internal Error: ' . $e->getMessage());
} finally {
    if (isset($conn)) { $conn->close(); }
}

?>
