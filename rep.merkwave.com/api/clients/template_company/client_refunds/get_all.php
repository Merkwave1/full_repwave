<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) { print_failure("Error: User UUID is required."); }

    // Validate user
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    if (!$stmt_user) { throw new Exception("Prepare failed for user query: " . $conn->error); }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $user_res = $stmt_user->get_result();
    $user = $user_res->fetch_assoc();
    $stmt_user->close();
    if (!$user) { print_failure("Error: Invalid user UUID."); }

    // Filters
    $client_id = $_GET['client_id'] ?? $_POST['client_id'] ?? null;
    $payment_method_id = $_GET['payment_method_id'] ?? $_POST['payment_method_id'] ?? null;
    $safe_id = $_GET['safe_id'] ?? $_POST['safe_id'] ?? null;
    $date_from = $_GET['date_from'] ?? $_POST['date_from'] ?? null;
    $date_to = $_GET['date_to'] ?? $_POST['date_to'] ?? null;
    $search = $_GET['search'] ?? $_POST['search'] ?? null;
    $page = $_GET['page'] ?? $_POST['page'] ?? null;
    $per_page = $_GET['per_page'] ?? $_POST['per_page'] ?? null;
    $limit_input = $_GET['limit'] ?? $_POST['limit'] ?? null;
    $offset_input = $_GET['offset'] ?? $_POST['offset'] ?? null;

    $limit = 100;
    if ($per_page !== null && is_numeric($per_page)) {
        $limit = max(1, (int)$per_page);
    } elseif ($limit_input !== null && is_numeric($limit_input)) {
        $limit = max(1, (int)$limit_input);
    }

    $offset = 0;
    $page_number = 1;
    if ($page !== null && is_numeric($page)) {
        $page_number = max(1, (int)$page);
        $offset = ($page_number - 1) * $limit;
    } elseif ($offset_input !== null && is_numeric($offset_input)) {
        $offset = max(0, (int)$offset_input);
        $page_number = intdiv($offset, $limit) + 1;
    }

    $search = is_string($search) ? trim($search) : '';
    $searchIsNumeric = ($search !== '' && ctype_digit($search));

    $conditions = [];
    $types = '';
    $params = [];

    if (!empty($client_id) && is_numeric($client_id)) { $conditions[] = "r.refunds_client_id = ?"; $types .= 'i'; $params[] = (int)$client_id; }
    if (!empty($payment_method_id) && is_numeric($payment_method_id)) { $conditions[] = "r.refunds_method_id = ?"; $types .= 'i'; $params[] = (int)$payment_method_id; }
    if (!empty($safe_id) && is_numeric($safe_id)) { $conditions[] = "r.refunds_safe_id = ?"; $types .= 'i'; $params[] = (int)$safe_id; }
    if (!empty($date_from) && DateTime::createFromFormat('Y-m-d', $date_from) !== false) { $conditions[] = "DATE(r.refunds_date) >= ?"; $types .= 's'; $params[] = $date_from; }
    if (!empty($date_to) && DateTime::createFromFormat('Y-m-d', $date_to) !== false) { $conditions[] = "DATE(r.refunds_date) <= ?"; $types .= 's'; $params[] = $date_to; }

    if ($search !== '') {
        $like = "%" . $search . "%";
        $searchClauses = [
            "c.clients_company_name LIKE ?",
            "pm.payment_methods_name LIKE ?",
            "s.safes_name LIKE ?",
            "r.refunds_notes LIKE ?",
            "CAST(r.refunds_id AS CHAR) LIKE ?",
            "r.refunds_transaction_id LIKE ?"
        ];
        $types .= 'ssssss';
        $params[] = $like; $params[] = $like; $params[] = $like; $params[] = $like; $params[] = $like; $params[] = $like;
        if ($searchIsNumeric) {
            $searchClauses[] = "r.refunds_id = ?";
            $types .= 'i';
            $params[] = (int)$search;
        }
        $conditions[] = '(' . implode(' OR ', $searchClauses) . ')';
    }

    $where_sql = $conditions ? ('WHERE ' . implode(' AND ', $conditions)) : '';

    $data_sql = "
        SELECT 
            r.refunds_id AS client_refunds_id,
            r.refunds_client_id AS client_refunds_client_id,
            c.clients_company_name AS client_name,
            r.refunds_method_id AS client_refunds_method_id,
            pm.payment_methods_name AS payment_method_name,
            r.refunds_amount AS client_refunds_amount,
            r.refunds_date AS client_refunds_date,
            r.refunds_transaction_id,
            r.refunds_notes AS client_refunds_notes,
            r.refunds_rep_user_id,
            u.users_name AS rep_user_name,
            r.refunds_safe_id AS client_refunds_safe_id,
            s.safes_name AS safe_name,
            r.refunds_safe_transaction_id,
            r.refunds_created_at,
            r.refunds_updated_at
        FROM refunds r
        LEFT JOIN clients c ON r.refunds_client_id = c.clients_id
        LEFT JOIN payment_methods pm ON r.refunds_method_id = pm.payment_methods_id
        LEFT JOIN users u ON r.refunds_rep_user_id = u.users_id
        LEFT JOIN safes s ON r.refunds_safe_id = s.safes_id
        $where_sql
        ORDER BY r.refunds_date DESC, r.refunds_id DESC
    ";

    $data_types = $types;
    $data_params = $params;
    if ($limit > 0) {
        $data_sql .= " LIMIT ? OFFSET ?";
        $data_types .= 'ii';
        $data_params[] = (int)$limit; $data_params[] = (int)$offset;
    }

    $stmt = $conn->prepare($data_sql);
    if (!$stmt) { throw new Exception("Prepare failed: " . $conn->error); }
    if (!empty($data_params)) { $stmt->bind_param($data_types, ...$data_params); }
    $stmt->execute();
    $result = $stmt->get_result();

    $rows = [];
    while ($row = $result->fetch_assoc()) { $rows[] = $row; }
    $stmt->close();

    // Count for pagination
    $count_sql = "
        SELECT COUNT(*) AS total_count
        FROM refunds r
        LEFT JOIN clients c ON r.refunds_client_id = c.clients_id
        LEFT JOIN payment_methods pm ON r.refunds_method_id = pm.payment_methods_id
        LEFT JOIN safes s ON r.refunds_safe_id = s.safes_id
        $where_sql
    ";

    $count_stmt = $conn->prepare($count_sql);
    if (!empty($params)) { $count_stmt->bind_param($types, ...$params); }
    $count_stmt->execute();
    $count_result = $count_stmt->get_result();
    $total_count = (int)($count_result->fetch_assoc()['total_count'] ?? 0);
    $count_stmt->close();

    $total_pages = $limit > 0 ? (int)ceil($total_count / $limit) : 1;
    if ($total_pages < 1) { $total_pages = 1; }
    if ($page_number > $total_pages) { $page_number = $total_pages; }

    $response = [
        'client_refunds' => $rows,
        'total_count' => $total_count,
        'returned_count' => count($rows),
        'page' => $page_number,
        'per_page' => $limit,
        'total_pages' => $total_pages
    ];

    print_success('Client refunds retrieved successfully.', $response);

} catch (Exception $e) {
    print_failure('Database error: ' . $e->getMessage());
} finally {
    if (isset($conn)) { $conn->close(); }
}

?>
