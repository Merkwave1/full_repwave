<?php
// Simplified add_with_receipt.php
// Accepts POST (form-data or application/json) to add a safe transaction with optional receipt image.

require_once '../db_connect.php';
require_once '../functions.php';
require_once '../notifications/notify_helpers.php';

header('Content-Type: application/json');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function json_error($msg) {
    echo json_encode(['status' => 'error', 'message' => $msg, 'data' => null]);
    exit;
}

function json_success($msg, $data = []) {
    echo json_encode(['status' => 'success', 'message' => $msg, 'data' => $data]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Only POST requests are allowed');
}

try {
    // Get users_uuid from header or POST/JSON
    $headers = getallheaders();
    $uuid = $headers['User-UUID'] ?? $headers['x-user-uuid'] ?? null;
    if (!$uuid) {
        $uuid = $_POST['users_uuid'] ?? null;
    }
    if (!$uuid) {
        // Try raw JSON
        $raw = file_get_contents('php://input');
        $json = json_decode($raw, true);
        $uuid = $json['users_uuid'] ?? $uuid;
    }
    if (!$uuid) json_error('Authentication failed: users_uuid is required');

    // Fetch user
    $stmt = $conn->prepare('SELECT users_id, users_role, users_name FROM users WHERE users_uuid = ? LIMIT 1');
    $stmt->bind_param('s', $uuid);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) json_error('Invalid user UUID');
    $user = $res->fetch_assoc();
    $user_id = (int)$user['users_id'];
    $user_role = $user['users_role'] ?? '';

    // Accept input (form-data) or JSON
    $input = [];
    if (!empty($_POST)) {
        $input = $_POST;
    } else {
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true) ?: [];
    }

    // required fields
    $safe_id = isset($input['safe_id']) ? (int)$input['safe_id'] : 0;
    $type = isset($input['type']) ? trim($input['type']) : '';
    $amount = isset($input['amount']) ? (float)$input['amount'] : 0.0;
    $description = isset($input['description']) ? trim($input['description']) : '';
    $reference = isset($input['reference']) ? trim($input['reference']) : '';
    $account_id = isset($input['account_id']) ? (int)$input['account_id'] : null;

    if ($safe_id <= 0) json_error('Field safe_id is required');
    if ($type === '') json_error('Field type is required');
    if ($amount <= 0) json_error('Field amount must be greater than 0');

    // Fetch safe
    $s = $conn->prepare('SELECT safes_id, safes_name, safes_balance, safes_type, safes_rep_user_id, safes_payment_method_id FROM safes WHERE safes_id = ? LIMIT 1');
    $s->bind_param('i', $safe_id);
    $s->execute();
    $safe_res = $s->get_result();
    if ($safe_res->num_rows === 0) json_error('Safe not found');
    $safe = $safe_res->fetch_assoc();
    $balance_before = (float)$safe['safes_balance'];
    $payment_method_id = isset($safe['safes_payment_method_id']) ? (int)$safe['safes_payment_method_id'] : 1;

    // Simple permission: allow any authenticated user. If safe is a rep safe, only owner or admins/managers/cash can modify.
    if ($safe['safes_type'] === 'rep' && (int)$safe['safes_rep_user_id'] !== $user_id && !in_array($user_role, ['admin', 'manager', 'cash'])) {
        json_error('Access denied: You cannot access this rep safe');
    }

    // Handle optional receipt upload
    $receipt_path = null;
    if (isset($_FILES['receipt_image']) && $_FILES['receipt_image']['error'] !== UPLOAD_ERR_NO_FILE) {
        try {
            $receipt_path = handle_file_upload(
                $_FILES['receipt_image'],
                'receipts',
                ['image/jpeg','image/png','image/gif','image/webp'],
                5 * 1024 * 1024
            );
        } catch (Exception $e) {
            json_error('Receipt upload failed: ' . $e->getMessage());
        }
    }

    // Determine new balance: treat certain types as debit
    $debit_types = ['withdrawal','payment','expense','supplier_payment','transfer_out','purchase'];
    $credit_types = ['deposit','receipt','transfer_in','sale'];
    if (in_array($type, $debit_types)) {
        $balance_after = $balance_before - $amount;
    } elseif (in_array($type, $credit_types)) {
        $balance_after = $balance_before + $amount;
    } else {
        // default: credit
        $balance_after = $balance_before + $amount;
    }

    // Determine status: only reps/store_keeper submitting expense -> pending
    // Cash role and deposit/income transactions auto-approve
    $status = 'approved';
    $pending_roles = ['rep', 'store_keeper'];
    if (in_array($user_role, $pending_roles) && $type === 'expense') {
        $status = 'pending';
    }

    // Insert transaction within DB transaction
    $conn->begin_transaction();
    try {
        $ins = $conn->prepare("INSERT INTO safe_transactions (
            safe_transactions_safe_id,
            safe_transactions_type,
            safe_transactions_payment_method_id,
            safe_transactions_amount,
            safe_transactions_balance_before,
            safe_transactions_balance_after,
            safe_transactions_description,
            safe_transactions_reference,
            safe_transactions_receipt_image,
            safe_transactions_status,
            safe_transactions_created_by,
            safe_transactions_account_id,
            safe_transactions_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");

        $ins->bind_param('isidddssssii',
            $safe_id,
            $type,
            $payment_method_id,
            $amount,
            $balance_before,
            $balance_after,
            $description,
            $reference,
            $receipt_path,
            $status,
            $user_id,
            $account_id
        );
        $ins->execute();
        $tx_id = $conn->insert_id;

        if ($status === 'approved') {
            $upd = $conn->prepare('UPDATE safes SET safes_balance = ?, safes_updated_at = NOW() WHERE safes_id = ?');
            $upd->bind_param('di', $balance_after, $safe_id);
            $upd->execute();
        }

        $conn->commit();

        if ($status === 'pending') {
            try {
                $title = 'طلب اعتماد عملية على الخزنة';
                $body = sprintf(
                    '%s طلب %s بقيمة %s على الخزنة %s ويحتاج إلى موافقتك.',
                    $user['users_name'] ?? 'مستخدم',
                    $type,
                    number_format((float)$amount, 2, '.', ''),
                    $safe['safes_name'] ?? ('خزنة #' . $safe_id)
                );
                $data = [
                    'transaction_id' => $tx_id,
                    'safe_id' => $safe_id,
                    'safe_name' => $safe['safes_name'] ?? null,
                    'amount' => (float)$amount,
                    'type' => $type,
                    'requested_by_user_id' => $user_id,
                    'status' => $status,
                ];
                create_notification_for_role($conn, 'admin', $title, $body, $data, 'in_app', 'high', 'safe_transactions', $tx_id);
            } catch (Throwable $notifyEx) {
                error_log('Failed to create pending safe transaction notification: ' . $notifyEx->getMessage());
            }
        }

        // Sync to Odoo immediately if auto-approved (for cash role or admin)
        if ($status === 'approved' && in_array($type, ['expense', 'deposit'])) {
            try {
                $odoo_sync_file = __DIR__ . '/../odoo/sync_transactions.php';
                if (file_exists($odoo_sync_file)) {
                    require_once $odoo_sync_file;
                    if (function_exists('syncExpense')) {
                        $odoo_result = syncExpense($tx_id);
                        if ($odoo_result) {
                            error_log("Auto-approved $type $tx_id synced to Odoo: $odoo_result");
                        }
                    }
                }
            } catch (Throwable $syncEx) {
                error_log("Odoo sync error for auto-approved transaction $tx_id: " . $syncEx->getMessage());
            }
        }

        json_success('Safe transaction added', [
            'transaction_id' => $tx_id,
            'safe_id' => $safe_id,
            'new_balance' => $balance_after,
            'status' => $status,
            'approval_required' => $status === 'pending'
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        if ($receipt_path && file_exists('../' . $receipt_path)) unlink('../' . $receipt_path);
        json_error('Failed to add transaction: ' . $e->getMessage());
    }

} catch (Exception $e) {
    json_error('Internal error: ' . $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}

?>
