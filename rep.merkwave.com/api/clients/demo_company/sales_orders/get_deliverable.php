<?php
// File: /sales_orders/get_deliverable.php
// Description: Retrieves sales orders that need delivery (server-side filtering)

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
    error_log("Deliverable Sales Orders API - UUID: " . $users_uuid . ", User ID: " . $auth_user_id . ", Role: " . $auth_user_role);

    // --- GATHER FILTERS AND PARAMETERS from $_GET ---
    $page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $client_id_filter = $_GET['client_id'] ?? null;
    $warehouse_id_filter = $_GET['warehouse_id'] ?? null;
    $date_from_filter = $_GET['date_from'] ?? null;
    $date_to_filter = $_GET['date_to'] ?? null;
    $search_query = $_GET['search'] ?? null;

    // --- DYNAMICALLY BUILD SQL QUERY ---
    // Base query joins sales_orders with clients, users, and warehouse
    $base_query = "FROM sales_orders so
                   JOIN clients c ON so.sales_orders_client_id = c.clients_id
                   JOIN users u ON so.sales_orders_representative_id = u.users_id
                   LEFT JOIN warehouse w ON so.sales_orders_warehouse_id = w.warehouse_id";

    $where_clauses = [];
    $params = [];
    $types = "";

    // Security: If the logged-in user is a rep, they can only see their own orders.
    if ($auth_user_role === 'rep') {
        $where_clauses[] = "so.sales_orders_representative_id = ?";
        $params[] = $auth_user_id;
        $types .= "i";
    }

    // DELIVERABLE ORDERS FILTERS:
    // 1. Status must be 'Invoiced' or 'Approved' (delivery is allowed for both)
    $where_clauses[] = "so.sales_orders_status IN ('Invoiced', 'Approved')";

    // 2. Delivery status must be any non-fully-delivered value
    $where_clauses[] = "(so.sales_orders_delivery_status IN ('Not_Delivered','Not Delivered','Preparing','Processing_Delivery','Partially_Delivered') 
                        OR so.sales_orders_delivery_status IS NULL 
                        OR so.sales_orders_delivery_status = '')";

    // 3. Must have items with remaining quantity > 0 (consider delivered quantity only)
    // Simplified to match get_pending_orders.php logic - ignore returns for deliverability
    $where_clauses[] = "EXISTS (
        SELECT 1 FROM sales_order_items soi
        LEFT JOIN (
            SELECT return_items_sales_order_item_id, SUM(return_items_quantity) AS total_returned
            FROM sales_return_items
            GROUP BY return_items_sales_order_item_id
        ) sri ON sri.return_items_sales_order_item_id = soi.sales_order_items_id
        WHERE soi.sales_order_items_sales_order_id = so.sales_orders_id
        AND (
            soi.sales_order_items_quantity
            - COALESCE(soi.sales_order_items_quantity_delivered, 0)
            - COALESCE(sri.total_returned, 0)
        ) > 0
    )";

    // Additional filters
    if (!empty($client_id_filter) && is_numeric($client_id_filter)) {
        $where_clauses[] = "so.sales_orders_client_id = ?";
        $params[] = $client_id_filter;
        $types .= "i";
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
    $count_query = "SELECT COUNT(DISTINCT so.sales_orders_id) as total " . $base_query . $where_sql;
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
        c.clients_company_name,
        c.clients_id,
        u.users_name as representative_name,
        w.warehouse_name,
        COUNT(soi.sales_order_items_id) as items_count
        " . $base_query . "
        LEFT JOIN sales_order_items soi ON so.sales_orders_id = soi.sales_order_items_sales_order_id
        " . $where_sql . "
        GROUP BY so.sales_orders_id
        ORDER BY so.sales_orders_order_date DESC
        LIMIT ? OFFSET ?";

    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";

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
             COALESCE(soi.sales_order_items_quantity_delivered,0) AS delivered_quantity,
             COALESCE(sri.total_returned,0) AS returned_quantity,
             (
                 soi.sales_order_items_quantity
                 - COALESCE(soi.sales_order_items_quantity_delivered,0)
                 - COALESCE(sri.total_returned,0)
             ) AS remaining_quantity
         FROM sales_order_items soi
         JOIN product_variants pv ON soi.sales_order_items_variant_id = pv.variant_id
         LEFT JOIN packaging_types pt ON soi.sales_order_items_packaging_type_id = pt.packaging_types_id
         LEFT JOIN (
             SELECT return_items_sales_order_item_id, SUM(return_items_quantity) AS total_returned
             FROM sales_return_items
             GROUP BY return_items_sales_order_item_id
         ) sri ON sri.return_items_sales_order_item_id = soi.sales_order_items_id
         WHERE soi.sales_order_items_sales_order_id = ?
        ");
        $stmt_items->bind_param("i", $order['sales_orders_id']);
        $stmt_items->execute();
        $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_items->close();

        $order['items'] = $items;

        $remaining_totals = 0;
        foreach ($items as $item) {
            $remaining_totals += max(0, (float)($item['remaining_quantity'] ?? 0));
        }

        $order['sales_orders_delivery_status_original'] = $order['sales_orders_delivery_status'];
        if ($remaining_totals <= 0) {
            $order['sales_orders_delivery_status'] = 'Delivered';
        }
        $order['sales_orders_remaining_quantity'] = $remaining_totals;
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

    print_success("Deliverable sales orders retrieved successfully.", $response);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>