<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get users_uuid from GET request
    $users_uuid = $_GET['users_uuid'] ?? null;

    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    // Get user_id and role from users table based on users_uuid
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

    // Build SQL query with joins to get additional information
    $sql = "
        SELECT 
            vp.visit_plan_id,
            vp.visit_plan_name,
            vp.visit_plan_description,
            vp.user_id,
            vp.visit_plan_status,
            vp.visit_plan_start_date,
            vp.visit_plan_end_date,
            vp.visit_plan_recurrence_type,
            vp.visit_plan_selected_days,
            vp.visit_plan_repeat_every,
            vp.visit_plan_created_at,
            vp.visit_plan_updated_at,
            u.users_name as representative_name,
            COUNT(vpc.client_id) as clients_count
        FROM visit_plans vp
        LEFT JOIN users u ON vp.user_id = u.users_id
        LEFT JOIN visit_plan_clients vpc ON vp.visit_plan_id = vpc.visit_plan_id
    ";

    $params = [];
    $types = "";

    // Apply authorization logic: if user is not admin, filter by representative
    if ($current_user_role !== 'admin') {
        $sql .= " WHERE vp.user_id = ?";
        $params[] = $current_user_id;
        $types .= "i";
    } else {
        $sql .= " WHERE 1=1";
    }

    // Add optional filters
    $visit_plan_status = $_GET['visit_plan_status'] ?? null;
    if (!empty($visit_plan_status)) {
        $sql .= " AND vp.visit_plan_status = ?";
        $params[] = $visit_plan_status;
        $types .= "s";
    }

    $user_id_filter = $_GET['user_id'] ?? null;
    if (!empty($user_id_filter) && $current_user_role === 'admin') {
        $sql .= " AND vp.user_id = ?";
        $params[] = $user_id_filter;
        $types .= "i";
    }

    $sql .= " GROUP BY vp.visit_plan_id ORDER BY vp.visit_plan_created_at DESC";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $visit_plans = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Parse JSON fields for better frontend consumption
    foreach ($visit_plans as &$plan) {
        if ($plan['visit_plan_selected_days']) {
            $plan['visit_plan_selected_days'] = json_decode($plan['visit_plan_selected_days'], true);
        }
    }

    print_success("Visit plans retrieved successfully.", $visit_plans);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) { $stmt->close(); }
    if (isset($stmt_user) && $stmt_user !== false) { $stmt_user->close(); }
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
        $plans[] = $row;
    }

    // Get summary statistics
    $stats_sql = "
        SELECT 
            COUNT(*) as total_plans,
            SUM(CASE WHEN visit_plan_status = 'Draft' THEN 1 ELSE 0 END) as draft_plans,
            SUM(CASE WHEN visit_plan_status = 'Active' THEN 1 ELSE 0 END) as active_plans,
            SUM(CASE WHEN visit_plan_status = 'Completed' THEN 1 ELSE 0 END) as completed_plans,
            SUM(actual_client_count) as total_planned_clients
        FROM visit_plans_details_view
        WHERE 1=1
    ";
    
    $stats_params = [];
    $stats_types = "";
    
    if ($rep_id) {
        $stats_sql .= " AND rep_id = ?";
        $stats_params[] = $rep_id;
        $stats_types .= "i";
    }
    
    if ($status !== 'all') {
        $stats_sql .= " AND visit_plan_status = ?";
        $stats_params[] = $status;
        $stats_types .= "s";
    }

    $stats_stmt = $conn->prepare($stats_sql);
    if (!empty($stats_params)) {
        $stats_stmt->bind_param($stats_types, ...$stats_params);
    }
    $stats_stmt->execute();
    $stats_result = $stats_stmt->get_result();
    $stats = $stats_result->fetch_assoc();

    print_success('Visit plans retrieved successfully', [
        'plans' => $plans,
        'statistics' => [
            'total_plans' => intval($stats['total_plans']),
            'draft_plans' => intval($stats['draft_plans']),
            'active_plans' => intval($stats['active_plans']),
            'completed_plans' => intval($stats['completed_plans']),
            'total_planned_clients' => intval($stats['total_planned_clients']),
            'shown_plans' => count($plans)
        ],
        'filters' => [
            'rep_id' => $rep_id,
            'status' => $status,
            'created_by' => $created_by
        ]
    ]);

} catch (Exception $e) {
    print_failure('Error fetching visit plans: ' . $e->getMessage());
}

$conn->close();
?>
