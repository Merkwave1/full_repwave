<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Validate user session
    validate_user_session();
    
    $current_user_id = $GLOBALS['current_user_id'];
    $current_user_role = $GLOBALS['current_user_role'];

    // Get parameters from GET request
    $user_id = $current_user_id; // Use authenticated user ID
    $start_latitude = isset($_GET['start_latitude']) ? floatval($_GET['start_latitude']) : null;
    $start_longitude = isset($_GET['start_longitude']) ? floatval($_GET['start_longitude']) : null;
    
    $conn->begin_transaction();
    $attendance_date = date('Y-m-d');
    $shift_start_time = date('Y-m-d H:i:s');

    // Check if user is currently working (ClockedIn or Paused)
    // Allow starting new shift if previous shift was ended (ClockedOut)
    // Check if user already started work today
    $check_sql = "SELECT attendance_id, attendance_status FROM representative_attendance 
                  WHERE user_id = ? AND attendance_date = ?";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->bind_param("is", $user_id, $attendance_date);
    $check_stmt->execute();
    $result = $check_stmt->get_result();

    if ($result->num_rows > 0) {
        $existing = $result->fetch_assoc();
        
        if ($existing['attendance_status'] === 'ClockedIn') {
            $conn->rollback();
            print_failure("Work day already started");
        } else if ($existing['attendance_status'] === 'ClockedOut') {
            $conn->rollback();
            print_failure("Work day already ended for today");
        }
    }

    // Check representative settings for location requirements
    $settings_sql = "SELECT allow_start_work_from_anywhere, work_start_latitude, work_start_longitude, 
                            gps_min_acceptable_accuracy_m 
                     FROM representative_settings WHERE user_id = ?";
    $settings_stmt = $conn->prepare($settings_sql);
    $settings_stmt->bind_param("i", $user_id);
    $settings_stmt->execute();
    $settings_result = $settings_stmt->get_result();
    
    if ($settings_result->num_rows > 0) {
        $settings = $settings_result->fetch_assoc();
        
        // Validate location if required
        if ($settings['allow_start_work_from_anywhere'] == 0) {
            if (empty($start_latitude) || empty($start_longitude)) {
                $conn->rollback();
                print_failure("Location is required to start work");
            }
            
            // Check if within acceptable range of work start location
            if (!empty($settings['work_start_latitude']) && !empty($settings['work_start_longitude'])) {
                $distance = calculateDistance(
                    $start_latitude, 
                    $start_longitude,
                    $settings['work_start_latitude'],
                    $settings['work_start_longitude']
                );
                
                $max_distance = $settings['gps_min_acceptable_accuracy_m'] ?? 50; // Default 50 meters
                
                if ($distance > $max_distance) {
                    $conn->rollback();
                    print_failure("You must be at the designated work location to start your shift. Distance: " . round($distance, 2) . "m");
                }
            }
        }
    }

    // Insert new attendance record
    $insert_sql = "INSERT INTO representative_attendance 
                   (user_id, attendance_date, shift_start_time, start_latitude, start_longitude, 
                    attendance_status, total_work_duration_sec) 
                   VALUES (?, ?, ?, ?, ?, 'ClockedIn', 0)";
    
    $stmt = $conn->prepare($insert_sql);
    $stmt->bind_param("issdd", $user_id, $attendance_date, $shift_start_time, 
                      $start_latitude, $start_longitude);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to start work day");
    }
    
    $attendance_id = $stmt->insert_id;
    $conn->commit();
    
    print_success("Work day started successfully", [
        "attendance_id" => $attendance_id,
        "user_id" => $user_id,
        "attendance_date" => $attendance_date,
        "shift_start_time" => $shift_start_time,
        "attendance_status" => "ClockedIn",
        "start_latitude" => $start_latitude,
        "start_longitude" => $start_longitude
    ]);

} catch (Exception | TypeError $e) {
    if (isset($conn)) {
        $conn->rollback();
    }
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($check_stmt) && $check_stmt !== false) {
        $check_stmt->close();
    }
    if (isset($settings_stmt) && $settings_stmt !== false) {
        $settings_stmt->close();
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
