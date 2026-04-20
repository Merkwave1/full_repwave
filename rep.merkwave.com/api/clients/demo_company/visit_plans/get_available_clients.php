<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get users_uuid from GET request
    $users_uuid = $_GET['users_uuid'] ?? null;
    $visit_plan_id = $_GET['visit_plan_id'] ?? null; // Optional: to exclude already assigned clients

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

    // Build SQL query to get available clients
    $sql = "
        SELECT 
            c.clients_id,
            c.clients_company_name,
            c.clients_rep_user_id,
            c.clients_city,
            c.clients_area_tag_id,
            c.clients_industry_id,
            c.clients_type,
            c.clients_last_visit,
            c.clients_credit_balance,
            c.clients_status
        FROM clients c
        WHERE c.clients_status = 'active'
    ";

    $params = [];
    $types = "";

    // Apply authorization logic: if user is not admin, filter by representative
    if ($current_user_role !== 'admin') {
        $sql .= " AND c.clients_rep_user_id = ?";
        $params[] = $current_user_id;
        $types .= "i";
    }

    // If visit_plan_id is provided, exclude clients already in that plan
    if (!empty($visit_plan_id) && is_numeric($visit_plan_id)) {
        $sql .= " AND c.clients_id NOT IN (
            SELECT vpc.client_id 
            FROM visit_plan_clients vpc 
            WHERE vpc.visit_plan_id = ?
        )";
        $params[] = $visit_plan_id;
        $types .= "i";
    }

    // Add optional filters
    $client_type = $_GET['client_type'] ?? null;
    if (!empty($client_type)) {
        $sql .= " AND c.clients_type = ?";
        $params[] = $client_type;
        $types .= "s";
    }

    $city = $_GET['city'] ?? null;
    if (!empty($city)) {
        $sql .= " AND c.clients_city LIKE ?";
        $params[] = '%' . $city . '%';
        $types .= "s";
    }

    $search = $_GET['search'] ?? null;
    if (!empty($search)) {
        $sql .= " AND (c.clients_company_name LIKE ? OR c.clients_contact_name LIKE ?)";
        $params[] = '%' . $search . '%';
        $params[] = '%' . $search . '%';
        $types .= "ss";
    }

    $sql .= " ORDER BY c.clients_company_name ASC";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $available_clients = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    print_success("Available clients retrieved successfully.", $available_clients);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) { $stmt->close(); }
    if (isset($stmt_user) && $stmt_user !== false) { $stmt_user->close(); }
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
