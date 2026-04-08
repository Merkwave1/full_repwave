<?php
header('Content-Type: application/json');
require_once '../db_connect.php';
require_once '../functions.php';

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Only POST requests are allowed']);
    exit;
}

try {
    // Get and validate UUID from header or POST data
    $headers = getallheaders();
    $uuid = $headers['User-UUID'] ?? $headers['x-user-uuid'] ?? null;
    
    // If not in headers, try to get from POST data
    if (!$uuid) {
        $input = json_decode(file_get_contents('php://input'), true);
        $uuid = $input['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    }
    
    if (!$uuid) {
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
        echo json_encode(['status' => 'error', 'message' => 'Invalid UUID']);
        exit;
    }
    
    $user_info = $user_result->fetch_assoc();

    // Check permissions - only managers, admins, and reps can add transactions
    if (!in_array($user_info['users_role'], ['manager', 'admin', 'rep', 'cash'])) {
        echo json_encode(['status' => 'error', 'message' => 'Access denied: Insufficient permissions']);
        exit;
    }

    // Get and validate input
    $json_input = file_get_contents('php://input');
    $input_data = json_decode($json_input, true);

    if (!$input_data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid JSON input']);
        exit;
    }

    // Validate required fields
    $required_fields = ['safe_id', 'type', 'amount'];
    foreach ($required_fields as $field) {
        if (!isset($input_data[$field]) || trim($input_data[$field]) === '') {
            echo json_encode(['status' => 'error', 'message' => "Field '$field' is required"]);
            exit;
        }
    }

    // Validate transaction type
    $valid_types = ['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'payment', 'receipt', 
                   'supplier_payment', 'purchase', 'sale', 'expense', 'adjustment', 'other'];
    $transaction_type = trim($input_data['type']);
    if (!in_array($transaction_type, $valid_types)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid transaction type']);
        exit;
    }

    // Validate amount
    $amount = floatval($input_data['amount']);
    if ($amount <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Amount must be greater than 0']);
        exit;
    }

    // Get safe information and check permissions
    $safe_id = intval($input_data['safe_id']);
    $safe_stmt = $conn->prepare("SELECT safes_id, safes_name, safes_balance, safes_type, safes_rep_user_id FROM safes WHERE safes_id = ?");
    $safe_stmt->bind_param("i", $safe_id);
    $safe_stmt->execute();
    $safe_result = $safe_stmt->get_result();
    
    if ($safe_result->num_rows === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Safe not found']);
        exit;
    }
    
    $safe_data = $safe_result->fetch_assoc();
    
    // Check if user can access this safe
    if ($user_info['users_role'] === 'rep') {
        if ($safe_data['safes_type'] === 'rep' && $safe_data['safes_rep_user_id'] != $user_info['users_id']) {
            echo json_encode(['status' => 'error', 'message' => 'Access denied: You can only access your own safe']);
            exit;
        }
        if ($safe_data['safes_type'] === 'company') {
            echo json_encode(['status' => 'error', 'message' => 'Access denied: Reps cannot access company safes']);
            exit;
        }
    } elseif ($user_info['users_role'] === 'cash') {
        // Cash users can only access safes explicitly assigned to them
        $check_assigned_stmt = $conn->prepare("SELECT 1 FROM user_safes WHERE user_id = ? AND safe_id = ?");
        $check_assigned_stmt->bind_param("ii", $user_info['users_id'], $safe_id);
        $check_assigned_stmt->execute();
        if ($check_assigned_stmt->get_result()->num_rows === 0) {
            echo json_encode(['status' => 'error', 'message' => 'Access denied: You are not assigned to this safe']);
            exit;
        }
        $check_assigned_stmt->close();
    }

    // Validate payment method if provided
    $payment_method_id = isset($input_data['payment_method_id']) ? intval($input_data['payment_method_id']) : 1; // Default to Cash
    $payment_method_stmt = $conn->prepare("SELECT payment_methods_id FROM payment_methods WHERE payment_methods_id = ? AND payment_methods_is_active = 1");
    $payment_method_stmt->bind_param("i", $payment_method_id);
    $payment_method_stmt->execute();
    $payment_method_result = $payment_method_stmt->get_result();
    
    if ($payment_method_result->num_rows === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid payment method']);
        exit;
    }

    // Calculate new balance
    $current_balance = floatval($safe_data['safes_balance']);

    // Determine if this is a credit or debit transaction
    $credit_types = ['deposit', 'transfer_in', 'receipt', 'sale'];
    $is_credit = in_array($transaction_type, $credit_types);

    // Store the raw amount as a positive value but apply the correct balance change
    $transaction_amount = $amount;
    $balance_delta = $is_credit ? $amount : -$amount;
    $new_balance = $current_balance + $balance_delta;

    // Begin transaction
    $conn->autocommit(false);

    try {
        $description = $input_data['description'] ?? '';
        $reference = $input_data['reference'] ?? '';
        $account_id = isset($input_data['account_id']) ? (int)$input_data['account_id'] : null;
        
        // Insert transaction record
        $insert_stmt = $conn->prepare("
            INSERT INTO safe_transactions (
                safe_transactions_safe_id,
                safe_transactions_type,
                safe_transactions_payment_method_id,
                safe_transactions_amount,
                safe_transactions_balance_before,
                safe_transactions_balance_after,
                safe_transactions_description,
                safe_transactions_reference,
                safe_transactions_created_by,
                safe_transactions_account_id,
                safe_transactions_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $insert_stmt->bind_param(
            "isiddsssii",
            $safe_id,
            $transaction_type,
            $payment_method_id,
            $transaction_amount,
            $current_balance,
            $new_balance,
            $description,
            $reference,
            $user_info['users_id'],
            $account_id
        );
        
        $insert_stmt->execute();
        $transaction_id = $conn->insert_id;

        // Update safe balance
        $update_stmt = $conn->prepare("UPDATE safes SET safes_balance = ?, safes_updated_at = NOW() WHERE safes_id = ?");
        $update_stmt->bind_param("di", $new_balance, $safe_id);
        $update_stmt->execute();

        // Commit transaction
        $conn->commit();

        echo json_encode([
            'status' => 'success',
            'message' => 'Safe transaction added successfully',
            'data' => [
                'transaction_id' => $transaction_id,
                'safe_id' => $safe_id,
                'type' => $transaction_type,
                'amount' => $transaction_amount,
                'new_balance' => $new_balance,
                'payment_method_id' => $payment_method_id
            ]
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['status' => 'error', 'message' => 'Failed to add transaction: ' . $e->getMessage()]);
    }

} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollback();
    }
    echo json_encode(['status' => 'error', 'message' => 'Internal error: ' . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->autocommit(true);
        $conn->close();
    }
}
?>
