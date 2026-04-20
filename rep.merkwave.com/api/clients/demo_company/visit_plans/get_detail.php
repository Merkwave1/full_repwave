<?php

require_once '../db_connect.php'; 
// functions.php is automatically included via db_connect.php

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get users_uuid and visit_plan_id from GET request
    $users_uuid = $_GET['users_uuid'] ?? null;
    $visit_plan_id = $_GET['visit_plan_id'] ?? null;

    // Validate required parameters
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }
    if (empty($visit_plan_id) || !is_numeric($visit_plan_id)) {
        print_failure("Error: Valid Visit Plan ID is required.");
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

    // Build SQL query to get visit plan details with representative info
    $sql = "
        SELECT 
            vp.*,
            u.users_name as representative_name,
            u.users_email as representative_email
        FROM visit_plans vp
        LEFT JOIN users u ON vp.user_id = u.users_id
        WHERE vp.visit_plan_id = ?
    ";
    $params = [$visit_plan_id];
    $types = "i"; // 'i' for integer (visit_plan_id)

    // Apply authorization logic: if user is not admin, filter by representative
    if ($current_user_role !== 'admin') {
        $sql .= " AND vp.user_id = ?";
        $params[] = $current_user_id;
        $types .= "i"; // 'i' for integer (user_id)
    }

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $visit_plan = $result->fetch_assoc();
    $stmt->close();

    if (!$visit_plan) {
        print_failure("Error: Visit plan not found or access denied.");
    }

    // Get associated clients for this visit plan
    $clients_sql = "
        SELECT 
            vpc.visit_plan_clients_id,
            vpc.client_id,
            vpc.visit_plan_client_added_at,
            c.clients_company_name,
            c.clients_contact_name,
            c.clients_contact_phone_1,
            c.clients_address,
            c.clients_city,
            c.clients_latitude,
            c.clients_longitude,
            c.clients_status as client_status
        FROM visit_plan_clients vpc
        LEFT JOIN clients c ON vpc.client_id = c.clients_id
        WHERE vpc.visit_plan_id = ?
        ORDER BY vpc.visit_plan_client_added_at DESC
    ";

    $clients_stmt = $conn->prepare($clients_sql);
    if (!$clients_stmt) {
        throw new Exception("Prepare failed for clients: " . $conn->error);
    }

    $clients_stmt->bind_param("i", $visit_plan_id);
    $clients_stmt->execute();
    $clients_result = $clients_stmt->get_result();
    $visit_plan_clients = $clients_result->fetch_all(MYSQLI_ASSOC);
    $clients_stmt->close();

    // Parse JSON fields for better frontend consumption
    if ($visit_plan['visit_plan_selected_days']) {
        $visit_plan['visit_plan_selected_days'] = json_decode($visit_plan['visit_plan_selected_days'], true);
    }

    // Add clients to the visit plan data
    $visit_plan['clients'] = $visit_plan_clients;
    $visit_plan['clients_count'] = count($visit_plan_clients);

    print_success("Visit plan details retrieved successfully.", $visit_plan);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) { $stmt->close(); }
    if (isset($stmt_user) && $stmt_user !== false) { $stmt_user->close(); }
    if (isset($clients_stmt) && $clients_stmt !== false) { $clients_stmt->close(); }
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
