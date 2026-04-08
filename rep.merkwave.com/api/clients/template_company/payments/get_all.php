<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // --- Authorization ---
    $user_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;

    if (empty($user_uuid)) {
        print_failure("Error: User UUID is required to fetch payments.");
    }

    // Get user's ID and role based on the UUID
    $user_stmt = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    $user_stmt->bind_param("s", $user_uuid);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();

    if ($user_result->num_rows === 0) {
        print_failure("Error: Invalid user UUID. No user found.");
    }
    $user_row = $user_result->fetch_assoc();
    $rep_user_id = $user_row['users_id'];
    $user_role = $user_row['users_role'];
    $user_stmt->close();
    // --- End Authorization ---

    // Get filter and pagination parameters
    $client_id = $_GET['client_id'] ?? $_POST['client_id'] ?? null;
    $method_id = $_GET['method_id'] ?? $_POST['method_id'] ?? null;
    $search = $_GET['search'] ?? $_POST['search'] ?? '';
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : (isset($_POST['page']) ? max(1, (int)$_POST['page']) : 1);
    $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : (isset($_POST['limit']) ? max(1, min(100, (int)$_POST['limit'])) : 20);
    $offset = ($page - 1) * $limit;

    $sql = "
        SELECT 
            p.payments_id,
            p.payments_client_id,
            c.clients_company_name,
            p.payments_method_id,
            pm.payment_methods_name,
            p.payments_amount,
            p.payments_date,
            p.payments_transaction_id,
            p.payments_notes,
            p.payments_rep_user_id,
            u.users_name as rep_user_name, -- Added representative name
            p.payments_safe_id,
            s.safes_name,
            p.payments_safe_transaction_id,
            p.payments_odoo_payment_id,
            p.payments_created_at,
            p.payments_updated_at
        FROM payments p
        JOIN clients c ON p.payments_client_id = c.clients_id
        JOIN payment_methods pm ON p.payments_method_id = pm.payment_methods_id
        JOIN users u ON p.payments_rep_user_id = u.users_id -- Join with users table
        LEFT JOIN safes s ON p.payments_safe_id = s.safes_id
    ";

    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    // MODIFIED: Role-based filtering
    // If the user is not an admin, filter by their user ID.
    if (strtolower($user_role) !== 'admin') {
        $where_clauses[] = "p.payments_rep_user_id = ?";
        $bind_types .= "i";
        $bind_params[] = $rep_user_id;
    }

    // Add other filters if they are provided
    if (!empty($client_id) && is_numeric($client_id)) {
        $where_clauses[] = "p.payments_client_id = ?";
        $bind_types .= "i";
        $bind_params[] = $client_id;
    } else if (!empty($client_id)) { 
        print_failure("Error: Invalid client ID provided.");
    }

    if (!empty($method_id) && is_numeric($method_id)) {
        $where_clauses[] = "p.payments_method_id = ?";
        $bind_types .= "i";
        $bind_params[] = $method_id;
    } else if (!empty($method_id)) { 
        print_failure("Error: Invalid payment method ID provided.");
    }

    // Apply search filter (client name, payment method, transaction ID, notes, payment ID)
    if (!empty($search)) {
        $search_param = '%' . $search . '%';
        $where_clauses[] = "(c.clients_company_name LIKE ? OR pm.payment_methods_name LIKE ? OR p.payments_transaction_id LIKE ? OR p.payments_notes LIKE ? OR CAST(p.payments_id AS CHAR) LIKE ?)";
        $bind_types .= 'sssss';
        $bind_params[] = $search_param;
        $bind_params[] = $search_param;
        $bind_params[] = $search_param;
        $bind_params[] = $search_param;
        $bind_params[] = $search_param;
    }

    // Append WHERE clause if there are any conditions
    if (!empty($where_clauses)) {
        $sql .= " WHERE " . implode(" AND ", $where_clauses);
    }

    // Count total records before pagination
    $count_sql = "SELECT COUNT(*) as total " . substr($sql, strpos($sql, 'FROM'));
    $stmt_count = $conn->prepare($count_sql);
    if (!$stmt_count) { throw new Exception('Prepare failed for count query: ' . $conn->error); }
    if (!empty($bind_params)) {
        $stmt_count->bind_param($bind_types, ...$bind_params);
    }
    $stmt_count->execute();
    $count_result = $stmt_count->get_result();
    $total_items = (int)$count_result->fetch_assoc()['total'];
    $total_pages = $limit > 0 ? ceil($total_items / $limit) : 0;
    $stmt_count->close();

    // Add ordering and pagination
    $sql .= " ORDER BY p.payments_date DESC LIMIT ? OFFSET ?";
    $bind_types .= 'ii';
    $bind_params[] = $limit;
    $bind_params[] = $offset;

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    if (!empty($bind_params)) {
        $stmt->bind_param($bind_types, ...$bind_params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();

    $payments = [];
    while ($row = $result->fetch_assoc()) {
        $payments[] = $row;
    }

    $has_more = $page < $total_pages;

    print_success("Payments retrieved successfully.", [
        'pagination' => [
            'current_page' => $page,
            'limit' => $limit,
            'total_items' => $total_items,
            'total_pages' => $total_pages,
            'has_more' => $has_more
        ],
        'data' => $payments,
        'user_role' => $user_role,
        'filters_applied' => [
            'search' => !empty($search),
            'client_id' => !empty($client_id),
            'method_id' => !empty($method_id)
        ]
    ]);

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
