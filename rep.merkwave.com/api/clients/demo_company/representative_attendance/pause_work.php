<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Validate user session
    validate_user_session();
    
    $current_user_id = $GLOBALS['current_user_id'];
    $current_user_role = $GLOBALS['current_user_role'];

    // Get parameters from GET request
    $user_id = $current_user_id;
    $break_latitude = isset($_GET['break_latitude']) ? floatval($_GET['break_latitude']) : null;
    $break_longitude = isset($_GET['break_longitude']) ? floatval($_GET['break_longitude']) : null;
    $break_reason = isset($_GET['break_reason']) ? $_GET['break_reason'] : null;
    
    $conn->begin_transaction();
    $attendance_date = date('Y-m-d');

    // Get current attendance record
    $check_sql = "SELECT attendance_id, attendance_status, shift_start_time, total_work_duration_sec 
                  FROM representative_attendance 
                  WHERE user_id = ? AND attendance_date = ?";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->bind_param("is", $user_id, $attendance_date);
    $check_stmt->execute();
    $result = $check_stmt->get_result();

    if ($result->num_rows === 0) {
        $conn->rollback();
        print_failure("No active work session found. Please start your work day first.");
    }

    $attendance = $result->fetch_assoc();

    if ($attendance['attendance_status'] === 'Paused') {
        $conn->rollback();
        print_failure("Work is already paused");
    }

    if ($attendance['attendance_status'] === 'ClockedOut') {
        $conn->rollback();
        print_failure("Work day has ended. Cannot pause.");
    }

    // Check if there's an unmatched pause (shouldn't happen, but safety check)
    $last_break_sql = "SELECT break_type FROM attendance_break_logs 
                       WHERE attendance_id = ? 
                       ORDER BY break_timestamp DESC LIMIT 1";
    $last_break_stmt = $conn->prepare($last_break_sql);
    $last_break_stmt->bind_param("i", $attendance['attendance_id']);
    $last_break_stmt->execute();
    $last_break_result = $last_break_stmt->get_result();
    
    if ($last_break_result->num_rows > 0) {
        $last_break = $last_break_result->fetch_assoc();
        if ($last_break['break_type'] === 'Pause') {
            $conn->rollback();
            print_failure("There is already an active pause. Please resume first.");
        }
    }

    // Calculate work time before pause
    $shift_start = new DateTime($attendance['shift_start_time']);
    $now = new DateTime();
    
    // Get all previous breaks to calculate actual work time
    $breaks_sql = "SELECT break_type, break_timestamp 
                   FROM attendance_break_logs 
                   WHERE attendance_id = ? 
                   ORDER BY break_timestamp ASC";
    $breaks_stmt = $conn->prepare($breaks_sql);
    $breaks_stmt->bind_param("i", $attendance['attendance_id']);
    $breaks_stmt->execute();
    $breaks_result = $breaks_stmt->get_result();
    
    $total_break_time = 0;
    $last_resume = $shift_start;
    
    while ($break_row = $breaks_result->fetch_assoc()) {
        if ($break_row['break_type'] === 'Resume') {
            $last_resume = new DateTime($break_row['break_timestamp']);
        }
    }
    
    // Calculate time since last resume
    $work_time_since_resume = $now->getTimestamp() - $last_resume->getTimestamp();
    $new_total_work_duration = $attendance['total_work_duration_sec'] + $work_time_since_resume;

    // Update attendance status and total work duration
    $update_sql = "UPDATE representative_attendance 
                   SET attendance_status = 'Paused',
                       total_work_duration_sec = ?
                   WHERE attendance_id = ?";
    $update_stmt = $conn->prepare($update_sql);
    $update_stmt->bind_param("ii", $new_total_work_duration, $attendance['attendance_id']);
    $update_stmt->execute();

    // Insert pause log
    $log_sql = "INSERT INTO attendance_break_logs 
                (attendance_id, break_type, break_timestamp, break_latitude, break_longitude, break_reason) 
                VALUES (?, 'Pause', NOW(), ?, ?, ?)";
    $log_stmt = $conn->prepare($log_sql);
    $log_stmt->bind_param("idds", $attendance['attendance_id'], $break_latitude, $break_longitude, $break_reason);
    
    if ($log_stmt->execute()) {
        $break_log_id = $log_stmt->insert_id;
        $conn->commit();
        
        print_success("Work paused successfully", [
            "attendance_id" => $attendance['attendance_id'],
            "break_log_id" => $break_log_id,
            "attendance_status" => "Paused",
            "total_work_duration_sec" => $new_total_work_duration,
            "pause_timestamp" => date('Y-m-d H:i:s')
        ]);
    } else {
        throw new Exception("Failed to log pause");
    }

} catch (Exception | TypeError $e) {
    if (isset($conn)) {
        $conn->rollback();
    }
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($check_stmt) && $check_stmt !== false) {
        $check_stmt->close();
    }
    if (isset($last_break_stmt) && $last_break_stmt !== false) {
        $last_break_stmt->close();
    }
    if (isset($breaks_stmt) && $breaks_stmt !== false) {
        $breaks_stmt->close();
    }
    if (isset($update_stmt) && $update_stmt !== false) {
        $update_stmt->close();
    }
    if (isset($log_stmt) && $log_stmt !== false) {
        $log_stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
