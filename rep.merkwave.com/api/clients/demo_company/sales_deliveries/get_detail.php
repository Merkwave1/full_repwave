<?php

require_once '../db_connect.php'; 
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Support mobile auth via users_uuid or fallback to IP admin auth
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    $user_role = null; $user_id = null; $rep_warehouse_ids = [];
    if ($users_uuid) {
        $stmt_user = $conn->prepare('SELECT users_id, users_role FROM users WHERE users_uuid = ? LIMIT 1');
        $stmt_user->bind_param('s', $users_uuid);
        $stmt_user->execute();
        $res_u = $stmt_user->get_result();
        $u = $res_u->fetch_assoc();
        $stmt_user->close();
        if (!$u) { print_failure('Invalid users_uuid'); }
        $user_id = (int)$u['users_id'];
        $user_role = $u['users_role'];
        if ($user_role === 'rep') {
            $stmt_wh = $conn->prepare('SELECT warehouse_id FROM warehouse WHERE warehouse_representative_user_id = ?');
            $stmt_wh->bind_param('i', $user_id);
            $stmt_wh->execute();
            $res_wh = $stmt_wh->get_result();
            while ($r = $res_wh->fetch_assoc()) { $rep_warehouse_ids[] = (int)$r['warehouse_id']; }
            $stmt_wh->close();
        }
    } else {
        
    }

    $delivery_id = $_GET['id'] ?? null;
    
    if (empty($delivery_id) || !is_numeric($delivery_id)) {
        echo json_encode(['status' => 'error', 'message' => 'Valid delivery ID is required']);
        exit;
    }

    // Get main delivery info
    $stmt_delivery = $conn->prepare("
        SELECT 
            sd.*,
            so.sales_orders_client_id,
            so.sales_orders_status,
            so.sales_orders_delivery_status,
            so.sales_orders_order_date,
            so.sales_orders_total_amount,
            so.sales_orders_notes as sales_order_notes,
            c.clients_company_name,
            c.clients_contact_name,
            c.clients_contact_phone_1,
            c.clients_address,
            w.warehouse_name,
            u.users_name as delivered_by_name
        FROM sales_deliveries sd
        LEFT JOIN sales_orders so ON sd.sales_deliveries_sales_order_id = so.sales_orders_id
        LEFT JOIN clients c ON so.sales_orders_client_id = c.clients_id
        LEFT JOIN warehouse w ON sd.sales_deliveries_warehouse_id = w.warehouse_id
        LEFT JOIN users u ON sd.sales_deliveries_delivered_by_user_id = u.users_id
    WHERE sd.sales_deliveries_id = ?
    ");

    $stmt_delivery->bind_param("i", $delivery_id);
    $stmt_delivery->execute();
    $delivery = $stmt_delivery->get_result()->fetch_assoc();
    $stmt_delivery->close();

    if (!$delivery) {
        echo json_encode(['status' => 'error', 'message' => 'Delivery not found']);
        exit;
    }

    // Rep access control: if rep, restrict to deliveries in their warehouses or belonging to their orders
    if ($users_uuid && $user_role === 'rep') {
        if ($rep_warehouse_ids) {
            if (!in_array((int)$delivery['sales_deliveries_warehouse_id'], $rep_warehouse_ids)) {
                // Check if order belongs to rep
                $stmt_check = $conn->prepare('SELECT sales_orders_representative_id FROM sales_orders WHERE sales_orders_id = ? LIMIT 1');
                $stmt_check->bind_param('i', $delivery['sales_deliveries_sales_order_id']);
                $stmt_check->execute();
                $res_check = $stmt_check->get_result();
                $row_check = $res_check->fetch_assoc();
                $stmt_check->close();
                if (!$row_check || (int)$row_check['sales_orders_representative_id'] !== $user_id) {
                    echo json_encode(['status' => 'success', 'delivery' => null, 'message' => 'Not authorized for this delivery']);
                    exit;
                }
            }
        } else {
            // No warehouses; only allow if rep owns the order
            $stmt_check = $conn->prepare('SELECT sales_orders_representative_id FROM sales_orders WHERE sales_orders_id = ? LIMIT 1');
            $stmt_check->bind_param('i', $delivery['sales_deliveries_sales_order_id']);
            $stmt_check->execute();
            $res_check = $stmt_check->get_result();
            $row_check = $res_check->fetch_assoc();
            $stmt_check->close();
            if (!$row_check || (int)$row_check['sales_orders_representative_id'] !== $user_id) {
                echo json_encode(['status' => 'success', 'delivery' => null, 'message' => 'Not authorized for this delivery']);
                exit;
            }
        }
    }

    // Get delivery items with product details
    $stmt_items = $conn->prepare("
        SELECT 
            sdi.*,
            soi.sales_order_items_variant_id,
            soi.sales_order_items_packaging_type_id,
            soi.sales_order_items_quantity,
            soi.sales_order_items_quantity_delivered,
            soi.sales_order_items_unit_price,
            soi.sales_order_items_total_price,
            pv.variant_name,
            pv.variant_sku,
            p.products_name,
            pt.packaging_types_name,
            pt.packaging_types_default_conversion_factor AS packaging_types_units_per_package
        FROM sales_delivery_items sdi
        LEFT JOIN sales_order_items soi ON sdi.sales_delivery_items_sales_order_item_id = soi.sales_order_items_id
        LEFT JOIN product_variants pv ON soi.sales_order_items_variant_id = pv.variant_id
        LEFT JOIN products p ON pv.variant_products_id = p.products_id
        LEFT JOIN packaging_types pt ON soi.sales_order_items_packaging_type_id = pt.packaging_types_id
        WHERE sdi.sales_delivery_items_delivery_id = ?
        ORDER BY sdi.sales_delivery_items_id
    ");

    $stmt_items->bind_param("i", $delivery_id);
    $stmt_items->execute();
    $items_result = $stmt_items->get_result();
    $items = [];

    while ($row = $items_result->fetch_assoc()) {
        $items[] = [
            'sales_delivery_items_id' => (int)$row['sales_delivery_items_id'],
            'sales_delivery_items_sales_order_item_id' => (int)$row['sales_delivery_items_sales_order_item_id'],
            'sales_delivery_items_quantity_delivered' => (float)$row['sales_delivery_items_quantity_delivered'],
                'sales_delivery_items_notes' => $row['sales_delivery_items_notes'],
                'sales_delivery_items_batch_date' => $row['sales_delivery_items_batch_date'],
            'sales_delivery_items_created_at' => $row['sales_delivery_items_created_at'],
            
            // Sales Order Item Info
            'sales_order_items_variant_id' => (int)$row['sales_order_items_variant_id'],
            'sales_order_items_packaging_type_id' => $row['sales_order_items_packaging_type_id'] ? (int)$row['sales_order_items_packaging_type_id'] : null,
            'sales_order_items_quantity' => (float)$row['sales_order_items_quantity'],
            'sales_order_items_quantity_delivered' => (float)$row['sales_order_items_quantity_delivered'],
            'sales_order_items_unit_price' => (float)$row['sales_order_items_unit_price'],
            'sales_order_items_total_price' => (float)$row['sales_order_items_total_price'],
            
            // Product Info
            'variant_name' => $row['variant_name'],
            'variant_sku' => $row['variant_sku'],
            'products_name' => $row['products_name'],
                'packaging_types_name' => $row['packaging_types_name'],
                'packaging_types_units_per_package' => isset($row['packaging_types_units_per_package']) && $row['packaging_types_units_per_package'] !== '' ? (float)$row['packaging_types_units_per_package'] : null
        ];
    }

    $stmt_items->close();

    // Format the delivery data
    $delivery_data = [
        'sales_deliveries_id' => (int)$delivery['sales_deliveries_id'],
        'sales_deliveries_sales_order_id' => (int)$delivery['sales_deliveries_sales_order_id'],
        'sales_deliveries_warehouse_id' => (int)$delivery['sales_deliveries_warehouse_id'],
        'sales_deliveries_delivery_date' => $delivery['sales_deliveries_delivery_date'],
        'sales_deliveries_delivered_by_user_id' => $delivery['sales_deliveries_delivered_by_user_id'] ? (int)$delivery['sales_deliveries_delivered_by_user_id'] : null,
        'sales_deliveries_delivery_status' => $delivery['sales_deliveries_delivery_status'],
        'sales_deliveries_delivery_notes' => $delivery['sales_deliveries_delivery_notes'],
        'sales_deliveries_delivery_address' => $delivery['sales_deliveries_delivery_address'],
        'sales_deliveries_created_at' => $delivery['sales_deliveries_created_at'],
        'sales_deliveries_updated_at' => $delivery['sales_deliveries_updated_at'],
        
        // Sales Order Info
        'sales_orders_client_id' => $delivery['sales_orders_client_id'] ? (int)$delivery['sales_orders_client_id'] : null,
        'sales_orders_status' => $delivery['sales_orders_status'],
        'sales_orders_delivery_status' => $delivery['sales_orders_delivery_status'],
        'sales_orders_order_date' => $delivery['sales_orders_order_date'],
        'sales_orders_total_amount' => $delivery['sales_orders_total_amount'] ? (float)$delivery['sales_orders_total_amount'] : 0,
        'sales_order_notes' => $delivery['sales_order_notes'],
        
        // Client Info
        'clients_company_name' => $delivery['clients_company_name'],
        'clients_contact_name' => $delivery['clients_contact_name'],
        'clients_contact_phone_1' => $delivery['clients_contact_phone_1'],
        'clients_address' => $delivery['clients_address'],
        
        // Related Info
        'warehouse_name' => $delivery['warehouse_name'],
        'delivered_by_name' => $delivery['delivered_by_name'],
        
        // Items
        'items' => $items,
        'total_items' => count($items),
        'total_quantity_delivered' => array_sum(array_column($items, 'sales_delivery_items_quantity_delivered'))
    ];

    echo json_encode([
        'status' => 'success',
        'delivery' => $delivery_data
    ]);

} catch (Exception | TypeError $e) {
    echo json_encode([
        'status' => 'error', 
        'message' => 'Database error: ' . $e->getMessage(),
        'line' => $e->getLine()
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}

?>
