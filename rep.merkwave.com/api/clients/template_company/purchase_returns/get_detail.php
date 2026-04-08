<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get user UUID and validate authentication
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
        exit;
    }

    // Get user details from UUID
    $user_stmt = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    if (!$user_stmt) {
        throw new Exception("Prepare failed for user authentication: " . $conn->error);
    }
    
    $user_stmt->bind_param("s", $users_uuid);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    $user_data = $user_result->fetch_assoc();
    $user_stmt->close();
    
    if (!$user_data) {
        print_failure("Error: Invalid user UUID.");
        exit;
    }
    
    $user_id = $user_data['users_id'];
    $user_role = $user_data['users_role'];
    
    // Role-based access control (admin, manager, employee can view details)
    if (!in_array($user_role, ['admin', 'manager', 'employee', 'cash'])) {
        print_failure("Error: Access denied. Insufficient permissions.");
        exit;
    }

    $purchase_returns_id = $_GET['id'] ?? $_POST['id'] ?? null;

    if (empty($purchase_returns_id) || !is_numeric($purchase_returns_id) || $purchase_returns_id <= 0) {
        print_failure("Error: Valid Purchase Return ID is required.");
        exit;
    }

    // Fetch main purchase return details with joined information
    $stmt_main = $conn->prepare("
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
            
            -- Join supplier information
            s.supplier_name,
            s.supplier_contact_person,
            s.supplier_phone,
            s.supplier_email,
            s.supplier_address,
            s.supplier_balance,
            
            -- Join purchase order information (if linked)
            po.purchase_orders_order_date,
            po.purchase_orders_total_amount AS purchase_order_total_amount,
            po.purchase_orders_status AS purchase_order_status,
            
            -- Join user information
            u.users_name AS created_by_user_name,
            u.users_email AS created_by_user_email

        FROM purchase_returns pr
        LEFT JOIN suppliers s ON pr.purchase_returns_supplier_id = s.supplier_id
        LEFT JOIN purchase_orders po ON pr.purchase_returns_purchase_order_id = po.purchase_orders_id
        LEFT JOIN users u ON pr.purchase_returns_created_by_user_id = u.users_id
        WHERE pr.purchase_returns_id = ?
        LIMIT 1
    ");

    if (!$stmt_main) {
        throw new Exception("Prepare failed for main purchase return select: " . $conn->error);
    }

    $stmt_main->bind_param("i", $purchase_returns_id);
    $stmt_main->execute();
    $result_main = $stmt_main->get_result();
    $purchase_return = $result_main->fetch_assoc();
    $stmt_main->close();

    if (!$purchase_return) {
        print_failure("Error: Purchase Return with ID " . $purchase_returns_id . " not found.");
        exit;
    }

    // Fetch purchase return items with detailed product information
    $stmt_items = $conn->prepare("
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
            poi.purchase_order_items_unit_cost AS original_unit_cost,
            poi.purchase_order_items_total_cost AS original_total_cost,
            
            -- Join product variant details
            pv.variant_id,
            pv.variant_name,
            pv.variant_sku,
            pv.variant_barcode,
            pv.variant_unit_price,
            pv.variant_cost_price,
            pv.variant_notes AS variant_notes,
            
            -- Join product details
            p.products_id,
            p.products_name,
            
            -- Join packaging type details
            pt.packaging_types_id,
            pt.packaging_types_name,
            pt.packaging_types_default_conversion_factor
            
        FROM purchase_return_items pri
        LEFT JOIN purchase_order_items poi ON pri.purchase_return_items_purchase_order_item_id = poi.purchase_order_items_id
        LEFT JOIN product_variants pv ON poi.purchase_order_items_variant_id = pv.variant_id
        LEFT JOIN products p ON pv.variant_products_id = p.products_id
        LEFT JOIN packaging_types pt ON poi.purchase_order_items_packaging_type_id = pt.packaging_types_id
        WHERE pri.purchase_return_items_return_id = ?
        ORDER BY pri.purchase_return_items_id ASC
    ");

    if (!$stmt_items) {
        throw new Exception("Prepare failed for purchase return items select: " . $conn->error);
    }

    $stmt_items->bind_param("i", $purchase_returns_id);
    $stmt_items->execute();
    $result_items = $stmt_items->get_result();
    $purchase_return['items'] = [];
    while ($item_row = $result_items->fetch_assoc()) {
        $purchase_return['items'][] = $item_row;
    }
    $stmt_items->close();

    // Calculate summary information
    $purchase_return['summary'] = [
        'total_items' => count($purchase_return['items']),
        'total_quantity' => array_sum(array_column($purchase_return['items'], 'purchase_return_items_quantity')),
        'total_amount' => $purchase_return['purchase_returns_total_amount']
    ];

    print_success("Purchase Return details retrieved successfully.", $purchase_return);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt_main) && $stmt_main !== false) {
        $stmt_main->close();
    }
    if (isset($stmt_items) && $stmt_items !== false) {
        $stmt_items->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
