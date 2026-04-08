<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $purchase_orders_id = $_GET['purchase_orders_id'] ?? $_POST['purchase_orders_id'] ?? null;

    if (empty($purchase_orders_id) || !is_numeric($purchase_orders_id)) {
        print_failure("Error: Valid Purchase Order ID is required.");
        exit;
    }

    // Get main purchase order details
    $sql_main = "
        SELECT 
            po.purchase_orders_id,
            po.purchase_orders_supplier_id,
            po.purchase_orders_warehouse_id,
            po.purchase_orders_order_date,
            po.purchase_orders_expected_delivery_date,
            po.purchase_orders_actual_delivery_date,
            po.purchase_orders_total_amount,
            po.purchase_orders_order_discount,
            po.purchase_orders_status,
            po.purchase_orders_notes,
            s.supplier_name,
            w.warehouse_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.purchase_orders_supplier_id = s.supplier_id
        LEFT JOIN warehouse w ON po.purchase_orders_warehouse_id = w.warehouse_id
        WHERE po.purchase_orders_id = ?
    ";

    $stmt_main = $conn->prepare($sql_main);
    if (!$stmt_main) {
        throw new Exception("Prepare failed for main query: " . $conn->error);
    }

    $stmt_main->bind_param("i", $purchase_orders_id);
    $stmt_main->execute();
    $result_main = $stmt_main->get_result();
    $purchase_order = $result_main->fetch_assoc();
    $stmt_main->close();

    if (!$purchase_order) {
        print_failure("Error: Purchase order not found.");
        exit;
    }

    // Get purchase order items
    $sql_items = "
        SELECT 
            poi.purchase_order_items_id,
            poi.purchase_order_items_variant_id,
            poi.purchase_order_items_quantity_ordered,
            poi.purchase_order_items_quantity_received,
            poi.purchase_order_items_unit_cost,
            poi.purchase_order_items_discount_amount,
            poi.purchase_order_items_tax_rate,
            poi.purchase_order_items_has_tax,
            poi.purchase_order_items_total_cost,
            poi.purchase_order_items_packaging_type_id,
            poi.purchase_order_items_notes,
            pv.variant_name as product_variant_name,
            p.products_name as product_name,
            pt.packaging_types_name as packaging_type_name,
            bu.base_units_name as base_unit_name
        FROM purchase_order_items poi
        LEFT JOIN product_variants pv ON poi.purchase_order_items_variant_id = pv.variant_id
        LEFT JOIN products p ON pv.variant_products_id = p.products_id
        LEFT JOIN packaging_types pt ON poi.purchase_order_items_packaging_type_id = pt.packaging_types_id
        LEFT JOIN base_units bu ON p.products_unit_of_measure_id = bu.base_units_id
        WHERE poi.purchase_order_items_purchase_order_id = ?
        ORDER BY poi.purchase_order_items_id
    ";

    $stmt_items = $conn->prepare($sql_items);
    if (!$stmt_items) {
        throw new Exception("Prepare failed for items query: " . $conn->error);
    }

    $stmt_items->bind_param("i", $purchase_orders_id);
    $stmt_items->execute();
    $result_items = $stmt_items->get_result();
    
    $items = [];
    while ($item = $result_items->fetch_assoc()) {
        $items[] = $item;
    }
    $stmt_items->close();

    // Add items to the main purchase order data
    $purchase_order['items'] = $items;

    print_success("Purchase order details retrieved successfully.", $purchase_order);

} catch (Exception $e) {
    print_failure( $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}

?>
