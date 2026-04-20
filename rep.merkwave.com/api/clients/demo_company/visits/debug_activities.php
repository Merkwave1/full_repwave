<?php
require_once '../functions.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

try {
    // Enable error reporting
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    
    // Get parameters
    $visit_id = $_GET['visit_id'] ?? null;
    $users_uuid = $_GET['users_uuid'] ?? null;
    
    if (!$visit_id) {
        echo json_encode(['status' => 'error', 'message' => 'Visit ID is required']);
        exit;
    }
    
    if (!$users_uuid) {
        echo json_encode(['status' => 'error', 'message' => 'User UUID is required']);
        exit;
    }
    
    // Get user ID from UUID
    $user_id = get_user_id_from_uuid_local($users_uuid);
    if (!$user_id) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid user UUID']);
        exit;
    }
    
    global $conn;
    
    // Check if database connection exists
    if (!$conn) {
        echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
        exit;
    }
    
    // Check if visit_activities table exists
    $table_check = $conn->query("SHOW TABLES LIKE 'visit_activities'");
    if ($table_check->num_rows == 0) {
        echo json_encode(['status' => 'error', 'message' => 'visit_activities table does not exist']);
        exit;
    }
    
    // Simple query first
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM visit_activities WHERE activity_visit_id = ?");
    if (!$stmt) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to prepare statement: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param("i", $visit_id);
    if (!$stmt->execute()) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to execute statement: ' . $stmt->error]);
        exit;
    }
    
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $count = $row['count'];
    
    $stmt->close();
    
    echo json_encode([
        'status' => 'success', 
        'message' => 'Debug successful',
        'data' => [
            'visit_id' => $visit_id,
            'user_id' => $user_id,
            'activities_count' => $count,
            'table_exists' => true
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Exception: ' . $e->getMessage()]);
} catch (Error $e) {
    echo json_encode(['status' => 'error', 'message' => 'Error: ' . $e->getMessage()]);
}
?>
