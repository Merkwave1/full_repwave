<?php
require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Handle both form data and JSON requests
    $input_data = [];
    $raw_input = file_get_contents('php://input');
    
    // Check if it's a JSON request
    $content_type = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($content_type, 'application/json') !== false && !empty($raw_input)) {
        $decoded_data = json_decode($raw_input, true);
        if ($decoded_data !== null) {
            $input_data = $decoded_data;
        }
    }
    
    // If no JSON data or JSON parsing failed, fall back to POST/GET
    if (empty($input_data)) {
        $input_data = array_merge($_GET, $_POST);
    }
    
    // Debug: Log what we received
    error_log("mark_read_admin.php - Content-Type: " . $content_type);
    error_log("mark_read_admin.php - Raw input: " . $raw_input);
    error_log("mark_read_admin.php - Parsed data: " . json_encode($input_data));
    
    // Get users_uuid from request
    $users_uuid = $input_data['users_uuid'] ?? null;

    if (empty($users_uuid)) {
        error_log("mark_read_admin.php - No UUID found in: " . json_encode($input_data));
        print_failure("Error: User UUID is required.");
    }

    // Get user_id and role from users table based on users_uuid
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    if (!$stmt_user) {
        throw new Exception("Prepare failed for user lookup: " . $conn->error);
    }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();

    if (!$user_data) {
        print_failure("Error: Invalid user UUID.");
    }

    $user_id = $user_data['users_id'];

    // Get parameters from request
    $notification_id = $input_data['notification_id'] ?? null;
    $mark_all_read = $input_data['mark_all_read'] ?? null;

    if ($mark_all_read === true || $mark_all_read === 'true' || $mark_all_read === 1 || $mark_all_read === '1') {
        // Mark all notifications as read for this user
    $sql = "UPDATE notifications 
        SET notifications_is_read = 1, notifications_read_at = NOW() 
        WHERE (notifications_user_id = ? OR (notifications_user_id IS NULL AND notifications_role = ?)) AND notifications_is_read = 0";
        
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $user_id, $user_data['users_role']);
        $stmt->execute();
        $affected_rows = $stmt->affected_rows;
        $stmt->close();

        print_success("All notifications marked as read.", [
            'marked_count' => $affected_rows
        ]);

    } elseif ($notification_id) {
        // Mark specific notification as read
    $sql = "UPDATE notifications 
        SET notifications_is_read = 1, notifications_read_at = NOW() 
        WHERE notifications_id = ? AND (notifications_user_id = ? OR (notifications_user_id IS NULL AND notifications_role = ?))";
        
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iis", $notification_id, $user_id, $user_data['users_role']);
        $stmt->execute();
        $affected_rows = $stmt->affected_rows;
        $stmt->close();

        if ($affected_rows > 0) {
            print_success("Notification marked as read.");
        } else {
            print_failure("Notification not found or already read.");
        }

    } else {
        print_failure("Either notification_id or mark_all_read must be provided.");
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage() . " on line " . $e->getLine());
}
?>
