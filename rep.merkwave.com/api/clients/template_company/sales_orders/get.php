<?php
// File: /sales_orders/get.php
// Description: Retrieves sales orders. Handles fetching a list with advanced filters OR a single order with full details.

require_once '../db_connect.php'; // Contains connection and all helper functions

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // --- Authorization using UUID (for mobile app) ---
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

    $auth_user_id = $user_data['users_id'];
    $auth_user_role = $user_data['users_role'];

    // DEBUG: Log the current UUID and user ID for troubleshooting
    error_log("Sales Orders API - UUID: " . $users_uuid . ", User ID: " . $auth_user_id . ", Role: " . $auth_user_role);

    // --- Check if fetching a single detailed order ---
    $order_id_to_fetch = $_GET['id'] ?? null;

    if (!empty($order_id_to_fetch) && is_numeric($order_id_to_fetch)) {
        // --- LOGIC TO FETCH A SINGLE DETAILED ORDER ---
        
        $stmt_order = $conn->prepare("
            SELECT so.*, 
                   c.clients_company_name, c.clients_address, c.clients_city, c.clients_contact_phone_1,
                   u.users_name as representative_name, 
                   w.warehouse_name
            FROM sales_orders so
            JOIN clients c ON so.sales_orders_client_id = c.clients_id
            JOIN users u ON so.sales_orders_representative_id = u.users_id
            JOIN warehouse w ON so.sales_orders_warehouse_id = w.warehouse_id
            WHERE so.sales_orders_id = ?
        ");
        $stmt_order->bind_param("i", $order_id_to_fetch);
        $stmt_order->execute();
        $order = $stmt_order->get_result()->fetch_assoc();
        $stmt_order->close();

        if (!$order) {
            print_failure("Sales Order not found.");
            exit;
        }

        // Security Check: Reps can only view their own orders.
        if ($auth_user_role === 'rep' && $order['sales_orders_representative_id'] != $auth_user_id) {
            print_failure("You are not authorized to view this order.");
            exit;
        }

        // Fetch associated items for the order
            $stmt_items = $conn->prepare("
                SELECT soi.*, 
                       pv.variant_name, 
                       pt.packaging_types_name,
                       (SELECT COALESCE(SUM(sdi2.sales_delivery_items_quantity_delivered),0) FROM sales_delivery_items sdi2 WHERE sdi2.sales_delivery_items_sales_order_item_id = soi.sales_order_items_id) AS delivered_quantity,
                       (SELECT COALESCE(SUM(sri2.return_items_quantity),0) FROM sales_return_items sri2 WHERE sri2.return_items_sales_order_item_id = soi.sales_order_items_id) AS returned_quantity
                FROM sales_order_items soi
                JOIN product_variants pv ON soi.sales_order_items_variant_id = pv.variant_id
                JOIN packaging_types pt ON soi.sales_order_items_packaging_type_id = pt.packaging_types_id
                WHERE soi.sales_order_items_sales_order_id = ?
            ");
        $stmt_items->bind_param("i", $order_id_to_fetch);
            $stmt_items->execute();
        $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_items->close();

        $order['items'] = $items;

        print_success("Sales Order details retrieved.", $order);
        exit(); // Stop execution after sending single order details
    }

    // --- LOGIC TO FETCH A LIST OF ORDERS (existing code) ---
    
    // --- GATHER FILTERS AND PARAMETERS from $_GET ---
    $page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $rep_id_filter = $_GET['rep_id'] ?? null;
    $status_filter = $_GET['status'] ?? null;
    $client_id_filter = $_GET['client_id'] ?? null;
    $delivery_status_filter = $_GET['delivery_status'] ?? null;
    $warehouse_id_filter = $_GET['warehouse_id'] ?? null;
    $representative_id_filter = $_GET['representative_id'] ?? null;
    $date_from_filter = $_GET['date_from'] ?? null;
    $date_to_filter = $_GET['date_to'] ?? null;
    $search_query = $_GET['search'] ?? null;
    $last_n_filter = $_GET['last_n'] ?? null; // NEW: Limit to last N orders for a client

    // --- DYNAMICALLY BUILD SQL QUERY ---
    $base_query = "FROM sales_orders so JOIN clients c ON so.sales_orders_client_id = c.clients_id JOIN users u ON so.sales_orders_representative_id = u.users_id";
    $where_clauses = [];
    $params = [];
    $types = "";

    // Security: If the logged-in user is a rep, they can only see their own orders.
    if ($auth_user_role === 'rep') {
        $where_clauses[] = "so.sales_orders_representative_id = ?";
        $params[] = $auth_user_id;
        $types .= "i";
    } 
    // If user is an admin, they can optionally filter by a specific rep.
    else if ($auth_user_role === 'admin' && !empty($rep_id_filter) && is_numeric($rep_id_filter)) {
        $where_clauses[] = "so.sales_orders_representative_id = ?";
        $params[] = $rep_id_filter;
        $types .= "i";
    }
    
    // Also support filtering by representative_id parameter
    if ($auth_user_role === 'admin' && !empty($representative_id_filter) && is_numeric($representative_id_filter)) {
        $where_clauses[] = "so.sales_orders_representative_id = ?";
        $params[] = $representative_id_filter;
        $types .= "i";
    }

    if (!empty($status_filter)) {
        $where_clauses[] = "so.sales_orders_status = ?";
        $params[] = $status_filter;
        $types .= "s";
    }
    
    if (!empty($client_id_filter) && is_numeric($client_id_filter)) {
        $where_clauses[] = "so.sales_orders_client_id = ?";
        $params[] = $client_id_filter;
        $types .= "i";
    }
    
    if (!empty($delivery_status_filter)) {
        $where_clauses[] = "so.sales_orders_delivery_status = ?";
        $params[] = $delivery_status_filter;
        $types .= "s";
    }
    
    if (!empty($warehouse_id_filter) && is_numeric($warehouse_id_filter)) {
        $where_clauses[] = "so.sales_orders_warehouse_id = ?";
        $params[] = $warehouse_id_filter;
        $types .= "i";
    }
    if (!empty($date_from_filter)) {
        $where_clauses[] = "so.sales_orders_order_date >= ?";
        $params[] = $date_from_filter;
        $types .= "s";
    }
    if (!empty($date_to_filter)) {
        $where_clauses[] = "so.sales_orders_order_date <= ?";
        $params[] = $date_to_filter . ' 23:59:59';
        $types .= "s";
    }
    if (!empty($search_query)) {
        $where_clauses[] = "(c.clients_company_name LIKE ? OR so.sales_orders_id = ?)";
        $search_term = "%" . $search_query . "%";
        $params[] = $search_term;
        $params[] = $search_query;
        $types .= "ss";
    }

    $where_sql = !empty($where_clauses) ? " WHERE " . implode(" AND ", $where_clauses) : "";

    // --- GET TOTAL COUNT FOR PAGINATION ---
    $count_query = "SELECT COUNT(so.sales_orders_id) as total " . $base_query . $where_sql;
    $stmt_count = $conn->prepare($count_query);
    if (!empty($params)) {
        $stmt_count->bind_param($types, ...$params);
    }
    $stmt_count->execute();
    $total_count = $stmt_count->get_result()->fetch_assoc()['total'];
    $total_pages = ceil($total_count / $limit);
    $stmt_count->close();

    // --- GET PAGINATED DATA ---
    $data_query = "SELECT 
    so.sales_orders_id, 
    so.sales_orders_status, 
    so.sales_orders_delivery_status,
    so.sales_orders_total_amount, 
    so.sales_orders_order_date, 
    so.sales_orders_warehouse_id,
    so.sales_orders_odoo_invoice_id,
        c.clients_company_name, 
        c.clients_id, 
        u.users_name as representative_name,
        w.warehouse_name,
        COUNT(soi.sales_order_items_id) as items_count
        " . $base_query . " 
        LEFT JOIN warehouse w ON so.sales_orders_warehouse_id = w.warehouse_id
        LEFT JOIN sales_order_items soi ON so.sales_orders_id = soi.sales_order_items_sales_order_id
        " . $where_sql . " 
        GROUP BY so.sales_orders_id
        ORDER BY so.sales_orders_order_date DESC";
    
    // Apply last_n limit if specified (for client-specific queries)
    if (!empty($last_n_filter) && is_numeric($last_n_filter) && !empty($client_id_filter)) {
        $data_query .= " LIMIT ?";
        $params[] = (int)$last_n_filter;
        $types .= "i";
    } else {
        $data_query .= " LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        $types .= "ii";
    }

    $stmt_data = $conn->prepare($data_query);
    if (!empty($params)) {
        $stmt_data->bind_param($types, ...$params);
    }
    $stmt_data->execute();
    $orders = $stmt_data->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_data->close();
    
    // --- FETCH ITEMS FOR EACH ORDER (for delivery management) ---
    foreach ($orders as &$order) {
        $stmt_items = $conn->prepare("
         SELECT soi.*, 
             pv.variant_name, 
             pt.packaging_types_name,
             (SELECT COALESCE(SUM(sdi2.sales_delivery_items_quantity_delivered),0) FROM sales_delivery_items sdi2 WHERE sdi2.sales_delivery_items_sales_order_item_id = soi.sales_order_items_id) AS delivered_quantity,
             (SELECT COALESCE(SUM(sri2.return_items_quantity),0) FROM sales_return_items sri2 WHERE sri2.return_items_sales_order_item_id = soi.sales_order_items_id) AS returned_quantity
         FROM sales_order_items soi
         JOIN product_variants pv ON soi.sales_order_items_variant_id = pv.variant_id
         JOIN packaging_types pt ON soi.sales_order_items_packaging_type_id = pt.packaging_types_id
         WHERE soi.sales_order_items_sales_order_id = ?
        ");
        $stmt_items->bind_param("i", $order['sales_orders_id']);
        $stmt_items->execute();
        $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_items->close();
        
        $order['items'] = $items;
    }
    unset($order); // Break reference
    
    // --- PREPARE AND SEND RESPONSE ---
    $response = [
        'pagination' => [
            'current_page' => $page,
            'limit' => $limit,
            'total_items' => $total_count,
            'total_pages' => $total_pages
        ],
        'data' => $orders
    ];

    print_success("Sales orders retrieved successfully.", $response);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
