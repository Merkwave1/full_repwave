<?php
// File: /sales_returns/get.php
// Description: Retrieves sales returns. Handles fetching a list with advanced filters OR a single return with full details.
// NEW: Can also sum returned quantities by sales_order_item_id.

require_once '../db_connect.php'; // Contains connection and all helper functions

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // --- Authorization ---
    $auth_user_id = get_user_id_from_uuid_local();
    $auth_user_role = 'rep'; // MOCK: adjust as needed

    // --- Support for UUID-based filtering ---
    $users_uuid = $_GET['users_uuid'] ?? null;
    $filter_user_id = null;

    if (!empty($users_uuid)) {
        // Get user ID from UUID for filtering
        $filter_user_id = get_user_id_from_uuid_local($users_uuid);
        error_log("DEBUG - UUID provided: " . $users_uuid);
        error_log("DEBUG - Resolved User ID from UUID: " . ($filter_user_id ?? 'NULL'));
        if (!$filter_user_id) {
            print_failure("Invalid users_uuid provided.");
        }
    } else {
        // Fallback to current authenticated user
        if (!$auth_user_id) {
            print_failure("Authorization failed: Could not identify user.");
        }
        $filter_user_id = $auth_user_id;
        error_log("DEBUG - Using fallback auth_user_id: " . $filter_user_id);
    }

    // --- Check if fetching summed returned quantities for a sales order ---
    $sum_by_so_items = isset($_GET['sum_by_so_items']) && $_GET['sum_by_so_items'] === 'true';
    $sales_order_id_for_sum = $_GET['sales_order_id'] ?? null;

    if ($sum_by_so_items && !empty($sales_order_id_for_sum) && is_numeric($sales_order_id_for_sum)) {
        // --- LOGIC TO SUM RETURNED QUANTITIES PER SALES_ORDER_ITEM_ID ---
        $sum_query = "
            SELECT
                sri.return_items_sales_order_item_id,
                SUM(sri.return_items_quantity) AS total_returned_quantity
            FROM sales_return_items sri
            LEFT JOIN sales_returns sr ON sri.return_items_return_id = sr.returns_id
            WHERE sri.return_items_sales_order_item_id IN (
                SELECT sales_order_items_id FROM sales_order_items WHERE sales_order_items_sales_order_id = ?
            )
            AND sr.returns_status NOT IN ('Cancelled') -- Only exclude Cancelled returns, include Draft/Pending
            GROUP BY sri.return_items_sales_order_item_id
        ";
        $stmt_sum = $conn->prepare($sum_query);
        $stmt_sum->bind_param("i", $sales_order_id_for_sum);
        
        // Debug logging
        error_log("DEBUG - Sum query: " . $sum_query);
        error_log("DEBUG - Sales Order ID: " . $sales_order_id_for_sum);
        error_log("DEBUG - Filter User ID: " . $filter_user_id);
        
        $stmt_sum->execute();
        $sum_results = $stmt_sum->get_result()->fetch_all(MYSQLI_ASSOC);
        
        // Debug logging for results
        error_log("DEBUG - Sum results count: " . count($sum_results));
        error_log("DEBUG - Sum results: " . json_encode($sum_results));
        
        $stmt_sum->close();

        // Format results into an associative array for easier consumption
        $formatted_sum_results = [];
        foreach ($sum_results as $row) {
            $formatted_sum_results[$row['return_items_sales_order_item_id']] = (double)$row['total_returned_quantity'];
        }

        print_success("Summed returned quantities retrieved successfully.", $formatted_sum_results);
        exit(); // Stop execution after sending summed quantities
    }


    // --- Check if fetching a single detailed return ---
    $return_id_to_fetch = $_GET['id'] ?? null;

    if (!empty($return_id_to_fetch) && is_numeric($return_id_to_fetch)) {
        // --- LOGIC TO FETCH A SINGLE DETAILED RETURN ---
    $stmt_return = $conn->prepare("SELECT sr.*,
           c.clients_company_name,
           so.sales_orders_id AS sales_order_link_id,
           so.sales_orders_subtotal AS sales_order_subtotal,
           so.sales_orders_discount_amount AS sales_orders_discount_amount,
           so.sales_orders_tax_amount AS sales_orders_tax_amount,
           so.sales_orders_total_amount AS sales_order_total_amount,
           u.users_name AS created_by_user_name
        FROM sales_returns sr
        LEFT JOIN clients c ON sr.returns_client_id = c.clients_id
        LEFT JOIN sales_orders so ON sr.returns_sales_order_id = so.sales_orders_id
        LEFT JOIN users u ON sr.returns_created_by_user_id = u.users_id
        WHERE sr.returns_id = ?");
        $stmt_return->bind_param("i", $return_id_to_fetch);
        $stmt_return->execute();
        $return_data = $stmt_return->get_result()->fetch_assoc();
        $stmt_return->close();

        if (!$return_data) {
            print_failure("Sales Return not found.");
        }

        // Security Check: Reps can only view returns for their clients/orders.
        // Similar to invoices, you might need more complex authorization here.

        // Fetch associated items for the return
        // Use COALESCE to get variant from either sales_order_items OR directly from return_items_variant_id
        $stmt_items = $conn->prepare("
            SELECT sri.*,
                   COALESCE(soi.sales_order_items_variant_id, sri.return_items_variant_id) AS resolved_variant_id,
                   soi.sales_order_items_unit_price,
                   soi.sales_order_items_discount_amount,
                   soi.sales_order_items_tax_amount,
                   soi.sales_order_items_tax_rate,
                   soi.sales_order_items_has_tax,
                   soi.sales_order_items_quantity AS ordered_quantity,
                   COALESCE(pv_soi.variant_name, pv_direct.variant_name) AS product_name,
                   COALESCE(pt_soi.packaging_types_name, pt_direct.packaging_types_name) AS packaging_types_name
            FROM sales_return_items sri
            LEFT JOIN sales_order_items soi ON sri.return_items_sales_order_item_id = soi.sales_order_items_id
            LEFT JOIN product_variants pv_soi ON soi.sales_order_items_variant_id = pv_soi.variant_id
            LEFT JOIN packaging_types pt_soi ON soi.sales_order_items_packaging_type_id = pt_soi.packaging_types_id
            LEFT JOIN product_variants pv_direct ON sri.return_items_variant_id = pv_direct.variant_id
            LEFT JOIN packaging_types pt_direct ON sri.return_items_packaging_type_id = pt_direct.packaging_types_id
            WHERE sri.return_items_return_id = ?
        ");
        $stmt_items->bind_param("i", $return_id_to_fetch);
        $stmt_items->execute();
        $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_items->close();

        $return_data['items'] = $items;

        print_success("Sales Return details retrieved.", $return_data);
        exit();
    }

    // --- LOGIC TO FETCH A LIST OF RETURNS ---
    $page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $client_id_filter = $_GET['client_id'] ?? null;
    $status_filter = $_GET['status'] ?? null;
    $date_from_filter = $_GET['date_from'] ?? null;
    $date_to_filter = $_GET['date_to'] ?? null;
    $search_query = $_GET['search'] ?? null; // For client company name or return ID
    $sales_order_id_filter = $_GET['sales_order_id'] ?? null; // Filter for list view

    $base_query = "FROM sales_returns sr LEFT JOIN clients c ON sr.returns_client_id = c.clients_id LEFT JOIN users u ON sr.returns_created_by_user_id = u.users_id";
    $where_clauses = [];
    $params = [];
    $types = "";

    // Security: Reps can only see returns they created or for their clients.
    // Use the filter_user_id (either from UUID or authenticated user)
    $where_clauses[] = "sr.returns_created_by_user_id = ?";
    $params[] = $filter_user_id;
    $types .= "i";

    if (!empty($client_id_filter) && is_numeric($client_id_filter)) {
        $where_clauses[] = "sr.returns_client_id = ?";
        $params[] = $client_id_filter;
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
        $where_clauses[] = "(c.clients_company_name LIKE ? OR sr.returns_id = ?)";
        $search_term = "%" . $search_query . "%";
        $params[] = $search_term;
        $params[] = $search_query; // Allow searching by return ID directly
        $types .= "si";
    }
    if (!empty($sales_order_id_filter) && is_numeric($sales_order_id_filter)) { // New filter for list view
        $where_clauses[] = "sr.returns_sales_order_id = ?";
        $params[] = $sales_order_id_filter;
        $types .= "i";
    }

    $where_sql = !empty($where_clauses) ? " WHERE " . implode(" AND ", $where_clauses) : "";

    // --- GET TOTAL COUNT FOR PAGINATION ---
    $count_query = "SELECT COUNT(sr.returns_id) as total " . $base_query . $where_sql;
    $stmt_count = $conn->prepare($count_query);
    if (!empty($params)) {
        $stmt_count->bind_param($types, ...$params);
    }
    $stmt_count->execute();
    $total_count = $stmt_count->get_result()->fetch_assoc()['total'];
    $total_pages = ceil($total_count / $limit);
    $stmt_count->close();

    // --- GET PAGINATED DATA ---
    $data_query = "
        SELECT sr.returns_id, 
               sr.returns_date, 
               sr.returns_total_amount, 
               sr.returns_status, 
               sr.returns_client_id, 
               c.clients_company_name, 
               u.users_name AS created_by_user_name,
               COALESCE(SUM(sri.return_items_tax_amount), 0) AS total_tax_amount,
               COALESCE(SUM(sri.return_items_total_price), 0) AS subtotal_amount
        " . $base_query . "
        LEFT JOIN sales_return_items sri ON sr.returns_id = sri.return_items_return_id
        " . $where_sql . " 
        GROUP BY sr.returns_id, sr.returns_date, sr.returns_total_amount, sr.returns_status, sr.returns_client_id, c.clients_company_name, u.users_name
        ORDER BY sr.returns_date DESC 
        LIMIT ? OFFSET ?";
    
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";

    $stmt_data = $conn->prepare($data_query);
    if (!empty($params)) {
        $stmt_data->bind_param($types, ...$params);
    }
    $stmt_data->execute();
    $returns = $stmt_data->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_data->close();
    
    // --- PREPARE AND SEND RESPONSE ---
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
    print_failure("Internal Error: " . $e->getMessage() . " on line " . $e->getLine()); // Added line number for debugging
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
