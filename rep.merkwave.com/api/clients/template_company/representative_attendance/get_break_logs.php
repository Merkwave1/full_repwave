<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Validate user session
    validate_user_session();
    
    $current_user_id = $GLOBALS['current_user_id'];
    $current_user_role = $GLOBALS['current_user_role'];

    // Get parameters
    $attendance_id = isset($_GET['attendance_id']) ? intval($_GET['attendance_id']) : 0;

    if (empty($attendance_id)) {
        print_failure("Attendance ID is required");
    }

    // Verify that the attendance record belongs to the current user (security check)
    $verify_sql = "SELECT user_id FROM representative_attendance WHERE attendance_id = ?";
    $verify_stmt = $conn->prepare($verify_sql);
    if (!$verify_stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $verify_stmt->bind_param("i", $attendance_id);
    $verify_stmt->execute();
    $verify_result = $verify_stmt->get_result();
    
    if ($verify_result->num_rows === 0) {
        print_failure("Attendance record not found");
    }
    
    $attendance_owner = $verify_result->fetch_assoc();
    
    // Only allow if it's the user's own attendance or if user is admin
    if ($current_user_role !== 'admin' && $attendance_owner['user_id'] != $current_user_id) {
        print_failure("Unauthorized access to attendance record");
    }
    // Get break logs for the attendance record
    $sql = "SELECT 
                abl.break_log_id,
                abl.attendance_id,
                abl.break_type,
                abl.break_timestamp,
                abl.break_latitude,
                abl.break_longitude,
                abl.break_reason,
                ra.user_id,
                ra.attendance_date,
                u.users_name
            FROM attendance_break_logs abl
            INNER JOIN representative_attendance ra ON abl.attendance_id = ra.attendance_id
            LEFT JOIN users u ON ra.user_id = u.users_id
            WHERE abl.attendance_id = ?
            ORDER BY abl.break_timestamp ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $attendance_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $break_logs = [];
    $total_break_duration = 0;
    $pause_start = null;
    $break_sessions = [];

    while ($row = $result->fetch_assoc()) {
        $break_logs[] = [
            "break_log_id" => $row['break_log_id'],
            "attendance_id" => $row['attendance_id'],
            "break_type" => $row['break_type'],
            "break_timestamp" => $row['break_timestamp'],
            "break_latitude" => $row['break_latitude'],
            "break_longitude" => $row['break_longitude'],
            "break_reason" => $row['break_reason'],
            "user_id" => $row['user_id'],
            "users_name" => $row['users_name'],
            "attendance_date" => $row['attendance_date']
        ];

        // Calculate break sessions and durations
        if ($row['break_type'] === 'Pause') {
            $pause_start = new DateTime($row['break_timestamp']);
        } elseif ($row['break_type'] === 'Resume' && $pause_start !== null) {
            $resume_time = new DateTime($row['break_timestamp']);
            $break_duration = $resume_time->getTimestamp() - $pause_start->getTimestamp();
            $total_break_duration += $break_duration;
            
            $duration_hours = floor($break_duration / 3600);
            $duration_minutes = floor(($break_duration % 3600) / 60);
            $duration_seconds = $break_duration % 60;
            
            $break_sessions[] = [
                "pause_timestamp" => $pause_start->format('Y-m-d H:i:s'),
                "resume_timestamp" => $resume_time->format('Y-m-d H:i:s'),
                "duration_sec" => $break_duration,
                "duration_formatted" => sprintf("%02d:%02d:%02d", $duration_hours, $duration_minutes, $duration_seconds),
                "reason" => $row['break_reason']
            ];
            
            $pause_start = null;
        }
    }

    // Format total break duration
    $total_hours = floor($total_break_duration / 3600);
    $total_minutes = floor(($total_break_duration % 3600) / 60);
    $total_seconds = $total_break_duration % 60;

    print_success("Break logs retrieved successfully", [
        "attendance_id" => $attendance_id,
        "break_logs" => $break_logs,
        "break_sessions" => $break_sessions,
        "total_breaks" => count($break_sessions),
        "total_break_duration_sec" => $total_break_duration,
        "total_break_duration_formatted" => sprintf("%02d:%02d:%02d", $total_hours, $total_minutes, $total_seconds)
    ]);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($verify_stmt) && $verify_stmt !== false) {
        $verify_stmt->close();
    }
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
