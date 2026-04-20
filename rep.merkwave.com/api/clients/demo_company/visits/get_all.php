<?php
// File: /visits/get_all.php
// Description: Get all visits for the authenticated representative

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get user UUID from query parameters
    $users_uuid = $_GET['users_uuid'] ?? null;
    
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }
    
    // Get user ID and role from UUID
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    if (!$stmt_user) {
        print_failure("Error: Failed to prepare user query.");
    }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();

    if (!$user_data) {
        print_failure("Error: Invalid user UUID.");
    }

    $user_id = $user_data['users_id'];
    $user_role = $user_data['users_role'];

    // Get pagination parameters
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = min(100, max(1, intval($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    
    // Get filter parameters
    $status_filter = $_GET['status'] ?? null;
    $client_id_filter = $_GET['client_id'] ?? null;
    $date_from = $_GET['date_from'] ?? null;
    $date_to = $_GET['date_to'] ?? null;
    $search = $_GET['search'] ?? null;
    $rep_id = $_GET['rep_id'] ?? null;
    $area_tag_id = $_GET['area_tag_id'] ?? null;

    // Build WHERE clause based on user role
    $where_conditions = [];
    $params = [];
    $types = "";

    // Role-based filtering
    if ($user_role !== 'admin') {
        $where_conditions[] = "v.visits_rep_user_id = ?";
        $params[] = $user_id;
        $types .= "i";
    }

    if ($status_filter && in_array($status_filter, ['Started', 'Completed', 'Cancelled'])) {
        $where_conditions[] = "v.visits_status = ?";
        $params[] = $status_filter;
        $types .= "s";
    }

    if ($client_id_filter && is_numeric($client_id_filter)) {
        $where_conditions[] = "v.visits_client_id = ?";
        $params[] = intval($client_id_filter);
        $types .= "i";
    }

    if ($date_from) {
        $where_conditions[] = "DATE(v.visits_start_time) >= ?";
        $params[] = $date_from;
        $types .= "s";
    }

    if ($date_to) {
        $where_conditions[] = "DATE(v.visits_start_time) <= ?";
        $params[] = $date_to;
        $types .= "s";
    }

    // Search filter
    if ($search && trim($search)) {
        $where_conditions[] = "(c.clients_company_name LIKE ? OR u.users_name LIKE ? OR cat.client_area_tag_name LIKE ?)";
        $search_param = "%" . trim($search) . "%";
        $params = array_merge($params, [$search_param, $search_param, $search_param]);
        $types .= "sss";
    }

    // Representative filter (for admin users)
    if ($rep_id && is_numeric($rep_id)) {
        $where_conditions[] = "v.visits_rep_user_id = ?";
        $params[] = intval($rep_id);
        $types .= "i";
    }

    // Area tag filter
    if ($area_tag_id && is_numeric($area_tag_id)) {
        $where_conditions[] = "c.clients_area_tag_id = ?";
        $params[] = intval($area_tag_id);
        $types .= "i";
    }

    $where_clause = !empty($where_conditions) ? "WHERE " . implode(" AND ", $where_conditions) : "";

    // Get total count
    $count_sql = "
        SELECT COUNT(*) as total
        FROM visits v
        INNER JOIN clients c ON v.visits_client_id = c.clients_id
        INNER JOIN users u ON v.visits_rep_user_id = u.users_id
    LEFT JOIN client_area_tags cat ON c.clients_area_tag_id = cat.client_area_tag_id
        $where_clause
    ";
    
    $count_stmt = $conn->prepare($count_sql);
    
    if (!empty($params)) {
        $count_stmt->bind_param($types, ...$params);
    }
    
    $count_stmt->execute();
    $total = $count_stmt->get_result()->fetch_assoc()['total'];
    $count_stmt->close();

    // Get visits with pagination
    $main_sql = "
        SELECT 
            v.visits_id,
            v.visits_client_id,
            c.clients_company_name AS clients_company_name,
            c.clients_company_name AS client_name,
            c.clients_contact_name,
            v.visits_rep_user_id,
            u.users_name AS rep_name,
            v.visits_start_time,
            v.visits_end_time,
            v.visits_start_latitude,
            v.visits_start_longitude,
            v.visits_end_latitude,
            v.visits_end_longitude,
            v.visits_status,
            v.visits_purpose,
            v.visits_outcome,
            v.visits_notes,
            cat.client_area_tag_name AS client_area_tag_name,
            TIMESTAMPDIFF(MINUTE, v.visits_start_time, v.visits_end_time) as visit_duration_minutes,
            v.visits_created_at,
            v.visits_updated_at,
            (SELECT COUNT(*) FROM visit_activities va WHERE va.activity_visit_id = v.visits_id) as activities_count,
                        (
                                -- Count of sales orders directly linked to the visit
                                (SELECT COUNT(*)
                                 FROM sales_orders so
                                 WHERE so.sales_orders_visit_id = v.visits_id)
                                +
                                -- Count of sales orders created during the visit via activities, excluding ones already linked to the visit
                                (SELECT COUNT(*)
                                 FROM sales_orders so2
                                 WHERE (so2.sales_orders_visit_id IS NULL OR so2.sales_orders_visit_id <> v.visits_id)
                                     AND EXISTS (
                                             SELECT 1
                                             FROM visit_activities va2
                                             WHERE va2.activity_reference_id = so2.sales_orders_id
                                                 AND va2.activity_visit_id = v.visits_id
                                                 AND va2.activity_type = 'SalesOrder_Created'
                                     )
                                )
                        ) as orders_count,
            (SELECT COUNT(*) FROM payments p WHERE p.payments_visit_id = v.visits_id) as payments_count,
            (
                SELECT COUNT(*) FROM sales_returns sr
                WHERE sr.sales_returns_visit_id = v.visits_id
                   OR (sr.returns_client_id = v.visits_client_id AND DATE(sr.returns_created_at) = DATE(v.visits_start_time))
            ) as returns_count
        FROM visits v
        INNER JOIN clients c ON v.visits_client_id = c.clients_id
        INNER JOIN users u ON v.visits_rep_user_id = u.users_id
    LEFT JOIN client_area_tags cat ON c.clients_area_tag_id = cat.client_area_tag_id
        $where_clause
        ORDER BY v.visits_start_time DESC
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $conn->prepare($main_sql);
    
    // Add limit and offset to params
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    
    $visits = [];
    while ($row = $result->fetch_assoc()) {
        // Add summary_stats subset to align with details endpoint
        $row['summary_stats'] = [
            'total_activities' => intval($row['activities_count'] ?? 0),
            'total_sales_orders' => intval($row['orders_count'] ?? 0),
            'total_payments' => intval($row['payments_count'] ?? 0),
            'total_returns' => intval($row['returns_count'] ?? 0)
        ];
        $visits[] = $row;
    }
    $stmt->close();

    print_success("Visits retrieved successfully.", [
        'visits' => $visits,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => ceil($total / $limit)
        ]
    ]);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
