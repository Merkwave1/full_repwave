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
    

    // Get only purchase orders that have items needing to be received
    // Status must be 'Ordered' or 'Partially Received'
    $query = "
        SELECT 
            po.purchase_orders_id,
            po.purchase_orders_supplier_id,
            po.purchase_orders_warehouse_id,
            po.purchase_orders_order_date,
            po.purchase_orders_expected_delivery_date,
            po.purchase_orders_total_amount,
            po.purchase_orders_status,
            po.purchase_orders_notes,
            
            -- Purchase order item details with calculated pending quantities
            poi.purchase_order_items_id,
            poi.purchase_order_items_variant_id,
            poi.purchase_order_items_packaging_type_id,
            poi.purchase_order_items_quantity_ordered,
            poi.purchase_order_items_quantity_received,
            COALESCE(poi.purchase_order_items_quantity_returned, 0) as purchase_order_items_quantity_returned,
            poi.purchase_order_items_unit_cost,
            poi.purchase_order_items_total_cost,
            poi.purchase_order_items_notes,
            
            -- Calculate quantity that still needs to be received
            -- If quantity_returned column doesn't exist, default to 0
            (poi.purchase_order_items_quantity_ordered - poi.purchase_order_items_quantity_received - COALESCE(poi.purchase_order_items_quantity_returned, 0)) as quantity_pending,
            
            -- Get product and variant information for display
            p.products_name,
            pv.variant_name,
            pt.packaging_types_name,
            bu.base_units_name
            
        FROM purchase_orders po
        INNER JOIN purchase_order_items poi ON po.purchase_orders_id = poi.purchase_order_items_purchase_order_id
        LEFT JOIN product_variants pv ON poi.purchase_order_items_variant_id = pv.variant_id
        LEFT JOIN products p ON pv.variant_products_id = p.products_id
        LEFT JOIN packaging_types pt ON poi.purchase_order_items_packaging_type_id = pt.packaging_types_id
        LEFT JOIN base_units bu ON p.products_unit_of_measure_id = bu.base_units_id
        
        WHERE po.purchase_orders_status IN ('Ordered', 'Partially Received')
        -- Only include items that still have quantity to receive (after accounting for returns)
        -- If quantity_returned column doesn't exist, it will default to 0
        AND (poi.purchase_order_items_quantity_ordered - poi.purchase_order_items_quantity_received - COALESCE(poi.purchase_order_items_quantity_returned, 0)) > 0
        
        ORDER BY po.purchase_orders_order_date DESC, po.purchase_orders_id DESC, poi.purchase_order_items_id ASC
    ";

    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $pending_orders_grouped = [];
    
    while ($row = $result->fetch_assoc()) {
        // Group items by purchase order
        $po_id = $row['purchase_orders_id'];
        
        // If this is a new purchase order, create the order structure
        if (!isset($pending_orders_grouped[$po_id])) {
            $pending_orders_grouped[$po_id] = [
                'purchase_orders_id' => $row['purchase_orders_id'],
                'purchase_orders_supplier_id' => $row['purchase_orders_supplier_id'],
                'purchase_orders_warehouse_id' => $row['purchase_orders_warehouse_id'],
                'purchase_orders_order_date' => $row['purchase_orders_order_date'],
                'purchase_orders_expected_delivery_date' => $row['purchase_orders_expected_delivery_date'],
                'purchase_orders_total_amount' => $row['purchase_orders_total_amount'],
                'purchase_orders_status' => $row['purchase_orders_status'],
                'purchase_orders_notes' => $row['purchase_orders_notes'],
                'items' => []
            ];
        }
        
        // Add item to current purchase order
        $pending_orders_grouped[$po_id]['items'][] = [
            'purchase_order_items_id' => $row['purchase_order_items_id'],
            'purchase_order_items_variant_id' => $row['purchase_order_items_variant_id'],
            'purchase_order_items_packaging_type_id' => $row['purchase_order_items_packaging_type_id'],
            'purchase_order_items_quantity_ordered' => $row['purchase_order_items_quantity_ordered'],
            'purchase_order_items_quantity_received' => $row['purchase_order_items_quantity_received'],
            'purchase_order_items_quantity_returned' => $row['purchase_order_items_quantity_returned'],
            'purchase_order_items_unit_cost' => $row['purchase_order_items_unit_cost'],
            'purchase_order_items_total_cost' => $row['purchase_order_items_total_cost'],
            'purchase_order_items_notes' => $row['purchase_order_items_notes'],
            'quantity_pending' => $row['quantity_pending'],
            'products_name' => $row['products_name'],
            'variant_name' => $row['variant_name'],
            'packaging_types_name' => $row['packaging_types_name'],
            'base_units_name' => $row['base_units_name']
        ];
    }
    
    $stmt->close();

    // Convert grouped orders from associative array to indexed array
    $pending_items = array_values($pending_orders_grouped);

    $response = [
        'purchase_orders' => $pending_items,
        'total_orders' => count($pending_items),
        'total_pending_items' => array_sum(array_map(function($po) { return count($po['items']); }, $pending_items))
    ];

    print_success("Pending purchase orders for receiving retrieved successfully.", $response);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
