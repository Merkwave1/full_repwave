<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_GET['users_uuid'] ?? null;
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    $rawDate = $_GET['date'] ?? date('Y-m-d');
    $dateObject = DateTime::createFromFormat('Y-m-d', substr((string) $rawDate, 0, 10));
    if (!$dateObject) {
        try {
            $dateObject = new DateTime($rawDate);
        } catch (Exception $e) {
            $dateObject = new DateTime('now');
        }
    }
    $targetDate = $dateObject->format('Y-m-d');

    $includeVisitPlansParam = strtolower(trim((string) ($_GET['include_visit_plans'] ?? '1')));
    $includeVisitPlans = !in_array($includeVisitPlansParam, ['0', 'false', 'no'], true);

    $visitPlanStatus = $_GET['visit_plan_status'] ?? 'Active';
    $statusFilter = $_GET['status'] ?? null;
    $clientIdFilter = $_GET['client_id'] ?? null;
    $userIdFilter = $_GET['user_id'] ?? null;
    $limitParam = isset($_GET['limit']) ? intval($_GET['limit']) : 200;
    $visitsLimit = max(10, min(500, $limitParam));

    $stmtUser = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    if (!$stmtUser) {
        print_failure("Error: Failed to prepare user lookup query.");
    }
    $stmtUser->bind_param('s', $users_uuid);
    $stmtUser->execute();
    $userResult = $stmtUser->get_result();
    $userData = $userResult->fetch_assoc();
    $stmtUser->close();

    if (!$userData) {
        print_failure("Error: Invalid User UUID provided.");
    }

    $currentUserId = intval($userData['users_id']);
    $currentUserRole = $userData['users_role'];

    $visitPlans = [];
    $planIndexMap = [];

    if ($includeVisitPlans) {
        $planSql = "
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
                u.users_name AS representative_name,
                COUNT(vpc.client_id) AS clients_count
            FROM visit_plans vp
            LEFT JOIN users u ON vp.user_id = u.users_id
            LEFT JOIN visit_plan_clients vpc ON vp.visit_plan_id = vpc.visit_plan_id
            WHERE 1 = 1
        ";

        $planParams = [];
        $planTypes = '';

        if ($currentUserRole !== 'admin') {
            $planSql .= ' AND vp.user_id = ?';
            $planParams[] = $currentUserId;
            $planTypes .= 'i';
        } elseif (!empty($userIdFilter) && is_numeric($userIdFilter)) {
            $planSql .= ' AND vp.user_id = ?';
            $planParams[] = intval($userIdFilter);
            $planTypes .= 'i';
        }

        if (!empty($visitPlanStatus) && strtolower($visitPlanStatus) !== 'all') {
            $planSql .= ' AND vp.visit_plan_status = ?';
            $planParams[] = $visitPlanStatus;
            $planTypes .= 's';
        }

        $planSql .= ' GROUP BY vp.visit_plan_id ORDER BY vp.visit_plan_created_at DESC';

        $stmtPlans = $conn->prepare($planSql);
        if (!$stmtPlans) {
            throw new Exception('Prepare failed for visit plans query: ' . $conn->error);
        }

        if (!empty($planParams)) {
            $stmtPlans->bind_param($planTypes, ...$planParams);
        }

        $stmtPlans->execute();
        $planResult = $stmtPlans->get_result();

        $planIds = [];
        $planIndex = 0;
        while ($planRow = $planResult->fetch_assoc()) {
            if (!empty($planRow['visit_plan_selected_days'])) {
                $decodedDays = json_decode($planRow['visit_plan_selected_days'], true);
                $planRow['visit_plan_selected_days'] = is_array($decodedDays) ? array_values(array_map('intval', $decodedDays)) : [];
            } else {
                $planRow['visit_plan_selected_days'] = [];
            }

            $planRow['clients_count'] = intval($planRow['clients_count'] ?? 0);
            $planRow['clients'] = [];

            $visitPlans[] = $planRow;
            $planId = intval($planRow['visit_plan_id']);
            $planIds[] = $planId;
            $planIndexMap[$planId] = $planIndex;
            $planIndex++;
        }
        $stmtPlans->close();

        if (!empty($planIds)) {
            $placeholders = implode(',', array_fill(0, count($planIds), '?'));
            $clientsSql = "
                SELECT 
                    vpc.visit_plan_clients_id,
                    vpc.visit_plan_id,
                    vpc.client_id,
                    vpc.visit_plan_client_added_at,
                    c.clients_company_name,
                    c.clients_contact_name,
                    c.clients_contact_phone_1,
                    c.clients_address,
                    c.clients_city,
                    c.clients_latitude,
                    c.clients_longitude,
                    c.clients_status AS client_status
                FROM visit_plan_clients vpc
                LEFT JOIN clients c ON vpc.client_id = c.clients_id
                WHERE vpc.visit_plan_id IN ($placeholders)
                ORDER BY vpc.visit_plan_id ASC, vpc.visit_plan_client_added_at ASC
            ";

            $stmtClients = $conn->prepare($clientsSql);
            if (!$stmtClients) {
                throw new Exception('Prepare failed for visit plan clients query: ' . $conn->error);
            }

            $clientTypes = str_repeat('i', count($planIds));
            $stmtClients->bind_param($clientTypes, ...$planIds);
            $stmtClients->execute();
            $clientsResult = $stmtClients->get_result();

            while ($clientRow = $clientsResult->fetch_assoc()) {
                $planId = intval($clientRow['visit_plan_id']);
                if (!isset($planIndexMap[$planId])) {
                    continue;
                }

                $clientRow['visit_plan_clients_id'] = intval($clientRow['visit_plan_clients_id']);
                $clientRow['client_id'] = intval($clientRow['client_id']);
                $clientRow['clients_latitude'] = isset($clientRow['clients_latitude']) ? floatval($clientRow['clients_latitude']) : null;
                $clientRow['clients_longitude'] = isset($clientRow['clients_longitude']) ? floatval($clientRow['clients_longitude']) : null;

                $visitPlans[$planIndexMap[$planId]]['clients'][] = $clientRow;
            }

            $stmtClients->close();
        }
    }

    $visitsSql = "
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
            TIMESTAMPDIFF(MINUTE, v.visits_start_time, v.visits_end_time) AS visit_duration_minutes,
            v.visits_created_at,
            v.visits_updated_at,
            (SELECT COUNT(*) FROM visit_activities va WHERE va.activity_visit_id = v.visits_id) AS activities_count,
            (
                (SELECT COUNT(*) FROM sales_orders so WHERE so.sales_orders_visit_id = v.visits_id)
                +
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
            ) AS orders_count,
            (SELECT COUNT(*) FROM payments p WHERE p.payments_visit_id = v.visits_id) AS payments_count,
            (
                SELECT COUNT(*) FROM sales_returns sr
                WHERE sr.sales_returns_visit_id = v.visits_id
                   OR (sr.returns_client_id = v.visits_client_id AND DATE(sr.returns_created_at) = DATE(v.visits_start_time))
            ) AS returns_count
        FROM visits v
        INNER JOIN clients c ON v.visits_client_id = c.clients_id
        INNER JOIN users u ON v.visits_rep_user_id = u.users_id
        LEFT JOIN client_area_tags cat ON c.clients_area_tag_id = cat.client_area_tag_id
        WHERE DATE(v.visits_start_time) = ?
    ";

    $visitParams = [$targetDate];
    $visitTypes = 's';

    if ($currentUserRole !== 'admin') {
        $visitsSql .= ' AND v.visits_rep_user_id = ?';
        $visitParams[] = $currentUserId;
        $visitTypes .= 'i';
    } elseif (!empty($userIdFilter) && is_numeric($userIdFilter)) {
        $visitsSql .= ' AND v.visits_rep_user_id = ?';
        $visitParams[] = intval($userIdFilter);
        $visitTypes .= 'i';
    }

    if (!empty($statusFilter) && in_array($statusFilter, ['Started', 'Completed', 'Cancelled'], true)) {
        $visitsSql .= ' AND v.visits_status = ?';
        $visitParams[] = $statusFilter;
        $visitTypes .= 's';
    }

    if (!empty($clientIdFilter) && is_numeric($clientIdFilter)) {
        $visitsSql .= ' AND v.visits_client_id = ?';
        $visitParams[] = intval($clientIdFilter);
        $visitTypes .= 'i';
    }

    $visitsSql .= ' ORDER BY v.visits_start_time ASC LIMIT ?';
    $visitParams[] = $visitsLimit;
    $visitTypes .= 'i';

    $stmtVisits = $conn->prepare($visitsSql);
    if (!$stmtVisits) {
        throw new Exception('Prepare failed for visits query: ' . $conn->error);
    }

    $stmtVisits->bind_param($visitTypes, ...$visitParams);
    $stmtVisits->execute();
    $visitResult = $stmtVisits->get_result();

    $actualVisits = [];
    $statusCounts = [
        'Started' => 0,
        'Completed' => 0,
        'Cancelled' => 0,
    ];

    while ($visitRow = $visitResult->fetch_assoc()) {
        $visitRow['visits_id'] = intval($visitRow['visits_id']);
        $visitRow['visits_client_id'] = intval($visitRow['visits_client_id']);
        $visitRow['visits_rep_user_id'] = intval($visitRow['visits_rep_user_id']);
        $visitRow['visit_duration_minutes'] = isset($visitRow['visit_duration_minutes']) ? intval($visitRow['visit_duration_minutes']) : null;
        $visitRow['activities_count'] = isset($visitRow['activities_count']) ? intval($visitRow['activities_count']) : 0;
        $visitRow['orders_count'] = isset($visitRow['orders_count']) ? intval($visitRow['orders_count']) : 0;
        $visitRow['payments_count'] = isset($visitRow['payments_count']) ? intval($visitRow['payments_count']) : 0;
        $visitRow['returns_count'] = isset($visitRow['returns_count']) ? intval($visitRow['returns_count']) : 0;

        $statusKey = $visitRow['visits_status'] ?? '';
        if (isset($statusCounts[$statusKey])) {
            $statusCounts[$statusKey]++;
        }

        $visitRow['summary_stats'] = [
            'total_activities' => $visitRow['activities_count'],
            'total_sales_orders' => $visitRow['orders_count'],
            'total_payments' => $visitRow['payments_count'],
            'total_returns' => $visitRow['returns_count'],
        ];

        $actualVisits[] = $visitRow;
    }

    $stmtVisits->close();

    print_success('Visit day overview retrieved successfully.', [
        'date' => $targetDate,
        'visit_plans' => $includeVisitPlans ? $visitPlans : null,
        'actual_visits' => $actualVisits,
        'stats' => [
            'visit_counts' => $statusCounts,
            'total_actual_visits' => count($actualVisits),
            'total_visit_plans' => $includeVisitPlans ? count($visitPlans) : null,
        ],
    ]);
} catch (Exception | TypeError $e) {
    print_failure('Internal Error: ' . $e->getMessage());
} finally {
    if (isset($stmtUser) && $stmtUser instanceof mysqli_stmt) {
        $stmtUser->close();
    }
    if (isset($stmtPlans) && $stmtPlans instanceof mysqli_stmt) {
        $stmtPlans->close();
    }
    if (isset($stmtClients) && $stmtClients instanceof mysqli_stmt) {
        $stmtClients->close();
    }
    if (isset($stmtVisits) && $stmtVisits instanceof mysqli_stmt) {
        $stmtVisits->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}

?>
