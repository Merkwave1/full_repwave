<?php
require_once '../db_connect.php';

// Test notification creation
try {
    // Get user_id from UUID - using the UUID from the admin localStorage
    $admin_uuid = '2b3b78f1-57f7-11f0-908a-b7c5b63e15b0';
    
    $stmt_user = $conn->prepare("SELECT users_id FROM users WHERE users_uuid = ?");
    $stmt_user->bind_param("s", $admin_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();
    
    if (!$user_data) {
        echo json_encode([
            'status' => 'error',
            'message' => 'User not found with UUID: ' . $admin_uuid
        ]);
        exit;
    }
    
    $user_id = $user_data['users_id'];
    $title = "Admin Dashboard Test";
    $body = "This is a test notification for the admin dashboard. UUID: " . $admin_uuid;
    $data = json_encode([
        'test' => true,
        'created_by' => 'test_script_admin',
        'user_uuid' => $admin_uuid,
        'timestamp' => date('Y-m-d H:i:s')
    ]);

    $sql = "INSERT INTO notifications (
        notifications_user_id,
        notifications_title,
        notifications_body,
        notifications_data,
        notifications_channel,
        notifications_priority,
        notifications_is_read,
        notifications_sent_at,
        notifications_reference_table,
        notifications_reference_id
    ) VALUES (?, ?, ?, ?, 'in_app', 'high', 0, NOW(), 'test_admin', 1)";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("isss", $user_id, $title, $body, $data);
    
    if ($stmt->execute()) {
        $notification_id = $conn->insert_id;
        echo json_encode([
            'status' => 'success',
            'message' => 'Admin test notification created successfully',
            'notification_id' => $notification_id,
            'user_id' => $user_id,
            'user_uuid' => $admin_uuid
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to create notification: ' . $stmt->error
        ]);
    }
    
    $stmt->close();

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Exception: ' . $e->getMessage()
    ]);
}
?>
