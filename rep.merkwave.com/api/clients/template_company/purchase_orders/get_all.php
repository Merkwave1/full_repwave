<?php

require_once '../db_connect.php'; 
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Check authorization using UUID
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? '';
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required for authentication.");
    }

    // Get user information from UUID
    $stmt_user = $conn->prepare("SELECT users_id FROM users WHERE users_uuid = ? LIMIT 1");
    if (!$stmt_user) {
        print_failure("Error: Failed to prepare user lookup statement: " . $conn->error);
    }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $user_result = $stmt_user->get_result();
    $user_data = $user_result->fetch_assoc();
    $stmt_user->close();

    if (!$user_data) {
        print_failure("Error: Invalid user UUID or user not found.");
    }

    $user_id = $user_data['users_id'];

    // Check if user is authorized
    
    $supplier_id = $_GET['supplier_id'] ?? $_POST['supplier_id'] ?? null;
    $status      = $_GET['status']      ?? $_POST['status']      ?? null; // can be single or comma-separated
    $date_from   = $_GET['date_from']   ?? $_POST['date_from']   ?? null;
    $date_to     = $_GET['date_to']     ?? $_POST['date_to']     ?? null;
    $search       = $_GET['search']      ?? $_POST['search']      ?? null;
    // Pagination params
    $limit       = $_GET['limit']       ?? $_POST['limit']       ?? null;
    $page        = $_GET['page']        ?? $_POST['page']        ?? null;
    $offset      = $_GET['offset']      ?? $_POST['offset']      ?? null; // optional direct offset

    $sql_main_po_base = "
        SELECT 
            po.purchase_orders_id,
            po.purchase_orders_supplier_id,
            po.purchase_orders_warehouse_id,
            po.purchase_orders_order_date,
            DATE_FORMAT(po.purchase_orders_order_date, '%Y-%m-%d %H:%i:%s') as purchase_orders_order_datetime,
            po.purchase_orders_expected_delivery_date,
            po.purchase_orders_actual_delivery_date,
            po.purchase_orders_total_amount,
            po.purchase_orders_status,
            po.purchase_orders_notes,
            po.purchase_orders_odoo_id,
            w.warehouse_name

        FROM purchase_orders po
        LEFT JOIN warehouse w ON po.purchase_orders_warehouse_id = w.warehouse_id
    ";
    $sql_main_po = $sql_main_po_base; // we'll append WHERE/ORDER/LIMIT later

    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($supplier_id) && is_numeric($supplier_id)) {
        $where_clauses[] = "po.purchase_orders_supplier_id = ?";
        $bind_types .= "i";
        $bind_params[] = $supplier_id;
    } else if (!empty($supplier_id)) {
        print_failure("Error: Invalid Supplier ID provided.");
        exit;
    }

    if (!empty($status)) {
        // Support CSV statuses
        $valid_statuses = ['Draft', 'Ordered', 'Shipped', 'Received', 'Partially Received', 'Cancelled'];
        $statuses = array_map('trim', explode(',', $status));
        // Validate all provided statuses
        foreach ($statuses as $st) {
            if (!in_array($st, $valid_statuses)) {
                print_failure("Error: Invalid status provided. Must be one of: '" . implode("','", $valid_statuses) . "'.");
                exit;
            }
        }
        if (count($statuses) === 1) {
            $where_clauses[] = "po.purchase_orders_status = ?";
            $bind_types .= "s";
            $bind_params[] = $statuses[0];
        } else {
            // Build IN clause dynamically
            $placeholders = implode(',', array_fill(0, count($statuses), '?'));
            $where_clauses[] = "po.purchase_orders_status IN ($placeholders)";
            $bind_types .= str_repeat('s', count($statuses));
            foreach ($statuses as $st) { $bind_params[] = $st; }
        }
    }

    // By default exclude Cancelled purchase orders from results unless a status filter is explicitly provided.
    if (empty($status)) {
        $where_clauses[] = "po.purchase_orders_status != 'Cancelled'";
    }

    if (!empty($date_from)) {
        if (!strtotime($date_from)) {
            print_failure("Error: Invalid 'date_from' format.");
            exit;
        }
        $where_clauses[] = "DATE(po.purchase_orders_order_date) >= ?";
        $bind_types .= "s";
        $bind_params[] = $date_from;
    }

    if (!empty($date_to)) {
        if (!strtotime($date_to)) {
            print_failure("Error: Invalid 'date_to' format.");
            exit;
        }
        $where_clauses[] = "DATE(po.purchase_orders_order_date) <= ?";
        $bind_types .= "s";
        $bind_params[] = $date_to;
    }

    if (!empty($search)) {
        // Allow searching across order id, notes and warehouse name
        $search_pattern = '%' . $search . '%';
        $where_clauses[] = "(CAST(po.purchase_orders_id AS CHAR) LIKE ? OR po.purchase_orders_notes LIKE ? OR w.warehouse_name LIKE ? )";
        $bind_types .= "sss";
        $bind_params[] = $search_pattern;
        $bind_params[] = $search_pattern;
        $bind_params[] = $search_pattern;
    }

    if (!empty($where_clauses)) {
        $sql_main_po .= " WHERE " . implode(" AND ", $where_clauses);
    }

    // Determine sort direction. Caller can pass 'sort=asc' or 'sort=desc'.
    $requested_sort = strtolower(trim((string)($_GET['sort'] ?? $_POST['sort'] ?? '')));
    if ($requested_sort !== 'asc' && $requested_sort !== 'desc') {
        // Default behavior: when viewing supplier-specific lists (كشف حساب المورد), show old->new (asc).
        if (!empty($supplier_id)) {
            $order_dir = 'ASC';
        } else {
            // Preserve previous default (newest first) for general lists
            $order_dir = 'DESC';
        }
    } else {
        $order_dir = strtoupper($requested_sort);
    }

    // Secondary id ordering direction should match primary direction
    $id_order_dir = $order_dir;

    $sql_main_po .= " ORDER BY po.purchase_orders_order_date {$order_dir}, po.purchase_orders_id {$id_order_dir}";

    // Compute pagination values
    $limit_val = null;
    $offset_val = null;
    $page_val = null;
    if (!is_null($limit) && $limit !== '' && is_numeric($limit)) {
        $limit_val = max(1, (int)$limit);
    }
    if (!is_null($page) && $page !== '' && is_numeric($page)) {
        $page_val = max(1, (int)$page);
    }
    if (!is_null($offset) && $offset !== '' && is_numeric($offset)) {
        $offset_val = max(0, (int)$offset);
    }

    // If page provided, compute offset from page/limit
    if (!is_null($page_val) && !is_null($limit_val)) {
        $offset_val = ($page_val - 1) * $limit_val;
    }

    // First, get total count for pagination (without LIMIT)
    $total_count = null;
    $count_sql = "SELECT COUNT(*) as total_count FROM (" . $sql_main_po_base;
    if (!empty($where_clauses)) {
        $count_sql .= " WHERE " . implode(" AND ", $where_clauses);
    }
    $count_sql .= ") as sub";

    // Save the current bind params/types for count query (before adding LIMIT/OFFSET)
    $count_bind_types = $bind_types;
    $count_bind_params = $bind_params;

    $count_stmt = $conn->prepare($count_sql);
    if (!$count_stmt) { throw new Exception("Prepare failed for count query: " . $conn->error); }
    if (!empty($count_bind_params)) {
        $count_stmt->bind_param($count_bind_types, ...$count_bind_params);
    }
    $count_stmt->execute();
    $count_res = $count_stmt->get_result();
    $count_row = $count_res->fetch_assoc();
    $total_count = (int)($count_row['total_count'] ?? 0);
    $count_stmt->close();

    if (!is_null($limit_val)) {
        $sql_main_po .= " LIMIT ?";
        $bind_types .= "i";
        $bind_params[] = $limit_val;
        if (!is_null($offset_val)) {
            $sql_main_po .= " OFFSET ?";
            $bind_types .= "i";
            $bind_params[] = $offset_val;
        }
    }

    $stmt_main_po = $conn->prepare($sql_main_po);

    if (!$stmt_main_po) {
        throw new Exception("Prepare failed for main PO select: " . $conn->error);
    }

    if (!empty($bind_params)) {
        $stmt_main_po->bind_param($bind_types, ...$bind_params);
    }
    
    $stmt_main_po->execute();
    $result_main_po = $stmt_main_po->get_result();

    $purchase_orders = [];
    while ($po_row = $result_main_po->fetch_assoc()) {
        $purchase_orders[] = $po_row;
    }
    $stmt_main_po->close();

    // Now, for each purchase order, fetch its items
    $stmt_po_items = $conn->prepare("
        SELECT 
            poi.purchase_order_items_id,
            poi.purchase_order_items_variant_id,
            poi.purchase_order_items_packaging_type_id,
            poi.purchase_order_items_quantity_ordered,
            poi.purchase_order_items_quantity_received,
            poi.purchase_order_items_quantity_returned,
            poi.purchase_order_items_unit_cost,
            poi.purchase_order_items_total_cost,
            poi.purchase_order_items_notes
        FROM purchase_order_items poi
        WHERE poi.purchase_order_items_purchase_order_id = ?
        ORDER BY poi.purchase_order_items_id ASC
    ");

    if (!$stmt_po_items) {
        throw new Exception("Prepare failed for PO items select: " . $conn->error);
    }

    foreach ($purchase_orders as &$po) { // Use & to modify the original array
        $stmt_po_items->bind_param("i", $po['purchase_orders_id']);
        $stmt_po_items->execute();
        $items_result = $stmt_po_items->get_result();
        $po['items'] = [];
        while ($item_row = $items_result->fetch_assoc()) {
            $po['items'][] = $item_row;
        }
    }
    $stmt_po_items->close(); // Close after the loop

    // Prepare pagination metadata
    $pagination = null;
    if (!is_null($limit_val)) {
        $total_pages = $limit_val > 0 ? (int)ceil($total_count / $limit_val) : 1;
        $curr_page = !is_null($page_val) ? $page_val : (!is_null($offset_val) && $limit_val > 0 ? (int)floor($offset_val / $limit_val) + 1 : 1);
        $pagination = [
            'current_page' => $curr_page,
            'limit' => $limit_val,
            'total_items' => $total_count,
            'total_pages' => $total_pages,
        ];
    }

    $response = [
        'purchase_orders' => $purchase_orders,
        'total_count' => isset($total_count) ? $total_count : count($purchase_orders),
        'returned_count' => count($purchase_orders),
    ];
    if (!is_null($pagination)) { $response['pagination'] = $pagination; }

    print_success("Purchase Orders retrieved successfully.", $response);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt_main_po) && $stmt_main_po !== false) {
        $stmt_main_po->close();
    }
    if (isset($stmt_po_items) && $stmt_po_items !== false) {
        $stmt_po_items->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
