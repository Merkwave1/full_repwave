<?php
/**
 * Get pending transactions for admin approval
 * GET /safe_transactions/get_pending.php
 */

include '../db_connect.php';
include '../functions.php';

header('Content-Type: application/json');

// Check authentication and admin privileges
$headers = getallheaders();
$uuid = $headers['User-UUID'] ?? $headers['x-user-uuid'] ?? null;

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

// Check if user is admin or cash
if (!in_array($user_info['users_role'], ['admin', 'cash'])) {
    echo json_encode(['status' => 'error', 'message' => 'Access denied. Admin or Cash privileges required']);
    exit;
}

try {
    // Get query parameters
    $status = $_GET['status'] ?? 'pending';
    $limit = intval($_GET['limit'] ?? 50);
    $offset = intval($_GET['offset'] ?? 0);
    
    // Build the query
    $query = "
        SELECT 
            st.*,
            s.safes_name,
            s.safes_description,
            u.users_name as created_by_name,
            u.users_role as created_by_role,
            pm.payment_method_name,
            approver.users_name as approved_by_name
        FROM safe_transactions st
        LEFT JOIN safes s ON st.safe_transactions_safe_id = s.safes_id
        LEFT JOIN users u ON st.safe_transactions_created_by = u.users_id
        LEFT JOIN payment_methods pm ON st.safe_transactions_payment_method_id = pm.payment_method_id
        LEFT JOIN users approver ON st.safe_transactions_approved_by = approver.users_id
        WHERE st.safe_transactions_status = ?
        ORDER BY st.safe_transactions_date DESC
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("sii", $status, $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $transactions[] = [
            'transaction_id' => $row['safe_transactions_id'],
            'safe_id' => $row['safe_transactions_safe_id'],
            'safe_name' => $row['safes_name'],
            'safe_description' => $row['safes_description'],
            'type' => $row['safe_transactions_type'],
            'amount' => floatval($row['safe_transactions_amount']),
            'balance_before' => floatval($row['safe_transactions_balance_before']),
            'balance_after' => floatval($row['safe_transactions_balance_after']),
            'description' => $row['safe_transactions_description'],
            'reference' => $row['safe_transactions_reference'],
            'receipt_image' => $row['safe_transactions_receipt_image'],
            'status' => $row['safe_transactions_status'],
            'created_by' => $row['created_by_name'],
            'created_by_role' => $row['created_by_role'],
            'payment_method' => $row['payment_method_name'],
            'approved_by' => $row['approved_by_name'],
            'approved_date' => $row['safe_transactions_approved_date'],
            'transaction_date' => $row['safe_transactions_date'],
            'created_at' => $row['safe_transactions_created_at']
        ];
    }
    
    // Get total count for pagination
    $count_query = "SELECT COUNT(*) as total FROM safe_transactions WHERE safe_transactions_status = ?";
    $count_stmt = $conn->prepare($count_query);
    $count_stmt->bind_param("s", $status);
    $count_stmt->execute();
    $count_result = $count_stmt->get_result();
    $total_count = $count_result->fetch_assoc()['total'];
    
    echo json_encode([
        'status' => 'success',
        'data' => $transactions,
        'pagination' => [
            'total' => intval($total_count),
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total_count
        ]
    ]);

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to fetch transactions: ' . $e->getMessage()]);
}

$conn->close();
?>
