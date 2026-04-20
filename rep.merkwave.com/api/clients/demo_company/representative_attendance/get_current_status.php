<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../db_connect.php';
include_once '../functions.php';

validate_user_session();

// Get user_id from users_uuid
$users_uuid = $_GET['users_uuid'] ?? null;

if (empty($users_uuid)) {
    print_failure("User UUID is required");
}

try {
    // Get user_id from users_uuid
    $stmt_user = $conn->prepare("SELECT users_id FROM users WHERE users_uuid = ? AND users_status = 1");
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    
    if ($result_user->num_rows === 0) {
        print_failure("Invalid user");
    }
    
    $user = $result_user->fetch_assoc();
    $user_id = intval($user['users_id']);
    $stmt_user->close();

    $attendance_date = date('Y-m-d');

    // Get today's attendance record
    $sql = "SELECT 
                ra.attendance_id,
                ra.user_id,
                ra.attendance_date,
                ra.shift_start_time,
                ra.shift_end_time,
                ra.start_latitude,
                ra.start_longitude,
                ra.end_latitude,
                ra.end_longitude,
                ra.total_work_duration_sec,
                ra.attendance_status,
                ra.attendance_created_at,
                ra.attendance_updated_at
            FROM representative_attendance ra
            WHERE ra.user_id = ? AND ra.attendance_date = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $user_id, $attendance_date);
    $stmt->execute();
    $result = $stmt->get_result();

    $attendance = null;
    if ($result->num_rows === 0) {
        // No attendance for today, check if there's an unfinished session from previous days
        $fallbackSql = "SELECT 
                ra.attendance_id,
                ra.user_id,
                ra.attendance_date,
                ra.shift_start_time,
                ra.shift_end_time,
                ra.start_latitude,
                ra.start_longitude,
                ra.end_latitude,
                ra.end_longitude,
                ra.total_work_duration_sec,
                ra.attendance_status,
                ra.attendance_created_at,
                ra.attendance_updated_at
            FROM representative_attendance ra
            WHERE ra.user_id = ?
              AND ra.attendance_status IN ('ClockedIn', 'Paused')
            ORDER BY ra.attendance_date DESC, ra.attendance_id DESC
            LIMIT 1";

        $fallbackStmt = $conn->prepare($fallbackSql);
        $fallbackStmt->bind_param("i", $user_id);
        $fallbackStmt->execute();
        $fallbackResult = $fallbackStmt->get_result();

        if ($fallbackResult->num_rows === 0) {
            // No open sessions found anywhere, allow user to start fresh today
            print_success("No work session for today", [
                "has_active_session" => false,
                "attendance" => null,
                "break_logs" => [],
                "can_start_work" => true,
                "can_pause_work" => false,
                "can_resume_work" => false,
                "can_end_work" => false,
                "show_dashboard" => false
            ]);
        }

        $attendance = $fallbackResult->fetch_assoc();
        $fallbackStmt->close();
    } else {
        $attendance = $result->fetch_assoc();
    }
    
    // Calculate current work duration (if still working)
    $current_work_duration = $attendance['total_work_duration_sec'];
    
    if ($attendance['attendance_status'] === 'ClockedIn') {
        // Get the last resume time (or start time if never paused)
        $last_resume_sql = "SELECT break_timestamp, break_type 
                           FROM attendance_break_logs 
                           WHERE attendance_id = ? 
                           ORDER BY break_timestamp DESC 
                           LIMIT 1";
        $last_resume_stmt = $conn->prepare($last_resume_sql);
        $last_resume_stmt->bind_param("i", $attendance['attendance_id']);
        $last_resume_stmt->execute();
        $last_resume_result = $last_resume_stmt->get_result();
        
        if ($last_resume_result->num_rows > 0) {
            $last_break = $last_resume_result->fetch_assoc();
            if ($last_break['break_type'] === 'Resume') {
                $last_resume_time = new DateTime($last_break['break_timestamp']);
            } else {
                $last_resume_time = new DateTime($attendance['shift_start_time']);
            }
        } else {
            $last_resume_time = new DateTime($attendance['shift_start_time']);
        }
        
        $now = new DateTime();
        $time_since_resume = $now->getTimestamp() - $last_resume_time->getTimestamp();
        $current_work_duration += $time_since_resume;
    }

    // Get break logs
    $breaks_sql = "SELECT 
                      break_log_id,
                      break_type,
                      break_timestamp,
                      break_latitude,
                      break_longitude,
                      break_reason
                   FROM attendance_break_logs
                   WHERE attendance_id = ?
                   ORDER BY break_timestamp ASC";
    
    $breaks_stmt = $conn->prepare($breaks_sql);
    $breaks_stmt->bind_param("i", $attendance['attendance_id']);
    $breaks_stmt->execute();
    $breaks_result = $breaks_stmt->get_result();
    
    $break_logs = [];
    while ($break = $breaks_result->fetch_assoc()) {
        $break_logs[] = $break;
    }

    // Determine what actions are available
    $can_start_work = false;
    $can_pause_work = false;
    $can_resume_work = false;
    $can_end_work = false;
    $show_dashboard = false;

    switch ($attendance['attendance_status']) {
        case 'ClockedIn':
            $can_pause_work = true;
            $can_end_work = true;
            $show_dashboard = true;
            break;
        case 'Paused':
            $can_resume_work = true;
            $show_dashboard = false; // Hide dashboard when paused
            break;
        case 'ClockedOut':
            $show_dashboard = false;
            break;
    }

    // Format duration
    $hours = floor($current_work_duration / 3600);
    $minutes = floor(($current_work_duration % 3600) / 60);
    $seconds = $current_work_duration % 60;

    print_success("Current attendance status retrieved", [
        "has_active_session" => true,
        "attendance" => [
            "attendance_id" => $attendance['attendance_id'],
            "user_id" => $attendance['user_id'],
            "attendance_date" => $attendance['attendance_date'],
            "shift_start_time" => $attendance['shift_start_time'],
            "shift_end_time" => $attendance['shift_end_time'],
            "attendance_status" => $attendance['attendance_status'],
            "total_work_duration_sec" => $current_work_duration,
            "total_work_duration_formatted" => sprintf("%02d:%02d:%02d", $hours, $minutes, $seconds),
            "start_latitude" => $attendance['start_latitude'],
            "start_longitude" => $attendance['start_longitude'],
            "end_latitude" => $attendance['end_latitude'],
            "end_longitude" => $attendance['end_longitude']
        ],
        "break_logs" => $break_logs,
        "can_start_work" => $can_start_work,
        "can_pause_work" => $can_pause_work,
        "can_resume_work" => $can_resume_work,
        "can_end_work" => $can_end_work,
        "show_dashboard" => $show_dashboard
    ]);

} catch (Exception $e) {
    print_failure("Error: " . $e->getMessage());
}

$conn->close();
?>
