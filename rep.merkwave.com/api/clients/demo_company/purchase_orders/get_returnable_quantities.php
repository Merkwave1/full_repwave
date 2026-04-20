<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $purchase_order_id = isset($_GET['purchase_order_id']) ? (int)$_GET['purchase_order_id'] : 0;
    
    if (!$purchase_order_id) {
        print_failure("Error: Purchase Order ID is required.");
        exit;
    }

    // Get purchase order items with their returnable quantities
    $query = "
        SELECT 
            poi.purchase_order_items_id,
            poi.purchase_order_items_variant_id,
            poi.purchase_order_items_packaging_type_id,
            poi.purchase_order_items_quantity_ordered,
            poi.purchase_order_items_quantity_received,
            poi.purchase_order_items_quantity_returned,
            poi.purchase_order_items_unit_cost,
            
            -- Purchase order warehouse info
            po.purchase_orders_warehouse_id,
            w.warehouse_name,
            
            -- Simple calculation: Only return EITHER not received OR received items, not mixed
            -- Priority to received items first
            CASE 
                WHEN poi.purchase_order_items_quantity_received > 0 AND 
                     poi.purchase_order_items_quantity_received > poi.purchase_order_items_quantity_returned THEN
                    (poi.purchase_order_items_quantity_received - poi.purchase_order_items_quantity_returned)
                ELSE 0
            END as available_to_return_received,
            
            -- Not received items available only if no received items can be returned
            CASE 
                WHEN poi.purchase_order_items_quantity_received = 0 OR 
                     poi.purchase_order_items_quantity_received <= poi.purchase_order_items_quantity_returned THEN
                    GREATEST(0, (poi.purchase_order_items_quantity_ordered - poi.purchase_order_items_quantity_received) - 
                             GREATEST(0, poi.purchase_order_items_quantity_returned - poi.purchase_order_items_quantity_received))
                ELSE 0
            END as available_to_return_not_received,
            
            -- Get inventory quantity for received items (sum all inventory entries for this variant in this warehouse)
            (SELECT COALESCE(SUM(inventory_quantity), 0) 
             FROM inventory 
             WHERE variant_id = poi.purchase_order_items_variant_id 
             AND warehouse_id = po.purchase_orders_warehouse_id) as inventory_quantity,
            
            -- Calculate status
            CASE 
                WHEN poi.purchase_order_items_quantity_received = 0 THEN 'لم يتم الاستلام'
                WHEN poi.purchase_order_items_quantity_received >= poi.purchase_order_items_quantity_ordered THEN 'تم الاستلام بالكامل'
                ELSE 'تم الاستلام جزئياً'
            END as receive_status,
            
            -- Additional info for display
            p.products_name,
            pv.variant_name,
            pt.packaging_types_name,
            bu.base_units_name
            
        FROM purchase_order_items poi
        LEFT JOIN purchase_orders po ON poi.purchase_order_items_purchase_order_id = po.purchase_orders_id
        LEFT JOIN warehouse w ON po.purchase_orders_warehouse_id = w.warehouse_id
        LEFT JOIN product_variants pv ON poi.purchase_order_items_variant_id = pv.variant_id
        LEFT JOIN products p ON pv.variant_products_id = p.products_id
        LEFT JOIN packaging_types pt ON poi.purchase_order_items_packaging_type_id = pt.packaging_types_id
        LEFT JOIN base_units bu ON p.products_unit_of_measure_id = bu.base_units_id
        
        WHERE poi.purchase_order_items_purchase_order_id = ?
        ORDER BY poi.purchase_order_items_id
    ";

    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("i", $purchase_order_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $returnable_items = [];
    while ($row = $result->fetch_assoc()) {
        $returnable_items[] = [
            'purchase_order_items_id' => $row['purchase_order_items_id'],
            'purchase_order_items_variant_id' => $row['purchase_order_items_variant_id'],
            'purchase_order_items_packaging_type_id' => $row['purchase_order_items_packaging_type_id'],
            'purchase_order_items_quantity_ordered' => $row['purchase_order_items_quantity_ordered'],
            'purchase_order_items_quantity_received' => $row['purchase_order_items_quantity_received'],
            'purchase_order_items_quantity_returned' => $row['purchase_order_items_quantity_returned'],
            'purchase_order_items_unit_cost' => $row['purchase_order_items_unit_cost'],
            'total_returned' => $row['purchase_order_items_quantity_returned'],
            'available_to_return_not_received' => $row['available_to_return_not_received'],
            'available_to_return_received' => $row['available_to_return_received'],
            'receive_status' => $row['receive_status'],
            'warehouse_id' => $row['purchase_orders_warehouse_id'],
            'warehouse_name' => $row['warehouse_name'],
            'inventory_quantity' => $row['inventory_quantity'],
            'product_name' => $row['products_name'],
            'product_variant_name' => $row['variant_name'],
            'packaging_type_name' => $row['packaging_types_name'],
            'base_unit_name' => $row['base_units_name']
        ];
    }

    $stmt->close();
    $conn->close();

    print_success("Returnable quantities retrieved successfully.", [
        'purchase_order_id' => $purchase_order_id,
        'items' => $returnable_items
    ]);

} catch (Exception $e) {
    print_failure( $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}

?>
