<?php
// Enables strict error reporting
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Include your database connection and helper functions
require_once '../db_connect.php'; 

// --- Support JSON POST (for fetch/ajax requests) ---
if (
    isset($_SERVER['CONTENT_TYPE']) &&
    (stripos($_SERVER['CONTENT_TYPE'], 'application/json') !== false)
) {
    $json = file_get_contents('php://input');
    $_POST = json_decode($json, true) ?? [];
}

try {
    // Check for authorization
    

    // Handle users_uuid parameter from frontend
    $users_uuid = $_POST['users_uuid'] ?? null;
    $requesting_user_id = null;
    
    if ($users_uuid) {
        // Get user_id from users_uuid
        $uuid_stmt = $conn->prepare("SELECT users_id FROM users WHERE users_uuid = ?");
        if (!$uuid_stmt) {
            print_failure("Error: Database preparation failed for UUID lookup."); 
            exit;
        }
        $uuid_stmt->bind_param("s", $users_uuid);
        $uuid_stmt->execute();
        $uuid_result = $uuid_stmt->get_result();
        if ($uuid_result->num_rows > 0) {
            $uuid_row = $uuid_result->fetch_assoc();
            $requesting_user_id = $uuid_row['users_id'];
        }
        $uuid_stmt->close();
        
        if (!$requesting_user_id) {
            print_failure("Error: Invalid users_uuid provided."); 
            exit;
        }
    }

    $visit_plan_id = $_POST['visit_plan_id'] ?? null;

    // Debug: Log received data
    error_log("Delete Visit Plan - POST data: " . json_encode($_POST));
    error_log("Delete Visit Plan - plan_id: " . ($visit_plan_id ?? 'null'));

    if (empty($visit_plan_id) || !is_numeric($visit_plan_id) || $visit_plan_id <= 0) {
        print_failure("Error: Valid Visit Plan ID is required.");
        exit;
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            DELETE FROM visit_plans
            WHERE visit_plan_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for delete: " . $conn->error);
        }

        $stmt->bind_param("i", $visit_plan_id);

        if (!$stmt->execute()) {
            throw new Exception("Error deleting visit plan: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Visit plan with ID " . $visit_plan_id . " not found.");
        }

        // Due to ON DELETE CASCADE on fk_vpc_plan,
        // related entries in visit_plan_clients will be automatically deleted.

        $conn->commit();
        print_success("Visit plan deleted successfully.");
        exit;

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) { $stmt->close(); }
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
