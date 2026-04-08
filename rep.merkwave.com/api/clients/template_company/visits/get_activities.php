<?php
require_once '../db_connect.php';

header('Content-Type: application/json');

// Debug log
error_log("Visit activities API called at: " . date('Y-m-d H:i:s'));
error_log("GET parameters: " . print_r($_GET, true));

try {
    // Get parameters
    $visit_id = $_GET['visit_id'] ?? null;
    $users_uuid = $_GET['users_uuid'] ?? null;
    
    if (!$visit_id) {
        print_failure("Visit ID is required");
    }
    
    // NOTE: Temporarily disabled UUID check for debugging
    // if (!$users_uuid) {
    //     print_failure("User UUID is required");
    // }
    
    global $conn;
    
    // Check if visit_activities table exists, create if not
    $table_check = $conn->query("SHOW TABLES LIKE 'visit_activities'");
    if ($table_check->num_rows == 0) {
        // Create the table without foreign key constraints first
        $create_table_sql = "
        CREATE TABLE `visit_activities` (
            `activity_id` INT AUTO_INCREMENT PRIMARY KEY,
            `activity_visit_id` INT NOT NULL,
            `activity_user_id` INT NOT NULL,
            `activity_type` ENUM(
                'SalesOrder_Created',
                'SalesInvoice_Created',
                'Payment_Collected',
                'Return_Initiated',
                'Document_Uploaded',
                'Photo_Before',
                'Photo_After',
                'Client_Note_Added'
            ) NOT NULL,
            `activity_reference_id` INT DEFAULT NULL,
            `activity_description` TEXT DEFAULT NULL,
            `activity_timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
        )";
        
        if (!$conn->query($create_table_sql)) {
            print_failure("Failed to create visit_activities table: " . $conn->error);
        }
    }
    
    // Now get the activities
    $stmt = $conn->prepare("
        SELECT 
            va.activity_id,
            va.activity_visit_id as visit_activities_visit_id,
            va.activity_user_id as visit_activities_user_id,
            va.activity_type as visit_activities_type,
            va.activity_reference_id as visit_activities_reference_id,
            va.activity_description as visit_activities_description,
            va.activity_timestamp as visit_activities_created_at
        FROM visit_activities va
        WHERE va.activity_visit_id = ?
        ORDER BY va.activity_timestamp DESC
    ");
    
    if (!$stmt) {
        print_failure("Failed to prepare statement: " . $conn->error);
    }
    
    $stmt->bind_param("i", $visit_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $activities = [];
    while ($row = $result->fetch_assoc()) {
        $activities[] = $row;
    }
    
    $stmt->close();
    
    print_success("Visit activities retrieved successfully", $activities);
    
} catch (Exception $e) {
    print_failure("Exception: " . $e->getMessage() . " in " . $e->getFile() . " at line " . $e->getLine());
} catch (Error $e) {
    print_failure("Fatal Error: " . $e->getMessage() . " in " . $e->getFile() . " at line " . $e->getLine());
}
?>
