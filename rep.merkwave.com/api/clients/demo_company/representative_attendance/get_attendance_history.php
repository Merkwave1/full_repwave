<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Validate user session
    validate_user_session();
    
    $current_user_id = $GLOBALS['current_user_id'];
    $current_user_role = $GLOBALS['current_user_role'];

    $user_id = $current_user_id;
    
    // Get parameters
    $start_date = isset($_GET['start_date']) ? $_GET['start_date'] : date('Y-m-d', strtotime('-30 days'));
    $end_date = isset($_GET['end_date']) ? $_GET['end_date'] : date('Y-m-d');
    // Get attendance records for the date range
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
                u.users_name,
                u.users_email
            FROM representative_attendance ra
            LEFT JOIN users u ON ra.user_id = u.users_id
            WHERE ra.user_id = ? 
            AND ra.attendance_date BETWEEN ? AND ?
            ORDER BY ra.attendance_date DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $user_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();

    $attendance_records = [];
    $total_work_duration = 0;
    $total_days_worked = 0;

    while ($row = $result->fetch_assoc()) {
        // Get break logs for this attendance
        $breaks_sql = "SELECT 
                          break_log_id,
                          break_type,
                          break_timestamp,
                          break_reason
                       FROM attendance_break_logs
                       WHERE attendance_id = ?
                       ORDER BY break_timestamp ASC";
        
        $breaks_stmt = $conn->prepare($breaks_sql);
        $breaks_stmt->bind_param("i", $row['attendance_id']);
        $breaks_stmt->execute();
        $breaks_result = $breaks_stmt->get_result();
        
        $break_logs = [];
        $total_break_duration = 0;
        $pause_start = null;
        
        while ($break = $breaks_result->fetch_assoc()) {
            $break_logs[] = $break;
            
            // Calculate break duration
            if ($break['break_type'] === 'Pause') {
                $pause_start = new DateTime($break['break_timestamp']);
            } elseif ($break['break_type'] === 'Resume' && $pause_start !== null) {
                $resume_time = new DateTime($break['break_timestamp']);
                $break_duration = $resume_time->getTimestamp() - $pause_start->getTimestamp();
                $total_break_duration += $break_duration;
                $pause_start = null;
            }
        }

        // Format durations
        $work_hours = floor($row['total_work_duration_sec'] / 3600);
        $work_minutes = floor(($row['total_work_duration_sec'] % 3600) / 60);
        $work_seconds = $row['total_work_duration_sec'] % 60;
        
        $break_hours = floor($total_break_duration / 3600);
        $break_minutes = floor(($total_break_duration % 3600) / 60);
        $break_seconds = $total_break_duration % 60;

        $attendance_records[] = [
            "attendance_id" => $row['attendance_id'],
            "attendance_date" => $row['attendance_date'],
            "shift_start_time" => $row['shift_start_time'],
            "shift_end_time" => $row['shift_end_time'],
            "attendance_status" => $row['attendance_status'],
            "total_work_duration_sec" => $row['total_work_duration_sec'],
            "total_work_duration_formatted" => sprintf("%02d:%02d:%02d", $work_hours, $work_minutes, $work_seconds),
            "total_break_duration_sec" => $total_break_duration,
            "total_break_duration_formatted" => sprintf("%02d:%02d:%02d", $break_hours, $break_minutes, $break_seconds),
            "break_count" => count($break_logs) / 2, // Divide by 2 since each break has pause and resume
            "break_logs" => $break_logs,
            "start_location" => [
                "latitude" => $row['start_latitude'],
                "longitude" => $row['start_longitude']
            ],
            "end_location" => [
                "latitude" => $row['end_latitude'],
                "longitude" => $row['end_longitude']
            ]
        ];

        if ($row['attendance_status'] === 'ClockedOut') {
            $total_work_duration += $row['total_work_duration_sec'];
            $total_days_worked++;
        }
    }

    // Calculate statistics
    $avg_work_duration = $total_days_worked > 0 ? $total_work_duration / $total_days_worked : 0;
    $avg_hours = floor($avg_work_duration / 3600);
    $avg_minutes = floor(($avg_work_duration % 3600) / 60);

    print_success("Attendance history retrieved successfully", [
        "user_id" => $user_id,
        "start_date" => $start_date,
        "end_date" => $end_date,
        "attendance_records" => $attendance_records,
        "statistics" => [
            "total_days_in_range" => $result->num_rows,
            "total_days_worked" => $total_days_worked,
            "total_work_duration_sec" => $total_work_duration,
            "average_work_duration_sec" => round($avg_work_duration),
            "average_work_duration_formatted" => sprintf("%02d:%02d", $avg_hours, $avg_minutes)
        ]
    ]);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($breaks_stmt) && $breaks_stmt !== false) {
        $breaks_stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
