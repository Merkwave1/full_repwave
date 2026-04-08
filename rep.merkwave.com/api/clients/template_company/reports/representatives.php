<?php
/**
 * Representatives Reports API - Admin Only
 * This endpoint provides comprehensive attendance and location data for all representatives
 * for admin dashboard reports
 */

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Validate user session
    validate_user_session();
    
    $current_user_id = $GLOBALS['current_user_id'];
    $current_user_role = $GLOBALS['current_user_role'];
    
    // Check if user is admin/manager
    if (!in_array($current_user_role, ['admin', 'manager', 'superadmin', 'cash'])) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Unauthorized. Admin access required.'
        ]);
        exit;
    }
    
    // Get query parameters
    $section = isset($_GET['section']) ? $_GET['section'] : 'overview';
    $start_date = isset($_GET['start_date']) ? $_GET['start_date'] : date('Y-m-d', strtotime('-30 days'));
    $end_date = isset($_GET['end_date']) ? $_GET['end_date'] : date('Y-m-d');
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
    $offset = ($page - 1) * $limit;
    $user_id_filter = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    $time_range = isset($_GET['time_range']) ? $_GET['time_range'] : null; // New parameter: '24h', 'week', 'month'
    
    $response = ['status' => 'success', 'data' => []];
    
    // Section: Overview - Statistics for all representatives
    if ($section === 'overview') {
        // Total representatives
        $total_reps_sql = "SELECT COUNT(DISTINCT users_id) as total 
                          FROM users 
                          WHERE users_role = 'rep' 
                          AND users_status = 1";
        $total_reps = $conn->query($total_reps_sql)->fetch_assoc()['total'];
        
        // Active representatives today (who have attendance record today)
        $active_today_sql = "SELECT COUNT(DISTINCT user_id) as total 
                            FROM representative_attendance 
                            WHERE attendance_date = CURDATE()
                            AND attendance_status IN ('active', 'break')";
        $active_today = $conn->query($active_today_sql)->fetch_assoc()['total'];
        
        // Total work hours this month
        $total_hours_sql = "SELECT COALESCE(SUM(total_work_duration_sec), 0) as total_seconds
                           FROM representative_attendance 
                           WHERE MONTH(attendance_date) = MONTH(CURDATE())
                           AND YEAR(attendance_date) = YEAR(CURDATE())";
        $total_seconds = $conn->query($total_hours_sql)->fetch_assoc()['total_seconds'];
        $total_work_hours = round($total_seconds / 3600, 1);
        
        // Total work days this month
        $total_days_sql = "SELECT COUNT(DISTINCT CONCAT(user_id, '-', attendance_date)) as total_days
                          FROM representative_attendance 
                          WHERE MONTH(attendance_date) = MONTH(CURDATE())
                          AND YEAR(attendance_date) = YEAR(CURDATE())";
        $total_work_days = $conn->query($total_days_sql)->fetch_assoc()['total_days'];
        
        // Average work hours
        $avg_work_hours = $total_work_days > 0 ? round($total_work_hours / $total_work_days, 1) : 0;
        
        // Total visits this month
        $total_visits_sql = "SELECT COUNT(*) as total 
                            FROM visits 
                            WHERE MONTH(visits_start_time) = MONTH(CURDATE())
                            AND YEAR(visits_start_time) = YEAR(CURDATE())";
        $total_visits = $conn->query($total_visits_sql)->fetch_assoc()['total'];
        
        // Attendance rate (days worked / total possible days)
        $days_in_month = date('j');
        $possible_days = $total_reps * $days_in_month;
        $attendance_rate = $possible_days > 0 ? round(($total_work_days / $possible_days) * 100, 1) : 0;
        
        // Average visits per rep
        $avg_visits_per_rep = $total_reps > 0 ? round($total_visits / $total_reps, 1) : 0;
        
        $response['data'] = [
            'total_representatives' => (int)$total_reps,
            'active_today' => (int)$active_today,
            'total_work_hours' => $total_work_hours,
            'avg_work_hours' => $avg_work_hours,
            'total_work_days' => (int)$total_work_days,
            'total_visits' => (int)$total_visits,
            'attendance_rate' => $attendance_rate,
            'avg_visits_per_rep' => $avg_visits_per_rep
        ];
    }
    
    // Section: Attendance - Detailed attendance records for all representatives
    elseif ($section === 'attendance') {
        // Build WHERE clause
        $where_conditions = ["ra.attendance_date BETWEEN ? AND ?"];
        $bind_types = "ss";
        $bind_params = [$start_date, $end_date];
        
        if ($user_id_filter) {
            $where_conditions[] = "ra.user_id = ?";
            $bind_types .= "i";
            $bind_params[] = $user_id_filter;
        }
        
        // Add status filter if provided
        $status_filter = isset($_GET['status']) ? $_GET['status'] : null;
        if ($status_filter) {
            $where_conditions[] = "ra.attendance_status = ?";
            $bind_types .= "s";
            $bind_params[] = $status_filter;
        }
        
        $where_clause = implode(" AND ", $where_conditions);
        
        // Get total count
        $count_sql = "SELECT COUNT(*) as total 
                     FROM representative_attendance ra 
                     WHERE $where_clause";
        $count_stmt = $conn->prepare($count_sql);
        $count_stmt->bind_param($bind_types, ...$bind_params);
        $count_stmt->execute();
        $total_count = $count_stmt->get_result()->fetch_assoc()['total'];
        
        // Get attendance records
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
                WHERE $where_clause
                ORDER BY ra.attendance_date DESC, ra.shift_start_time DESC
                LIMIT ? OFFSET ?";
        
        $stmt = $conn->prepare($sql);
        $bind_types .= "ii";
        $bind_params[] = $limit;
        $bind_params[] = $offset;
        $stmt->bind_param($bind_types, ...$bind_params);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $attendance_records = [];
        while ($row = $result->fetch_assoc()) {
            $attendance_records[] = [
                'attendance_id' => (int)$row['attendance_id'],
                'user_id' => (int)$row['user_id'],
                'users_name' => $row['users_name'],
                'users_email' => $row['users_email'],
                'attendance_date' => $row['attendance_date'],
                'shift_start_time' => $row['shift_start_time'],
                'shift_end_time' => $row['shift_end_time'],
                'start_latitude' => $row['start_latitude'],
                'start_longitude' => $row['start_longitude'],
                'end_latitude' => $row['end_latitude'],
                'end_longitude' => $row['end_longitude'],
                'total_work_duration_sec' => (int)$row['total_work_duration_sec'],
                'attendance_status' => $row['attendance_status']
            ];
        }
        
        $response['data'] = [
            'items' => $attendance_records,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => (int)$total_count,
                'total_pages' => ceil($total_count / $limit)
            ]
        ];
    }
    
    // Section: Break Logs - Get break logs for a specific attendance record
    elseif ($section === 'break_logs') {
        $attendance_id = isset($_GET['attendance_id']) ? intval($_GET['attendance_id']) : 0;
        
        if (!$attendance_id) {
            throw new Exception('Attendance ID is required for break logs');
        }
        
        $sql = "SELECT 
                    abl.break_log_id,
                    abl.attendance_id,
                    abl.break_type,
                    abl.break_timestamp as break_start_time,
                    abl.resume_timestamp as break_end_time,
                    abl.break_reason,
                    TIMESTAMPDIFF(SECOND, abl.break_timestamp, 
                        COALESCE(abl.resume_timestamp, NOW())) as break_duration_sec
                FROM attendance_break_logs abl
                WHERE abl.attendance_id = ?
                ORDER BY abl.break_timestamp ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $attendance_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $break_logs = [];
        while ($row = $result->fetch_assoc()) {
            $break_logs[] = [
                'break_log_id' => (int)$row['break_log_id'],
                'attendance_id' => (int)$row['attendance_id'],
                'break_type' => $row['break_type'],
                'break_start_time' => $row['break_start_time'],
                'break_end_time' => $row['break_end_time'],
                'break_reason' => $row['break_reason'],
                'break_duration_sec' => (int)$row['break_duration_sec']
            ];
        }
        
        $response['data'] = ['break_logs' => $break_logs];
    }
    
    // Section: Location - Last location for each representative from rep_location_tracking
    elseif ($section === 'location') {
        // Get last location for each user (representatives and warehouse keepers)
        $sql = "SELECT 
                    rlt.id,
                    rlt.user_id,
                    rlt.latitude,
                    rlt.longitude,
                    rlt.tracking_time,
                    rlt.battery_level,
                    rlt.phone_info,
                    u.users_name,
                    u.users_email,
                    u.users_phone,
                    u.users_role
                FROM rep_location_tracking rlt
                INNER JOIN (
                    SELECT user_id, MAX(id) as max_id
                    FROM rep_location_tracking
                    WHERE (user_id, tracking_time) IN (
                        SELECT user_id, MAX(tracking_time) as max_time
                        FROM rep_location_tracking
                        GROUP BY user_id
                    )
                    GROUP BY user_id
                ) latest ON rlt.id = latest.max_id
                LEFT JOIN users u ON rlt.user_id = u.users_id
                WHERE (u.users_role = 'rep' OR u.users_role = 'store_keeper') AND u.users_status = 1
                ORDER BY rlt.tracking_time DESC";
        
        $result = $conn->query($sql);
        
        $locations = [];
        while ($row = $result->fetch_assoc()) {
            $locations[] = [
                'id' => (int)$row['id'],
                'user_id' => (int)$row['user_id'],
                'users_name' => $row['users_name'],
                'users_email' => $row['users_email'],
                'users_phone' => $row['users_phone'],
                'users_role' => $row['users_role'],
                'latitude' => (float)$row['latitude'],
                'longitude' => (float)$row['longitude'],
                'tracking_time' => $row['tracking_time'],
                'battery_level' => $row['battery_level'] ? (int)$row['battery_level'] : null,
                'phone_info' => $row['phone_info']
            ];
        }
        
        $response['data'] = [
            'items' => $locations,
            'total' => count($locations)
        ];
    }
    
    // Section: Location History - Get location history for a specific representative
    elseif ($section === 'location_history') {
        if (!$user_id_filter) {
            throw new Exception('User ID is required for location history');
        }
        
        // Build WHERE clause based on time_range or date range
        $where_time_condition = "";
        $bind_params = [$user_id_filter];
        $bind_types = "i";
        
        if ($time_range) {
            // Use datetime-based filtering for time ranges
            switch ($time_range) {
                case '24h':
                    $where_time_condition = "AND tracking_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)";
                    break;
                case 'week':
                    $where_time_condition = "AND tracking_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
                    break;
                case 'month':
                    $where_time_condition = "AND tracking_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
                    break;
                default:
                    $where_time_condition = "AND tracking_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)";
            }
        } else {
            // Check if dates include time component (datetime format)
            $has_time_start = strpos($start_date, ' ') !== false || strpos($start_date, 'T') !== false;
            $has_time_end = strpos($end_date, ' ') !== false || strpos($end_date, 'T') !== false;
            
            if ($has_time_start && $has_time_end) {
                // Use datetime-based filtering for exact time range
                $where_time_condition = "AND tracking_time BETWEEN ? AND ?";
            } else {
                // Use date-based filtering for custom date range (full days)
                $where_time_condition = "AND DATE(tracking_time) BETWEEN ? AND ?";
            }
            $bind_params[] = $start_date;
            $bind_params[] = $end_date;
            $bind_types .= "ss";
        }
        
        // Get total count first
        $count_sql = "SELECT COUNT(*) as total 
                     FROM rep_location_tracking 
                     WHERE user_id = ? 
                     $where_time_condition";
        $count_stmt = $conn->prepare($count_sql);
        $count_stmt->bind_param($bind_types, ...$bind_params);
        $count_stmt->execute();
        $total_count = $count_stmt->get_result()->fetch_assoc()['total'];
        
        // If total records <= 100, get all records
        // If total records > 100, get evenly distributed 100 records
        if ($total_count <= 100) {
            $sql = "SELECT 
                        id,
                        latitude,
                        longitude,
                        tracking_time,
                        battery_level,
                        phone_info
                    FROM rep_location_tracking
                    WHERE user_id = ? 
                    $where_time_condition
                    ORDER BY tracking_time DESC";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param($bind_types, ...$bind_params);
        } else {
            // Get distributed 100 records by selecting every Nth record
            // Use ROW_NUMBER to get evenly distributed samples
            
            // Build the distributed query with proper parameter binding
            $distributed_bind_types = "i" . $bind_types; // Add total_count as first param
            $distributed_bind_params = array_merge([$total_count], $bind_params);
            
            $sql = "SELECT 
                        id,
                        latitude,
                        longitude,
                        tracking_time,
                        battery_level,
                        phone_info
                    FROM (
                        SELECT 
                            id,
                            latitude,
                            longitude,
                            tracking_time,
                            battery_level,
                            phone_info,
                            @row_num := @row_num + 1 as row_num,
                            @total_rows as total_rows
                        FROM rep_location_tracking, (SELECT @row_num := 0, @total_rows := ?) as init
                        WHERE user_id = ? 
                        $where_time_condition
                        ORDER BY tracking_time ASC
                    ) as numbered
                    WHERE MOD(row_num - 1, FLOOR(total_rows / 100)) = 0 OR row_num = total_rows
                    ORDER BY tracking_time DESC
                    LIMIT 100";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param($distributed_bind_types, ...$distributed_bind_params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $history = [];
        while ($row = $result->fetch_assoc()) {
            $history[] = [
                'id' => (int)$row['id'],
                'latitude' => (float)$row['latitude'],
                'longitude' => (float)$row['longitude'],
                'tracking_time' => $row['tracking_time'],
                'battery_level' => $row['battery_level'] ? (int)$row['battery_level'] : null,
                'phone_info' => $row['phone_info']
            ];
        }
        
        $response['data'] = [
            'items' => $history,
            'total' => (int)$total_count,
            'displayed' => count($history)
        ];
    }
    
    else {
        throw new Exception("Invalid section: $section");
    }
    
    echo json_encode($response);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
