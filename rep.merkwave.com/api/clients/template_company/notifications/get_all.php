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

    // Optional filters
    $is_read = $_GET['is_read'] ?? null; // null = all, 0 = unread, 1 = read
    $limit = min((int)($_GET['limit'] ?? 50), 100); // Max 100 notifications
    $offset = max((int)($_GET['offset'] ?? 0), 0);

    // Build WHERE clause
    $where_conditions = ["(notifications_user_id = ? OR (notifications_user_id IS NULL AND notifications_role = ?))"];
    $bind_params = [$user_id, $user_role];
    $bind_types = "is";

    if ($is_read !== null) {
        $where_conditions[] = "notifications_is_read = ?";
        $bind_params[] = (int)$is_read;
        $bind_types .= "i";
    }

    $where_clause = "WHERE " . implode(" AND ", $where_conditions);

    // Get notifications
    $sql = "SELECT 
                notifications_id,
                notifications_title,
                notifications_body,
                notifications_data,
                notifications_channel,
                notifications_priority,
                notifications_is_read,
                notifications_read_at,
                notifications_sent_at,
                notifications_reference_table,
                notifications_reference_id,
                notifications_created_at,
                notifications_role
            FROM notifications 
            $where_clause 
            ORDER BY notifications_created_at DESC 
            LIMIT ? OFFSET ?";

    $stmt = $conn->prepare($sql);
    $bind_types .= "ii";
    $bind_params[] = $limit;
    $bind_params[] = $offset;
    
    $stmt->bind_param($bind_types, ...$bind_params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $notifications = [];
    while ($row = $result->fetch_assoc()) {
        // Decode JSON data if present
        if ($row['notifications_data']) {
            $row['notifications_data'] = json_decode($row['notifications_data'], true);
        }
        $notifications[] = $row;
    }
    $stmt->close();

    // Get unread count
    $count_sql = "SELECT COUNT(*) as unread_count FROM notifications WHERE (notifications_user_id = ? OR (notifications_user_id IS NULL AND notifications_role = ?)) AND notifications_is_read = 0";
    $count_stmt = $conn->prepare($count_sql);
    $count_stmt->bind_param("is", $user_id, $user_role);
    $count_stmt->execute();
    $count_result = $count_stmt->get_result()->fetch_assoc();
    $count_stmt->close();

    print_success("Notifications retrieved successfully.", [
        'notifications' => $notifications,
        'unread_count' => $count_result['unread_count'],
        'total_returned' => count($notifications)
    ]);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage() . " on line " . $e->getLine());
}
?>
