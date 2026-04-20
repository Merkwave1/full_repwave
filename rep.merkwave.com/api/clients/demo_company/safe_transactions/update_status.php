<?php
/**
 * Approve or reject a pending transaction
 * POST /safe_transactions/update_status.php
 * 
 * Expected payload:
 * {
 *   "transaction_id": 123,
 *   "status": "approved" or "rejected",
 *   "notes": "Optional approval/rejection notes"
 * }
 */

// Explicit CORS headers (needed BEFORE early OPTIONS exit)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, User-UUID, X-User-UUID, x-user-uuid');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'ok', 'message' => 'Preflight OK']);
    exit;
}

// db_connect.php already includes functions.php and sends base CORS headers
include_once '../db_connect.php';
require_once '../notifications/notify_helpers.php';

// Include Odoo sync for expenses
require_once __DIR__ . '/../odoo/sync_transactions.php';

    // Unified UUID retrieval similar to sales_deliveries/add.php
    $input = null;
    $uuid = $_POST['users_uuid'] ?? $_GET['users_uuid'] ?? null;
    if (!$uuid) {
        $rawBody = file_get_contents('php://input');
        $tmp = json_decode($rawBody, true);
        if (is_array($tmp)) {
            $input = $tmp;
            $uuid = $input['users_uuid'] ?? null;
        }
    }

    if (!$uuid) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'UUID is required']);
        exit;
    }

// Get user info by UUID
$user_stmt = $conn->prepare("SELECT users_id, users_role, users_name FROM users WHERE users_uuid = ?");
if (!$user_stmt) {
    echo json_encode(['status' => 'error', 'message' => 'Database prepare failed']);
    exit;
}

$user_stmt->bind_param("s", $uuid);
$user_stmt->execute();
$user_result = $user_stmt->get_result();

if ($user_result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Invalid UUID']);
    exit;
}

$user_info = $user_result->fetch_assoc();

try {
    if (!in_array($user_info['users_role'], ['admin', 'cash'])) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Access denied. Admin or Cash privileges required']);
        exit;
    }

    if (!is_array($input)) {
        $input = $_POST ?: [];
    }

    $transaction_id = $input['transaction_id'] ?? ($_POST['transaction_id'] ?? null);
    $new_status = $input['status'] ?? ($_POST['status'] ?? null);
    $notesRaw = $input['notes'] ?? ($_POST['notes'] ?? '');

    if (!$transaction_id || !$new_status) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Transaction ID and status are required']);
        exit;
    }

    $transaction_id = (int)$transaction_id;
    if ($transaction_id <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid transaction id']);
        exit;
    }

    if (!in_array($new_status, ['approved', 'rejected'], true)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Status must be "approved" or "rejected"']);
        exit;
    }

    $notes = is_string($notesRaw) ? trim($notesRaw) : '';

    $inTransaction = false;

    $conn->begin_transaction();
    $inTransaction = true;

    $fetchSql = "
        SELECT st.*, s.safes_balance AS current_safe_balance, s.safes_name, s.safes_type
        FROM safe_transactions st
        JOIN safes s ON st.safe_transactions_safe_id = s.safes_id
        WHERE st.safe_transactions_id = ? AND st.safe_transactions_status = 'pending'
        FOR UPDATE
    ";

    $fetchStmt = $conn->prepare($fetchSql);
    if (!$fetchStmt) {
        throw new Exception('Prepare failed (select primary): ' . $conn->error);
    }
    $fetchStmt->bind_param('i', $transaction_id);
    $fetchStmt->execute();
    $primaryResult = $fetchStmt->get_result();
    if ($primaryResult->num_rows === 0) {
        http_response_code(409);
        echo json_encode(['status' => 'error', 'message' => 'Transaction not found or no longer pending.']);
        $conn->rollback();
        exit;
    }
    $primary = $primaryResult->fetch_assoc();
    $fetchStmt->close();

    $transactions = [];
    $transactions[$primary['safe_transactions_id']] = $primary;

    $relatedId = isset($primary['safe_transactions_related_id']) ? (int)$primary['safe_transactions_related_id'] : null;
    if ($relatedId && $relatedId !== (int)$primary['safe_transactions_id']) {
        $relStmt = $conn->prepare($fetchSql);
        if (!$relStmt) {
            throw new Exception('Prepare failed (select related): ' . $conn->error);
        }
        $relStmt->bind_param('i', $relatedId);
        $relStmt->execute();
        $relResult = $relStmt->get_result();
        if ($relResult->num_rows > 0) {
            $relatedRow = $relResult->fetch_assoc();
            if ($relatedRow['safe_transactions_status'] !== 'pending') {
                http_response_code(409);
                echo json_encode(['status' => 'error', 'message' => 'Related transaction already processed.']);
                $conn->rollback();
                exit;
            }
            $transactions[$relatedRow['safe_transactions_id']] = $relatedRow;
        }
        $relStmt->close();
    }

    if (count($transactions) === 1) {
        $reverseSql = "
            SELECT st.*, s.safes_balance AS current_safe_balance, s.safes_name, s.safes_type
            FROM safe_transactions st
            JOIN safes s ON st.safe_transactions_safe_id = s.safes_id
            WHERE st.safe_transactions_related_id = ?
              AND st.safe_transactions_id <> ?
              AND st.safe_transactions_status = 'pending'
            FOR UPDATE
        ";
        $reverseStmt = $conn->prepare($reverseSql);
        if ($reverseStmt) {
            $reverseStmt->bind_param('ii', $transaction_id, $transaction_id);
            $reverseStmt->execute();
            $reverseResult = $reverseStmt->get_result();
            if ($reverseResult && $reverseResult->num_rows > 0) {
                while ($row = $reverseResult->fetch_assoc()) {
                    $transactions[$row['safe_transactions_id']] = $row;
                }
            }
            $reverseStmt->close();
        }
    }

    if (empty($transactions)) {
        http_response_code(409);
        echo json_encode(['status' => 'error', 'message' => 'No pending transactions found to update.']);
        $conn->rollback();
        exit;
    }

    $debit_types = ['withdrawal', 'transfer_out', 'payment', 'supplier_payment', 'purchase', 'expense'];
    $credit_types = ['deposit', 'transfer_in', 'receipt', 'sale'];

    $updateSafeStmt = $conn->prepare('UPDATE safes SET safes_balance = ?, safes_updated_at = NOW() WHERE safes_id = ?');
    if (!$updateSafeStmt) {
        throw new Exception('Prepare failed (update safe): ' . $conn->error);
    }

    $updateTxnStmt = $conn->prepare("\n        UPDATE safe_transactions \n        SET safe_transactions_status = ?,\n            safe_transactions_approved_by = ?,\n            safe_transactions_approved_date = NOW(),\n            safe_transactions_balance_before = ?,\n            safe_transactions_balance_after = ?,\n            safe_transactions_description = CASE\n                WHEN ? <> '' THEN TRIM(CONCAT_WS('\\n', NULLIF(safe_transactions_description, ''), CONCAT('[Admin note: ', ?, ']')))\n                ELSE safe_transactions_description\n            END\n        WHERE safe_transactions_id = ?\n    ");
    if (!$updateTxnStmt) {
        throw new Exception('Prepare failed (update transaction): ' . $conn->error);
    }

    $balancesCache = [];
    $updatedSafes = [];
    $updatedTransactionIds = [];
    $notifiedUsers = [];

    foreach ($transactions as $txnId => $txn) {
        $txnId = (int)$txnId;
        $safeId = (int)$txn['safe_transactions_safe_id'];
        $currentBalance = array_key_exists($safeId, $balancesCache)
            ? $balancesCache[$safeId]
            : (float)$txn['current_safe_balance'];

        $amount = (float)$txn['safe_transactions_amount'];
        $type = strtolower($txn['safe_transactions_type']);
        $balanceAfter = $currentBalance;

        if ($new_status === 'approved') {
            if (in_array($type, $debit_types, true)) {
                if ($currentBalance < $amount) {
                    throw new Exception('Insufficient balance in safe #' . $safeId . ' to approve this transaction.');
                }
                $balanceAfter = $currentBalance - $amount;
            } elseif (in_array($type, $credit_types, true)) {
                $balanceAfter = $currentBalance + $amount;
            } else {
                $balanceAfter = $currentBalance + $amount;
            }

            $updateSafeStmt->bind_param('di', $balanceAfter, $safeId);
            $updateSafeStmt->execute();
            $balancesCache[$safeId] = $balanceAfter;
            $updatedSafes[$safeId] = [
                'safe_id' => $safeId,
                'balance_after' => $balanceAfter,
                'safe_name' => $txn['safes_name'] ?? null,
                'safe_type' => $txn['safes_type'] ?? null,
            ];
        } else {
            $balancesCache[$safeId] = $currentBalance;
        }

        $updateTxnStmt->bind_param(
            'siddssi',
            $new_status,
            $user_info['users_id'],
            $currentBalance,
            $balanceAfter,
            $notes,
            $notes,
            $txnId
        );
        if (!$updateTxnStmt->execute()) {
            throw new Exception('Failed to update transaction #' . $txnId . ': ' . $updateTxnStmt->error);
        }

        $updatedTransactionIds[] = $txnId;
        if (!empty($txn['safe_transactions_created_by'])) {
            $creatorId = (int)$txn['safe_transactions_created_by'];
            if ($creatorId > 0) {
                if (!isset($notifiedUsers[$creatorId])) {
                    $notifiedUsers[$creatorId] = [];
                }
                $notifiedUsers[$creatorId][$txnId] = $txn;
            }
        }
    }

    $conn->commit();
    $inTransaction = false;

    // Sync approved expenses, deposits (income) and transfers to Odoo
    if ($new_status === 'approved') {
        foreach ($transactions as $txnId => $txn) {
            $type = strtolower($txn['safe_transactions_type'] ?? '');
            try {
                if ($type === 'expense' || $type === 'deposit') {
                    // Sync expense/deposit (income) to Odoo
                    $odoo_result = syncExpense((int)$txnId);
                    if ($odoo_result) {
                        error_log("$type $txnId synced to Odoo: $odoo_result");
                    }
                } elseif ($type === 'transfer_out') {
                    // Sync transfer to Odoo
                    $odoo_result = syncSafeTransfer((int)$txnId);
                    if ($odoo_result) {
                        error_log("Transfer $txnId synced to Odoo: $odoo_result");
                    }
                }
            } catch (Exception $syncEx) {
                // Log error but don't fail the approval
                error_log("Odoo sync error for transaction $txnId: " . $syncEx->getMessage());
            }
        }
    }

    $message = $new_status === 'approved' ? 'تمت الموافقة على التحويل.' : 'تم رفض التحويل.';
    foreach ($notifiedUsers as $userId => $transactionsForUser) {
        if (empty($transactionsForUser)) {
            continue;
        }

        $preferredTxn = null;
        foreach ($transactionsForUser as $candidate) {
            if (strtolower((string)$candidate['safe_transactions_type']) === 'transfer_out') {
                $preferredTxn = $candidate;
                break;
            }
        }
        if ($preferredTxn === null) {
            $preferredTxn = reset($transactionsForUser);
        }

        $txnAmount = isset($preferredTxn['safe_transactions_amount']) ? (float)$preferredTxn['safe_transactions_amount'] : 0.0;
        $txnSafeName = $preferredTxn['safes_name'] ?? ('خزنة #' . ($preferredTxn['safe_transactions_safe_id'] ?? ''));
        $txnType = strtolower((string)($preferredTxn['safe_transactions_type'] ?? ''));

        $title = $new_status === 'approved' ? 'تمت الموافقة على طلبك' : 'تم رفض طلبك';
        $actionText = $new_status === 'approved' ? 'تمت الموافقة على طلبك' : 'تم رفض طلبك';
        $body = sprintf(
            '%s لعملية %s بقيمة %s على %s.',
            $actionText,
            $txnType ?: 'الخزنة',
            number_format($txnAmount, 2, '.', ''),
            $txnSafeName
        );

        $data = [
            'transaction_id' => (int)($preferredTxn['safe_transactions_id'] ?? 0),
            'status' => $new_status,
            'safe_id' => (int)($preferredTxn['safe_transactions_safe_id'] ?? 0),
            'amount' => $txnAmount,
            'type' => $txnType,
            'notes' => $notes,
        ];

        create_notification($conn, (int)$userId, $title, $body, $data, 'in_app', 'normal', 'safe_transactions', (int)($preferredTxn['safe_transactions_id'] ?? 0));
    }

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => $message,
        'data' => [
            'transaction_ids' => array_values($updatedTransactionIds),
            'status' => $new_status,
            'approved_by' => $user_info['users_name'],
            'notes' => $notes,
            'updated_safes' => array_values($updatedSafes),
        ],
    ]);

} catch (Throwable $e) {
    if (isset($inTransaction) && $inTransaction) {
        try {
            $conn->rollback();
        } catch (Throwable $rollbackEx) {
            // ignore
        }
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to update transaction: ' . $e->getMessage()]);
}

if (isset($updateSafeStmt) && $updateSafeStmt instanceof mysqli_stmt) {
    $updateSafeStmt->close();
}
if (isset($updateTxnStmt) && $updateTxnStmt instanceof mysqli_stmt) {
    $updateTxnStmt->close();
}

$conn->close();
?>
