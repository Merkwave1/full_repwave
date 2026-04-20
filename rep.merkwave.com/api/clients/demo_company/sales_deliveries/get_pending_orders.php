<?php
// Get Pending Sales Orders endpoint
// Behavior:
//  - Accepts users_uuid (GET or POST)
//  - Determines user role
//  - If role == 'rep' => restrict orders to warehouses assigned to that representative
//  - Else (admin / manager / others) => return all pending orders (original behavior)
//  - Returns only orders that still have at least one item with pending quantity

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) {
        print_failure('Error: users_uuid is required.');
    }

    // Get filter and pagination parameters
    $search = $_GET['search'] ?? $_POST['search'] ?? '';
    $status = $_GET['status'] ?? $_POST['status'] ?? '';
    $warehouse = $_GET['warehouse'] ?? $_POST['warehouse'] ?? '';
    $client = $_GET['client'] ?? $_POST['client'] ?? '';
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : (isset($_POST['page']) ? max(1, (int)$_POST['page']) : 1);
    $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : (isset($_POST['limit']) ? max(1, min(100, (int)$_POST['limit'])) : 20);
    $offset = ($page - 1) * $limit;

    // Lookup user (id + role)
    $stmt_user = $conn->prepare('SELECT users_id, users_role FROM users WHERE users_uuid = ? LIMIT 1');
    if (!$stmt_user) { throw new Exception('Prepare failed for user lookup: ' . $conn->error); }
    $stmt_user->bind_param('s', $users_uuid);
    $stmt_user->execute();
    $res_user = $stmt_user->get_result();
    $user = $res_user->fetch_assoc();
    $stmt_user->close();
    if (!$user) { print_failure('Error: Invalid users_uuid.'); }

    $user_id = (int)$user['users_id'];
    $user_role = $user['users_role'];

    $controlled_warehouse_ids = [];
    $restrict_to_warehouses = ($user_role === 'rep' || $user_role === 'store_keeper');

    if ($restrict_to_warehouses) {
        if ($user_role === 'rep') {
            // Rep uses warehouse.warehouse_representative_user_id
            $stmt_wh = $conn->prepare('SELECT warehouse_id FROM warehouse WHERE warehouse_representative_user_id = ?');
            $stmt_wh->bind_param('i', $user_id);
            $stmt_wh->execute();
            $res_wh = $stmt_wh->get_result();
            while ($r = $res_wh->fetch_assoc()) { $controlled_warehouse_ids[] = (int)$r['warehouse_id']; }
            $stmt_wh->close();
        } else if ($user_role === 'store_keeper') {
            // Store keeper uses user_warehouses table
            $stmt_wh = $conn->prepare('SELECT warehouse_id FROM user_warehouses WHERE user_id = ?');
            $stmt_wh->bind_param('i', $user_id);
            $stmt_wh->execute();
            $res_wh = $stmt_wh->get_result();
            while ($r = $res_wh->fetch_assoc()) { $controlled_warehouse_ids[] = (int)$r['warehouse_id']; }
            $stmt_wh->close();
        }

        if (!$controlled_warehouse_ids) {
            print_success(
                $user_role === 'rep' ? 'لا توجد مستودعات مرتبطة بالمندوب.' : 'لا توجد مستودعات تحت سيطرة أمين المخزن.',
                [
                    'pagination' => [
                        'current_page' => 1,
                        'limit' => 50,
                        'total_items' => 0,
                        'total_pages' => 0
                    ],
                    'data' => [],
                    'user_role' => $user_role,
                    'filtered' => true
                ]
            );
        }
    }

    // Build main orders query (conditional warehouse restriction for reps)
    // Treat NULL or empty delivery status as 'Not_Delivered' (legacy rows may have '')
    $base_sql = "SELECT so.*, c.clients_company_name, c.clients_contact_name, c.clients_contact_phone_1, c.clients_address, w.warehouse_name, u.users_name AS representative_name
                             FROM sales_orders so
                             LEFT JOIN clients c ON so.sales_orders_client_id = c.clients_id
                             LEFT JOIN warehouse w ON so.sales_orders_warehouse_id = w.warehouse_id
                             LEFT JOIN users u ON so.sales_orders_representative_id = u.users_id
                             WHERE so.sales_orders_status IN ('Approved','Invoiced')
                                 AND (so.sales_orders_delivery_status IN ('Not_Delivered','Processing_Delivery','Partially_Delivered')
                                            OR so.sales_orders_delivery_status IS NULL OR so.sales_orders_delivery_status = '')";

    $params = [];
    $types = '';

    if ($restrict_to_warehouses) {
        // Dynamic IN clause for controlled warehouses (rep or store_keeper)
        $placeholders = implode(',', array_fill(0, count($controlled_warehouse_ids), '?'));
        $base_sql .= " AND so.sales_orders_warehouse_id IN ($placeholders)";
        $types .= str_repeat('i', count($controlled_warehouse_ids));
        $params = array_merge($params, $controlled_warehouse_ids);
    }

    // Apply search filter (client name, order ID, notes)
    if (!empty($search)) {
        $search_param = '%' . $search . '%';
        $base_sql .= " AND (c.clients_company_name LIKE ? OR c.clients_contact_name LIKE ? OR so.sales_orders_id LIKE ? OR so.sales_orders_notes LIKE ?)";
        $types .= 'ssss';
        $params[] = $search_param;
        $params[] = $search_param;
        $params[] = $search_param;
        $params[] = $search_param;
    }

    // Apply status filter
    if (!empty($status)) {
        // Handle 'Not_Delivered' which includes NULL and empty strings
        if ($status === 'Not_Delivered') {
            $base_sql .= " AND (so.sales_orders_delivery_status = 'Not_Delivered' OR so.sales_orders_delivery_status IS NULL OR so.sales_orders_delivery_status = '')";
        } else {
            $base_sql .= " AND so.sales_orders_delivery_status = ?";
            $types .= 's';
            $params[] = $status;
        }
    }

    // Apply warehouse filter
    if (!empty($warehouse)) {
        $warehouse_param = '%' . $warehouse . '%';
        $base_sql .= " AND w.warehouse_name LIKE ?";
        $types .= 's';
        $params[] = $warehouse_param;
    }

    // Apply client filter
    if (!empty($client)) {
        $client_param = '%' . $client . '%';
        $base_sql .= " AND (c.clients_company_name LIKE ? OR c.clients_contact_name LIKE ?)";
        $types .= 'ss';
        $params[] = $client_param;
        $params[] = $client_param;
    }

    // Count total records before pagination
    $count_sql = "SELECT COUNT(*) as total " . substr($base_sql, strpos($base_sql, 'FROM'));
    $stmt_count = $conn->prepare($count_sql);
    if (!$stmt_count) { throw new Exception('Prepare failed for count query: ' . $conn->error); }
    if ($types) { $stmt_count->bind_param($types, ...$params); }
    $stmt_count->execute();
    $count_result = $stmt_count->get_result();
    $total_items = (int)$count_result->fetch_assoc()['total'];
    $total_pages = $limit > 0 ? ceil($total_items / $limit) : 0;
    $stmt_count->close();

    // Add ordering and pagination
    $base_sql .= ' ORDER BY so.sales_orders_order_date DESC LIMIT ? OFFSET ?';
    $types .= 'ii';
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $conn->prepare($base_sql);
    if (!$stmt) { throw new Exception('Prepare failed for main query: ' . $conn->error); }
    if ($types) { $stmt->bind_param($types, ...$params); }
    $stmt->execute();
    $result = $stmt->get_result();

    $pending_orders = [];
    while ($row = $result->fetch_assoc()) {
        $order_id = (int)$row['sales_orders_id'];

    $stmt_items = $conn->prepare("SELECT soi.*, (soi.sales_order_items_quantity - soi.sales_order_items_quantity_delivered) AS quantity_pending, pv.variant_name, pv.variant_sku, p.products_name, pt.packaging_types_name, pt.packaging_types_default_conversion_factor AS packaging_types_units_per_package,
                -- Direct packaging-specific total
                inv_pkg.total_available AS pkg_total,
                -- Base unit (no packaging) total
                inv_base.total_available AS base_total,
                -- Computed available quantity with fallback + conversion
                CASE 
                   WHEN soi.sales_order_items_packaging_type_id IS NOT NULL THEN 
                       CASE 
                           WHEN inv_pkg.total_available IS NOT NULL THEN inv_pkg.total_available
                           WHEN inv_base.total_available IS NOT NULL AND pt.packaging_types_default_conversion_factor IS NOT NULL AND pt.packaging_types_default_conversion_factor > 0 THEN inv_base.total_available / pt.packaging_types_default_conversion_factor
                           ELSE 0
                       END
                   ELSE COALESCE(inv_base.total_available,0)
                END AS available_quantity,
                CASE 
                   WHEN soi.sales_order_items_packaging_type_id IS NOT NULL AND inv_pkg.total_available IS NOT NULL THEN 'packaging'
                   WHEN soi.sales_order_items_packaging_type_id IS NOT NULL AND inv_pkg.total_available IS NULL AND inv_base.total_available IS NOT NULL THEN 'base_converted'
                   WHEN soi.sales_order_items_packaging_type_id IS NULL AND inv_base.total_available IS NOT NULL THEN 'base'
                   ELSE 'none'
                END AS available_quantity_source
            FROM sales_order_items soi 
            LEFT JOIN product_variants pv ON soi.sales_order_items_variant_id = pv.variant_id 
            LEFT JOIN products p ON pv.variant_products_id = p.products_id 
            LEFT JOIN packaging_types pt ON soi.sales_order_items_packaging_type_id = pt.packaging_types_id 
            LEFT JOIN ( SELECT variant_id, warehouse_id, packaging_type_id, SUM(inventory_quantity) AS total_available FROM inventory GROUP BY variant_id, warehouse_id, packaging_type_id ) inv_pkg 
                 ON inv_pkg.variant_id = soi.sales_order_items_variant_id AND inv_pkg.warehouse_id = ? AND inv_pkg.packaging_type_id <=> soi.sales_order_items_packaging_type_id 
            LEFT JOIN ( SELECT variant_id, warehouse_id, SUM(inventory_quantity) AS total_available FROM inventory WHERE packaging_type_id IS NULL GROUP BY variant_id, warehouse_id ) inv_base 
                 ON inv_base.variant_id = soi.sales_order_items_variant_id AND inv_base.warehouse_id = ?
            WHERE soi.sales_order_items_sales_order_id = ? AND (soi.sales_order_items_quantity - soi.sales_order_items_quantity_delivered) > 0 
            ORDER BY soi.sales_order_items_id");
        if (!$stmt_items) { throw new Exception('Prepare failed for items query: ' . $conn->error); }
        $stmt_items->bind_param('iii', $row['sales_orders_warehouse_id'], $row['sales_orders_warehouse_id'], $order_id);
        $stmt_items->execute();
        $items_res = $stmt_items->get_result();
        $items = [];
        while ($ir = $items_res->fetch_assoc()) {
            $variantId = (int)$ir['sales_order_items_variant_id'];
            $pkgId = $ir['sales_order_items_packaging_type_id'] ? (int)$ir['sales_order_items_packaging_type_id'] : null;

            // Fetch batches (production dates) with remaining quantity > 0 for this variant & packaging & warehouse
            if (!isset($stmt_batch_with_pkg)) {
                $stmt_batch_with_pkg = $conn->prepare("SELECT inventory_production_date, inventory_quantity FROM inventory WHERE variant_id=? AND warehouse_id=? AND packaging_type_id=? AND inventory_quantity>0 ORDER BY inventory_production_date ASC");
            }
            if (!isset($stmt_batch_no_pkg)) {
                $stmt_batch_no_pkg = $conn->prepare("SELECT inventory_production_date, inventory_quantity FROM inventory WHERE variant_id=? AND warehouse_id=? AND packaging_type_id IS NULL AND inventory_quantity>0 ORDER BY inventory_production_date ASC");
            }
            $batches = [];
            if ($pkgId !== null) {
                $stmt_batch_with_pkg->bind_param('iii', $variantId, $row['sales_orders_warehouse_id'], $pkgId);
                $stmt_batch_with_pkg->execute();
                $resB = $stmt_batch_with_pkg->get_result();
            } else {
                $stmt_batch_no_pkg->bind_param('ii', $variantId, $row['sales_orders_warehouse_id']);
                $stmt_batch_no_pkg->execute();
                $resB = $stmt_batch_no_pkg->get_result();
            }
            while ($br = $resB->fetch_assoc()) {
                $batches[] = [
                    'production_date' => $br['inventory_production_date'],
                    'quantity' => (float)$br['inventory_quantity']
                ];
            }

            $items[] = [
                'sales_order_items_id' => (int)$ir['sales_order_items_id'],
                'sales_order_items_variant_id' => $variantId,
                'sales_order_items_packaging_type_id' => $pkgId,
                'sales_order_items_quantity' => (float)$ir['sales_order_items_quantity'],
                'sales_order_items_quantity_delivered' => (float)$ir['sales_order_items_quantity_delivered'],
                'quantity_pending' => (float)$ir['quantity_pending'],
                'sales_order_items_unit_price' => (float)$ir['sales_order_items_unit_price'],
                'sales_order_items_total_price' => (float)$ir['sales_order_items_total_price'],
                'sales_order_items_notes' => $ir['sales_order_items_notes'],
                'variant_name' => $ir['variant_name'],
                'variant_sku' => $ir['variant_sku'],
                'products_name' => $ir['products_name'],
                'packaging_types_name' => $ir['packaging_types_name'],
                'packaging_types_units_per_package' => ($ir['packaging_types_units_per_package'] !== null && $ir['packaging_types_units_per_package'] !== '') ? (float)$ir['packaging_types_units_per_package'] : null,
                'available_quantity' => (float)$ir['available_quantity'],
                'available_quantity_source' => $ir['available_quantity_source'],
                'batches' => $batches,
                'can_deliver' => (float)$ir['available_quantity'] >= (float)$ir['quantity_pending']
            ];
        }
        if (isset($stmt_batch_with_pkg)) { $stmt_batch_with_pkg->free_result(); }
        if (isset($stmt_batch_no_pkg)) { $stmt_batch_no_pkg->free_result(); }
        $stmt_items->close();

        if ($items) {
            $pending_orders[] = [
                'sales_orders_id' => $order_id,
                'sales_orders_client_id' => (int)$row['sales_orders_client_id'],
                'sales_orders_representative_id' => (int)$row['sales_orders_representative_id'],
                'sales_orders_warehouse_id' => (int)$row['sales_orders_warehouse_id'],
                'sales_orders_visit_id' => $row['sales_orders_visit_id'] ? (int)$row['sales_orders_visit_id'] : null,
                'sales_orders_order_date' => $row['sales_orders_order_date'],
                'sales_orders_expected_delivery_date' => $row['sales_orders_expected_delivery_date'],
                'sales_orders_actual_delivery_date' => $row['sales_orders_actual_delivery_date'],
                'sales_orders_status' => $row['sales_orders_status'],
                'sales_orders_delivery_status' => ($row['sales_orders_delivery_status'] === null || $row['sales_orders_delivery_status'] === '') ? 'Not_Delivered' : $row['sales_orders_delivery_status'],
                'sales_orders_total_amount' => (float)$row['sales_orders_total_amount'],
                'sales_orders_notes' => $row['sales_orders_notes'],
                'sales_orders_created_at' => $row['sales_orders_created_at'],
                'clients_company_name' => $row['clients_company_name'],
                'clients_contact_name' => $row['clients_contact_name'],
                'clients_contact_phone_1' => $row['clients_contact_phone_1'],
                'clients_address' => $row['clients_address'],
                'warehouse_name' => $row['warehouse_name'],
                'representative_name' => $row['representative_name'],
                'items' => $items,
                'total_pending_items' => count($items),
                'total_pending_quantity' => array_sum(array_column($items, 'quantity_pending')),
                'can_deliver_all' => !in_array(false, array_column($items, 'can_deliver'))
            ];
        }
    }
    $stmt->close();

    $has_more = $page < $total_pages;
    
    print_success(
        count($pending_orders) > 0 ? 'Pending sales orders retrieved successfully.' : 'No pending orders found.',
        [
            'pagination' => [
                'current_page' => $page,
                'limit' => $limit,
                'total_items' => $total_items,
                'total_pages' => $total_pages,
                'has_more' => $has_more
            ],
            'data' => $pending_orders,
            'user_role' => $user_role,
            'filtered' => $restrict_to_warehouses,
            'filters_applied' => [
                'search' => !empty($search),
                'status' => !empty($status),
                'warehouse' => !empty($warehouse),
                'client' => !empty($client)
            ]
        ]
    );
} catch (Exception | TypeError $e) {
    print_failure('Database error: ' . $e->getMessage() . ' (Line: ' . $e->getLine() . ')');
} finally {
    if (isset($conn) && $conn instanceof mysqli) { $conn->close(); }
}

?>
