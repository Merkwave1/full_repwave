<?php
/**
 * Get receipt image for a transaction
 * GET /safe_transactions/get_receipt.php?transaction_id=123
 */

include '../db_connect.php';
include '../functions.php';

// Check authentication
$headers = getallheaders();
$uuid = $headers['User-UUID'] ?? $headers['x-user-uuid'] ?? null;

if (!$uuid) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'UUID is required']);
    exit;
}

// Get user info by UUID
$user_stmt = $conn->prepare("SELECT users_id, users_role, users_name FROM users WHERE users_uuid = ?");
if (!$user_stmt) {
    http_response_code(500);
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
$transaction_id = $_GET['transaction_id'] ?? null;

if (!$transaction_id) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Transaction ID is required']);
    exit;
}

try {
    // Get transaction with receipt image
    $query = "
        SELECT 
            safe_transactions_receipt_image,
            safe_transactions_created_by,
            safe_transactions_status
        FROM safe_transactions 
        WHERE safe_transactions_id = ?
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $transaction_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Transaction not found']);
        exit;
    }
    
    $transaction = $result->fetch_assoc();
    
    // Check permissions: admin/cash can see all, reps can only see their own
    if (!in_array($user_info['users_role'], ['admin', 'cash']) && $transaction['safe_transactions_created_by'] != $user_info['users_id']) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Access denied']);
        exit;
    }
    
    $receipt_image_path = $transaction['safe_transactions_receipt_image'];
    
    if (!$receipt_image_path) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'No receipt image found for this transaction']);
        exit;
    }
    
    // Build full file path
    $full_file_path = __DIR__ . '/../' . $receipt_image_path;
    
    if (!file_exists($full_file_path)) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Receipt image file not found']);
        exit;
    }
    
    // Get file info
    $file_info = pathinfo($full_file_path);
    $mime_type = mime_content_type($full_file_path);
    
    // Set appropriate headers
    header('Content-Type: ' . $mime_type);
    header('Content-Length: ' . filesize($full_file_path));
    header('Content-Disposition: inline; filename="receipt_' . $transaction_id . '.' . $file_info['extension'] . '"');
    header('Cache-Control: private, max-age=3600'); // Cache for 1 hour
    
    // Output the file
    readfile($full_file_path);

} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Failed to retrieve receipt: ' . $e->getMessage()]);
}

$conn->close();
?>
