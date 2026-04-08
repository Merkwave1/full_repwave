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

    // Get user info by UUID (using mysqli like other functions)
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

    // Check permissions - only managers, admins and cash role can add safes
    if (!in_array($user_info['users_role'], ['manager', 'admin', 'cash'])) {
        echo json_encode(['status' => 'error', 'message' => 'Access denied: Insufficient permissions']);
        exit;
    }

    // Get JSON input
    $json_input = file_get_contents('php://input');
    $input_data = json_decode($json_input, true);

    if (!$input_data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid JSON input']);
        exit;
    }

    // Validate required fields
    $required_fields = ['name', 'type'];
    foreach ($required_fields as $field) {
        if (!isset($input_data[$field]) || trim($input_data[$field]) === '') {
            echo json_encode(['status' => 'error', 'message' => "Field '$field' is required"]);
            exit;
        }
    }

    // Validate safe type (allow company, rep, store_keeper, cash)
    $valid_types = ['company', 'rep', 'store_keeper', 'cash'];
    $safe_type = trim($input_data['type']);
    if (!in_array($safe_type, $valid_types)) {
        echo json_encode(['status' => 'error', 'message' => "Invalid safe type. Must be one of: " . implode(', ', $valid_types)]);
        exit;
    }

    // Validate rep_user_id for rep, store_keeper, or cash safes
    $rep_user_id = null;
    if ($safe_type === 'rep' || $safe_type === 'store_keeper' || $safe_type === 'cash') {
        if (!isset($input_data['rep_user_id']) || trim($input_data['rep_user_id']) === '') {
            echo json_encode(['status' => 'error', 'message' => 'rep_user_id is required for rep, store_keeper, or cash safes']);
            exit;
        }
        
        $rep_user_id = intval($input_data['rep_user_id']);
        
        // Validate rep_user_id exists and has appropriate role
        $user_check_stmt = $pdo->prepare("SELECT users_id, users_role FROM users WHERE users_id = ?");
        $user_check_stmt->execute([$rep_user_id]);
        $user_data = $user_check_stmt->fetch();
        if (!$user_data) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid rep_user_id']);
            exit;
        }

        $db_role = strtolower(trim((string)$user_data['users_role']));
        if ($safe_type === 'rep') {
            if ($db_role !== 'rep' && $db_role !== 'sales_rep') {
                echo json_encode(['status' => 'error', 'message' => 'Selected user is not a sales representative']);
                exit;
            }
        } elseif ($safe_type === 'cash') {
            if ($db_role !== 'cash') {
                echo json_encode(['status' => 'error', 'message' => 'Selected user is not a cash role']);
                exit;
            }
        } else { // store_keeper
            if (!in_array($db_role, ['store_keeper', 'store', 'storekeeper'])) {
                echo json_encode(['status' => 'error', 'message' => 'Selected user is not a store keeper']);
                exit;
            }
        }
    } elseif ($safe_type === 'company') {
        // Company safes should not have rep_user_id
        if (isset($input_data['rep_user_id']) && $input_data['rep_user_id'] !== null) {
            echo json_encode(['status' => 'error', 'message' => 'Company safes cannot be assigned to a representative']);
            exit;
        }
    }

    // Prepare data
    $name = trim($input_data['name']);
    $description = trim($input_data['description'] ?? '');
    $initial_balance = floatval($input_data['initial_balance'] ?? 0);
    $payment_method_id = intval($input_data['payment_method_id'] ?? 1); // Default to Cash
    $is_active = isset($input_data['is_active']) ? intval($input_data['is_active']) : 1;
    $color = trim($input_data['color'] ?? 'white'); // Default to white
    
    // Validate color (must match enum values)
    $valid_colors = ['white', 'black', 'lightgray', 'gray', 'blue', 'green', 'red', 'yellow', 'orange', 'beige'];
    if (!in_array($color, $valid_colors)) {
        $color = 'white'; // Fallback to default if invalid
    }

    // Check if safe name already exists
    $name_check_stmt = $pdo->prepare("SELECT safes_id FROM safes WHERE safes_name = ?");
    $name_check_stmt->execute([$name]);
    if ($name_check_stmt->fetch()) {
        echo json_encode(['status' => 'error', 'message' => 'Safe name already exists']);
        exit;
    }

    // Start transaction
    $pdo->beginTransaction();

    try {
        // Insert the safe
        $insert_stmt = $pdo->prepare("
            INSERT INTO safes (
                safes_name,
                safes_description,
                safes_balance,
                safes_type,
                safes_rep_user_id,
                safes_payment_method_id,
                safes_is_active,
                safes_color,
                safes_created_at,
                safes_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        $insert_stmt->execute([
            $name,
            $description,
            $initial_balance,
            $safe_type,
            $rep_user_id,
            $payment_method_id,
            $is_active,
            $color
        ]);

        $safe_id = $pdo->lastInsertId();

        // If there's an initial balance, create a safe transaction
        if ($initial_balance > 0) {
            $transaction_stmt = $pdo->prepare("
                INSERT INTO safe_transactions (
                    safe_transactions_safe_id,
                    safe_transactions_type,
                    safe_transactions_amount,
                    safe_transactions_balance_before,
                    safe_transactions_balance_after,
                    safe_transactions_description,
                    safe_transactions_reference,
                    safe_transactions_date,
                    safe_transactions_created_by
                ) VALUES (?, 'deposit', ?, 0, ?, 'Initial balance', CONCAT('INIT-', ?), NOW(), ?)
            ");

            $transaction_stmt->execute([
                $safe_id,
                $initial_balance,
                $initial_balance,
                $safe_id,
                $user_info['users_id']
            ]);
        }

        // Commit transaction
        $pdo->commit();

        // Return the created safe data
        $created_safe = [
            'safes_id' => $safe_id,
            'safes_name' => $name,
            'safes_description' => $description,
            'safes_balance' => $initial_balance,
            'safes_rep_user_id' => $rep_user_id,
            'safes_is_active' => $is_active,
            'safes_created_at' => date('Y-m-d H:i:s'),
            'safes_updated_at' => date('Y-m-d H:i:s')
        ];

        echo json_encode([
            'status' => 'success',
            'message' => 'Safe created successfully',
            'data' => $created_safe
        ]);

    } catch (Exception $e) {
        // Rollback transaction
        $pdo->rollback();
        throw $e;
    }

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
