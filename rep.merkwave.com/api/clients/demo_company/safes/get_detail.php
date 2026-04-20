<?php
header('Content-Type: application/json');
require_once '../db_connect.php';
require_once '../functions.php';

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['status' => 'error', 'message' => 'Only GET requests are allowed']);
    exit;
}

try {
    // Get and validate UUID from query parameter or header
    $uuid = $_GET['users_uuid'] ?? null;
    if (!$uuid) {
        $headers = getallheaders();
        $uuid = $headers['User-UUID'] ?? null;
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
    $user_stmt->close();

    // Get safe ID from URL parameter
    $safe_id = $_GET['id'] ?? null;
    if (!$safe_id) {
        echo json_encode(['status' => 'error', 'message' => 'Safe ID is required']);
        exit;
    }

    // Build the query with all related information
    $query = "
        SELECT 
            s.safes_id,
            s.safes_name,
            s.safes_description,
            s.safes_balance,
            s.safes_rep_user_id,
            s.safes_payment_method_id,
            s.safes_is_active,
            s.safes_created_at,
            s.safes_updated_at,
            u.users_name as rep_user_name,
            u.users_role as rep_user_role,
            u.users_phone as rep_user_phone,
            u.users_email as rep_user_email,
            pm.payment_methods_name as payment_method_name,
            pm.payment_methods_description as payment_method_description,
            pm.payment_methods_type as payment_method_type,
            -- Recent transactions count
            (SELECT COUNT(*) FROM safe_transactions st 
             WHERE st.safe_transactions_safe_id = s.safes_id 
             AND st.safe_transactions_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as recent_transactions_count,
            -- Total transactions count
            (SELECT COUNT(*) FROM safe_transactions st 
             WHERE st.safe_transactions_safe_id = s.safes_id) as total_transactions_count,
            -- Last transaction date
            (SELECT MAX(st.safe_transactions_date) FROM safe_transactions st 
             WHERE st.safe_transactions_safe_id = s.safes_id) as last_transaction_date
        FROM safes s
        LEFT JOIN users u ON s.safes_rep_user_id = u.users_id
        LEFT JOIN payment_methods pm ON s.safes_payment_method_id = pm.payment_methods_id
        WHERE s.safes_id = ?
    ";

    $types = "i";
    $params = [$safe_id];

    // Apply access control based on user role
    if ($user_info['users_role'] === 'rep') {
        // Rep can only see their own safes
        $query .= " AND s.safes_rep_user_id = ?";
        $types .= "i";
        $params[] = $user_info['users_id'];
    }

    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $safe = $result->fetch_assoc();

    if (!$safe) {
        echo json_encode(['status' => 'error', 'message' => 'Safe not found or access denied']);
        exit;
    }

    // Format the response
    $formatted_safe = [
        'safes_id' => (int)$safe['safes_id'],
        'safes_name' => $safe['safes_name'],
        'safes_description' => $safe['safes_description'],
        'safes_balance' => (float)$safe['safes_balance'],
        'safes_rep_user_id' => (int)$safe['safes_rep_user_id'],
        'safes_payment_method_id' => (int)$safe['safes_payment_method_id'],
        'safes_is_active' => (int)$safe['safes_is_active'],
        'safes_created_at' => $safe['safes_created_at'],
        'safes_updated_at' => $safe['safes_updated_at'],
        'rep_user_name' => $safe['rep_user_name'],
        'rep_user_role' => $safe['rep_user_role'],
        'rep_user_phone' => $safe['rep_user_phone'],
        'rep_user_email' => $safe['rep_user_email'],
        'payment_method_name' => $safe['payment_method_name'],
        'payment_method_description' => $safe['payment_method_description'],
        'payment_method_type' => $safe['payment_method_type'],
        'recent_transactions_count' => (int)$safe['recent_transactions_count'],
        'total_transactions_count' => (int)$safe['total_transactions_count'],
        'last_transaction_date' => $safe['last_transaction_date']
    ];

    echo json_encode([
        'status' => 'success',
        'data' => $formatted_safe
    ]);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
