<?php
// visit_plans/get_all_clients.php
// Returns all clients (assigned and unassigned) for the current user, with assignment status for a given visit plan

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_GET['users_uuid'] ?? null;
    $visit_plan_id = $_GET['visit_plan_id'] ?? null;

    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }
    if (empty($visit_plan_id) || !is_numeric($visit_plan_id)) {
        print_failure("Error: Valid visit_plan_id is required.");
    }

    // Get user_id and role
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

    // Get all clients for this user (or all if admin)
    $sql = "SELECT 
        c.clients_id,
        c.clients_company_name,
        c.clients_rep_user_id,
        c.clients_city,
        c.clients_area_tag_id,
        area.client_area_tag_name,
        c.clients_industry_id,
        ind.client_industries_name AS client_industry_name,
        c.clients_type,
        c.clients_last_visit,
        c.clients_credit_balance,
        c.clients_status,
        (
            SELECT COUNT(1) FROM visit_plan_clients vpc 
            WHERE vpc.client_id = c.clients_id AND vpc.visit_plan_id = ?
        ) AS is_assigned
    FROM clients c
    LEFT JOIN client_area_tags area ON c.clients_area_tag_id = area.client_area_tag_id
    LEFT JOIN client_industries ind ON c.clients_industry_id = ind.client_industries_id
    WHERE c.clients_status = 'active'";

    $params = [$visit_plan_id];
    $types = "i";

    if ($current_user_role !== 'admin') {
        $sql .= " AND c.clients_rep_user_id = ?";
        $params[] = $current_user_id;
        $types .= "i";
    }

    $sql .= " ORDER BY c.clients_company_name ASC";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $clients = [];
    while ($row = $result->fetch_assoc()) {
        $row['is_assigned'] = (int)$row['is_assigned'] > 0 ? true : false;
        $clients[] = $row;
    }
    $stmt->close();

    print_success("All clients with assignment status retrieved successfully.", $clients);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) { $stmt->close(); }
    if (isset($stmt_user) && $stmt_user !== false) { $stmt_user->close(); }
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
