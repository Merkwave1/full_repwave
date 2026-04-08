<?php
// File: /sales_returns/get_all.php
// Description: Retrieves ALL sales returns (admin sees all; non-admins see only their own), with pagination and filters.

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Require users_uuid to determine role/permissions (consistent with other endpoints like clients/get_all.php)
    $users_uuid = $_GET['users_uuid'] ?? null;
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    // Resolve user and role
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $user_row = $stmt_user->get_result()->fetch_assoc();
    $stmt_user->close();

    if (!$user_row) {
        print_failure("Error: Invalid User UUID provided.");
    }

    $current_user_id = (int)$user_row['users_id'];
    $current_user_role = $user_row['users_role'];

    // Pagination
    $page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    // Optional filters
    $client_id_filter = $_GET['client_id'] ?? null;
    $status_filter = $_GET['status'] ?? null;
    $date_from_filter = $_GET['date_from'] ?? null;
    $date_to_filter = $_GET['date_to'] ?? null;
    $search_query = isset($_GET['search']) ? trim($_GET['search']) : null; // matches client company name or return ID
    $sales_order_id_filter = $_GET['sales_order_id'] ?? null;

    // Build base query (use proper PHP concatenation with .)
    $base_query =
        "FROM sales_returns sr " .
        "LEFT JOIN clients c ON sr.returns_client_id = c.clients_id " .
        "LEFT JOIN users u ON sr.returns_created_by_user_id = u.users_id";

    $where_clauses = [];
    $params = [];
    $types = "";

    // Security model: Admin sees all; others only their own
    if ($current_user_role !== 'admin') {
        $where_clauses[] = "sr.returns_created_by_user_id = ?";
        $params[] = $current_user_id;
        $types .= "i";
    }

    if (!empty($client_id_filter) && is_numeric($client_id_filter)) {
        $where_clauses[] = "sr.returns_client_id = ?";
        $params[] = (int)$client_id_filter;
        $types .= "i";
    }
    if (!empty($status_filter)) {
        $where_clauses[] = "sr.returns_status = ?";
        $params[] = $status_filter;
        $types .= "s";
    }
    if (!empty($date_from_filter)) {
        $where_clauses[] = "sr.returns_date >= ?";
        $params[] = $date_from_filter;
        $types .= "s";
    }
    if (!empty($date_to_filter)) {
        $where_clauses[] = "sr.returns_date <= ?";
        $params[] = $date_to_filter;
        $types .= "s";
    }
    if (!empty($search_query)) {
        $like_search = "%" . $search_query . "%";
        $search_conditions = [
            "c.clients_company_name LIKE ?",
            "CAST(sr.returns_id AS CHAR) LIKE ?"
        ];
        $params[] = $like_search;
        $params[] = $like_search;
        $types .= "ss";

        if (ctype_digit($search_query)) {
            $search_conditions[] = "sr.returns_id = ?";
            $params[] = (int)$search_query;
            $types .= "i";
        }

        $where_clauses[] = "(" . implode(" OR ", $search_conditions) . ")";
    }
    if (!empty($sales_order_id_filter) && is_numeric($sales_order_id_filter)) {
        $where_clauses[] = "sr.returns_sales_order_id = ?";
        $params[] = (int)$sales_order_id_filter;
        $types .= "i";
    }

    $where_sql = !empty($where_clauses) ? (" WHERE " . implode(" AND ", $where_clauses)) : "";

    // Count for pagination
    $count_query = "SELECT COUNT(DISTINCT sr.returns_id) AS total " . $base_query . " " . $where_sql;
    $stmt_count = $conn->prepare($count_query);
    if (!empty($params)) {
        $stmt_count->bind_param($types, ...$params);
    }
    $stmt_count->execute();
    $total_count = (int)($stmt_count->get_result()->fetch_assoc()['total'] ?? 0);
    $stmt_count->close();

    $total_pages = $limit > 0 ? (int)ceil($total_count / $limit) : 0;

    // Data query
    $data_query = "
        SELECT sr.returns_id,
               sr.returns_date,
               sr.returns_date AS returns_return_date,
               sr.returns_date AS return_date,
               sr.returns_total_amount,
               sr.returns_status,
               sr.returns_client_id,
               sr.returns_odoo_picking_id,
               c.clients_company_name,
               u.users_name AS created_by_user_name,
               COALESCE(SUM(sri.return_items_tax_amount), 0) AS total_tax_amount,
               COALESCE(SUM(sri.return_items_total_price), 0) AS subtotal_amount,
               COUNT(DISTINCT sri.return_items_id) AS items_count,
               COUNT(DISTINCT sri.return_items_id) AS total_items
        " . $base_query . "
        LEFT JOIN sales_return_items sri ON sr.returns_id = sri.return_items_return_id
        " . $where_sql . "
        GROUP BY sr.returns_id, sr.returns_date, sr.returns_total_amount, sr.returns_status, sr.returns_client_id, sr.returns_odoo_picking_id, c.clients_company_name, u.users_name
        ORDER BY sr.returns_date DESC
        LIMIT ? OFFSET ?";

    $params_with_limit = $params;
    $types_with_limit = $types . "ii";
    $params_with_limit[] = $limit;
    $params_with_limit[] = $offset;

    $stmt_data = $conn->prepare($data_query);
    if (!empty($params_with_limit)) {
        $stmt_data->bind_param($types_with_limit, ...$params_with_limit);
    }
    $stmt_data->execute();
    $returns = $stmt_data->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_data->close();

    $response = [
        'pagination' => [
            'current_page' => $page,
            'limit' => $limit,
            'total_items' => $total_count,
            'total_pages' => $total_pages
        ],
        'data' => $returns
    ];

    print_success("Sales returns retrieved successfully.", $response);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
