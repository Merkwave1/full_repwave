<?php
// Notification helper functions
// Centralizes creation of notifications so business logic scripts stay clean.

/**
 * Create a single notification record.
 *
 * @param int|null $user_id        Target user id (null when targeting role)
 * @param string|null $target_role Target role slug (e.g. 'admin')
 *
 * @return int|null inserted notification id or null on failure
 */
function create_notification($conn, $user_id, $title, $body = null, $data = null, $channel = 'in_app', $priority = 'normal', $reference_table = null, $reference_id = null, $target_role = null) {
    try {
        $jsonData = $data !== null ? json_encode($data, JSON_UNESCAPED_UNICODE) : null;
        $stmt = $conn->prepare("INSERT INTO notifications (notifications_user_id, notifications_role, notifications_title, notifications_body, notifications_data, notifications_channel, notifications_priority, notifications_reference_table, notifications_reference_id, notifications_sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        if (!$stmt) { return null; }
        // Types: i (user id), s (title), s (body), s (json), s (channel), s (priority), s (ref table), i (ref id)
        $stmt->bind_param("isssssssi", $user_id, $target_role, $title, $body, $jsonData, $channel, $priority, $reference_table, $reference_id);
        if (!$stmt->execute()) { return null; }
        $id = $stmt->insert_id;
        $stmt->close();
        return $id;
    } catch (Throwable $e) {
        error_log('Notification create failed: ' . $e->getMessage());
        return null;
    }
}

/**
 * Convenience helper: create same notification for multiple users.
 */
function create_notifications_for_users($conn, array $user_ids, $title, $body = null, $data = null, $channel = 'in_app', $priority = 'normal', $reference_table = null, $reference_id = null) {
    foreach ($user_ids as $uid) {
        if (!is_numeric($uid)) continue;
        create_notification($conn, (int)$uid, $title, $body, $data, $channel, $priority, $reference_table, $reference_id, null);
    }
}

/**
 * Convenience helper: create a notification that targets a role (notifications_role) with no direct user id.
 */
function create_notification_for_role($conn, $role, $title, $body = null, $data = null, $channel = 'in_app', $priority = 'normal', $reference_table = null, $reference_id = null) {
    if (empty($role)) { return null; }
    return create_notification($conn, null, $title, $body, $data, $channel, $priority, $reference_table, $reference_id, $role);
}
