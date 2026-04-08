<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) { print_failure("Error: User UUID is required."); }

    // Validate user (admin only to delete)
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    $stmt_user->bind_param('s', $users_uuid);
    $stmt_user->execute();
    $user = $stmt_user->get_result()->fetch_assoc();
    $stmt_user->close();
    if (!$user) { print_failure('Error: Invalid user UUID.'); }
    if (!in_array($user['users_role'], ['admin', 'cash'])) { print_failure('Error: Insufficient permissions. Only admin or cash role can delete client refunds.'); }

    $client_refunds_id = $_POST['client_refunds_id'] ?? null;
    if (empty($client_refunds_id) || !is_numeric($client_refunds_id) || $client_refunds_id <= 0) { print_failure('Error: Valid refund ID is required.'); }

    // Get refund data
    $stmt_get = $conn->prepare("SELECT refunds_client_id, refunds_amount, refunds_safe_id, refunds_safe_transaction_id FROM refunds WHERE refunds_id = ?");
    $stmt_get->bind_param('i', $client_refunds_id);
    $stmt_get->execute();
    $ref = $stmt_get->get_result()->fetch_assoc();
    $stmt_get->close();
    if (!$ref) { print_failure('Error: Refund not found.'); }

    $conn->begin_transaction();

    // Reverse client balance (add back refunded amount to client's credit)
    $stmt_client = $conn->prepare("UPDATE clients SET clients_credit_balance = clients_credit_balance + ? WHERE clients_id = ?");
    $stmt_client->bind_param('di', $ref['refunds_amount'], $ref['refunds_client_id']);
    if (!$stmt_client->execute()) { throw new Exception('Error reversing client balance: ' . $stmt_client->error); }
    $stmt_client->close();

    // Reverse safe balance (add back to safe)
    $stmt_safe = $conn->prepare("UPDATE safes SET safes_balance = safes_balance + ? WHERE safes_id = ?");
    $stmt_safe->bind_param('di', $ref['refunds_amount'], $ref['refunds_safe_id']);
    if (!$stmt_safe->execute()) { throw new Exception('Error reversing safe balance: ' . $stmt_safe->error); }
    $stmt_safe->close();

    // Delete related safe transaction
    if (!empty($ref['refunds_safe_transaction_id'])) {
        $stmt_del = $conn->prepare("DELETE FROM safe_transactions WHERE safe_transactions_id = ?");
        $stmt_del->bind_param('i', $ref['refunds_safe_transaction_id']);
        if (!$stmt_del->execute()) { throw new Exception('Error deleting safe transaction: ' . $stmt_del->error); }
        $stmt_del->close();
    }

    // Delete refund
    $stmt_delete = $conn->prepare("DELETE FROM refunds WHERE refunds_id = ?");
    $stmt_delete->bind_param('i', $client_refunds_id);
    if (!$stmt_delete->execute()) { throw new Exception('Error deleting refund: ' . $stmt_delete->error); }
    if ($stmt_delete->affected_rows === 0) { throw new Exception('No refund was deleted.'); }
    $stmt_delete->close();

    $conn->commit();
    print_success('Client refund deleted successfully.', null);

} catch (Exception $e) {
    $conn->rollback();
    print_failure('Database error: ' . $e->getMessage());
} finally {
    if (isset($conn)) { $conn->close(); }
}

?>
