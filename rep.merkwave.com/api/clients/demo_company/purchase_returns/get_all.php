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
    // Pagination
    $limit       = $_GET['limit']       ?? $_POST['limit']       ?? null;
    $page        = $_GET['page']        ?? $_POST['page']        ?? null;
    $offset      = $_GET['offset']      ?? $_POST['offset']      ?? null;

    $sql_main_pr_base = "
        SELECT 
            pr.purchase_returns_id,
            pr.purchase_returns_supplier_id,
            pr.purchase_returns_purchase_order_id,
            pr.purchase_returns_date,
            pr.purchase_returns_reason,
            pr.purchase_returns_total_amount,
            pr.purchase_returns_status,
            pr.purchase_returns_notes,
            pr.purchase_returns_created_by_user_id,
            pr.purchase_returns_created_at,
            pr.purchase_returns_updated_at,
            pr.purchase_returns_odoo_picking_id,
            
            -- Join supplier information
            s.supplier_name,
            s.supplier_contact_person,
            s.supplier_phone,
            s.supplier_email,
            
            -- Join user information
            u.users_name AS created_by_user_name

        FROM purchase_returns pr
        LEFT JOIN suppliers s ON pr.purchase_returns_supplier_id = s.supplier_id
        LEFT JOIN users u ON pr.purchase_returns_created_by_user_id = u.users_id
    ";
    $sql_main_pr = $sql_main_pr_base; // we'll append WHERE/ORDER/LIMIT later

    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($supplier_id) && is_numeric($supplier_id)) {
        $where_clauses[] = "pr.purchase_returns_supplier_id = ?";
        $bind_types .= "i";
        $bind_params[] = $supplier_id;
    } else if (!empty($supplier_id)) {
        print_failure("Error: Invalid Supplier ID provided.");
        exit;
    }

    if (!empty($status)) {
        // Support CSV statuses
        $valid_statuses = ['Draft', 'Pending', 'Approved', 'Rejected', 'Processed', 'Cancelled'];
        $statuses = array_map('trim', explode(',', $status));
        foreach ($statuses as $st) {
            if (!in_array($st, $valid_statuses)) {
                print_failure("Error: Invalid status provided. Must be one of: '" . implode("','", $valid_statuses) . "'.");
                exit;
            }
        }
        if (count($statuses) === 1) {
            $where_clauses[] = "pr.purchase_returns_status = ?";
            $bind_types .= "s";
            $bind_params[] = $statuses[0];
        } else {
            $placeholders = implode(',', array_fill(0, count($statuses), '?'));
            $where_clauses[] = "pr.purchase_returns_status IN ($placeholders)";
            $bind_types .= str_repeat('s', count($statuses));
            foreach ($statuses as $st) { $bind_params[] = $st; }
        }
    }

    if (!empty($date_from)) {
        if (!strtotime($date_from)) {
            print_failure("Error: Invalid 'date_from' format.");
            exit;
        }
        $where_clauses[] = "DATE(pr.purchase_returns_date) >= ?";
        $bind_types .= "s";
        $bind_params[] = $date_from;
    }

    if (!empty($date_to)) {
        if (!strtotime($date_to)) {
            print_failure("Error: Invalid 'date_to' format.");
            exit;
        }
        $where_clauses[] = "DATE(pr.purchase_returns_date) <= ?";
        $bind_types .= "s";
        $bind_params[] = $date_to;
    }

    if (!empty($where_clauses)) {
        $sql_main_pr .= " WHERE " . implode(" AND ", $where_clauses);
    }

    $sql_main_pr .= " ORDER BY pr.purchase_returns_date DESC, pr.purchase_returns_id DESC";

    // Pagination calculations
    $limit_val = null; $offset_val = null; $page_val = null;
    if (!is_null($limit) && $limit !== '' && is_numeric($limit)) { $limit_val = max(1, (int)$limit); }
    if (!is_null($page) && $page !== '' && is_numeric($page)) { $page_val = max(1, (int)$page); }
    if (!is_null($offset) && $offset !== '' && is_numeric($offset)) { $offset_val = max(0, (int)$offset); }
    if (!is_null($page_val) && !is_null($limit_val)) { $offset_val = ($page_val - 1) * $limit_val; }

    // Count total
    $count_sql = "SELECT COUNT(*) as total_count FROM (" . $sql_main_pr_base;
    if (!empty($where_clauses)) { $count_sql .= " WHERE " . implode(" AND ", $where_clauses); }
    $count_sql .= ") as sub";
    $count_stmt = $conn->prepare($count_sql);
    if (!$count_stmt) { throw new Exception("Prepare failed for count query: " . $conn->error); }
    if (!empty($bind_params)) { $count_stmt->bind_param($bind_types, ...$bind_params); }
    $count_stmt->execute();
    $count_res = $count_stmt->get_result();
    $total_count = (int)($count_res->fetch_assoc()['total_count'] ?? 0);
    $count_stmt->close();

    if (!is_null($limit_val)) {
        $sql_main_pr .= " LIMIT ?"; $bind_types .= 'i'; $bind_params[] = $limit_val;
        if (!is_null($offset_val)) { $sql_main_pr .= " OFFSET ?"; $bind_types .= 'i'; $bind_params[] = $offset_val; }
    }

    $stmt_main_pr = $conn->prepare($sql_main_pr);

    if (!$stmt_main_pr) {
        throw new Exception("Prepare failed for main purchase return select: " . $conn->error);
    }

    if (!empty($bind_params)) {
        $stmt_main_pr->bind_param($bind_types, ...$bind_params);
    }
    
    $stmt_main_pr->execute();
    $result_main_pr = $stmt_main_pr->get_result();

    $purchase_returns = [];
    while ($pr_row = $result_main_pr->fetch_assoc()) {
        $purchase_returns[] = $pr_row;
    }
    $stmt_main_pr->close();

    // Now, for each purchase return, fetch its items with product details
    $stmt_pr_items = $conn->prepare("
        SELECT 
            pri.purchase_return_items_id,
            pri.purchase_return_items_purchase_order_item_id,
            pri.purchase_return_items_quantity,
            pri.purchase_return_items_unit_cost,
            pri.purchase_return_items_total_cost,
            pri.purchase_return_items_notes,
            
            -- Join purchase order item details
            poi.purchase_order_items_variant_id,
            poi.purchase_order_items_packaging_type_id,
            poi.purchase_order_items_quantity_ordered,
            poi.purchase_order_items_quantity_received,
            
            -- Join product variant details
            pv.variant_name,
            pv.variant_sku,
            pv.variant_barcode,
            
            -- Join product details
            p.products_name,
            p.products_brand,
            
            -- Join packaging type details
            pt.packaging_types_name,
            
            -- Join base unit details
            bu.base_units_name
            
        FROM purchase_return_items pri
        LEFT JOIN purchase_order_items poi ON pri.purchase_return_items_purchase_order_item_id = poi.purchase_order_items_id
        LEFT JOIN product_variants pv ON poi.purchase_order_items_variant_id = pv.variant_id
        LEFT JOIN products p ON pv.variant_products_id = p.products_id
        LEFT JOIN packaging_types pt ON poi.purchase_order_items_packaging_type_id = pt.packaging_types_id
        LEFT JOIN base_units bu ON p.products_unit_of_measure_id = bu.base_units_id
        WHERE pri.purchase_return_items_return_id = ?
        ORDER BY pri.purchase_return_items_id ASC
    ");

    if (!$stmt_pr_items) {
        throw new Exception("Prepare failed for purchase return items select: " . $conn->error);
    }

    foreach ($purchase_returns as &$pr) { // Use & to modify the original array
        $stmt_pr_items->bind_param("i", $pr['purchase_returns_id']);
        $stmt_pr_items->execute();
        $items_result = $stmt_pr_items->get_result();
        $pr['items'] = [];
        while ($item_row = $items_result->fetch_assoc()) {
            $pr['items'][] = $item_row;
        }
    }
    $stmt_pr_items->close();

    // Prepare response with pagination metadata
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
        'purchase_returns' => $purchase_returns,
        'total_count' => isset($total_count) ? $total_count : count($purchase_returns),
        'returned_count' => count($purchase_returns),
    ];
    if (!is_null($pagination)) { $response['pagination'] = $pagination; }

    print_success("Purchase Returns retrieved successfully.", $response);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt_main_pr) && $stmt_main_pr !== false) {
        $stmt_main_pr->close();
    }
    if (isset($stmt_pr_items) && $stmt_pr_items !== false) {
        $stmt_pr_items->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
