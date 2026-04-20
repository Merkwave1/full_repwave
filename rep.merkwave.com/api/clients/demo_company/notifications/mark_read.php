<?php
require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Authorization
    
    

        
    $uuid = $_POST['uuid'] ?? null;
    $user_id = get_user_id_from_uuid_local($uuid) ?? null;
    if (!$user_id) {
        print_failure("Authentication required.");
    }

    $user_role = null;
    $role_stmt = $conn->prepare("SELECT users_role FROM users WHERE users_id = ?");
    if ($role_stmt) {
        $role_stmt->bind_param("i", $user_id);
        $role_stmt->execute();
        $role_result = $role_stmt->get_result()->fetch_assoc();
        if ($role_result && isset($role_result['users_role'])) {
            $user_role = $role_result['users_role'];
        }
        $role_stmt->close();
    }

    $notification_id = $_POST['notification_id'] ?? null;
    $mark_all_read = $_POST['mark_all_read'] ?? false;

    if ($mark_all_read) {
        // Mark all unread notifications as read for this user
    $stmt = $conn->prepare("UPDATE notifications SET notifications_is_read = 1, notifications_read_at = NOW() WHERE (notifications_user_id = ? OR (notifications_user_id IS NULL AND notifications_role = ?)) AND notifications_is_read = 0");
    $stmt->bind_param("is", $user_id, $user_role);
        $stmt->execute();
        $affected_rows = $stmt->affected_rows;
        $stmt->close();
        
        print_success("All notifications marked as read.", ['marked_count' => $affected_rows]);
    } elseif ($notification_id) {
        // Mark specific notification as read
        if (!is_numeric($notification_id)) {
            print_failure("Valid notification ID is required.");
        }

    $stmt = $conn->prepare("UPDATE notifications SET notifications_is_read = 1, notifications_read_at = NOW() WHERE notifications_id = ? AND (notifications_user_id = ? OR (notifications_user_id IS NULL AND notifications_role = ?))");
    $stmt->bind_param("iis", $notification_id, $user_id, $user_role);
        $stmt->execute();
        $affected_rows = $stmt->affected_rows;
        $stmt->close();

        if ($affected_rows > 0) {
            print_success("Notification marked as read.");
        } else {
            print_failure("Notification not found or already read.");
        }
    } else {
        print_failure("Either notification_id or mark_all_read=true is required.");
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage() . " on line " . $e->getLine());
}
?>
