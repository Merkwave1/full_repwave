<?php

require_once '../db_connect.php'; 

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
    
    // Check permissions - all users with valid UUID can read return info
    if (!in_array($users_role, ['admin', 'manager', 'employee', 'cash'])) {
        print_failure("Error: Insufficient permissions.");
        exit;
    }

    $purchase_order_item_id = $_GET['purchase_order_item_id'] ?? $_POST['purchase_order_item_id'] ?? null;

    if (empty($purchase_order_item_id) || !is_numeric($purchase_order_item_id)) {
        print_failure("Error: Valid Purchase Order Item ID is required.");
        exit;
    }

    // Get original item quantities and order status
    $sql_original = "
        SELECT 
            poi.purchase_order_items_quantity_ordered,
            poi.purchase_order_items_quantity_received,
            poi.purchase_order_items_unit_cost,
            poi.purchase_order_items_discount_amount,
            poi.purchase_order_items_tax_rate,
            poi.purchase_order_items_has_tax,
            po.purchase_orders_status
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_items_purchase_order_id = po.purchase_orders_id
        WHERE poi.purchase_order_items_id = ?
    ";

    $stmt_original = $conn->prepare($sql_original);
    if (!$stmt_original) {
        throw new Exception("Prepare failed for original query: " . $conn->error);
    }

    $stmt_original->bind_param("i", $purchase_order_item_id);
    $stmt_original->execute();
    $result_original = $stmt_original->get_result();
    $original_data = $result_original->fetch_assoc();
    $stmt_original->close();

    if (!$original_data) {
        print_failure("Error: Purchase order item not found.");
        exit;
    }

    // Get total already returned quantity
    $sql_returned = "
        SELECT COALESCE(SUM(pri.purchase_return_items_quantity), 0) AS total_returned,
               GROUP_CONCAT(CONCAT(pr.purchase_returns_id, ':', pr.purchase_returns_status, ':', pri.purchase_return_items_quantity) SEPARATOR '; ') AS debug_returns
        FROM purchase_returns pr
        JOIN purchase_return_items pri ON pr.purchase_returns_id = pri.purchase_return_items_return_id
        WHERE pri.purchase_return_items_purchase_order_item_id = ?
        AND pr.purchase_returns_status = 'Approved'
    ";

    $stmt_returned = $conn->prepare($sql_returned);
    if (!$stmt_returned) {
        throw new Exception("Prepare failed for returned query: " . $conn->error);
    }

    $stmt_returned->bind_param("i", $purchase_order_item_id);
    $stmt_returned->execute();
    $result_returned = $stmt_returned->get_result();
    $returned_data = $result_returned->fetch_assoc();
    $stmt_returned->close();

    $total_returned = (float)$returned_data['total_returned'];
    $quantity_ordered = (float)$original_data['purchase_order_items_quantity_ordered'];
    $quantity_received = (float)$original_data['purchase_order_items_quantity_received'];
    $purchase_orders_status = $original_data['purchase_orders_status'];
    
    // Calculate available for return based on order status
    // For orders that haven't been received (Ordered/Shipped), use ordered quantity
    // For orders that have been received (Received/Partially Received), use received quantity
    $available_for_return = in_array($purchase_orders_status, ['Received', 'Partially Received']) && $quantity_received > 0
        ? $quantity_received - $total_returned
        : $quantity_ordered - $total_returned;

    // Calculate final unit cost including discount and tax
    $unit_cost = (float)$original_data['purchase_order_items_unit_cost'];
    $discount_amount = (float)$original_data['purchase_order_items_discount_amount'];
    $tax_rate = (float)$original_data['purchase_order_items_tax_rate'];
    $has_tax = (bool)$original_data['purchase_order_items_has_tax'];
    
    // Apply discount
    $discounted_unit_cost = $unit_cost - $discount_amount;
    
    // Apply tax if applicable
    $final_unit_cost = $has_tax ? $discounted_unit_cost * (1 + ($tax_rate / 100)) : $discounted_unit_cost;

    $response_data = [
        'quantity_ordered' => $quantity_ordered,
        'quantity_received' => $quantity_received,
        'quantity_returned' => $total_returned,
        'available_for_return' => $available_for_return,
        'unit_cost' => $unit_cost, // Original unit cost
        'discount_amount' => $discount_amount,
        'tax_rate' => $tax_rate,
        'has_tax' => $has_tax,
        'final_unit_cost' => $final_unit_cost, // Final cost after discount and tax
        'purchase_orders_status' => $purchase_orders_status,
        'debug_returns' => $returned_data['debug_returns'] ?? 'No returns found' // Debug info
    ];

    print_success("Purchase order item return info retrieved successfully.", $response_data);

} catch (Exception $e) {
    print_failure( $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}

?>
