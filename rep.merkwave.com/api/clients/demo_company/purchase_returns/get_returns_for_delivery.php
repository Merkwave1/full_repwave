<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Check authentication
    $users_uuid = $_GET['users_uuid'] ?? null;
    
    if (!$users_uuid) {
        print_failure("Error: User UUID is required.");
        exit;
    }
    
    // Get user details
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ? LIMIT 1");
    if (!$stmt_user) {
        throw new Exception("Prepare failed for user check: " . $conn->error);
    }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();
    
    if (!$user_data) {
        print_failure("Error: Invalid user session.");
        exit;
    }
    
    $user_role = $user_data['users_role'];
    
    // Check permissions
    if (!in_array($user_role, ['admin', 'manager', 'cash'])) {
        print_failure("Error: Insufficient permissions to view returns for delivery.");
        exit;
    }

    // Get approved purchase returns ready for delivery
    $query = "
        SELECT 
            pr.purchase_returns_id,
            pr.purchase_returns_date,
            pr.purchase_returns_reason,
            pr.purchase_returns_total_amount,
            pr.purchase_returns_status,
            pr.purchase_returns_notes,
            pr.purchase_returns_created_at,
            
            -- Supplier info
            s.supplier_name,
            s.supplier_contact_person,
            
            -- Purchase order info
            po.purchase_orders_id,
            po.purchase_orders_order_date,
            po.purchase_orders_status as order_status,
            w.warehouse_name,
            
            -- Count of items
            COUNT(pri.purchase_return_items_id) as items_count,
            SUM(pri.purchase_return_items_quantity) as total_quantity_returned,
            
            -- Created by user
            u.users_name as created_by_name
            
        FROM purchase_returns pr
        LEFT JOIN suppliers s ON pr.purchase_returns_supplier_id = s.supplier_id
        LEFT JOIN purchase_orders po ON pr.purchase_returns_purchase_order_id = po.purchase_orders_id
        LEFT JOIN warehouse w ON po.purchase_orders_warehouse_id = w.warehouse_id
        LEFT JOIN purchase_return_items pri ON pr.purchase_returns_id = pri.purchase_return_items_return_id
        LEFT JOIN users u ON pr.purchase_returns_created_by_user_id = u.users_id
        
        WHERE pr.purchase_returns_status = 'Approved'
        
        GROUP BY pr.purchase_returns_id
        ORDER BY pr.purchase_returns_created_at DESC
    ";

    $result = $conn->query($query);
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $returns = [];
    while ($row = $result->fetch_assoc()) {
        $returns[] = $row;
    }

    print_success("Purchase returns ready for delivery retrieved successfully.", [
        'returns' => $returns,
        'count' => count($returns)
    ]);

} catch (Exception $e) {
    print_failure( $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
