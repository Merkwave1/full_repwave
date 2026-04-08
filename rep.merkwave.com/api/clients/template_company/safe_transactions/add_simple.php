<?php
header('Content-Type: application/json');
require_once '../db_connect.php';
require_once '../functions.php';

// Simple add endpoint for safe transactions (multipart/form-data)
// Expected POST fields: users_uuid, safe_id, amount, description (optional), image (optional file)

function json_ok($msg, $data = null) {
    echo json_encode(['status' => 'success', 'message' => $msg, 'data' => $data]);
    exit;
}

function json_fail($msg) {
    echo json_encode(['status' => 'error', 'message' => $msg, 'data' => 'No data']);
    exit;
}

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_fail('Only POST requests are allowed');
}

try {
    // Accept form-data (preferred) or JSON
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true) ?: [];

    // users_uuid can be in form-data or JSON or headers
    $users_uuid = $_POST['users_uuid'] ?? $json['users_uuid'] ?? null;
    if (!$users_uuid) {
        $headers = getallheaders();
        $users_uuid = $headers['User-UUID'] ?? $headers['x-user-uuid'] ?? null;
    }
    if (!$users_uuid) json_fail('users_uuid is required');

    // Basic params
    $safe_id = isset($_POST['safe_id']) ? intval($_POST['safe_id']) : (isset($json['safe_id']) ? intval($json['safe_id']) : 0);
    $amount = isset($_POST['amount']) ? floatval($_POST['amount']) : (isset($json['amount']) ? floatval($json['amount']) : 0);
    $description = $_POST['description'] ?? ($json['description'] ?? '');
    $account_id = isset($_POST['account_id']) ? intval($_POST['account_id']) : (isset($json['account_id']) ? intval($json['account_id']) : null);

    if ($safe_id <= 0) json_fail('safe_id is required');
    if ($amount <= 0) json_fail('amount must be greater than 0');

    // Lookup user
    $u = $conn->prepare('SELECT users_id, users_role FROM users WHERE users_uuid = ? LIMIT 1');
    $u->bind_param('s', $users_uuid);
    $u->execute();
    $ures = $u->get_result();
    if ($ures->num_rows === 0) json_fail('Invalid users_uuid');
    $user = $ures->fetch_assoc();
    $user_id = intval($user['users_id']);

    // Lookup safe
    $s = $conn->prepare('SELECT safes_id, safes_balance FROM safes WHERE safes_id = ? LIMIT 1');
    $s->bind_param('i', $safe_id);
    $s->execute();
    $sres = $s->get_result();
    if ($sres->num_rows === 0) json_fail('Safe not found');
    $safe = $sres->fetch_assoc();
    $balance_before = floatval($safe['safes_balance']);

    // Handle optional image file (field name: image)
    $image_path = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
        try {
            $image_path = handle_file_upload($_FILES['image'], 'receipts', ['image/jpeg','image/png','image/gif','image/webp'], 5 * 1024 * 1024);
        } catch (Exception $e) {
            json_fail('Image upload failed: ' . $e->getMessage());
        }
    }

    // Compute new balance assuming this is an expense (debit)
    $balance_after = $balance_before - $amount;

    // Insert transaction and update safe within DB transaction
    $conn->autocommit(false);
    try {
        $ins = $conn->prepare('INSERT INTO safe_transactions (
            safe_transactions_safe_id,
            safe_transactions_type,
            safe_transactions_payment_method_id,
            safe_transactions_amount,
            safe_transactions_balance_before,
            safe_transactions_balance_after,
            safe_transactions_description,
            safe_transactions_receipt_image,
            safe_transactions_status,
            safe_transactions_created_by,
            safe_transactions_account_id,
            safe_transactions_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');

        $type = 'expense';
        $payment_method_id = 1;
        $status = 'approved';

        $ins->bind_param('isidddsssii', $safe_id, $type, $payment_method_id, $amount, $balance_before, $balance_after, $description, $image_path, $status, $user_id, $odoo_account_id);
        $ins->execute();
        $tx_id = $conn->insert_id;

        $upd = $conn->prepare('UPDATE safes SET safes_balance = ?, safes_updated_at = NOW() WHERE safes_id = ?');
        $upd->bind_param('di', $balance_after, $safe_id);
        $upd->execute();

        $conn->commit();

        json_ok('Transaction added', ['transaction_id' => $tx_id, 'safe_id' => $safe_id, 'new_balance' => $balance_after]);
    } catch (Exception $e) {
        $conn->rollback();
        if ($image_path && file_exists('../' . $image_path)) unlink('../' . $image_path);
        json_fail('Failed to add transaction: ' . $e->getMessage());
    }

} catch (Exception $e) {
    json_fail('Internal error: ' . $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->autocommit(true);
    if (isset($conn) && $conn) $conn->close();
}

?>
