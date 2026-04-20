<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) { print_failure("Error: User UUID is required."); }

    // Validate user
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    $stmt_user->bind_param('s', $users_uuid);
    $stmt_user->execute();
    $user = $stmt_user->get_result()->fetch_assoc();
    $stmt_user->close();
    if (!$user) { print_failure('Error: Invalid user UUID.'); }

    $client_refunds_id        = $_POST['client_refunds_id'] ?? null;
    $client_refunds_client_id = $_POST['client_refunds_client_id'] ?? null;
    $client_refunds_method_id = $_POST['client_refunds_method_id'] ?? null;
    $client_refunds_amount    = $_POST['client_refunds_amount'] ?? null;
    $client_refunds_date      = $_POST['client_refunds_date'] ?? null;
    $client_refunds_notes     = $_POST['client_refunds_notes'] ?? null;
    $client_refunds_safe_id   = $_POST['client_refunds_safe_id'] ?? null;

    if (empty($client_refunds_id) || !is_numeric($client_refunds_id) || $client_refunds_id <= 0) { print_failure('Error: Valid refund ID is required.'); }
    if (empty($client_refunds_client_id) || !is_numeric($client_refunds_client_id) || $client_refunds_client_id <= 0) { print_failure('Error: Valid Client ID is required.'); }
    if (empty($client_refunds_method_id) || !is_numeric($client_refunds_method_id) || $client_refunds_method_id <= 0) { print_failure('Error: Valid Method ID is required.'); }
    if (empty($client_refunds_amount) || !is_numeric($client_refunds_amount) || $client_refunds_amount <= 0) { print_failure('Error: Valid Amount is required.'); }
    if (!empty($client_refunds_date) && !DateTime::createFromFormat('Y-m-d', $client_refunds_date)) { print_failure('Error: Invalid date format. Use YYYY-MM-DD.'); }

    // Get existing refund
    $stmt_get = $conn->prepare("SELECT * FROM refunds WHERE refunds_id = ? LIMIT 1");
    $stmt_get->bind_param('i', $client_refunds_id);
    $stmt_get->execute();
    $old = $stmt_get->get_result()->fetch_assoc();
    $stmt_get->close();
    if (!$old) { print_failure('Error: Refund not found.'); }

    $conn->begin_transaction();

    // Reverse old effects: client balance and safe balances
    // 1) Reverse client balance
    $stmt_rev_client = $conn->prepare("UPDATE clients SET clients_credit_balance = clients_credit_balance + ? WHERE clients_id = ?");
    $stmt_rev_client->bind_param('di', $old['refunds_amount'], $old['refunds_client_id']);
    if (!$stmt_rev_client->execute()) { throw new Exception('Error reversing client balance: ' . $stmt_rev_client->error); }
    $stmt_rev_client->close();

    // 2) Reverse safe balance
    $stmt_rev_safe = $conn->prepare("UPDATE safes SET safes_balance = safes_balance + ? WHERE safes_id = ?");
    $stmt_rev_safe->bind_param('di', $old['refunds_amount'], $old['refunds_safe_id']);
    if (!$stmt_rev_safe->execute()) { throw new Exception('Error reversing safe balance: ' . $stmt_rev_safe->error); }
    $stmt_rev_safe->close();

    // 3) Delete old safe transaction if exists
    if (!empty($old['refunds_safe_transaction_id'])) {
        $stmt_del_tx = $conn->prepare("DELETE FROM safe_transactions WHERE safe_transactions_id = ?");
        $stmt_del_tx->bind_param('i', $old['refunds_safe_transaction_id']);
        if (!$stmt_del_tx->execute()) { throw new Exception('Error deleting old safe transaction: ' . $stmt_del_tx->error); }
        $stmt_del_tx->close();
    }

    // Update main refunds row
    $sql_update = "UPDATE refunds SET refunds_client_id = ?, refunds_method_id = ?, refunds_amount = ?, refunds_date = ?, refunds_notes = ?, refunds_safe_id = ?, refunds_updated_at = NOW() WHERE refunds_id = ?";
    $stmt_upd = $conn->prepare($sql_update);
    $date_to_use = $client_refunds_date ?: date('Y-m-d');
    $notes_to_use = ($client_refunds_notes === '') ? null : $client_refunds_notes;
    $stmt_upd->bind_param('iidssii', $client_refunds_client_id, $client_refunds_method_id, $client_refunds_amount, $date_to_use, $notes_to_use, $client_refunds_safe_id, $client_refunds_id);
    if (!$stmt_upd->execute()) { throw new Exception('Error updating refund: ' . $stmt_upd->error); }
    $stmt_upd->close();

    // Apply new effects
    // 1) Adjust client balance (decrease)
    $stmt_client = $conn->prepare("UPDATE clients SET clients_credit_balance = clients_credit_balance - ? WHERE clients_id = ?");
    $stmt_client->bind_param('di', $client_refunds_amount, $client_refunds_client_id);
    if (!$stmt_client->execute()) { throw new Exception('Error updating client balance: ' . $stmt_client->error); }
    $stmt_client->close();

    // 2) Fetch safe balance before
    $bal_stmt = $conn->prepare("SELECT safes_balance FROM safes WHERE safes_id = ? LIMIT 1");
    $bal_stmt->bind_param('i', $client_refunds_safe_id);
    $bal_stmt->execute();
    $bal_res = $bal_stmt->get_result()->fetch_assoc();
    $bal_stmt->close();
    $balance_before = isset($bal_res['safes_balance']) ? (float)$bal_res['safes_balance'] : 0.0;
    $balance_after = $balance_before - (float)$client_refunds_amount;

    // 3) Insert new safe transaction
    $safe_desc = 'Client refund (Refund ID: ' . $client_refunds_id . ') - updated';
    $safe_ref = 'refunds#' . $client_refunds_id;
    $safe_type = 'payment'; // money out
    $related_table = 'refunds';

    $stmt_safe = $conn->prepare("INSERT INTO safe_transactions (
        safe_transactions_safe_id, safe_transactions_type, safe_transactions_amount,
        safe_transactions_balance_before, safe_transactions_balance_after,
        safe_transactions_description, safe_transactions_reference, safe_transactions_date,
        safe_transactions_created_by, safe_transactions_related_table, safe_transactions_related_id,
        safe_transactions_created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");

    $stmt_safe->bind_param('isdddsssisi', $client_refunds_safe_id, $safe_type, $client_refunds_amount, $balance_before, $balance_after, $safe_desc, $safe_ref, $date_to_use, $user['users_id'], $related_table, $client_refunds_id);
    if (!$stmt_safe->execute()) { throw new Exception('Error creating safe transaction: ' . $stmt_safe->error); }
    $new_tx_id = $stmt_safe->insert_id;
    $stmt_safe->close();

    // 4) Update refunds with new tx id
    $stmt_link = $conn->prepare("UPDATE refunds SET refunds_safe_transaction_id = ? WHERE refunds_id = ?");
    $stmt_link->bind_param('ii', $new_tx_id, $client_refunds_id);
    if (!$stmt_link->execute()) { throw new Exception('Error linking safe transaction: ' . $stmt_link->error); }
    $stmt_link->close();

    // 5) Update safe balance (decrease)
    $stmt_safe_upd = $conn->prepare("UPDATE safes SET safes_balance = safes_balance - ? WHERE safes_id = ?");
    $stmt_safe_upd->bind_param('di', $client_refunds_amount, $client_refunds_safe_id);
    if (!$stmt_safe_upd->execute()) { throw new Exception('Error updating safe balance: ' . $stmt_safe_upd->error); }
    $stmt_safe_upd->close();

    $conn->commit();
    print_success('Client refund updated successfully.', ['client_refunds_id' => $client_refunds_id]);

} catch (Exception $e) {
    $conn->rollback();
    print_failure('Internal Error: ' . $e->getMessage());
} finally {
    if (isset($conn)) { $conn->close(); }
}

?>
