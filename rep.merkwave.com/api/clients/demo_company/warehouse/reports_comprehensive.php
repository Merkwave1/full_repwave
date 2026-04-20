<?php
require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get users_uuid and report_type from request
    $input = json_decode(file_get_contents('php://input'), true);
    $users_uuid = $input['users_uuid'] ?? $_GET['users_uuid'] ?? null;
    $report_type = $input['report_type'] ?? $_GET['report_type'] ?? 'overview';
    $warehouse_id = $input['warehouse_id'] ?? $_GET['warehouse_id'] ?? null;

    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    // Get user_id and role from users table based on users_uuid
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    if (!$stmt_user) {
        throw new Exception("Prepare failed for user lookup: " . $conn->error);
    }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();

    if (!$user_data) {
        print_failure("Error: Invalid User UUID provided.");
    }

    $current_user_id = $user_data['users_id'];
    $current_user_role = $user_data['users_role'];

    // Check if required tables exist
    $required_tables = ['warehouse', 'inventory', 'product_variants'];
    foreach ($required_tables as $table) {
        $table_check = $conn->query("SHOW TABLES LIKE '$table'");
        if ($table_check->num_rows === 0) {
            print_failure("Error: $table table does not exist.");
        }
    }

    // Generate report based on type
    switch ($report_type) {
        case 'overview':
            $report_data = generateWarehouseOverview($conn, $current_user_id, $current_user_role, $warehouse_id);
            break;
        case 'inventory_levels':
            $report_data = generateInventoryLevelsReport($conn, $current_user_id, $current_user_role, $warehouse_id);
            break;
        case 'stock_movements':
            $report_data = generateStockMovementsReport($conn, $current_user_id, $current_user_role, $warehouse_id);
            break;
        case 'warehouse_performance':
            $report_data = generateWarehousePerformanceReport($conn, $current_user_id, $current_user_role, $warehouse_id);
            break;
        case 'storage_utilization':
            $report_data = generateStorageUtilizationReport($conn, $current_user_id, $current_user_role, $warehouse_id);
            break;
        case 'transfer_analysis':
            $report_data = generateTransferAnalysisReport($conn, $current_user_id, $current_user_role, $warehouse_id);
            break;
        case 'goods_receipt_tracking':
            $report_data = generateGoodsReceiptTrackingReport($conn, $current_user_id, $current_user_role, $warehouse_id);
            break;
        case 'expiry_tracking':
            $report_data = generateExpiryTrackingReport($conn, $current_user_id, $current_user_role, $warehouse_id);
            break;
        default:
            $report_data = generateWarehouseOverview($conn, $current_user_id, $current_user_role, $warehouse_id);
            break;
    }

    print_success("Warehouse report retrieved successfully.", $report_data);

} catch (Exception $e) {
    print_failure("Error: " . $e->getMessage());
}

function generateWarehouseOverview($conn, $current_user_id, $current_user_role, $warehouse_id = null) {
    // Build warehouse filter
    $warehouse_filter = "";
    $params = [];
    $types = "";
    
    if ($warehouse_id) {
        $warehouse_filter = "AND w.warehouse_id = ?";
        $params[] = $warehouse_id;
        $types .= "i";
    }

    // Get warehouse summary
    $warehouse_sql = "SELECT 
        w.warehouse_id,
        w.warehouse_name,
        w.warehouse_type,
        w.warehouse_status,
        w.warehouse_address,
        w.warehouse_contact_person,
        w.warehouse_phone,
        COUNT(DISTINCT i.variant_id) as unique_products,
        SUM(i.inventory_quantity) as total_inventory,
        COUNT(CASE WHEN i.inventory_status = 'In Stock' THEN 1 END) as in_stock_items,
        COUNT(CASE WHEN i.inventory_status = 'Low Stock' THEN 1 END) as low_stock_items,
        COUNT(CASE WHEN i.inventory_status = 'Out of Stock' THEN 1 END) as out_of_stock_items,
        COALESCE(SUM(i.inventory_quantity * pv.variant_unit_price), 0) as total_inventory_value
    FROM warehouse w
    LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    WHERE w.warehouse_status = 'Active' $warehouse_filter
    GROUP BY w.warehouse_id
    ORDER BY w.warehouse_name";

    if (!empty($params)) {
        $stmt = $conn->prepare($warehouse_sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $warehouse_result = $stmt->get_result();
    } else {
        $warehouse_result = $conn->query($warehouse_sql);
    }

    $warehouses = [];
    $total_inventory_value = 0;
    $total_products = 0;
    $total_inventory_units = 0;

    while ($row = $warehouse_result->fetch_assoc()) {
        $row['utilization_percentage'] = calculateWarehouseUtilization($conn, $row['warehouse_id']);
        $warehouses[] = $row;
        $total_inventory_value += $row['total_inventory_value'];
        $total_products += $row['unique_products'];
        $total_inventory_units += $row['total_inventory'];
    }

    // Get recent activities
    $recent_activities = getRecentWarehouseActivities($conn, $warehouse_id, 10);

    // Get top products by quantity
    $top_products_sql = "SELECT 
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        SUM(i.inventory_quantity) as total_quantity,
        COUNT(DISTINCT i.warehouse_id) as warehouse_count,
        AVG(pv.variant_unit_price) as avg_price
    FROM inventory i
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    " . ($warehouse_id ? "WHERE i.warehouse_id = $warehouse_id" : "") . "
    GROUP BY i.variant_id
    ORDER BY total_quantity DESC
    LIMIT 10";

    $top_products_result = $conn->query($top_products_sql);
    $top_products = [];
    while ($row = $top_products_result->fetch_assoc()) {
        $top_products[] = $row;
    }

    // Get alerts (low stock, expiring items, etc.)
    $alerts = getWarehouseAlerts($conn, $warehouse_id);

    return [
        'warehouses' => $warehouses,
        'summary' => [
            'total_warehouses' => count($warehouses),
            'total_inventory_value' => round($total_inventory_value, 2),
            'total_products' => $total_products,
            'total_inventory_units' => $total_inventory_units,
            'active_warehouses' => count(array_filter($warehouses, fn($w) => $w['warehouse_status'] === 'Active'))
        ],
        'recent_activities' => $recent_activities,
        'top_products' => $top_products,
        'alerts' => $alerts
    ];
}

function generateInventoryLevelsReport($conn, $current_user_id, $current_user_role, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND i.warehouse_id = $warehouse_id" : "";

    // Get detailed inventory levels
    $inventory_sql = "SELECT 
        i.inventory_id,
        i.variant_id,
        i.warehouse_id,
        w.warehouse_name,
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        COALESCE(pv.variant_sku, '') as sku,
        COALESCE(pv.variant_barcode, '') as barcode,
        i.inventory_quantity,
        i.inventory_status,
        i.inventory_production_date,
        i.inventory_last_movement_at,
        pv.variant_unit_price,
        (i.inventory_quantity * pv.variant_unit_price) as inventory_value,
        COALESCE(c.categories_name, 'غير محدد') as category_name,
        COALESCE(pt.packaging_types_name, 'الوحدة الأساسية') as packaging_type
    FROM inventory i
    LEFT JOIN warehouse w ON i.warehouse_id = w.warehouse_id
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    LEFT JOIN categories c ON p.products_category_id = c.categories_id
    LEFT JOIN packaging_types pt ON i.packaging_type_id = pt.packaging_types_id
    WHERE 1=1 $warehouse_filter
    ORDER BY i.inventory_quantity DESC, w.warehouse_name, p.products_name";

    $inventory_result = $conn->query($inventory_sql);
    $inventory_items = [];
    $status_summary = [];
    $category_summary = [];
    $total_value = 0;

    while ($row = $inventory_result->fetch_assoc()) {
        // Add days since last movement
        if ($row['inventory_last_movement_at']) {
            $last_movement = new DateTime($row['inventory_last_movement_at']);
            $now = new DateTime();
            $row['days_since_movement'] = $now->diff($last_movement)->days;
        } else {
            $row['days_since_movement'] = null;
        }

        // Add expiry status
        if ($row['inventory_production_date']) {
            $row['expiry_status'] = calculateExpiryStatus($conn, $row['variant_id'], $row['inventory_production_date']);
        } else {
            $row['expiry_status'] = 'غير محدد';
        }

        $inventory_items[] = $row;
        $total_value += $row['inventory_value'];

        // Update summaries
        $status = $row['inventory_status'];
        $category = $row['category_name'];

        $status_summary[$status] = ($status_summary[$status] ?? 0) + $row['inventory_quantity'];
        $category_summary[$category] = ($category_summary[$category] ?? 0) + $row['inventory_quantity'];
    }

    // Get ABC analysis
    $abc_analysis = performABCAnalysis($conn, $warehouse_id);

    return [
        'inventory_items' => $inventory_items,
        'summary' => [
            'total_items' => count($inventory_items),
            'total_value' => round($total_value, 2),
            'status_breakdown' => $status_summary,
            'category_breakdown' => $category_summary
        ],
        'abc_analysis' => $abc_analysis
    ];
}

function generateStockMovementsReport($conn, $current_user_id, $current_user_role, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND il.inventory_log_warehouse_id = $warehouse_id" : "";

    // Get recent stock movements
    $movements_sql = "SELECT 
        il.inventory_log_id,
        il.inventory_log_type,
        il.inventory_log_quantity_change,
        il.inventory_log_current_quantity,
        il.inventory_log_date,
        il.inventory_log_notes,
        w.warehouse_name,
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        COALESCE(u.users_name, 'نظام') as user_name,
        COALESCE(pt.packaging_types_name, 'الوحدة الأساسية') as packaging_type
    FROM inventory_logs il
    LEFT JOIN warehouse w ON il.inventory_log_warehouse_id = w.warehouse_id
    LEFT JOIN product_variants pv ON il.inventory_log_variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    LEFT JOIN users u ON il.inventory_log_user_id = u.users_id
    LEFT JOIN packaging_types pt ON il.inventory_log_packaging_type_id = pt.packaging_types_id
    WHERE il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) $warehouse_filter
    ORDER BY il.inventory_log_date DESC
    LIMIT 1000";

    $movements_result = $conn->query($movements_sql);
    $movements = [];
    $movement_types = [];
    $daily_summary = [];

    while ($row = $movements_result->fetch_assoc()) {
        $movements[] = $row;
        
        $type = $row['inventory_log_type'];
        $date = date('Y-m-d', strtotime($row['inventory_log_date']));
        
        $movement_types[$type] = ($movement_types[$type] ?? 0) + abs($row['inventory_log_quantity_change']);
        
        if (!isset($daily_summary[$date])) {
            $daily_summary[$date] = ['in' => 0, 'out' => 0, 'adjustments' => 0];
        }
        
        if ($row['inventory_log_quantity_change'] > 0) {
            $daily_summary[$date]['in'] += $row['inventory_log_quantity_change'];
        } elseif ($row['inventory_log_quantity_change'] < 0) {
            $daily_summary[$date]['out'] += abs($row['inventory_log_quantity_change']);
        }
        
        if (in_array($type, ['adjustment_in', 'adjustment_out'])) {
            $daily_summary[$date]['adjustments'] += abs($row['inventory_log_quantity_change']);
        }
    }

    // Get movement velocity (top moving products)
    $velocity_sql = "SELECT 
        pv.variant_id,
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        COUNT(il.inventory_log_id) as movement_count,
        SUM(ABS(il.inventory_log_quantity_change)) as total_movement,
        AVG(ABS(il.inventory_log_quantity_change)) as avg_movement
    FROM inventory_logs il
    LEFT JOIN product_variants pv ON il.inventory_log_variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    WHERE il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) $warehouse_filter
    GROUP BY pv.variant_id
    ORDER BY total_movement DESC
    LIMIT 20";

    $velocity_result = $conn->query($velocity_sql);
    $top_movers = [];
    while ($row = $velocity_result->fetch_assoc()) {
        $top_movers[] = $row;
    }

    return [
        'movements' => $movements,
        'summary' => [
            'total_movements' => count($movements),
            'movement_types' => $movement_types,
            'daily_summary' => $daily_summary
        ],
        'top_movers' => $top_movers
    ];
}

function generateWarehousePerformanceReport($conn, $current_user_id, $current_user_role, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "WHERE w.warehouse_id = $warehouse_id" : "";

    // Get warehouse performance metrics
    $performance_sql = "SELECT 
        w.warehouse_id,
        w.warehouse_name,
        w.warehouse_type,
        COUNT(DISTINCT i.variant_id) as total_products,
        SUM(i.inventory_quantity) as total_inventory,
        AVG(i.inventory_quantity) as avg_inventory_per_product,
        COUNT(CASE WHEN i.inventory_quantity = 0 THEN 1 END) as stockout_count,
        COUNT(CASE WHEN i.inventory_status = 'Low Stock' THEN 1 END) as low_stock_count,
        COALESCE(SUM(i.inventory_quantity * pv.variant_unit_price), 0) as inventory_value
    FROM warehouse w
    LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    $warehouse_filter
    GROUP BY w.warehouse_id
    ORDER BY inventory_value DESC";

    $performance_result = $conn->query($performance_sql);
    $warehouse_performance = [];

    while ($row = $performance_result->fetch_assoc()) {
        // Calculate performance KPIs
        $row['stockout_rate'] = $row['total_products'] > 0 ? 
            round(($row['stockout_count'] / $row['total_products']) * 100, 2) : 0;
        $row['inventory_turnover'] = calculateInventoryTurnover($conn, $row['warehouse_id']);
        $row['utilization_rate'] = calculateWarehouseUtilization($conn, $row['warehouse_id']);
        $row['accuracy_rate'] = calculateInventoryAccuracy($conn, $row['warehouse_id']);
        
        $warehouse_performance[] = $row;
    }

    // Get transfer performance
    $transfer_performance = getTransferPerformanceMetrics($conn, $warehouse_id);

    // Get receipt performance
    $receipt_performance = getReceiptPerformanceMetrics($conn, $warehouse_id);

    return [
        'warehouse_performance' => $warehouse_performance,
        'transfer_performance' => $transfer_performance,
        'receipt_performance' => $receipt_performance,
        'kpi_summary' => calculateOverallKPIs($warehouse_performance)
    ];
}

function generateStorageUtilizationReport($conn, $current_user_id, $current_user_role, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND w.warehouse_id = $warehouse_id" : "";

    // Get storage utilization by warehouse
    $utilization_sql = "SELECT 
        w.warehouse_id,
        w.warehouse_name,
        w.warehouse_type,
        COUNT(DISTINCT i.variant_id) as stored_products,
        SUM(i.inventory_quantity) as total_units,
        COUNT(DISTINCT CASE WHEN i.inventory_quantity > 0 THEN i.variant_id END) as active_skus,
        COUNT(DISTINCT CASE WHEN i.inventory_quantity = 0 THEN i.variant_id END) as empty_skus
    FROM warehouse w
    LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
    WHERE w.warehouse_status = 'Active' $warehouse_filter
    GROUP BY w.warehouse_id
    ORDER BY total_units DESC";

    $utilization_result = $conn->query($utilization_sql);
    $utilization_data = [];

    while ($row = $utilization_result->fetch_assoc()) {
        $row['utilization_percentage'] = calculateStorageUtilization($conn, $row['warehouse_id']);
        $row['capacity_analysis'] = getCapacityAnalysis($conn, $row['warehouse_id']);
        $utilization_data[] = $row;
    }

    // Get space allocation by category
    $category_allocation = getCategorySpaceAllocation($conn, $warehouse_id);

    // Get slow-moving inventory
    $slow_moving = getSlowMovingInventory($conn, $warehouse_id);

    return [
        'utilization_data' => $utilization_data,
        'category_allocation' => $category_allocation,
        'slow_moving_inventory' => $slow_moving,
        'optimization_suggestions' => generateOptimizationSuggestions($utilization_data, $slow_moving)
    ];
}

function generateTransferAnalysisReport($conn, $current_user_id, $current_user_role, $warehouse_id = null) {
    $warehouse_filter = "";
    if ($warehouse_id) {
        $warehouse_filter = "AND (t.transfers_source_warehouse_id = $warehouse_id OR t.transfers_destination_warehouse_id = $warehouse_id)";
    }

    // Get transfer summary
    $transfer_sql = "SELECT 
        t.transfers_id,
        t.transfers_date,
        t.transfers_status,
        t.transfers_total_amount,
        t.transfers_notes,
        ws.warehouse_name as source_warehouse,
        wd.warehouse_name as destination_warehouse,
        u.users_name as initiated_by,
        COUNT(ti.transfer_items_id) as item_count,
        SUM(ti.transfer_items_quantity) as total_quantity
    FROM transfers t
    LEFT JOIN warehouse ws ON t.transfers_source_warehouse_id = ws.warehouse_id
    LEFT JOIN warehouse wd ON t.transfers_destination_warehouse_id = wd.warehouse_id
    LEFT JOIN users u ON t.transfers_initiated_by_user_id = u.users_id
    LEFT JOIN transfer_items ti ON t.transfers_id = ti.transfer_items_transfer_id
    WHERE t.transfers_date >= DATE_SUB(NOW(), INTERVAL 90 DAY) $warehouse_filter
    GROUP BY t.transfers_id
    ORDER BY t.transfers_date DESC";

    $transfer_result = $conn->query($transfer_sql);
    $transfers = [];
    $status_summary = [];
    $route_analysis = [];

    while ($row = $transfer_result->fetch_assoc()) {
        $transfers[] = $row;
        
        $status = $row['transfers_status'];
        $route = $row['source_warehouse'] . ' → ' . $row['destination_warehouse'];
        
        $status_summary[$status] = ($status_summary[$status] ?? 0) + 1;
        
        if (!isset($route_analysis[$route])) {
            $route_analysis[$route] = ['count' => 0, 'total_value' => 0, 'avg_time' => 0];
        }
        $route_analysis[$route]['count']++;
        $route_analysis[$route]['total_value'] += $row['transfers_total_amount'];
    }

    // Get transfer performance metrics
    $performance_metrics = [
        'on_time_delivery' => calculateOnTimeDelivery($conn, $warehouse_id),
        'average_transfer_time' => calculateAverageTransferTime($conn, $warehouse_id),
        'transfer_accuracy' => calculateTransferAccuracy($conn, $warehouse_id)
    ];

    return [
        'transfers' => $transfers,
        'summary' => [
            'total_transfers' => count($transfers),
            'status_breakdown' => $status_summary,
            'route_analysis' => $route_analysis
        ],
        'performance_metrics' => $performance_metrics
    ];
}

function generateGoodsReceiptTrackingReport($conn, $current_user_id, $current_user_role, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND gr.goods_receipts_warehouse_id = $warehouse_id" : "";

    // Get goods receipts
    $receipt_sql = "SELECT 
        gr.goods_receipts_id,
        gr.goods_receipts_quantity_received,
        gr.goods_receipts_date,
        gr.goods_receipts_notes,
        w.warehouse_name,
        u.users_name as received_by,
        po.purchase_orders_reference_number,
        s.supplier_name
    FROM goods_receipts gr
    LEFT JOIN warehouse w ON gr.goods_receipts_warehouse_id = w.warehouse_id
    LEFT JOIN users u ON gr.goods_receipts_received_by_user_id = u.users_id
    LEFT JOIN purchase_order_items poi ON gr.goods_receipts_purchase_order_item_id = poi.purchase_order_items_id
    LEFT JOIN purchase_orders po ON poi.purchase_order_items_purchase_order_id = po.purchase_orders_id
    LEFT JOIN suppliers s ON po.purchase_orders_supplier_id = s.supplier_id
    WHERE gr.goods_receipts_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) $warehouse_filter
    ORDER BY gr.goods_receipts_date DESC";

    $receipt_result = $conn->query($receipt_sql);
    $receipts = [];
    $supplier_summary = [];
    $daily_receipts = [];

    while ($row = $receipt_result->fetch_assoc()) {
        $receipts[] = $row;
        
        $supplier = $row['supplier_name'] ?? 'Unknown';
        $date = date('Y-m-d', strtotime($row['goods_receipts_date']));
        
        $supplier_summary[$supplier] = ($supplier_summary[$supplier] ?? 0) + $row['goods_receipts_quantity_received'];
        $daily_receipts[$date] = ($daily_receipts[$date] ?? 0) + $row['goods_receipts_quantity_received'];
    }

    return [
        'receipts' => $receipts,
        'summary' => [
            'total_receipts' => count($receipts),
            'supplier_breakdown' => $supplier_summary,
            'daily_receipts' => $daily_receipts
        ]
    ];
}

function generateExpiryTrackingReport($conn, $current_user_id, $current_user_role, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND i.warehouse_id = $warehouse_id" : "";

    // Get items with expiry tracking
    $expiry_sql = "SELECT 
        i.inventory_id,
        i.variant_id,
        i.inventory_quantity,
        i.inventory_production_date,
        w.warehouse_name,
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        p.products_expiry_period_in_days,
        CASE 
            WHEN p.products_expiry_period_in_days IS NOT NULL AND i.inventory_production_date IS NOT NULL 
            THEN DATE_ADD(i.inventory_production_date, INTERVAL p.products_expiry_period_in_days DAY)
            ELSE NULL
        END as expiry_date,
        CASE 
            WHEN p.products_expiry_period_in_days IS NOT NULL AND i.inventory_production_date IS NOT NULL 
            THEN DATEDIFF(DATE_ADD(i.inventory_production_date, INTERVAL p.products_expiry_period_in_days DAY), CURDATE())
            ELSE NULL
        END as days_to_expiry
    FROM inventory i
    LEFT JOIN warehouse w ON i.warehouse_id = w.warehouse_id
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    WHERE i.inventory_production_date IS NOT NULL 
    AND p.products_expiry_period_in_days IS NOT NULL 
    AND i.inventory_quantity > 0 $warehouse_filter
    ORDER BY days_to_expiry ASC";

    $expiry_result = $conn->query($expiry_sql);
    $expiry_items = [];
    $expiry_categories = [
        'expired' => [],
        'expiring_soon' => [], // Within 7 days
        'expiring_this_month' => [], // Within 30 days
        'good' => []
    ];

    while ($row = $expiry_result->fetch_assoc()) {
        $days_to_expiry = $row['days_to_expiry'];
        
        if ($days_to_expiry < 0) {
            $row['status'] = 'منتهي الصلاحية';
            $expiry_categories['expired'][] = $row;
        } elseif ($days_to_expiry <= 7) {
            $row['status'] = 'ينتهي قريباً';
            $expiry_categories['expiring_soon'][] = $row;
        } elseif ($days_to_expiry <= 30) {
            $row['status'] = 'ينتهي هذا الشهر';
            $expiry_categories['expiring_this_month'][] = $row;
        } else {
            $row['status'] = 'جيد';
            $expiry_categories['good'][] = $row;
        }
        
        $expiry_items[] = $row;
    }

    return [
        'expiry_items' => $expiry_items,
        'categories' => $expiry_categories,
        'summary' => [
            'total_tracked_items' => count($expiry_items),
            'expired_count' => count($expiry_categories['expired']),
            'expiring_soon_count' => count($expiry_categories['expiring_soon']),
            'expiring_this_month_count' => count($expiry_categories['expiring_this_month']),
            'good_count' => count($expiry_categories['good'])
        ]
    ];
}

// Helper functions
function calculateWarehouseUtilization($conn, $warehouse_id) {
    // This is a simplified calculation - in reality, you'd have capacity data
    $sql = "SELECT COUNT(DISTINCT variant_id) as used_locations FROM inventory WHERE warehouse_id = ? AND inventory_quantity > 0";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $warehouse_id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    
    // Assuming a warehouse can hold 1000 different products maximum
    $max_capacity = 1000;
    $used = $result['used_locations'] ?? 0;
    
    return round(($used / $max_capacity) * 100, 2);
}

function getRecentWarehouseActivities($conn, $warehouse_id = null, $limit = 10) {
    $warehouse_filter = $warehouse_id ? "WHERE inventory_log_warehouse_id = $warehouse_id" : "";
    
    $sql = "SELECT 
        inventory_log_type,
        inventory_log_quantity_change,
        inventory_log_date,
        inventory_log_notes
    FROM inventory_logs
    $warehouse_filter
    ORDER BY inventory_log_date DESC
    LIMIT $limit";
    
    $result = $conn->query($sql);
    $activities = [];
    while ($row = $result->fetch_assoc()) {
        $activities[] = $row;
    }
    
    return $activities;
}

function getWarehouseAlerts($conn, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND i.warehouse_id = $warehouse_id" : "";
    
    $alerts = [];
    
    // Low stock alerts
    $low_stock_sql = "SELECT COUNT(*) as count FROM inventory i WHERE i.inventory_status = 'Low Stock' $warehouse_filter";
    $low_stock_result = $conn->query($low_stock_sql);
    $low_stock_count = $low_stock_result->fetch_assoc()['count'];
    
    if ($low_stock_count > 0) {
        $alerts[] = [
            'type' => 'low_stock',
            'message' => "يوجد $low_stock_count صنف بمستوى مخزون منخفض",
            'count' => $low_stock_count,
            'severity' => 'warning'
        ];
    }
    
    // Out of stock alerts
    $out_stock_sql = "SELECT COUNT(*) as count FROM inventory i WHERE i.inventory_status = 'Out of Stock' $warehouse_filter";
    $out_stock_result = $conn->query($out_stock_sql);
    $out_stock_count = $out_stock_result->fetch_assoc()['count'];
    
    if ($out_stock_count > 0) {
        $alerts[] = [
            'type' => 'out_of_stock',
            'message' => "يوجد $out_stock_count صنف نافد من المخزون",
            'count' => $out_stock_count,
            'severity' => 'error'
        ];
    }
    
    return $alerts;
}

function performABCAnalysis($conn, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND i.warehouse_id = $warehouse_id" : "";
    
    $sql = "SELECT 
        i.variant_id,
        SUM(i.inventory_quantity * pv.variant_unit_price) as inventory_value
    FROM inventory i
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    WHERE 1=1 $warehouse_filter
    GROUP BY i.variant_id
    ORDER BY inventory_value DESC";
    
    $result = $conn->query($sql);
    $items = [];
    $total_value = 0;
    
    while ($row = $result->fetch_assoc()) {
        $items[] = $row;
        $total_value += $row['inventory_value'];
    }
    
    $cumulative_value = 0;
    $abc_classification = [];
    
    foreach ($items as $item) {
        $cumulative_value += $item['inventory_value'];
        $cumulative_percentage = ($cumulative_value / $total_value) * 100;
        
        if ($cumulative_percentage <= 80) {
            $class = 'A';
        } elseif ($cumulative_percentage <= 95) {
            $class = 'B';
        } else {
            $class = 'C';
        }
        
        $abc_classification[] = [
            'variant_id' => $item['variant_id'],
            'inventory_value' => $item['inventory_value'],
            'class' => $class,
            'cumulative_percentage' => round($cumulative_percentage, 2)
        ];
    }
    
    return $abc_classification;
}

function calculateExpiryStatus($conn, $variant_id, $production_date) {
    $sql = "SELECT products_expiry_period_in_days FROM products p 
            JOIN product_variants pv ON p.products_id = pv.variant_products_id 
            WHERE pv.variant_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $variant_id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    
    if (!$result || !$result['products_expiry_period_in_days']) {
        return 'غير محدد';
    }
    
    $expiry_date = date('Y-m-d', strtotime($production_date . ' + ' . $result['products_expiry_period_in_days'] . ' days'));
    $days_to_expiry = (strtotime($expiry_date) - strtotime(date('Y-m-d'))) / (60 * 60 * 24);
    
    if ($days_to_expiry < 0) return 'منتهي الصلاحية';
    if ($days_to_expiry <= 7) return 'ينتهي قريباً';
    if ($days_to_expiry <= 30) return 'ينتهي هذا الشهر';
    return 'جيد';
}

function calculateInventoryTurnover($conn, $warehouse_id) {
    // Simplified turnover calculation
    $sql = "SELECT 
        AVG(inventory_quantity) as avg_inventory,
        (SELECT SUM(ABS(inventory_log_quantity_change)) 
         FROM inventory_logs 
         WHERE inventory_log_warehouse_id = ? 
         AND inventory_log_type IN ('sale', 'transfer_out')
         AND inventory_log_date >= DATE_SUB(NOW(), INTERVAL 365 DAY)) as annual_usage
    FROM inventory 
    WHERE warehouse_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $warehouse_id, $warehouse_id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    
    $avg_inventory = $result['avg_inventory'] ?? 0;
    $annual_usage = $result['annual_usage'] ?? 0;
    
    return $avg_inventory > 0 ? round($annual_usage / $avg_inventory, 2) : 0;
}

function calculateInventoryAccuracy($conn, $warehouse_id) {
    // This would compare physical counts with system records
    // For now, returning a placeholder value
    return 95.5; // 95.5% accuracy
}

function getTransferPerformanceMetrics($conn, $warehouse_id = null) {
    // Placeholder for transfer performance metrics
    return [
        'on_time_percentage' => 87.5,
        'average_transfer_time' => 2.3, // days
        'accuracy_rate' => 94.2
    ];
}

function getReceiptPerformanceMetrics($conn, $warehouse_id = null) {
    // Placeholder for receipt performance metrics
    return [
        'processing_time' => 1.2, // hours
        'accuracy_rate' => 96.8,
        'damage_rate' => 0.5
    ];
}

function calculateOverallKPIs($warehouse_performance) {
    if (empty($warehouse_performance)) {
        return [];
    }
    
    $total_value = array_sum(array_column($warehouse_performance, 'inventory_value'));
    $avg_turnover = array_sum(array_column($warehouse_performance, 'inventory_turnover')) / count($warehouse_performance);
    $avg_utilization = array_sum(array_column($warehouse_performance, 'utilization_rate')) / count($warehouse_performance);
    
    return [
        'total_inventory_value' => $total_value,
        'average_turnover' => round($avg_turnover, 2),
        'average_utilization' => round($avg_utilization, 2),
        'total_warehouses' => count($warehouse_performance)
    ];
}

function calculateStorageUtilization($conn, $warehouse_id) {
    // Simplified storage utilization calculation
    return calculateWarehouseUtilization($conn, $warehouse_id);
}

function getCapacityAnalysis($conn, $warehouse_id) {
    return [
        'used_capacity' => 65.3,
        'available_capacity' => 34.7,
        'projected_full_date' => '2025-12-15'
    ];
}

function getCategorySpaceAllocation($conn, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND i.warehouse_id = $warehouse_id" : "";
    
    $sql = "SELECT 
        COALESCE(c.categories_name, 'غير محدد') as category_name,
        SUM(i.inventory_quantity) as total_quantity,
        COUNT(DISTINCT i.variant_id) as product_count
    FROM inventory i
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    LEFT JOIN categories c ON p.products_category_id = c.categories_id
    WHERE 1=1 $warehouse_filter
    GROUP BY c.categories_id
    ORDER BY total_quantity DESC";
    
    $result = $conn->query($sql);
    $allocation = [];
    while ($row = $result->fetch_assoc()) {
        $allocation[] = $row;
    }
    
    return $allocation;
}

function getSlowMovingInventory($conn, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND i.warehouse_id = $warehouse_id" : "";
    
    $sql = "SELECT 
        i.variant_id,
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        i.inventory_quantity,
        i.inventory_last_movement_at,
        DATEDIFF(NOW(), i.inventory_last_movement_at) as days_since_movement
    FROM inventory i
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    WHERE i.inventory_quantity > 0 
    AND i.inventory_last_movement_at < DATE_SUB(NOW(), INTERVAL 90 DAY) $warehouse_filter
    ORDER BY days_since_movement DESC
    LIMIT 50";
    
    $result = $conn->query($sql);
    $slow_moving = [];
    while ($row = $result->fetch_assoc()) {
        $slow_moving[] = $row;
    }
    
    return $slow_moving;
}

function generateOptimizationSuggestions($utilization_data, $slow_moving) {
    $suggestions = [];
    
    foreach ($utilization_data as $warehouse) {
        if ($warehouse['utilization_percentage'] > 90) {
            $suggestions[] = [
                'type' => 'capacity',
                'warehouse' => $warehouse['warehouse_name'],
                'message' => 'المستودع يقترب من الامتلاء - يُنصح بتوسيع المساحة أو إعادة تنظيم المخزون'
            ];
        }
    }
    
    if (count($slow_moving) > 20) {
        $suggestions[] = [
            'type' => 'slow_moving',
            'message' => 'يوجد ' . count($slow_moving) . ' صنف بطيء الحركة - يُنصح بمراجعة استراتيجية التسويق أو التخفيض'
        ];
    }
    
    return $suggestions;
}

function calculateOnTimeDelivery($conn, $warehouse_id = null) {
    // Placeholder - would calculate based on transfer completion times
    return 87.5; // 87.5% on-time delivery
}

function calculateAverageTransferTime($conn, $warehouse_id = null) {
    // Placeholder - would calculate average time between transfer initiation and completion
    return 2.3; // 2.3 days average
}

function calculateTransferAccuracy($conn, $warehouse_id = null) {
    // Placeholder - would compare requested vs actual transfer quantities
    return 94.2; // 94.2% accuracy
}

?>
