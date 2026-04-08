<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) { print_failure("Error: User UUID is required."); }

    // Find user
    $stmt_user = $conn->prepare("SELECT users_id, users_role, users_name FROM users WHERE users_uuid = ?");
    if (!$stmt_user) { throw new Exception("Prepare failed for user lookup: " . $conn->error); }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $res_user = $stmt_user->get_result();
    $user = $res_user->fetch_assoc();
    $stmt_user->close();
    if (!$user) { print_failure("Error: Invalid user UUID."); }

    $rep_user_id = (int)$user['users_id'];
    $role = $user['users_role'];
    $user_name = $user['users_name'];

    $client_refunds_client_id = $_POST['client_refunds_client_id'] ?? null;
    $client_refunds_method_id = $_POST['client_refunds_method_id'] ?? null;
    $client_refunds_amount    = $_POST['client_refunds_amount'] ?? null;
    $client_refunds_date      = $_POST['client_refunds_date'] ?? date('Y-m-d');
    $client_refunds_notes     = $_POST['client_refunds_notes'] ?? null;
    $client_refunds_safe_id   = $_POST['client_refunds_safe_id'] ?? null;

    if ($client_refunds_notes === '') { $client_refunds_notes = null; }

    if (empty($client_refunds_client_id) || !is_numeric($client_refunds_client_id) || $client_refunds_client_id <= 0) { print_failure('Error: Valid Client ID is required.'); }
    if (empty($client_refunds_method_id) || !is_numeric($client_refunds_method_id) || $client_refunds_method_id <= 0) { print_failure('Error: Valid Payment Method ID is required.'); }
    if (empty($client_refunds_amount) || !is_numeric($client_refunds_amount) || $client_refunds_amount <= 0) { print_failure('Error: Valid Refund Amount is required.'); }
    if (!strtotime($client_refunds_date)) { print_failure('Error: Invalid refund date.'); }

    // Safe selection: reps auto-safe, admins must provide safe
    if ($role === 'rep') {
        $stmt = $conn->prepare("SELECT safes_id FROM safes WHERE safes_rep_user_id = ? AND safes_type = 'rep' LIMIT 1");
        $stmt->bind_param("i", $rep_user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res->num_rows === 0) {
            $stmt->close();
            $safe_name = $user_name . ' - Representative Safe';
            $create = $conn->prepare("INSERT INTO safes (safes_name, safes_type, safes_balance, safes_rep_user_id, safes_payment_method_id, safes_is_active, safes_description) VALUES (?, 'rep', 0.00, ?, 1, 1, 'Auto-created representative safe')");
            if (!$create) { throw new Exception('Prepare failed to create safe: ' . $conn->error); }
            $create->bind_param("si", $safe_name, $rep_user_id);
            $create->execute();
            $client_refunds_safe_id = $conn->insert_id;
            $create->close();
        } else {
            $client_refunds_safe_id = $res->fetch_assoc()['safes_id'];
            $stmt->close();
        }
    } elseif ($role === 'cash') {
        // cash: must use assigned safes
        if (empty($client_refunds_safe_id)) {
            // Try to get the first assigned safe as default
            $stmt = $conn->prepare("SELECT safe_id FROM user_safes WHERE user_id = ? LIMIT 1");
            $stmt->bind_param("i", $rep_user_id);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($res->num_rows > 0) {
                $client_refunds_safe_id = $res->fetch_assoc()['safe_id'];
            } else {
                print_failure("Error: No safes assigned to this cash user.");
            }
            $stmt->close();
        } else {
            // Verify the provided safe is assigned to this user
            $stmt = $conn->prepare("SELECT 1 FROM user_safes WHERE user_id = ? AND safe_id = ?");
            $stmt->bind_param("ii", $rep_user_id, $client_refunds_safe_id);
            $stmt->execute();
            if ($stmt->get_result()->num_rows === 0) {
                print_failure("Error: Access denied. You are not assigned to this safe.");
            }
            $stmt->close();
        }
    } else {
        if (empty($client_refunds_safe_id) || !is_numeric($client_refunds_safe_id) || $client_refunds_safe_id <= 0) { print_failure("Error: Valid Safe ID is required."); }
    }

    $conn->begin_transaction();

    // Insert refund
    $stmt_insert = $conn->prepare("INSERT INTO refunds (
        refunds_client_id, refunds_method_id, refunds_amount, refunds_date,
        refunds_transaction_id, refunds_notes, refunds_rep_user_id, refunds_safe_id,
        refunds_created_at, refunds_updated_at
    ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NOW(), NOW())");
    if (!$stmt_insert) { throw new Exception('Prepare failed for insert: ' . $conn->error); }
    $stmt_insert->bind_param('iidssii',
        $client_refunds_client_id,
        $client_refunds_method_id,
        $client_refunds_amount,
        $client_refunds_date,
        $client_refunds_notes,
        $rep_user_id,
        $client_refunds_safe_id
    );
    if (!$stmt_insert->execute()) { throw new Exception('Error inserting refund: ' . $stmt_insert->error); }
    $new_refund_id = $stmt_insert->insert_id;
    $stmt_insert->close();

    // Decrease client's credit_balance (money going out back to client)
    $stmt_update_client = $conn->prepare("UPDATE clients SET clients_credit_balance = clients_credit_balance - ? WHERE clients_id = ?");
    if (!$stmt_update_client) { throw new Exception('Prepare failed for client balance: ' . $conn->error); }
    $stmt_update_client->bind_param('di', $client_refunds_amount, $client_refunds_client_id);
    if (!$stmt_update_client->execute()) { throw new Exception('Error updating client balance: ' . $stmt_update_client->error); }
    $stmt_update_client->close();

    // Safe balances
    $bal_stmt = $conn->prepare("SELECT safes_balance FROM safes WHERE safes_id = ? LIMIT 1");
    if (!$bal_stmt) { throw new Exception('Prepare failed for balance fetch: ' . $conn->error); }
    $bal_stmt->bind_param('i', $client_refunds_safe_id);
    $bal_stmt->execute();
    $bal_res = $bal_stmt->get_result()->fetch_assoc();
    $bal_stmt->close();
    $balance_before = isset($bal_res['safes_balance']) ? (float)$bal_res['safes_balance'] : 0.0;
    $balance_after = $balance_before - (float)$client_refunds_amount;

    // Insert safe transaction (money out)
    $safe_desc = 'Client refund (Refund ID: ' . $new_refund_id . ')';
    $safe_ref = 'refunds#' . $new_refund_id;
    $safe_type = 'payment'; // using 'payment' to denote cash going out
    $related_table = 'refunds';

    $stmt_safe_transaction = $conn->prepare("INSERT INTO safe_transactions (
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");

    if (!$stmt_safe_transaction) { throw new Exception('Prepare failed for safe transaction insert: ' . $conn->error); }

    $stmt_safe_transaction->bind_param(
        'isdddsssisi',
        $client_refunds_safe_id,
        $safe_type,
        $client_refunds_amount,
        $balance_before,
        $balance_after,
        $safe_desc,
        $safe_ref,
        $client_refunds_date,
        $rep_user_id,
        $related_table,
        $new_refund_id
    );

    if (!$stmt_safe_transaction->execute()) { throw new Exception('Error inserting safe transaction: ' . $stmt_safe_transaction->error); }
    $new_safe_transaction_id = $stmt_safe_transaction->insert_id;
    $stmt_safe_transaction->close();

    // Back reference
    $stmt_update_refund_tx = $conn->prepare("UPDATE refunds SET refunds_safe_transaction_id = ? WHERE refunds_id = ?");
    if (!$stmt_update_refund_tx) { throw new Exception('Prepare failed to update refund tx id: ' . $conn->error); }
    $stmt_update_refund_tx->bind_param('ii', $new_safe_transaction_id, $new_refund_id);
    if (!$stmt_update_refund_tx->execute()) { throw new Exception('Error updating refund tx id: ' . $stmt_update_refund_tx->error); }
    $stmt_update_refund_tx->close();

    // Update safe balance (decrease)
    $stmt_update_safe = $conn->prepare("UPDATE safes SET safes_balance = safes_balance - ? WHERE safes_id = ?");
    if (!$stmt_update_safe) { throw new Exception('Prepare failed for safe balance: ' . $conn->error); }
    $stmt_update_safe->bind_param('di', $client_refunds_amount, $client_refunds_safe_id);
    if (!$stmt_update_safe->execute()) { throw new Exception('Error updating safe balance: ' . $stmt_update_safe->error); }
    $stmt_update_safe->close();

    $conn->commit();

    // Sync to Odoo (non-blocking)
    $odoo_refund_id = null;
    try {
        require_once __DIR__ . '/../odoo/sync_transactions.php';
        if (function_exists('isOdooIntegrationEnabled') && isOdooIntegrationEnabled()) {
            $odoo_refund_id = syncRefund($new_refund_id);
            if ($odoo_refund_id) {
                error_log("Refund $new_refund_id synced to Odoo: ID $odoo_refund_id");
            }
        }
    } catch (Exception $odooEx) {
        error_log("Odoo refund sync failed (non-blocking): " . $odooEx->getMessage());
    }

    print_success('Client refund added successfully.', [
        'client_refunds_id' => $new_refund_id,
        'odoo_refund_id' => $odoo_refund_id
    ]);

} catch (Exception $e) {
    $conn->rollback();
    print_failure('Internal Error: ' . $e->getMessage());
} finally {
    if (isset($conn)) { $conn->close(); }
}

?>
