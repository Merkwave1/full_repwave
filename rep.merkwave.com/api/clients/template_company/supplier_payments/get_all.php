<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get user UUID and validate
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
        exit;
    }

    // Validate user UUID and get user information
    $sql_user = "SELECT users_id, users_role FROM users WHERE users_uuid = ?";
    $stmt_user = $conn->prepare($sql_user);
    if (!$stmt_user) {
        throw new Exception("Prepare failed for user query: " . $conn->error);
    }
    
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();
    
    if (!$user_data) {
        print_failure("Error: Invalid user UUID.");
        exit;
    }
    
    $users_id = $user_data['users_id'];
    $users_role = $user_data['users_role'];
    
        // Check permissions - only admin, manager, employee, and cash role can view supplier payments
    if (!in_array($users_role, ['admin', 'manager', 'employee', 'cash'])) {
        print_failure("Error: Insufficient permissions.");
        exit;
    }

    // Get optional filters
    $supplier_id = $_GET['supplier_id'] ?? $_POST['supplier_id'] ?? null;
    $safe_id = $_GET['safe_id'] ?? $_POST['safe_id'] ?? null;
    $start_date = $_GET['start_date'] ?? $_POST['start_date'] ?? null;
    $end_date = $_GET['end_date'] ?? $_POST['end_date'] ?? null;
    $search = $_GET['search'] ?? $_POST['search'] ?? null;
    $status = $_GET['status'] ?? $_POST['status'] ?? null;
    $limit = $_GET['limit'] ?? $_POST['limit'] ?? 10000;
    $offset = $_GET['offset'] ?? $_POST['offset'] ?? 0;

    // Build the main query
    $sql = "
        SELECT 
            sp.supplier_payments_id,
            sp.supplier_payments_supplier_id,
            sp.supplier_payments_method_id,
            sp.supplier_payments_amount,
            sp.supplier_payments_date,
            sp.supplier_payments_transaction_id,
            sp.supplier_payments_notes,
            sp.supplier_payments_rep_user_id,
            sp.supplier_payments_safe_id,
            sp.supplier_payments_safe_transaction_id,
            sp.supplier_payments_purchase_order_id,
            sp.supplier_payments_type,
            sp.supplier_payments_status,
            sp.supplier_payments_created_at,
            sp.supplier_payments_updated_at,
            sp.supplier_payments_odoo_id,
            -- Supplier information
            s.supplier_name,
            s.supplier_contact_person,
            s.supplier_phone,
            s.supplier_email,
            s.supplier_balance,
            -- Payment method information
            pm.payment_methods_name as payment_method_name,
            pm.payment_methods_description as payment_method_description,
            -- User information
            u.users_name as rep_user_name,
            u.users_email as rep_user_email,
            -- Safe information
            sf.safes_name as safe_name,
            sf.safes_description as safe_description,
            -- Purchase order information (if linked)
            po.purchase_orders_total_amount as purchase_order_total,
            po.purchase_orders_status as purchase_order_status,
            po.purchase_orders_order_date as purchase_order_date
        FROM supplier_payments sp
        LEFT JOIN suppliers s ON sp.supplier_payments_supplier_id = s.supplier_id
        LEFT JOIN payment_methods pm ON sp.supplier_payments_method_id = pm.payment_methods_id
        LEFT JOIN users u ON sp.supplier_payments_rep_user_id = u.users_id
        LEFT JOIN safes sf ON sp.supplier_payments_safe_id = sf.safes_id
        LEFT JOIN purchase_orders po ON sp.supplier_payments_purchase_order_id = po.purchase_orders_id
        WHERE 1=1
    ";

    $params = [];
    $types = "";

    // Add filters
    if ($supplier_id && is_numeric($supplier_id)) {
        $sql .= " AND sp.supplier_payments_supplier_id = ?";
        $params[] = $supplier_id;
        $types .= "i";
    }

    if ($start_date && DateTime::createFromFormat('Y-m-d', $start_date)) {
        $sql .= " AND DATE(sp.supplier_payments_date) >= ?";
        $params[] = $start_date;
        $types .= "s";
    }

    if ($end_date && DateTime::createFromFormat('Y-m-d', $end_date)) {
        $sql .= " AND DATE(sp.supplier_payments_date) <= ?";
        $params[] = $end_date;
        $types .= "s";
    }

    if ($status && in_array($status, ['pending', 'approved', 'cancelled'])) {
        $sql .= " AND sp.supplier_payments_status = ?";
        $params[] = $status;
        $types .= "s";
    }

    // Safe filter
    if ($safe_id && is_numeric($safe_id)) {
        $sql .= " AND sp.supplier_payments_safe_id = ?";
        $params[] = $safe_id;
        $types .= "i";
    }

    // Server-side search: allow searching payment id, transaction id, notes, supplier name, or safe name
    if ($search !== null && $search !== '') {
        $search_like = '%' . $search . '%';
        $sql .= " AND (CAST(sp.supplier_payments_id AS CHAR) LIKE ? OR sp.supplier_payments_transaction_id LIKE ? OR sp.supplier_payments_notes LIKE ? OR s.supplier_name LIKE ? OR sf.safes_name LIKE ?)";
        $params[] = $search_like;
        $params[] = $search_like;
        $params[] = $search_like;
        $params[] = $search_like;
        $params[] = $search_like;
        $types .= "sssss";
    }

    // Add ordering and limit
    $sql .= " ORDER BY sp.supplier_payments_date DESC, sp.supplier_payments_id DESC";
    
    if (is_numeric($limit) && is_numeric($offset)) {
        $sql .= " LIMIT ? OFFSET ?";
        $params[] = (int)$limit;
        $params[] = (int)$offset;
        $types .= "ii";
    }

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $supplier_payments = [];
    while ($row = $result->fetch_assoc()) {
        $supplier_payments[] = $row;
    }

    $stmt->close();

    // Get total count for pagination
    $count_sql = "
        SELECT COUNT(*) as total_count
        FROM supplier_payments sp
        WHERE 1=1
    ";

    $count_params = [];
    $count_types = "";

    // Add same filters for count
    if ($supplier_id && is_numeric($supplier_id)) {
        $count_sql .= " AND sp.supplier_payments_supplier_id = ?";
        $count_params[] = $supplier_id;
        $count_types .= "i";
    }

    if ($start_date && DateTime::createFromFormat('Y-m-d', $start_date)) {
        $count_sql .= " AND DATE(sp.supplier_payments_date) >= ?";
        $count_params[] = $start_date;
        $count_types .= "s";
    }

    if ($end_date && DateTime::createFromFormat('Y-m-d', $end_date)) {
        $count_sql .= " AND DATE(sp.supplier_payments_date) <= ?";
        $count_params[] = $end_date;
        $count_types .= "s";
    }

    if ($status && in_array($status, ['pending', 'approved', 'cancelled'])) {
        $count_sql .= " AND sp.supplier_payments_status = ?";
        $count_params[] = $status;
        $count_types .= "s";
    }

    if ($safe_id && is_numeric($safe_id)) {
        $count_sql .= " AND sp.supplier_payments_safe_id = ?";
        $count_params[] = $safe_id;
        $count_types .= "i";
    }

    if ($search !== null && $search !== '') {
        $search_like = '%' . $search . '%';
        $count_sql .= " AND (CAST(sp.supplier_payments_id AS CHAR) LIKE ? OR sp.supplier_payments_transaction_id LIKE ? OR sp.supplier_payments_notes LIKE ? OR EXISTS (SELECT 1 FROM suppliers s2 WHERE s2.supplier_id = sp.supplier_payments_supplier_id AND s2.supplier_name LIKE ?) OR EXISTS (SELECT 1 FROM safes f2 WHERE f2.safes_id = sp.supplier_payments_safe_id AND f2.safes_name LIKE ?))";
        $count_params[] = $search_like;
        $count_params[] = $search_like;
        $count_params[] = $search_like;
        $count_params[] = $search_like;
        $count_params[] = $search_like;
        $count_types .= "sssss";
    }

    $count_stmt = $conn->prepare($count_sql);
    if (!empty($count_params)) {
        $count_stmt->bind_param($count_types, ...$count_params);
    }

    $count_stmt->execute();
    $count_result = $count_stmt->get_result();
    $total_count = $count_result->fetch_assoc()['total_count'];
    $count_stmt->close();

    $response_data = [
        'supplier_payments' => $supplier_payments,
        'total_count' => (int)$total_count,
        'returned_count' => count($supplier_payments)
    ];

    print_success("Supplier payments retrieved successfully.", $response_data);

} catch (Exception $e) {
    print_failure( $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}

?>
