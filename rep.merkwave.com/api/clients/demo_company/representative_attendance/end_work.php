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
    $end_latitude = isset($_GET['end_latitude']) ? floatval($_GET['end_latitude']) : null;
    $end_longitude = isset($_GET['end_longitude']) ? floatval($_GET['end_longitude']) : null;
    
    $conn->begin_transaction();
    $attendance_date = date('Y-m-d');
    $shift_end_time = date('Y-m-d H:i:s');

    // Get current day's attendance record
    $check_sql = "SELECT attendance_id, attendance_status, shift_start_time, total_work_duration_sec, attendance_date 
                  FROM representative_attendance 
                  WHERE user_id = ? AND attendance_date = ?";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->bind_param("is", $user_id, $attendance_date);
    $check_stmt->execute();
    $result = $check_stmt->get_result();

    if ($result->num_rows === 0) {
        // No record for today. Look for the most recent open session regardless of date.
        $fallback_sql = "SELECT attendance_id, attendance_status, shift_start_time, total_work_duration_sec, attendance_date 
                         FROM representative_attendance 
                         WHERE user_id = ? AND attendance_status IN ('ClockedIn','Paused')
                         ORDER BY attendance_date DESC, attendance_id DESC
                         LIMIT 1";
        $fallback_stmt = $conn->prepare($fallback_sql);
        $fallback_stmt->bind_param("i", $user_id);
        $fallback_stmt->execute();
        $fallback_result = $fallback_stmt->get_result();

        if ($fallback_result->num_rows === 0) {
            $conn->rollback();
            print_failure("No active work session found. Please start your work day first.");
        }

        $attendance = $fallback_result->fetch_assoc();
        $attendance_date = $attendance['attendance_date'];
        $fallback_stmt->close();
    } else {
        $attendance = $result->fetch_assoc();
        $attendance_date = $attendance['attendance_date'];
    }

    if ($attendance['attendance_status'] === 'ClockedOut') {
        $conn->rollback();
        print_failure("Work day has already ended");
    }

    if ($attendance['attendance_status'] === 'Paused') {
        $conn->rollback();
        print_failure("Please resume work before ending your day");
    }

    // Check representative settings for location requirements
    $settings_sql = "SELECT allow_end_work_from_anywhere, work_end_latitude, work_end_longitude, 
                            gps_min_acceptable_accuracy_m 
                     FROM representative_settings WHERE user_id = ?";
    $settings_stmt = $conn->prepare($settings_sql);
    $settings_stmt->bind_param("i", $user_id);
    $settings_stmt->execute();
    $settings_result = $settings_stmt->get_result();
    
    if ($settings_result->num_rows > 0) {
        $settings = $settings_result->fetch_assoc();
        
        // Validate location if required
        if ($settings['allow_end_work_from_anywhere'] == 0) {
            if (empty($end_latitude) || empty($end_longitude)) {
                $conn->rollback();
                print_failure("Location is required to end work");
            }
            
            // Check if within acceptable range of work end location
            if (!empty($settings['work_end_latitude']) && !empty($settings['work_end_longitude'])) {
                $distance = calculateDistance(
                    $end_latitude, 
                    $end_longitude,
                    $settings['work_end_latitude'],
                    $settings['work_end_longitude']
                );
                
                $max_distance = $settings['gps_min_acceptable_accuracy_m'] ?? 50;
                
                if ($distance > $max_distance) {
                    $conn->rollback();
                    print_failure("You must be at the designated work location to end your shift. Distance: " . round($distance, 2) . "m");
                }
            }
        }
    }

    // Calculate final work duration
    $shift_start = new DateTime($attendance['shift_start_time']);
    $shift_end = new DateTime($shift_end_time);
    
    // Get all breaks to calculate total break time
    $breaks_sql = "SELECT break_type, break_timestamp 
                   FROM attendance_break_logs 
                   WHERE attendance_id = ? 
                   ORDER BY break_timestamp ASC";
    $breaks_stmt = $conn->prepare($breaks_sql);
    $breaks_stmt->bind_param("i", $attendance['attendance_id']);
    $breaks_stmt->execute();
    $breaks_result = $breaks_stmt->get_result();
    
    $last_resume = $shift_start;
    
    while ($break_row = $breaks_result->fetch_assoc()) {
        if ($break_row['break_type'] === 'Resume') {
            $last_resume = new DateTime($break_row['break_timestamp']);
        }
    }
    
    // Calculate time since last resume
    $work_time_since_resume = $shift_end->getTimestamp() - $last_resume->getTimestamp();
    $final_total_work_duration = $attendance['total_work_duration_sec'] + $work_time_since_resume;

    // Update attendance record
    $update_sql = "UPDATE representative_attendance 
                   SET shift_end_time = ?,
                       end_latitude = ?,
                       end_longitude = ?,
                       attendance_status = 'ClockedOut',
                       total_work_duration_sec = ?
                   WHERE attendance_id = ?";
    
    $update_stmt = $conn->prepare($update_sql);
    $update_stmt->bind_param("sddii", $shift_end_time, $end_latitude, $end_longitude, 
                             $final_total_work_duration, $attendance['attendance_id']);
    
    if ($update_stmt->execute()) {
        $conn->commit();
        
        // Format duration for display
        $hours = floor($final_total_work_duration / 3600);
        $minutes = floor(($final_total_work_duration % 3600) / 60);
        $seconds = $final_total_work_duration % 60;
        
        print_success("Work day ended successfully", [
            "attendance_id" => $attendance['attendance_id'],
            "user_id" => $user_id,
            "attendance_date" => $attendance_date,
            "shift_start_time" => $attendance['shift_start_time'],
            "shift_end_time" => $shift_end_time,
            "total_work_duration_sec" => $final_total_work_duration,
            "total_work_duration_formatted" => sprintf("%02d:%02d:%02d", $hours, $minutes, $seconds),
            "attendance_status" => "ClockedOut",
            "end_latitude" => $end_latitude,
            "end_longitude" => $end_longitude
        ]);
    } else {
        throw new Exception("Failed to end work day");
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
    if (isset($fallback_stmt) && $fallback_stmt !== false) {
        $fallback_stmt->close();
    }
    if (isset($settings_stmt) && $settings_stmt !== false) {
        $settings_stmt->close();
    }
    if (isset($breaks_stmt) && $breaks_stmt !== false) {
        $breaks_stmt->close();
    }
    if (isset($update_stmt) && $update_stmt !== false) {
        $update_stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}

// Helper function to calculate distance between two coordinates
function calculateDistance($lat1, $lon1, $lat2, $lon2) {
    $earthRadius = 6371000; // meters
    
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    
    $a = sin($dLat/2) * sin($dLat/2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLon/2) * sin($dLon/2);
    
    $c = 2 * atan2(sqrt($a), sqrt(1-$a));
    
    return $earthRadius * $c;
}
?>
