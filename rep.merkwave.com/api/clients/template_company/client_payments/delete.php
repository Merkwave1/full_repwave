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
    if (!$user) { print_failure('Error: Invalid user UUID.'); }

    $payments_id = $_POST['client_payments_id'] ?? null;
    if (empty($payments_id) || !is_numeric($payments_id) || $payments_id <= 0) { print_failure('Error: Valid Client Payment ID is required.'); }

    $conn->begin_transaction();

    // Get payment before delete
    $fetch = $conn->prepare('SELECT payments_client_id, payments_amount FROM payments WHERE payments_id = ?');
    $fetch->bind_param('i', $payments_id);
    $fetch->execute();
    $old = $fetch->get_result()->fetch_assoc();
    $fetch->close();
    if (!$old) { $conn->rollback(); print_failure('Error: Payment not found.'); }

    // Delete payment
    $del = $conn->prepare('DELETE FROM payments WHERE payments_id = ?');
    $del->bind_param('i', $payments_id);
    if (!$del->execute()) { throw new Exception('Error deleting payment: ' . $del->error); }
    if ($del->affected_rows === 0) { $conn->rollback(); print_failure('Error: Payment not found.'); }
    $del->close();

    // Adjust client balance back
    $adjust = $conn->prepare('UPDATE clients SET clients_credit_balance = clients_credit_balance + ? WHERE clients_id = ?');
    $amount = (float)$old['payments_amount'];
    $clientId = (int)$old['payments_client_id'];
    $adjust->bind_param('di', $amount, $clientId);
    if (!$adjust->execute()) { throw new Exception('Error adjusting client balance: ' . $adjust->error); }
    $adjust->close();

    $conn->commit();
    print_success('Client payment deleted successfully.');

} catch (Exception $e) {
    $conn->rollback();
    print_failure('Internal Error: ' . $e->getMessage());
} finally {
    if (isset($conn)) { $conn->close(); }
}

?>
