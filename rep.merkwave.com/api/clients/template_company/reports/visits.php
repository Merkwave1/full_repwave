<?php

require_once '../db_connect.php'; 
// functions.php يتم تضمينها تلقائيًا عبر db_connect.php

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // الحصول على users_uuid من طلب GET
    $users_uuid = $_GET['users_uuid'] ?? null;
    
    // الحصول على section parameter لتحديد أي جزء من التقرير مطلوب
    $section = $_GET['section'] ?? 'all';

    // التحقق من أن معرف المستخدم موجود
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    // الحصول على user_id ودور المستخدم (role) من جدول users بناءً على users_uuid
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    if (!$stmt_user) {
        throw new Exception("Prepare failed for user lookup: " . $conn->error);
    }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();

    if (!$user_data) {
        print_failure("Error: Invalid User UUID provided.");
    }

    $current_user_id = $user_data['users_id'];
    $current_user_role = $user_data['users_role'];

    // إعداد البيانات للتقرير
    $report_data = [];

    // Helper to check if a section should be included
    $include = function($name) use ($section) {
        return $section === 'all' || $section === $name;
    };
    // Pagination helpers
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 20;
    $offset = ($page - 1) * $limit;

    // ========== 1. نظرة عامة على الزيارات (Overview) ==========
    if ($include('overview')) {
    
    // بناء استعلام لإحصائيات الزيارات العامة
    $overview_sql = "
        SELECT 
            COUNT(*) as total_visits,
            COUNT(CASE WHEN visits_status = 'Started' THEN 1 END) as started_visits,
            COUNT(CASE WHEN visits_status = 'Completed' THEN 1 END) as completed_visits,
            COUNT(CASE WHEN visits_status = 'Cancelled' THEN 1 END) as cancelled_visits,
            COUNT(CASE WHEN DATE(visits_start_time) = CURDATE() THEN 1 END) as today_visits,
            COUNT(CASE WHEN WEEK(visits_start_time) = WEEK(NOW()) AND YEAR(visits_start_time) = YEAR(NOW()) THEN 1 END) as this_week_visits,
            COUNT(CASE WHEN MONTH(visits_start_time) = MONTH(NOW()) AND YEAR(visits_start_time) = YEAR(NOW()) THEN 1 END) as this_month_visits,
            AVG(CASE WHEN visits_end_time IS NOT NULL THEN 
                TIMESTAMPDIFF(MINUTE, visits_start_time, visits_end_time) 
            END) as avg_visit_duration_minutes
        FROM visits v
    ";
    
    $overview_params = [];
    $overview_types = "";
    
    // تطبيق منطق الصلاحيات
    if ($current_user_role !== 'admin') {
        $overview_sql .= " WHERE v.visits_rep_user_id = ?";
        $overview_params[] = $current_user_id;
        $overview_types .= "i";
    }
    
    $stmt_overview = $conn->prepare($overview_sql);
    if (!$stmt_overview) {
        throw new Exception("Prepare failed for overview query: " . $conn->error);
    }
    
    if (!empty($overview_params)) {
        $stmt_overview->bind_param($overview_types, ...$overview_params);
    }
    
    $stmt_overview->execute();
    $overview_result = $stmt_overview->get_result();
    $report_data['overview'] = $overview_result->fetch_assoc();
    $stmt_overview->close();
    }

    // ========== 2. تفاصيل الزيارات (Details) ==========
    if ($include('details')) {
    
    $details_sql = "
        SELECT 
            v.visits_id,
            v.visits_start_time,
            v.visits_end_time,
            v.visits_status,
            v.visits_purpose,
            v.visits_outcome,
            v.visits_notes,
            v.visits_start_latitude,
            v.visits_start_longitude,
            v.visits_end_latitude,
            v.visits_end_longitude,
            c.clients_id,
            c.clients_company_name,
            c.clients_contact_name,
            c.clients_contact_phone_1,
            c.clients_address,
            c.clients_city,
            c.clients_area_tag_id,
            cat.client_area_tag_name,
            u.users_id as rep_id,
            u.users_name as rep_name,
            CASE WHEN v.visits_end_time IS NOT NULL THEN 
                TIMESTAMPDIFF(MINUTE, v.visits_start_time, v.visits_end_time) 
            ELSE NULL END as visit_duration_minutes,
            (SELECT COUNT(*) FROM visit_activities va WHERE va.activity_visit_id = v.visits_id) as activities_count,
            (SELECT COUNT(*) FROM sales_orders so WHERE so.sales_orders_visit_id = v.visits_id) as orders_count,
            (SELECT COUNT(*) FROM payments p WHERE p.payments_visit_id = v.visits_id) as payments_count
        FROM visits v
        LEFT JOIN clients c ON v.visits_client_id = c.clients_id
        LEFT JOIN client_area_tags cat ON c.clients_area_tag_id = cat.client_area_tag_id 
        LEFT JOIN users u ON v.visits_rep_user_id = u.users_id
    ";
    
    $details_params = [];
    $details_types = "";
    
    if ($current_user_role !== 'admin') {
        $details_sql .= " WHERE v.visits_rep_user_id = ?";
        $details_params[] = $current_user_id;
        $details_types .= "i";
    }
    
    // Count total for pagination if only details requested
    $details_sql_count = "SELECT COUNT(*) as cnt FROM visits v" . ($current_user_role !== 'admin' ? " WHERE v.visits_rep_user_id = ?" : "");
    $details_sql .= " ORDER BY v.visits_start_time DESC";
    if ($section === 'details') {
        $details_sql .= " LIMIT ? OFFSET ?";
    } else {
        $details_sql .= " LIMIT 100"; // safeguard when fetching all
    }
    
    $stmt_details = $conn->prepare($details_sql);
    if (!$stmt_details) {
        throw new Exception("Prepare failed for details query: " . $conn->error);
    }
    
    if ($section === 'details') {
        if (!empty($details_params)) {
            $details_types .= 'ii';
            $details_params[] = $limit;
            $details_params[] = $offset;
            $stmt_details->bind_param($details_types, ...$details_params);
        } else {
            $stmt_details->bind_param('ii', $limit, $offset);
        }
    } else if (!empty($details_params)) {
        $stmt_details->bind_param($details_types, ...$details_params);
    }
    
    $stmt_details->execute();
    $details_result = $stmt_details->get_result();
    $report_data['details'] = $details_result->fetch_all(MYSQLI_ASSOC);
    $stmt_details->close();
    if ($section === 'details') {
        // total count
        if ($current_user_role !== 'admin') {
            $stmt_count = $conn->prepare($details_sql_count);
            $stmt_count->bind_param('i', $current_user_id);
        } else {
            $stmt_count = $conn->prepare("SELECT COUNT(*) as cnt FROM visits");
        }
        $stmt_count->execute();
        $count_res = $stmt_count->get_result();
        $count_row = $count_res->fetch_assoc();
        $stmt_count->close();
        $report_data['pagination'] = [
            'page' => $page,
            'limit' => $limit,
            'total' => intval($count_row['cnt'] ?? 0)
        ];
    }
    }

    // ========== 3. أنشطة الزيارات (Activities) ==========
    if ($include('activities')) {
    
    $activities_sql = "
        SELECT 
            va.activity_id,
            va.activity_visit_id,
            va.activity_type,
            va.activity_reference_id,
            va.activity_description,
            va.activity_timestamp,
            v.visits_id,
            c.clients_company_name,
            u.users_name as rep_name,
            COUNT(*) OVER (PARTITION BY va.activity_visit_id) as visit_total_activities
        FROM visit_activities va
        LEFT JOIN visits v ON va.activity_visit_id = v.visits_id
        LEFT JOIN clients c ON v.visits_client_id = c.clients_id
        LEFT JOIN users u ON va.activity_user_id = u.users_id
    ";
    
    $activities_params = [];
    $activities_types = "";
    
    if ($current_user_role !== 'admin') {
        $activities_sql .= " WHERE va.activity_user_id = ?";
        $activities_params[] = $current_user_id;
        $activities_types .= "i";
    }
    
    $activities_sql_count = "SELECT COUNT(*) as cnt FROM visit_activities va" . ($current_user_role !== 'admin' ? " WHERE va.activity_user_id = ?" : "");
    $activities_sql .= " ORDER BY va.activity_timestamp DESC";
    if ($section === 'activities') {
        $activities_sql .= " LIMIT ? OFFSET ?";
    } else {
        $activities_sql .= " LIMIT 200";
    }
    
    $stmt_activities = $conn->prepare($activities_sql);
    if (!$stmt_activities) {
        throw new Exception("Prepare failed for activities query: " . $conn->error);
    }
    
    if ($section === 'activities') {
        if (!empty($activities_params)) {
            $activities_types .= 'ii';
            $activities_params[] = $limit;
            $activities_params[] = $offset;
            $stmt_activities->bind_param($activities_types, ...$activities_params);
        } else {
            $stmt_activities->bind_param('ii', $limit, $offset);
        }
    } else if (!empty($activities_params)) {
        $stmt_activities->bind_param($activities_types, ...$activities_params);
    }
    
    $stmt_activities->execute();
    $activities_result = $stmt_activities->get_result();
    $report_data['activities'] = $activities_result->fetch_all(MYSQLI_ASSOC);
    $stmt_activities->close();
    if ($section === 'activities') {
        if ($current_user_role !== 'admin') {
            $stmt_count = $conn->prepare($activities_sql_count);
            $stmt_count->bind_param('i', $current_user_id);
        } else {
            $stmt_count = $conn->prepare("SELECT COUNT(*) as cnt FROM visit_activities");
        }
        $stmt_count->execute();
        $count_res = $stmt_count->get_result();
        $count_row = $count_res->fetch_assoc();
        $stmt_count->close();
        $report_data['pagination'] = [
            'page' => $page,
            'limit' => $limit,
            'total' => intval($count_row['cnt'] ?? 0)
        ];
    }
    }

    // ========== 4. إحصائيات حسب المنطقة (Areas) ==========
    if ($include('areas')) {
    
    $areas_sql = "
        SELECT 
            cat.client_area_tag_id,
            cat.client_area_tag_name,
            COUNT(v.visits_id) as total_visits,
            COUNT(CASE WHEN v.visits_status = 'Completed' THEN 1 END) as completed_visits,
            COUNT(CASE WHEN v.visits_status = 'Cancelled' THEN 1 END) as cancelled_visits,
            COUNT(DISTINCT v.visits_client_id) as unique_clients_visited,
            AVG(CASE WHEN v.visits_end_time IS NOT NULL THEN 
                TIMESTAMPDIFF(MINUTE, v.visits_start_time, v.visits_end_time) 
            END) as avg_visit_duration
        FROM client_area_tags cat
        LEFT JOIN clients c ON cat.client_area_tag_id = c.clients_area_tag_id
        LEFT JOIN visits v ON c.clients_id = v.visits_client_id
    ";
    
    $areas_params = [];
    $areas_types = "";
    
    if ($current_user_role !== 'admin') {
        $areas_sql .= " WHERE v.visits_rep_user_id = ? OR v.visits_rep_user_id IS NULL";
        $areas_params[] = $current_user_id;
        $areas_types .= "i";
    }
    
    $areas_sql .= " GROUP BY cat.client_area_tag_id, cat.client_area_tag_name ORDER BY total_visits DESC";
    if ($section === 'areas') {
        $areas_sql .= " LIMIT ? OFFSET ?";
    }
    
    $stmt_areas = $conn->prepare($areas_sql);
    if (!$stmt_areas) {
        throw new Exception("Prepare failed for areas query: " . $conn->error);
    }
    
    if ($section === 'areas') {
        if (!empty($areas_params)) {
            $areas_types .= 'ii';
            $areas_params[] = $limit;
            $areas_params[] = $offset;
            $stmt_areas->bind_param($areas_types, ...$areas_params);
        } else {
            $stmt_areas->bind_param('ii', $limit, $offset);
        }
    } else if (!empty($areas_params)) {
        $stmt_areas->bind_param($areas_types, ...$areas_params);
    }
    
    $stmt_areas->execute();
    $areas_result = $stmt_areas->get_result();
    $report_data['areas'] = $areas_result->fetch_all(MYSQLI_ASSOC);
    $stmt_areas->close();
    if ($section === 'areas') {
        // Counting unique areas could be heavy; skip total for now or compute approx via count(*) on grouped select
        $report_data['pagination'] = [ 'page' => $page, 'limit' => $limit ];
    }
    }

    // ========== 5. إحصائيات المندوبين (Representatives) ==========
    if ($include('representatives')) {
    
    $reps_sql = "
        SELECT 
            u.users_id,
            u.users_name,
            u.users_email,
            COUNT(v.visits_id) as total_visits,
            COUNT(CASE WHEN v.visits_status = 'Completed' THEN 1 END) as completed_visits,
            COUNT(CASE WHEN v.visits_status = 'Started' THEN 1 END) as ongoing_visits,
            COUNT(CASE WHEN v.visits_status = 'Cancelled' THEN 1 END) as cancelled_visits,
            COUNT(DISTINCT v.visits_client_id) as unique_clients_visited,
            AVG(CASE WHEN v.visits_end_time IS NOT NULL THEN 
                TIMESTAMPDIFF(MINUTE, v.visits_start_time, v.visits_end_time) 
            END) as avg_visit_duration,
            COUNT(CASE WHEN DATE(v.visits_start_time) = CURDATE() THEN 1 END) as today_visits,
                        (
                            SELECT COUNT(DISTINCT so.sales_orders_id)
                            FROM sales_orders so
                            WHERE 
                                EXISTS (
                                    SELECT 1 FROM visits v2 
                                    WHERE v2.visits_id = so.sales_orders_visit_id 
                                        AND v2.visits_rep_user_id = u.users_id
                                )
                                OR EXISTS (
                                    SELECT 1 FROM visit_activities va 
                                    JOIN visits v3 ON va.activity_visit_id = v3.visits_id
                                    WHERE va.activity_type = 'SalesOrder_Created'
                                        AND va.activity_reference_id = so.sales_orders_id
                                        AND v3.visits_rep_user_id = u.users_id
                                )
                        ) as orders_from_visits,
                        (
                            SELECT COALESCE(SUM(so.sales_orders_total_amount),0)
                            FROM sales_orders so
                            WHERE 
                                EXISTS (
                                    SELECT 1 FROM visits v2 
                                    WHERE v2.visits_id = so.sales_orders_visit_id 
                                        AND v2.visits_rep_user_id = u.users_id
                                )
                                OR EXISTS (
                                    SELECT 1 FROM visit_activities va 
                                    JOIN visits v3 ON va.activity_visit_id = v3.visits_id
                                    WHERE va.activity_type = 'SalesOrder_Created'
                                        AND va.activity_reference_id = so.sales_orders_id
                                        AND v3.visits_rep_user_id = u.users_id
                                )
                        ) as total_sales_from_visits
        FROM users u
        LEFT JOIN visits v ON u.users_id = v.visits_rep_user_id
        WHERE u.users_role = 'rep'
    ";
    
    if ($current_user_role !== 'admin') {
        $reps_sql .= " AND u.users_id = " . $current_user_id;
    }
    
    $reps_sql .= " GROUP BY u.users_id, u.users_name, u.users_email ORDER BY total_visits DESC";
    if ($section === 'representatives') {
        $reps_sql .= " LIMIT ? OFFSET ?";
    }
    
    $stmt_reps = $conn->prepare($reps_sql);
    if (!$stmt_reps) {
        throw new Exception("Prepare failed for representatives query: " . $conn->error);
    }
    
    if ($section === 'representatives') {
        if ($current_user_role !== 'admin') {
            $stmt_reps->bind_param('iii', $current_user_id, $limit, $offset);
        } else {
            $stmt_reps->bind_param('ii', $limit, $offset);
        }
    }
    $stmt_reps->execute();
    $reps_result = $stmt_reps->get_result();
    $report_data['representatives'] = $reps_result->fetch_all(MYSQLI_ASSOC);
    $stmt_reps->close();
    if ($section === 'representatives') {
        // Similar counting simplification
        $report_data['pagination'] = [ 'page' => $page, 'limit' => $limit ];
    }
    }

    // ========== 6. التحليلات (Analytics) ==========
    if ($include('analytics')) {
    
    // إحصائيات الزيارات حسب اليوم (آخر 30 يوم)
    $daily_sql = "
        SELECT 
            DATE(visits_start_time) as visit_date,
            COUNT(*) as total_visits,
            COUNT(CASE WHEN visits_status = 'Completed' THEN 1 END) as completed_visits,
            COUNT(CASE WHEN visits_status = 'Cancelled' THEN 1 END) as cancelled_visits,
            AVG(CASE WHEN visits_end_time IS NOT NULL THEN 
                TIMESTAMPDIFF(MINUTE, visits_start_time, visits_end_time) 
            END) as avg_duration
        FROM visits v
        WHERE visits_start_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    ";
    
    if ($current_user_role !== 'admin') {
        $daily_sql .= " AND v.visits_rep_user_id = " . $current_user_id;
    }
    
    $daily_sql .= " GROUP BY DATE(visits_start_time) ORDER BY visit_date DESC";
    
    $stmt_daily = $conn->prepare($daily_sql);
    if (!$stmt_daily) {
        throw new Exception("Prepare failed for daily analytics query: " . $conn->error);
    }
    
    $stmt_daily->execute();
    $daily_result = $stmt_daily->get_result();
    $report_data['daily_analytics'] = $daily_result->fetch_all(MYSQLI_ASSOC);
    $stmt_daily->close();

    // إحصائيات الزيارات حسب الساعة
    $hourly_sql = "
        SELECT 
            HOUR(visits_start_time) as visit_hour,
            COUNT(*) as total_visits,
            COUNT(CASE WHEN visits_status = 'Completed' THEN 1 END) as completed_visits
        FROM visits v
        WHERE visits_start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ";
    
    if ($current_user_role !== 'admin') {
        $hourly_sql .= " AND v.visits_rep_user_id = " . $current_user_id;
    }
    
    $hourly_sql .= " GROUP BY HOUR(visits_start_time) ORDER BY visit_hour";
    
    $stmt_hourly = $conn->prepare($hourly_sql);
    if (!$stmt_hourly) {
        throw new Exception("Prepare failed for hourly analytics query: " . $conn->error);
    }
    
    $stmt_hourly->execute();
    $hourly_result = $stmt_hourly->get_result();
    $report_data['hourly_analytics'] = $hourly_result->fetch_all(MYSQLI_ASSOC);
    $stmt_hourly->close();
    }

    // ========== 7. أداء الزيارات (Performance) ==========
    if ($include('performance')) {
    
    $performance_sql = "
        SELECT 
            COUNT(*) as total_visits,
            COUNT(CASE WHEN visits_status = 'Completed' THEN 1 END) as completed_visits,
            ROUND((COUNT(CASE WHEN visits_status = 'Completed' THEN 1 END) / NULLIF(COUNT(*),0)) * 100, 2) as completion_rate,
            COUNT(CASE WHEN visits_status = 'Cancelled' THEN 1 END) as cancelled_visits,
            ROUND((COUNT(CASE WHEN visits_status = 'Cancelled' THEN 1 END) / NULLIF(COUNT(*),0)) * 100, 2) as cancellation_rate,
            (SELECT COUNT(DISTINCT so.sales_orders_id) FROM sales_orders so 
                WHERE (
                    EXISTS (SELECT 1 FROM visits v2 WHERE v2.visits_id = so.sales_orders_visit_id " . ($current_user_role !== 'admin' ? "AND v2.visits_rep_user_id = $current_user_id" : "") . ")
                    OR EXISTS (
                        SELECT 1 FROM visit_activities va 
                        JOIN visits v3 ON va.activity_visit_id = v3.visits_id
                        WHERE va.activity_type = 'SalesOrder_Created'
                          AND va.activity_reference_id = so.sales_orders_id
                          " . ($current_user_role !== 'admin' ? "AND v3.visits_rep_user_id = $current_user_id" : "") . "
                    )
                )
            ) as total_orders_from_visits,
            (SELECT COALESCE(SUM(so.sales_orders_total_amount),0) FROM sales_orders so 
                WHERE (
                    EXISTS (SELECT 1 FROM visits v2 WHERE v2.visits_id = so.sales_orders_visit_id " . ($current_user_role !== 'admin' ? "AND v2.visits_rep_user_id = $current_user_id" : "") . ")
                    OR EXISTS (
                        SELECT 1 FROM visit_activities va 
                        JOIN visits v3 ON va.activity_visit_id = v3.visits_id
                        WHERE va.activity_type = 'SalesOrder_Created'
                          AND va.activity_reference_id = so.sales_orders_id
                          " . ($current_user_role !== 'admin' ? "AND v3.visits_rep_user_id = $current_user_id" : "") . "
                    )
                )
            ) as total_revenue_from_visits,
            (SELECT COUNT(*) FROM payments p 
             JOIN visits v2 ON p.payments_visit_id = v2.visits_id 
             WHERE " . ($current_user_role !== 'admin' ? "v2.visits_rep_user_id = $current_user_id" : "1=1") . ") as total_payments_from_visits,
            (SELECT COALESCE(SUM(p.payments_amount),0) FROM payments p 
             JOIN visits v2 ON p.payments_visit_id = v2.visits_id 
             WHERE " . ($current_user_role !== 'admin' ? "v2.visits_rep_user_id = $current_user_id" : "1=1") . ") as total_payment_amount_from_visits
        FROM visits v
    ";
    
    if ($current_user_role !== 'admin') {
        $performance_sql .= " WHERE v.visits_rep_user_id = " . $current_user_id;
    }
    
    $stmt_performance = $conn->prepare($performance_sql);
    if (!$stmt_performance) {
        throw new Exception("Prepare failed for performance query: " . $conn->error);
    }
    
    $stmt_performance->execute();
    $performance_result = $stmt_performance->get_result();
    $report_data['performance'] = $performance_result->fetch_assoc();
    $stmt_performance->close();
    }

    // ========== 8. معلومات إضافية (Additional Info) ==========
    
    // العملاء الأكثر زيارة
    if ($include('top_clients')) {
    $top_clients_sql = "
        SELECT 
            c.clients_id,
            c.clients_company_name,
            c.clients_contact_name,
            c.clients_city,
            COUNT(v.visits_id) as total_visits,
            COUNT(CASE WHEN v.visits_status = 'Completed' THEN 1 END) as completed_visits,
            MAX(v.visits_start_time) as last_visit,
            (SELECT COUNT(*) FROM sales_orders so WHERE so.sales_orders_client_id = c.clients_id) as total_orders,
            (SELECT SUM(so.sales_orders_total_amount) FROM sales_orders so WHERE so.sales_orders_client_id = c.clients_id) as total_revenue
        FROM clients c
        LEFT JOIN visits v ON c.clients_id = v.visits_client_id
    ";
    
    if ($current_user_role !== 'admin') {
        $top_clients_sql .= " WHERE c.clients_rep_user_id = " . $current_user_id;
    }
    
    $top_clients_sql .= " GROUP BY c.clients_id HAVING total_visits > 0 ORDER BY total_visits DESC";
    if ($section === 'top_clients') {
        $top_clients_sql .= " LIMIT ? OFFSET ?";
    } else {
        $top_clients_sql .= " LIMIT 20";
    }
    
    $stmt_top_clients = $conn->prepare($top_clients_sql);
    if (!$stmt_top_clients) {
        throw new Exception("Prepare failed for top clients query: " . $conn->error);
    }
    
    if ($section === 'top_clients') {
        if ($current_user_role !== 'admin') {
            $stmt_top_clients->bind_param('iii', $current_user_id, $limit, $offset);
        } else {
            $stmt_top_clients->bind_param('ii', $limit, $offset);
        }
    }
    $stmt_top_clients->execute();
    $top_clients_result = $stmt_top_clients->get_result();
    $report_data['top_clients'] = $top_clients_result->fetch_all(MYSQLI_ASSOC);
    $stmt_top_clients->close();
    if ($section === 'top_clients') {
        $report_data['pagination'] = [ 'page' => $page, 'limit' => $limit ];
    }
    }

    // إرسال النتيجة بناءً على section المطلوب
    if ($section === 'overview') {
        print_success("Visits overview retrieved successfully.", ['overview' => $report_data['overview']]);
    } elseif ($section === 'details') {
        print_success("Visits details retrieved successfully.", ['details' => $report_data['details']]);
    } elseif ($section === 'activities') {
        print_success("Visits activities retrieved successfully.", ['activities' => $report_data['activities']]);
    } elseif ($section === 'areas') {
        print_success("Visits areas retrieved successfully.", ['areas' => $report_data['areas']]);
    } elseif ($section === 'representatives') {
        print_success("Visits representatives retrieved successfully.", ['representatives' => $report_data['representatives']]);
    } elseif ($section === 'analytics') {
        print_success("Visits analytics retrieved successfully.", [
            'daily_analytics' => $report_data['daily_analytics'] ?? [],
            'hourly_analytics' => $report_data['hourly_analytics'] ?? [],
        ]);
    } elseif ($section === 'performance') {
        print_success("Visits performance retrieved successfully.", ['performance' => $report_data['performance']]);
    } elseif ($section === 'top_clients') {
        print_success("Visits top clients retrieved successfully.", ['top_clients' => $report_data['top_clients']]);
    } else {
        // إرسال جميع البيانات
        print_success("Visits reports retrieved successfully.", $report_data);
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
