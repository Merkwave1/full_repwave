<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Require users_uuid for permission check
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) {
        print_failure('Error: User UUID is required.');
    }

    // Validate user
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    $stmt_user->bind_param('s', $users_uuid);
    $stmt_user->execute();
    $user = $stmt_user->get_result()->fetch_assoc();
    $stmt_user->close();
    if (!$user) print_failure('Error: Invalid user UUID.');

    // Require receipt id
    $receipt_id = isset($_GET['receipt_id']) ? (int)$_GET['receipt_id'] : (isset($_POST['receipt_id']) ? (int)$_POST['receipt_id'] : 0);
    if (!$receipt_id) print_failure('Error: receipt_id is required.');

    // Fetch receipt header
    $stmt = $conn->prepare("SELECT gr.goods_receipt_id as receipt_id, gr.goods_receipt_warehouse_id as warehouse_id, gr.goods_receipt_date as receipt_date, COALESCE(gr.goods_receipt_notes, '') as notes, gr.goods_receipt_received_by_user_id as received_by_user_id, COALESCE(u.users_name, '') as received_by_user_name, COALESCE(w.warehouse_name, '') as warehouse_name FROM goods_receipts gr LEFT JOIN users u ON gr.goods_receipt_received_by_user_id = u.users_id LEFT JOIN warehouse w ON gr.goods_receipt_warehouse_id = w.warehouse_id WHERE gr.goods_receipt_id = ? LIMIT 1");
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param('i', $receipt_id);
    $stmt->execute();
    $header = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$header) {
        print_failure('Error: Goods receipt not found.');
    }

    // Fetch items for this receipt - now supports both purchase_order_item_id and direct variant_id
    $items_sql = "SELECT 
        gri.goods_receipt_item_id as id, 
        gri.purchase_order_item_id as purchase_order_item_id, 
        COALESCE(gri.quantity_received,0) as quantity_received, 
        gri.goods_receipt_items_production_date as production_date, 
        COALESCE(COALESCE(pv.variant_products_id, pv2.variant_products_id), 0) as product_id,
        COALESCE(COALESCE(p.products_name, p2.products_name), '') as product_name,
        COALESCE(COALESCE(pv.variant_id, pv2.variant_id), 0) as variant_id,
        COALESCE(COALESCE(pv.variant_name, pv2.variant_name), '') as variant_name,
        COALESCE(COALESCE(pv.variant_sku, pv2.variant_sku), '') as variant_sku,
        COALESCE(pt.packaging_types_id, NULL) as packaging_type_id, 
        COALESCE(pt.packaging_types_name, '') as packaging_type_name, 
        COALESCE(poi.purchase_order_items_purchase_order_id, 0) as purchase_order_id 
    FROM goods_receipt_items gri 
    LEFT JOIN purchase_order_items poi ON gri.purchase_order_item_id = poi.purchase_order_items_id 
    LEFT JOIN product_variants pv ON poi.purchase_order_items_variant_id = pv.variant_id 
    LEFT JOIN product_variants pv2 ON gri.variant_id = pv2.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id 
    LEFT JOIN products p2 ON pv2.variant_products_id = p2.products_id
    LEFT JOIN packaging_types pt ON poi.purchase_order_items_packaging_type_id = pt.packaging_types_id 
    WHERE gri.goods_receipt_id = ?";
    $stmt2 = $conn->prepare($items_sql);
    if (!$stmt2) throw new Exception('Prepare failed items: ' . $conn->error);
    $stmt2->bind_param('i', $receipt_id);
    $stmt2->execute();
    $res_items = $stmt2->get_result();
    $items = [];
    while ($row = $res_items->fetch_assoc()) {
        $items[] = [
            'id' => (int)$row['id'],
            'purchase_order_item_id' => (int)$row['purchase_order_item_id'],
            'quantity_received' => (float)$row['quantity_received'],
            'production_date' => $row['production_date'] === null ? null : $row['production_date'],
            'product_id' => (int)$row['product_id'],
            'product_name' => $row['product_name'],
            'variant_id' => (int)$row['variant_id'],
            'variant_name' => $row['variant_name'],
            'variant_sku' => $row['variant_sku'],
            'packaging_type_id' => $row['packaging_type_id'] !== null ? (int)$row['packaging_type_id'] : null,
            'packaging_type_name' => $row['packaging_type_name'],
            'purchase_order_id' => (int)$row['purchase_order_id']
        ];
    }
    $stmt2->close();

    $response = array_merge($header, ['items' => $items]);

    echo json_encode(['status' => 'success', 'message' => 'Goods receipt fetched.', 'data' => $response]);
    exit;

} catch (Exception $e) {
    print_failure('Error: ' . $e->getMessage());
}

?>
