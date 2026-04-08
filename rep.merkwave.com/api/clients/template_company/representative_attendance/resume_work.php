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
    
    $conn->begin_transaction();
    $attendance_date = date('Y-m-d');

    // Get the most recent paused attendance record (not just today's)
    // This allows resuming work even if it was paused on a previous day
    $check_sql = "SELECT attendance_id, attendance_status, attendance_date 
                  FROM representative_attendance 
                  WHERE user_id = ? AND attendance_status = 'Paused'
                  ORDER BY attendance_date DESC, shift_start_time DESC
                  LIMIT 1";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->bind_param("i", $user_id);
    $check_stmt->execute();
    $result = $check_stmt->get_result();

    if ($result->num_rows === 0) {
        $conn->rollback();
        print_failure("No active work session found");
    }

    $attendance = $result->fetch_assoc();

    // If the paused attendance is from a previous day, clock out that day and start a new session for today
    if ($attendance['attendance_date'] !== $attendance_date) {
        // Clock out the previous day's attendance
        $clockout_sql = "UPDATE representative_attendance 
                        SET attendance_status = 'ClockedOut',
                            shift_end_time = CONCAT(attendance_date, ' 23:59:59')
                        WHERE attendance_id = ?";
        $clockout_stmt = $conn->prepare($clockout_sql);
        $clockout_stmt->bind_param("i", $attendance['attendance_id']);
        $clockout_stmt->execute();
        $clockout_stmt->close();
        
        // Create a new attendance record for today
        $new_attendance_sql = "INSERT INTO representative_attendance 
                              (user_id, attendance_date, shift_start_time, attendance_status) 
                              VALUES (?, ?, NOW(), 'ClockedIn')";
        $new_attendance_stmt = $conn->prepare($new_attendance_sql);
        $new_attendance_stmt->bind_param("is", $user_id, $attendance_date);
        $new_attendance_stmt->execute();
        $new_attendance_id = $new_attendance_stmt->insert_id;
        $new_attendance_stmt->close();
        
        // Insert resume log for the new attendance
        $log_sql = "INSERT INTO attendance_break_logs 
                    (attendance_id, break_type, break_timestamp, break_latitude, break_longitude) 
                    VALUES (?, 'Resume', NOW(), ?, ?)";
        $log_stmt = $conn->prepare($log_sql);
        $log_stmt->bind_param("idd", $new_attendance_id, $break_latitude, $break_longitude);
        
        if ($log_stmt->execute()) {
            $break_log_id = $log_stmt->insert_id;
            $conn->commit();
            
            print_success("Work resumed successfully (new session started)", [
                "attendance_id" => $new_attendance_id,
                "break_log_id" => $break_log_id,
                "attendance_status" => "ClockedIn",
                "resume_timestamp" => date('Y-m-d H:i:s'),
                "note" => "Previous session from " . $attendance['attendance_date'] . " was automatically closed"
            ]);
        } else {
            throw new Exception("Failed to log resume");
        }
    } else {
        // Same day - just resume the existing attendance
        // Update attendance status back to ClockedIn
        $update_sql = "UPDATE representative_attendance 
                       SET attendance_status = 'ClockedIn'
                       WHERE attendance_id = ?";
        $update_stmt = $conn->prepare($update_sql);
        $update_stmt->bind_param("i", $attendance['attendance_id']);
        $update_stmt->execute();

        // Insert resume log
        $log_sql = "INSERT INTO attendance_break_logs 
                    (attendance_id, break_type, break_timestamp, break_latitude, break_longitude) 
                    VALUES (?, 'Resume', NOW(), ?, ?)";
        $log_stmt = $conn->prepare($log_sql);
        $log_stmt->bind_param("idd", $attendance['attendance_id'], $break_latitude, $break_longitude);
        
        if ($log_stmt->execute()) {
            $break_log_id = $log_stmt->insert_id;
            $conn->commit();
            
            print_success("Work resumed successfully", [
                "attendance_id" => $attendance['attendance_id'],
                "break_log_id" => $break_log_id,
                "attendance_status" => "ClockedIn",
                "resume_timestamp" => date('Y-m-d H:i:s')
            ]);
        } else {
            throw new Exception("Failed to log resume");
        }
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
    if (isset($clockout_stmt) && $clockout_stmt !== false) {
        $clockout_stmt->close();
    }
    if (isset($new_attendance_stmt) && $new_attendance_stmt !== false) {
        $new_attendance_stmt->close();
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
