<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) { print_failure("Error: User UUID is required."); }

    // Find user and role
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

    // Assign/validate safe
    $client_payments_safe_id = $_POST['client_payments_safe_id'] ?? null;
    if ($role === 'rep') {
        // reps: auto safe by owner
        $stmt = $conn->prepare("SELECT safes_id FROM safes WHERE safes_rep_user_id = ? AND safes_type = 'rep' LIMIT 1");
        if (!$stmt) { throw new Exception("Prepare failed for safe lookup: " . $conn->error); }
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
            $client_payments_safe_id = $conn->insert_id;
            $create->close();
        } else {
            $client_payments_safe_id = $res->fetch_assoc()['safes_id'];
            $stmt->close();
        }
    } elseif ($role === 'cash') {
        // cash: must use assigned safes
        if (empty($client_payments_safe_id)) {
            // Try to get the first assigned safe as default
            $stmt = $conn->prepare("SELECT safe_id FROM user_safes WHERE user_id = ? LIMIT 1");
            $stmt->bind_param("i", $rep_user_id);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($res->num_rows > 0) {
                $client_payments_safe_id = $res->fetch_assoc()['safe_id'];
            } else {
                print_failure("Error: No safes assigned to this cash user.");
            }
            $stmt->close();
        } else {
            // Verify the provided safe is assigned to this user
            $stmt = $conn->prepare("SELECT 1 FROM user_safes WHERE user_id = ? AND safe_id = ?");
            $stmt->bind_param("ii", $rep_user_id, $client_payments_safe_id);
            $stmt->execute();
            if ($stmt->get_result()->num_rows === 0) {
                print_failure("Error: Access denied. You are not assigned to this safe.");
            }
            $stmt->close();
        }
    } else {
        if (empty($client_payments_safe_id) || !is_numeric($client_payments_safe_id) || $client_payments_safe_id <= 0) {
            print_failure("Error: Valid Safe ID is required.");
        }
    }

    $client_payments_client_id = $_POST['client_payments_client_id'] ?? null;
    $client_payments_method_id = $_POST['client_payments_method_id'] ?? null;
    $client_payments_amount    = $_POST['client_payments_amount'] ?? null;
    $client_payments_date      = $_POST['client_payments_date'] ?? date('Y-m-d');
    $client_payments_notes     = $_POST['client_payments_notes'] ?? null;
    $client_payments_reference_number = $_POST['client_payments_reference_number'] ?? null;

    if ($client_payments_notes === '') { $client_payments_notes = null; }
    if ($client_payments_reference_number === '') { $client_payments_reference_number = null; }

    // Validate
    if (empty($client_payments_client_id) || !is_numeric($client_payments_client_id) || $client_payments_client_id <= 0) { print_failure('Error: Valid Client ID is required.'); }
    if (empty($client_payments_method_id) || !is_numeric($client_payments_method_id) || $client_payments_method_id <= 0) { print_failure('Error: Valid Payment Method ID is required.'); }
    if (empty($client_payments_amount) || !is_numeric($client_payments_amount) || $client_payments_amount <= 0) { print_failure('Error: Valid Payment Amount is required.'); }
    if (!strtotime($client_payments_date)) { print_failure('Error: Invalid payment date.'); }

    $conn->begin_transaction();

    // Insert payment (using payments table schema)
    $stmt_insert = $conn->prepare("INSERT INTO payments (
        payments_client_id, payments_method_id, payments_amount, payments_date,
        payments_transaction_id, payments_notes, payments_rep_user_id, payments_safe_id,
        payments_visit_id, payments_created_at, payments_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())");
    if (!$stmt_insert) { throw new Exception('Prepare failed for insert: ' . $conn->error); }
    $stmt_insert->bind_param('iidsssii',
        $client_payments_client_id,
        $client_payments_method_id,
        $client_payments_amount,
        $client_payments_date,
        $client_payments_reference_number,
        $client_payments_notes,
        $rep_user_id,
        $client_payments_safe_id
    );
    if (!$stmt_insert->execute()) { throw new Exception('Error inserting payment: ' . $stmt_insert->error); }
    $new_payment_id = $stmt_insert->insert_id;
    $stmt_insert->close();

    // Update client's credit_balance (increase)
    $stmt_update_client = $conn->prepare("UPDATE clients SET clients_credit_balance = clients_credit_balance + ? WHERE clients_id = ?");
    if (!$stmt_update_client) { throw new Exception('Prepare failed for client balance: ' . $conn->error); }
    $stmt_update_client->bind_param('di', $client_payments_amount, $client_payments_client_id);
    if (!$stmt_update_client->execute()) { throw new Exception('Error updating client balance: ' . $stmt_update_client->error); }
    $stmt_update_client->close();

    // Fetch safe balance before to fill safe_transactions fields
    $bal_stmt = $conn->prepare("SELECT safes_balance FROM safes WHERE safes_id = ? LIMIT 1");
    if (!$bal_stmt) { throw new Exception('Prepare failed for balance fetch: ' . $conn->error); }
    $bal_stmt->bind_param('i', $client_payments_safe_id);
    $bal_stmt->execute();
    $bal_res = $bal_stmt->get_result()->fetch_assoc();
    $bal_stmt->close();
    $balance_before = isset($bal_res['safes_balance']) ? (float)$bal_res['safes_balance'] : 0.0;
    $balance_after = $balance_before + (float)$client_payments_amount;

    // Insert into safe_transactions (schema-aligned)
    $safe_desc = 'Client payment (Payment ID: ' . $new_payment_id . ')';
    $safe_ref = 'payments#' . $new_payment_id;
    $safe_type = 'receipt';
    $related_table = 'payments';

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
        $client_payments_safe_id,
        $safe_type,
        $client_payments_amount,
        $balance_before,
        $balance_after,
        $safe_desc,
        $safe_ref,
        $client_payments_date,
        $rep_user_id,
        $related_table,
        $new_payment_id
    );

    if (!$stmt_safe_transaction->execute()) { throw new Exception('Error inserting safe transaction: ' . $stmt_safe_transaction->error); }
    $new_safe_transaction_id = $stmt_safe_transaction->insert_id;
    $stmt_safe_transaction->close();

    // Back reference on payments
    $stmt_update_payment_tx = $conn->prepare("UPDATE payments SET payments_safe_transaction_id = ? WHERE payments_id = ?");
    if (!$stmt_update_payment_tx) { throw new Exception('Prepare failed to update payment tx id: ' . $conn->error); }
    $stmt_update_payment_tx->bind_param('ii', $new_safe_transaction_id, $new_payment_id);
    if (!$stmt_update_payment_tx->execute()) { throw new Exception('Error updating payment tx id: ' . $stmt_update_payment_tx->error); }
    $stmt_update_payment_tx->close();

    // Update safe balance (increase as money comes in)
    $stmt_update_safe = $conn->prepare("UPDATE safes SET safes_balance = safes_balance + ? WHERE safes_id = ?");
    if (!$stmt_update_safe) { throw new Exception('Prepare failed for safe balance: ' . $conn->error); }
    $stmt_update_safe->bind_param('di', $client_payments_amount, $client_payments_safe_id);
    if (!$stmt_update_safe->execute()) { throw new Exception('Error updating safe balance: ' . $stmt_update_safe->error); }
    $stmt_update_safe->close();

    $conn->commit();

    // Sync to Odoo (non-blocking)
    $odoo_payment_id = null;
    try {
        require_once __DIR__ . '/../odoo/sync_transactions.php';
        if (function_exists('isOdooIntegrationEnabled') && isOdooIntegrationEnabled()) {
            $odoo_payment_id = syncPayment($new_payment_id);
            if ($odoo_payment_id) {
                error_log("Payment $new_payment_id synced to Odoo: ID $odoo_payment_id");
            }
        }
    } catch (Exception $odooEx) {
        error_log("Odoo payment sync failed (non-blocking): " . $odooEx->getMessage());
    }

    print_success('Client payment added successfully.', [
        'client_payments_id' => $new_payment_id,
        'odoo_payment_id' => $odoo_payment_id
    ]);

} catch (Exception $e) {
    $conn->rollback();
    print_failure('Internal Error: ' . $e->getMessage());
} finally {
    if (isset($conn)) { $conn->close(); }
}

?>
