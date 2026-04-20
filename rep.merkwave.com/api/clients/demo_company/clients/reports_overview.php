<?php
require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get users_uuid from POST request
    $input = json_decode(file_get_contents('php://input'), true);
    $users_uuid = $input['users_uuid'] ?? $_GET['users_uuid'] ?? null;

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

    // Build clients query with role-based filtering
    $sql = "
        SELECT 
        c.clients_id,
        c.clients_company_name,
        c.clients_email,
        c.clients_contact_name,
        c.clients_contact_phone_1,
        c.clients_city,
        c.clients_credit_balance,
        c.clients_status,
        c.clients_type,
        c.clients_last_visit,
        c.clients_area_tag_id,
        c.clients_industry_id,
        c.clients_rep_user_id,
        c.clients_created_at,
        c.clients_updated_at
        FROM clients c
    ";

    $params = [];
    $types = "";

    // Apply role-based filtering
    if ($current_user_role !== 'admin') {
        $sql .= " WHERE c.clients_rep_user_id = ?";
        $params[] = $current_user_id;
        $types .= "i";
    }
    
    $sql .= " ORDER BY c.clients_company_name ASC";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed for clients: " . $conn->error);
    }

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $clients = [];
    while ($row = $result->fetch_assoc()) {
        // Map to frontend expected format
        $clients[] = [
            'client_id' => $row['clients_id'],
            'client_name' => $row['clients_company_name'],
            'email' => $row['clients_email'],
            'phone' => $row['clients_contact_phone_1'],
            'address' => $row['clients_city'],
            'status' => $row['clients_status'],
            'client_type' => $row['clients_type'],
            'industry_id' => $row['clients_industry_id'],
            'area_tag_id' => $row['clients_area_tag_id'],
            'rep_user_id' => $row['clients_rep_user_id'],
            'created_at' => $row['clients_created_at'],
            'updated_at' => $row['clients_updated_at'],
            'last_visit' => $row['clients_last_visit'],
            'credit_balance' => $row['clients_credit_balance']
        ];
    }

    // Calculate overview statistics
    $total_clients = count($clients);
    $active_clients = count(array_filter($clients, fn($c) => $c['status'] === 'active'));
    $inactive_clients = count(array_filter($clients, fn($c) => $c['status'] === 'inactive'));
    $individual_clients = count(array_filter($clients, fn($c) => $c['client_type'] === 'individual'));
    $company_clients = count(array_filter($clients, fn($c) => $c['client_type'] === 'company'));

    // Calculate this month and last month new clients
    $now = new DateTime();
    $this_month = $now->format('Y-m');
    $last_month = $now->modify('-1 month')->format('Y-m');

    $new_clients_this_month = count(array_filter($clients, function($c) use ($this_month) {
        return strpos($c['created_at'], $this_month) === 0;
    }));

    $new_clients_last_month = count(array_filter($clients, function($c) use ($last_month) {
        return strpos($c['created_at'], $last_month) === 0;
    }));

    // Calculate growth rate
    $growth_rate = 0;
    if ($new_clients_last_month > 0) {
        $growth_rate = round((($new_clients_this_month - $new_clients_last_month) / $new_clients_last_month) * 100, 1);
    } elseif ($new_clients_this_month > 0) {
        $growth_rate = 100;
    }

    $overview = [
        'total_clients' => $total_clients,
        'active_clients' => $active_clients,
        'inactive_clients' => $inactive_clients,
        'active_percentage' => $total_clients > 0 ? round(($active_clients / $total_clients) * 100, 1) : 0,
        'new_clients_this_month' => $new_clients_this_month,
        'new_clients_last_month' => $new_clients_last_month,
        'growth_rate' => $growth_rate,
        'individual_clients' => $individual_clients,
        'company_clients' => $company_clients,
        'individual_percentage' => $total_clients > 0 ? round(($individual_clients / $total_clients) * 100, 1) : 0,
        'company_percentage' => $total_clients > 0 ? round(($company_clients / $total_clients) * 100, 1) : 0
    ];

    print_success("Clients overview retrieved successfully.", [
        'overview' => $overview,
        'clients' => $clients
    ]);

} catch (Exception $e) {
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
