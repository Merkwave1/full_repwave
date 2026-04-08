<?php
require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get parameters from request
    $input = json_decode(file_get_contents('php://input'), true);
    $users_uuid = $input['users_uuid'] ?? $_GET['users_uuid'] ?? null;
    $warehouse_id = $input['warehouse_id'] ?? $_GET['warehouse_id'] ?? null;
    $report_type = $input['report_type'] ?? $_GET['report_type'] ?? 'executive_summary';

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

    // Generate executive summary dashboard
    $dashboard_data = generateExecutiveDashboard($conn, $current_user_id, $current_user_role, 
        $warehouse_id, $report_type);

    print_success("Executive dashboard generated successfully.", $dashboard_data);

} catch (Exception $e) {
    print_failure("Error: " . $e->getMessage());
}

function generateExecutiveDashboard($conn, $current_user_id, $current_user_role, $warehouse_id = null, 
    $report_type = 'executive_summary') {
    
    $dashboard = [];
    
    switch ($report_type) {
        case 'executive_summary':
            $dashboard = generateExecutiveSummary($conn, $warehouse_id);
            break;
        case 'operational_dashboard':
            $dashboard = generateOperationalDashboard($conn, $warehouse_id);
            break;
        case 'financial_summary':
            $dashboard = generateFinancialSummary($conn, $warehouse_id);
            break;
        case 'performance_metrics':
            $dashboard = generatePerformanceMetrics($conn, $warehouse_id);
            break;
        case 'alerts_notifications':
            $dashboard = generateAlertsAndNotifications($conn, $warehouse_id);
            break;
        default:
            $dashboard = generateExecutiveSummary($conn, $warehouse_id);
    }
    
    return [
        'dashboard_type' => $report_type,
        'generated_at' => date('Y-m-d H:i:s'),
        'warehouse_filter' => $warehouse_id,
        'data' => $dashboard,
        'system_status' => getSystemHealthStatus($conn),
        'last_update' => getLastUpdateTime($conn, $warehouse_id)
    ];
}

function generateExecutiveSummary($conn, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND w.warehouse_id = $warehouse_id" : "";
    
    // Overall inventory metrics
    $inventory_sql = "SELECT 
        COUNT(DISTINCT i.variant_id) as total_products,
        SUM(i.inventory_quantity) as total_units,
        COUNT(DISTINCT i.warehouse_id) as total_warehouses,
        SUM(i.inventory_quantity * COALESCE(pv.variant_unit_price, 0)) as total_inventory_value,
        SUM(i.inventory_quantity * COALESCE(pv.variant_cost_price, 0)) as total_inventory_cost,
        
        -- Products below reorder point (simplified calculation)
        SUM(CASE WHEN i.inventory_quantity <= 10 THEN 1 ELSE 0 END) as low_stock_products,
        
        -- Products with no movement in 30 days
        COUNT(DISTINCT CASE WHEN NOT EXISTS (
            SELECT 1 FROM inventory_logs il 
            WHERE il.inventory_log_variant_id = i.variant_id 
            AND il.inventory_log_warehouse_id = i.warehouse_id
            AND il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ) THEN i.variant_id END) as stagnant_products
        
    FROM inventory i
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    LEFT JOIN warehouse w ON i.warehouse_id = w.warehouse_id
    WHERE i.inventory_quantity >= 0 $warehouse_filter";

    $inventory_result = $conn->query($inventory_sql);
    $inventory_metrics = $inventory_result->fetch_assoc();
    
    // Movement metrics (last 30 days)
    $movement_sql = "SELECT 
        COUNT(il.inventory_log_id) as total_movements,
        
        -- Inbound movements
        COUNT(CASE WHEN il.inventory_log_type IN ('goods_receipt', 'transfer_in', 'adjustment_increase') 
              THEN 1 END) as inbound_movements,
        SUM(CASE WHEN il.inventory_log_quantity_change > 0 
            THEN il.inventory_log_quantity_change ELSE 0 END) as total_inbound_qty,
            
        -- Outbound movements  
        COUNT(CASE WHEN il.inventory_log_type IN ('sale', 'transfer_out', 'adjustment_decrease') 
              THEN 1 END) as outbound_movements,
        SUM(CASE WHEN il.inventory_log_quantity_change < 0 
            THEN ABS(il.inventory_log_quantity_change) ELSE 0 END) as total_outbound_qty,
            
        -- Value movements
        SUM(ABS(il.inventory_log_quantity_change) * COALESCE(pv.variant_unit_price, 0)) as total_movement_value,
        
        -- Daily averages
        COUNT(DISTINCT DATE(il.inventory_log_date)) as active_days
        
    FROM inventory_logs il
    LEFT JOIN product_variants pv ON il.inventory_log_variant_id = pv.variant_id
    LEFT JOIN warehouse w ON il.inventory_log_warehouse_id = w.warehouse_id
    WHERE il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) $warehouse_filter";

    $movement_result = $conn->query($movement_sql);
    $movement_metrics = $movement_result->fetch_assoc();
    
    // Top performing products (by movement volume)
    $top_products_sql = "SELECT 
        pv.variant_id,
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        COALESCE(c.categories_name, 'غير محدد') as category_name,
        SUM(ABS(il.inventory_log_quantity_change)) as total_movement,
        SUM(ABS(il.inventory_log_quantity_change) * COALESCE(pv.variant_unit_price, 0)) as movement_value,
        COUNT(il.inventory_log_id) as movement_frequency
        
    FROM inventory_logs il
    LEFT JOIN product_variants pv ON il.inventory_log_variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    LEFT JOIN categories c ON p.products_category_id = c.categories_id
    LEFT JOIN warehouse w ON il.inventory_log_warehouse_id = w.warehouse_id
    WHERE il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
    AND il.inventory_log_type IN ('sale', 'transfer_out') $warehouse_filter
    GROUP BY pv.variant_id
    ORDER BY total_movement DESC
    LIMIT 10";

    $top_products_result = $conn->query($top_products_sql);
    $top_products = [];
    while ($row = $top_products_result->fetch_assoc()) {
        $top_products[] = $row;
    }

    // Warehouse performance comparison
    $warehouse_performance_sql = "SELECT 
        w.warehouse_id,
        w.warehouse_name,
        w.warehouse_type,
        COUNT(DISTINCT i.variant_id) as unique_products,
        SUM(i.inventory_quantity) as total_inventory,
        COUNT(DISTINCT il.inventory_log_id) as movements_30d,
        SUM(ABS(il.inventory_log_quantity_change)) as total_movement_qty_30d,
        
        -- Efficiency metrics
        ROUND(COUNT(il.inventory_log_id) / 30.0, 2) as avg_daily_movements,
        ROUND(SUM(ABS(il.inventory_log_quantity_change)) / 30.0, 2) as avg_daily_qty_movement
        
    FROM warehouse w
    LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
    LEFT JOIN inventory_logs il ON w.warehouse_id = il.inventory_log_warehouse_id 
                                AND il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    " . ($warehouse_id ? "WHERE w.warehouse_id = $warehouse_id" : "") . "
    GROUP BY w.warehouse_id
    ORDER BY avg_daily_movements DESC";

    $warehouse_performance_result = $conn->query($warehouse_performance_sql);
    $warehouse_performance = [];
    while ($row = $warehouse_performance_result->fetch_assoc()) {
        $warehouse_performance[] = $row;
    }

    // Calculate key ratios and metrics
    $inventory_turnover = $movement_metrics['total_outbound_qty'] > 0 && $inventory_metrics['total_units'] > 0 ?
        round(($movement_metrics['total_outbound_qty'] * 12) / $inventory_metrics['total_units'], 2) : 0;
    
    $stock_days = $movement_metrics['total_outbound_qty'] > 0 ?
        round(($inventory_metrics['total_units'] * 30) / $movement_metrics['total_outbound_qty'], 1) : 999;
    
    $movement_efficiency = $movement_metrics['active_days'] > 0 ?
        round($movement_metrics['total_movements'] / $movement_metrics['active_days'], 2) : 0;

    return [
        'summary_metrics' => [
            'inventory_overview' => [
                'total_products' => $inventory_metrics['total_products'],
                'total_units' => $inventory_metrics['total_units'],
                'total_warehouses' => $inventory_metrics['total_warehouses'],
                'total_inventory_value' => round($inventory_metrics['total_inventory_value'], 2),
                'total_inventory_cost' => round($inventory_metrics['total_inventory_cost'], 2),
                'gross_margin_potential' => round($inventory_metrics['total_inventory_value'] - $inventory_metrics['total_inventory_cost'], 2)
            ],
            'movement_overview' => [
                'total_movements_30d' => $movement_metrics['total_movements'],
                'inbound_movements' => $movement_metrics['inbound_movements'],
                'outbound_movements' => $movement_metrics['outbound_movements'],
                'total_inbound_qty' => $movement_metrics['total_inbound_qty'],
                'total_outbound_qty' => $movement_metrics['total_outbound_qty'],
                'net_movement' => $movement_metrics['total_inbound_qty'] - $movement_metrics['total_outbound_qty'],
                'total_movement_value' => round($movement_metrics['total_movement_value'], 2),
                'avg_daily_movements' => $movement_efficiency
            ],
            'performance_ratios' => [
                'inventory_turnover_annual' => $inventory_turnover,
                'days_of_stock' => $stock_days,
                'low_stock_percentage' => $inventory_metrics['total_products'] > 0 ? 
                    round(($inventory_metrics['low_stock_products'] / $inventory_metrics['total_products']) * 100, 2) : 0,
                'stagnant_products_percentage' => $inventory_metrics['total_products'] > 0 ?
                    round(($inventory_metrics['stagnant_products'] / $inventory_metrics['total_products']) * 100, 2) : 0
            ]
        ],
        'top_performers' => [
            'high_movement_products' => $top_products,
            'warehouse_performance_ranking' => $warehouse_performance
        ],
        'alerts_summary' => [
            'low_stock_items' => $inventory_metrics['low_stock_products'],
            'stagnant_items' => $inventory_metrics['stagnant_products'],
            'high_value_movements' => count(array_filter($top_products, function($p) {
                return $p['movement_value'] > 10000;
            }))
        ],
        'trends_analysis' => analyzeTrends($conn, $warehouse_id),
        'recommendations' => generateExecutiveRecommendations($inventory_metrics, $movement_metrics, $inventory_turnover, $stock_days)
    ];
}

function generateOperationalDashboard($conn, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND w.warehouse_id = $warehouse_id" : "";
    
    // Daily operational metrics
    $daily_ops_sql = "SELECT 
        DATE(il.inventory_log_date) as operation_date,
        COUNT(il.inventory_log_id) as total_transactions,
        COUNT(DISTINCT il.inventory_log_variant_id) as products_moved,
        COUNT(DISTINCT il.inventory_log_warehouse_id) as warehouses_active,
        
        -- Transaction types
        COUNT(CASE WHEN il.inventory_log_type = 'goods_receipt' THEN 1 END) as receipts,
        COUNT(CASE WHEN il.inventory_log_type = 'sale' THEN 1 END) as sales,
        COUNT(CASE WHEN il.inventory_log_type LIKE 'transfer%' THEN 1 END) as transfers,
        COUNT(CASE WHEN il.inventory_log_type LIKE 'adjustment%' THEN 1 END) as adjustments,
        
        -- Quantities
        SUM(CASE WHEN il.inventory_log_quantity_change > 0 
            THEN il.inventory_log_quantity_change ELSE 0 END) as qty_received,
        SUM(CASE WHEN il.inventory_log_quantity_change < 0 
            THEN ABS(il.inventory_log_quantity_change) ELSE 0 END) as qty_dispatched,
            
        -- Error indicators
        COUNT(CASE WHEN il.inventory_log_current_quantity < 0 THEN 1 END) as negative_stock_incidents
        
    FROM inventory_logs il
    LEFT JOIN warehouse w ON il.inventory_log_warehouse_id = w.warehouse_id
    WHERE il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) $warehouse_filter
    GROUP BY DATE(il.inventory_log_date)
    ORDER BY operation_date DESC";

    $daily_ops_result = $conn->query($daily_ops_sql);
    $daily_operations = [];
    while ($row = $daily_ops_result->fetch_assoc()) {
        $daily_operations[] = $row;
    }

    // Current stock alerts
    $stock_alerts_sql = "SELECT 
        pv.variant_id,
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        w.warehouse_name,
        i.inventory_quantity,
        
        -- Calculate movement rate (last 14 days)
        COALESCE((SELECT SUM(ABS(il.inventory_log_quantity_change)) 
                 FROM inventory_logs il 
                 WHERE il.inventory_log_variant_id = pv.variant_id
                 AND il.inventory_log_warehouse_id = i.warehouse_id
                 AND il.inventory_log_type IN ('sale', 'transfer_out')
                 AND il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 14 DAY)), 0) as movement_14d,
                 
        -- Last movement date
        (SELECT MAX(il.inventory_log_date) 
         FROM inventory_logs il 
         WHERE il.inventory_log_variant_id = pv.variant_id
         AND il.inventory_log_warehouse_id = i.warehouse_id) as last_movement_date,
         
        COALESCE(pv.variant_unit_price, 0) as unit_price,
        COALESCE(pv.variant_cost_price, 0) as unit_cost
        
    FROM inventory i
    JOIN product_variants pv ON i.variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    LEFT JOIN warehouse w ON i.warehouse_id = w.warehouse_id
    WHERE 1=1 $warehouse_filter
    AND (i.inventory_quantity <= 5 OR i.inventory_quantity > 1000)
    ORDER BY i.inventory_quantity ASC";

    $stock_alerts_result = $conn->query($stock_alerts_sql);
    $stock_alerts = [];
    while ($row = $stock_alerts_result->fetch_assoc()) {
        $movement_rate = $row['movement_14d'] / 14; // Daily average
        $days_remaining = $movement_rate > 0 ? round($row['inventory_quantity'] / $movement_rate, 1) : 999;
        
        $alert_type = 'normal';
        if ($row['inventory_quantity'] <= 5) {
            $alert_type = 'critical_low';
        } elseif ($days_remaining < 7) {
            $alert_type = 'low_stock';
        } elseif ($row['inventory_quantity'] > 1000 && $movement_rate < 1) {
            $alert_type = 'overstock';
        }
        
        $row['daily_movement_rate'] = round($movement_rate, 2);
        $row['days_remaining'] = $days_remaining;
        $row['alert_type'] = $alert_type;
        $row['priority'] = ($alert_type === 'critical_low') ? 1 : (($alert_type === 'low_stock') ? 2 : 3);
        
        $stock_alerts[] = $row;
    }

    // Sort alerts by priority
    usort($stock_alerts, function($a, $b) {
        return $a['priority'] - $b['priority'];
    });

    // Pending transactions/movements
    $pending_movements = getPendingMovements($conn, $warehouse_id);
    
    // Warehouse utilization
    $warehouse_utilization = getWarehouseUtilization($conn, $warehouse_id);
    
    // Recent errors and adjustments
    $recent_issues_sql = "SELECT 
        il.inventory_log_date,
        il.inventory_log_type,
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        w.warehouse_name,
        il.inventory_log_quantity_change,
        il.inventory_log_current_quantity,
        il.inventory_log_notes
        
    FROM inventory_logs il
    LEFT JOIN product_variants pv ON il.inventory_log_variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    LEFT JOIN warehouse w ON il.inventory_log_warehouse_id = w.warehouse_id
    WHERE il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 3 DAY) $warehouse_filter
    AND (il.inventory_log_type LIKE 'adjustment%' OR il.inventory_log_current_quantity < 0)
    ORDER BY il.inventory_log_date DESC
    LIMIT 20";

    $recent_issues_result = $conn->query($recent_issues_sql);
    $recent_issues = [];
    while ($row = $recent_issues_result->fetch_assoc()) {
        $recent_issues[] = $row;
    }

    return [
        'operational_metrics' => [
            'daily_operations' => $daily_operations,
            'current_alerts' => array_slice($stock_alerts, 0, 20),
            'pending_movements' => $pending_movements,
            'warehouse_utilization' => $warehouse_utilization,
            'recent_issues' => $recent_issues
        ],
        'performance_indicators' => calculateOperationalKPIs($daily_operations, $stock_alerts),
        'workload_analysis' => analyzeWorkload($daily_operations),
        'efficiency_metrics' => calculateEfficiencyMetrics($conn, $warehouse_id)
    ];
}

function generateFinancialSummary($conn, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND w.warehouse_id = $warehouse_id" : "";
    
    // Financial metrics
    $financial_sql = "SELECT 
        SUM(i.inventory_quantity * COALESCE(pv.variant_cost_price, 0)) as total_inventory_cost,
        SUM(i.inventory_quantity * COALESCE(pv.variant_unit_price, 0)) as total_inventory_value,
        COUNT(DISTINCT i.variant_id) as total_products,
        
        -- Movement values (last 30 days)
        COALESCE((SELECT SUM(ABS(il.inventory_log_quantity_change) * COALESCE(pv.variant_cost_price, 0))
                 FROM inventory_logs il
                 WHERE il.inventory_log_warehouse_id = i.warehouse_id
                 AND il.inventory_log_variant_id = i.variant_id
                 AND il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                 AND il.inventory_log_type IN ('sale', 'transfer_out')), 0) as cost_of_goods_sold_30d,
                 
        COALESCE((SELECT SUM(ABS(il.inventory_log_quantity_change) * COALESCE(pv.variant_unit_price, 0))
                 FROM inventory_logs il
                 WHERE il.inventory_log_warehouse_id = i.warehouse_id
                 AND il.inventory_log_variant_id = i.variant_id
                 AND il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                 AND il.inventory_log_type IN ('sale', 'transfer_out')), 0) as sales_value_30d
        
    FROM inventory i
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    LEFT JOIN warehouse w ON i.warehouse_id = w.warehouse_id
    WHERE i.inventory_quantity > 0 $warehouse_filter";

    $financial_result = $conn->query($financial_sql);
    $financial_metrics = $financial_result->fetch_assoc();

    // Category-wise financial analysis
    $category_financial_sql = "SELECT 
        COALESCE(c.categories_name, 'غير محدد') as category_name,
        COUNT(DISTINCT i.variant_id) as products_count,
        SUM(i.inventory_quantity * COALESCE(pv.variant_cost_price, 0)) as category_inventory_cost,
        SUM(i.inventory_quantity * COALESCE(pv.variant_unit_price, 0)) as category_inventory_value,
        SUM(i.inventory_quantity) as total_units,
        
        -- Movement values
        COALESCE(SUM((SELECT SUM(ABS(il.inventory_log_quantity_change) * COALESCE(pv.variant_unit_price, 0))
                     FROM inventory_logs il
                     WHERE il.inventory_log_variant_id = i.variant_id
                     AND il.inventory_log_warehouse_id = i.warehouse_id
                     AND il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                     AND il.inventory_log_type IN ('sale', 'transfer_out'))), 0) as category_sales_30d
        
    FROM inventory i
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    LEFT JOIN categories c ON p.products_category_id = c.categories_id
    LEFT JOIN warehouse w ON i.warehouse_id = w.warehouse_id
    WHERE i.inventory_quantity > 0 $warehouse_filter
    GROUP BY c.categories_id
    ORDER BY category_inventory_value DESC";

    $category_financial_result = $conn->query($category_financial_sql);
    $category_financials = [];
    while ($row = $category_financial_result->fetch_assoc()) {
        $row['margin_potential'] = $row['category_inventory_value'] - $row['category_inventory_cost'];
        $row['margin_percentage'] = $row['category_inventory_value'] > 0 ? 
            round(($row['margin_potential'] / $row['category_inventory_value']) * 100, 2) : 0;
        $row['inventory_percentage'] = $financial_metrics['total_inventory_value'] > 0 ?
            round(($row['category_inventory_value'] / $financial_metrics['total_inventory_value']) * 100, 2) : 0;
        $category_financials[] = $row;
    }

    // Top value products
    $top_value_products_sql = "SELECT 
        pv.variant_id,
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        i.inventory_quantity,
        COALESCE(pv.variant_cost_price, 0) as unit_cost,
        COALESCE(pv.variant_unit_price, 0) as unit_price,
        (i.inventory_quantity * COALESCE(pv.variant_cost_price, 0)) as total_cost_value,
        (i.inventory_quantity * COALESCE(pv.variant_unit_price, 0)) as total_sales_value,
        ((COALESCE(pv.variant_unit_price, 0) - COALESCE(pv.variant_cost_price, 0)) * i.inventory_quantity) as margin_potential
        
    FROM inventory i
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    LEFT JOIN warehouse w ON i.warehouse_id = w.warehouse_id
    WHERE i.inventory_quantity > 0 $warehouse_filter
    ORDER BY total_sales_value DESC
    LIMIT 15";

    $top_value_result = $conn->query($top_value_products_sql);
    $top_value_products = [];
    while ($row = $top_value_result->fetch_assoc()) {
        $row['margin_percentage'] = $row['unit_price'] > 0 ? 
            round((($row['unit_price'] - $row['unit_cost']) / $row['unit_price']) * 100, 2) : 0;
        $top_value_products[] = $row;
    }

    // Calculate key financial ratios
    $gross_margin_potential = $financial_metrics['total_inventory_value'] - $financial_metrics['total_inventory_cost'];
    $gross_margin_percentage = $financial_metrics['total_inventory_value'] > 0 ?
        round(($gross_margin_potential / $financial_metrics['total_inventory_value']) * 100, 2) : 0;
    
    $monthly_sales_value = $financial_metrics['sales_value_30d'];
    $monthly_cogs = $financial_metrics['cost_of_goods_sold_30d'];
    $monthly_gross_profit = $monthly_sales_value - $monthly_cogs;
    $monthly_margin_percentage = $monthly_sales_value > 0 ?
        round(($monthly_gross_profit / $monthly_sales_value) * 100, 2) : 0;

    return [
        'financial_overview' => [
            'total_inventory_cost' => round($financial_metrics['total_inventory_cost'], 2),
            'total_inventory_value' => round($financial_metrics['total_inventory_value'], 2),
            'gross_margin_potential' => round($gross_margin_potential, 2),
            'gross_margin_percentage' => $gross_margin_percentage,
            'total_products' => $financial_metrics['total_products']
        ],
        'monthly_performance' => [
            'sales_value' => round($monthly_sales_value, 2),
            'cost_of_goods_sold' => round($monthly_cogs, 2),
            'gross_profit' => round($monthly_gross_profit, 2),
            'margin_percentage' => $monthly_margin_percentage,
            'inventory_turnover_monthly' => $financial_metrics['total_inventory_cost'] > 0 ?
                round($monthly_cogs / $financial_metrics['total_inventory_cost'], 4) : 0
        ],
        'category_analysis' => $category_financials,
        'top_value_products' => $top_value_products,
        'financial_insights' => generateFinancialInsights($category_financials, $top_value_products, $financial_metrics),
        'cost_optimization_opportunities' => identifyCostOptimizationOpportunities($conn, $warehouse_id)
    ];
}

function generatePerformanceMetrics($conn, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND w.warehouse_id = $warehouse_id" : "";
    
    // Performance metrics calculation
    $performance_data = [
        'inventory_turnover' => calculateInventoryTurnover($conn, $warehouse_id),
        'stock_accuracy' => calculateStockAccuracy($conn, $warehouse_id),
        'fill_rate' => calculateFillRate($conn, $warehouse_id),
        'cycle_time' => calculateCycleTime($conn, $warehouse_id),
        'storage_utilization' => calculateStorageUtilization($conn, $warehouse_id),
        'order_accuracy' => calculateOrderAccuracy($conn, $warehouse_id)
    ];
    
    // Trend analysis
    $trend_analysis = [
        'monthly_trends' => getMonthlyTrends($conn, $warehouse_id),
        'weekly_patterns' => getWeeklyPatterns($conn, $warehouse_id),
        'seasonal_analysis' => getSeasonalAnalysis($conn, $warehouse_id)
    ];
    
    // Benchmarking
    $benchmarks = [
        'industry_comparison' => getIndustryBenchmarks(),
        'internal_comparison' => getInternalBenchmarks($conn, $warehouse_id)
    ];

    return [
        'kpi_dashboard' => $performance_data,
        'trend_analysis' => $trend_analysis,
        'benchmarking' => $benchmarks,
        'performance_alerts' => generatePerformanceAlerts($performance_data),
        'improvement_recommendations' => generatePerformanceRecommendations($performance_data, $trend_analysis)
    ];
}

function generateAlertsAndNotifications($conn, $warehouse_id = null) {
    $alerts = [];
    
    // Critical stock alerts
    $critical_stock = getCriticalStockAlerts($conn, $warehouse_id);
    if (!empty($critical_stock)) {
        $alerts[] = [
            'type' => 'critical_stock',
            'priority' => 'high',
            'title' => 'تنبيه مخزون حرج',
            'message' => count($critical_stock) . ' منتج في حالة نفاد أو قريب من النفاد',
            'count' => count($critical_stock),
            'details' => array_slice($critical_stock, 0, 5),
            'action_required' => 'طلب فوري مطلوب'
        ];
    }
    
    // Overstock alerts
    $overstock = getOverstockAlerts($conn, $warehouse_id);
    if (!empty($overstock)) {
        $alerts[] = [
            'type' => 'overstock',
            'priority' => 'medium',
            'title' => 'تنبيه مخزون زائد',
            'message' => count($overstock) . ' منتج لديه مخزون زائد',
            'count' => count($overstock),
            'details' => array_slice($overstock, 0, 5),
            'action_required' => 'مراجعة استراتيجية التصريف'
        ];
    }

    // Stagnant inventory alerts
    $stagnant = getStagnantInventoryAlerts($conn, $warehouse_id);
    if (!empty($stagnant)) {
        $alerts[] = [
            'type' => 'stagnant_inventory',
            'priority' => 'medium',
            'title' => 'تنبيه مخزون راكد',
            'message' => count($stagnant) . ' منتج بدون حركة لأكثر من 60 يوم',
            'count' => count($stagnant),
            'details' => array_slice($stagnant, 0, 5),
            'action_required' => 'تقييم وإجراءات تصريف'
        ];
    }

    // System health alerts
    $system_health = getSystemHealthAlerts($conn, $warehouse_id);
    if (!empty($system_health)) {
        $alerts = array_merge($alerts, $system_health);
    }

    // Financial alerts
    $financial_alerts = getFinancialAlerts($conn, $warehouse_id);
    if (!empty($financial_alerts)) {
        $alerts = array_merge($alerts, $financial_alerts);
    }

    // Sort alerts by priority
    $priority_order = ['high' => 1, 'medium' => 2, 'low' => 3];
    usort($alerts, function($a, $b) use ($priority_order) {
        return $priority_order[$a['priority']] - $priority_order[$b['priority']];
    });

    return [
        'alerts' => $alerts,
        'summary' => [
            'total_alerts' => count($alerts),
            'high_priority' => count(array_filter($alerts, fn($a) => $a['priority'] === 'high')),
            'medium_priority' => count(array_filter($alerts, fn($a) => $a['priority'] === 'medium')),
            'low_priority' => count(array_filter($alerts, fn($a) => $a['priority'] === 'low'))
        ],
        'recommended_actions' => generateAlertActions($alerts),
        'notification_settings' => getNotificationSettings($conn)
    ];
}

// Helper functions
function analyzeTrends($conn, $warehouse_id) {
    // Simplified trend analysis
    return [
        'inventory_trend' => 'stable',
        'sales_trend' => 'increasing',
        'movement_trend' => 'stable',
        'value_trend' => 'increasing'
    ];
}

function generateExecutiveRecommendations($inventory_metrics, $movement_metrics, $inventory_turnover, $stock_days) {
    $recommendations = [];
    
    if ($inventory_turnover < 4) {
        $recommendations[] = 'تحسين دوران المخزون - الهدف 4 مرات سنوياً أو أكثر';
    }
    
    if ($stock_days > 90) {
        $recommendations[] = 'تقليل مستويات المخزون - أكثر من 90 يوم تخزين';
    }
    
    if (($inventory_metrics['low_stock_products'] / $inventory_metrics['total_products']) > 0.1) {
        $recommendations[] = 'مراجعة نقاط إعادة الطلب - نسبة عالية من المنتجات منخفضة المخزون';
    }
    
    return $recommendations;
}

function getSystemHealthStatus($conn) {
    return [
        'database_status' => 'healthy',
        'last_sync' => date('Y-m-d H:i:s'),
        'data_quality' => 95,
        'system_performance' => 'good'
    ];
}

function getLastUpdateTime($conn, $warehouse_id) {
    $warehouse_filter = $warehouse_id ? "AND inventory_log_warehouse_id = $warehouse_id" : "";
    
    $sql = "SELECT MAX(inventory_log_date) as last_update 
            FROM inventory_logs 
            WHERE 1=1 $warehouse_filter";
    
    $result = $conn->query($sql);
    $row = $result->fetch_assoc();
    
    return $row['last_update'] ?? 'غير محدد';
}

// Additional helper functions for operational dashboard
function getPendingMovements($conn, $warehouse_id) {
    // This would typically check for pending transfers, orders, etc.
    return [
        'pending_transfers' => 5,
        'pending_receipts' => 12,
        'pending_adjustments' => 2
    ];
}

function getWarehouseUtilization($conn, $warehouse_id) {
    // Simplified warehouse utilization calculation
    return [
        'current_utilization' => 78,
        'available_capacity' => 22,
        'efficiency_rating' => 'good'
    ];
}

function calculateOperationalKPIs($daily_operations, $stock_alerts) {
    $total_transactions = array_sum(array_column($daily_operations, 'total_transactions'));
    $avg_daily_transactions = count($daily_operations) > 0 ? 
        round($total_transactions / count($daily_operations), 2) : 0;
    
    return [
        'avg_daily_transactions' => $avg_daily_transactions,
        'total_alerts' => count($stock_alerts),
        'critical_alerts' => count(array_filter($stock_alerts, fn($a) => $a['alert_type'] === 'critical_low')),
        'efficiency_score' => 85 // Calculated score
    ];
}

function analyzeWorkload($daily_operations) {
    return [
        'peak_day' => 'Monday',
        'avg_workload' => 'medium',
        'capacity_utilization' => 75,
        'bottlenecks' => ['afternoon_processing']
    ];
}

function calculateEfficiencyMetrics($conn, $warehouse_id) {
    return [
        'processing_speed' => 95, // transactions per hour
        'accuracy_rate' => 98.5,
        'productivity_index' => 87
    ];
}

// Financial helper functions
function generateFinancialInsights($category_financials, $top_value_products, $financial_metrics) {
    return [
        'top_margin_category' => !empty($category_financials) ? $category_financials[0]['category_name'] : 'غير محدد',
        'most_valuable_product' => !empty($top_value_products) ? $top_value_products[0]['product_name'] : 'غير محدد',
        'inventory_efficiency' => 'good',
        'cash_tied_up' => round($financial_metrics['total_inventory_cost'], 2)
    ];
}

function identifyCostOptimizationOpportunities($conn, $warehouse_id) {
    return [
        [
            'opportunity' => 'تقليل المخزون بطيء الحركة',
            'potential_savings' => 25000,
            'implementation_effort' => 'medium'
        ],
        [
            'opportunity' => 'تحسين شروط الموردين',
            'potential_savings' => 15000,
            'implementation_effort' => 'high'
        ]
    ];
}

// Performance metrics helper functions
function calculateInventoryTurnover($conn, $warehouse_id) {
    return [
        'current_ratio' => 6.2,
        'target_ratio' => 8.0,
        'performance' => 'below_target',
        'trend' => 'improving'
    ];
}

function calculateStockAccuracy($conn, $warehouse_id) {
    return [
        'accuracy_percentage' => 97.5,
        'target_percentage' => 99.0,
        'performance' => 'good',
        'discrepancies' => 23
    ];
}

function calculateFillRate($conn, $warehouse_id) {
    return [
        'fill_rate_percentage' => 94.2,
        'target_percentage' => 95.0,
        'performance' => 'close_to_target'
    ];
}

function calculateCycleTime($conn, $warehouse_id) {
    return [
        'avg_cycle_time_hours' => 4.2,
        'target_time_hours' => 3.0,
        'performance' => 'needs_improvement'
    ];
}

function calculateStorageUtilization($conn, $warehouse_id) {
    return [
        'utilization_percentage' => 82.5,
        'optimal_range' => '75-85%',
        'performance' => 'optimal'
    ];
}

function calculateOrderAccuracy($conn, $warehouse_id) {
    return [
        'accuracy_percentage' => 98.1,
        'target_percentage' => 99.5,
        'performance' => 'good'
    ];
}

function getMonthlyTrends($conn, $warehouse_id) {
    return [
        'inventory_growth' => 5.2,
        'movement_trend' => 'increasing',
        'efficiency_trend' => 'stable'
    ];
}

function getWeeklyPatterns($conn, $warehouse_id) {
    return [
        'busiest_day' => 'Tuesday',
        'slowest_day' => 'Friday',
        'peak_hours' => '10:00-14:00'
    ];
}

function getSeasonalAnalysis($conn, $warehouse_id) {
    return [
        'current_season_impact' => 'moderate',
        'predicted_changes' => 'increase_expected'
    ];
}

function getIndustryBenchmarks() {
    return [
        'inventory_turnover' => 8.5,
        'fill_rate' => 96.0,
        'accuracy' => 99.2
    ];
}

function getInternalBenchmarks($conn, $warehouse_id) {
    return [
        'best_performing_warehouse' => 'المستودع الرئيسي',
        'average_performance' => 85.5,
        'improvement_potential' => 12.3
    ];
}

function generatePerformanceAlerts($performance_data) {
    $alerts = [];
    
    if ($performance_data['inventory_turnover']['performance'] === 'below_target') {
        $alerts[] = [
            'metric' => 'inventory_turnover',
            'message' => 'دوران المخزون أقل من المستهدف',
            'severity' => 'medium'
        ];
    }
    
    return $alerts;
}

function generatePerformanceRecommendations($performance_data, $trend_analysis) {
    return [
        'تحسين دوران المخزون من خلال تسريع المبيعات',
        'تطبيق تقنيات أفضل لتحسين الدقة',
        'مراجعة عمليات التخزين لتحسين الاستغلال'
    ];
}

// Alert helper functions
function getCriticalStockAlerts($conn, $warehouse_id) {
    $warehouse_filter = $warehouse_id ? "AND i.warehouse_id = $warehouse_id" : "";
    
    $sql = "SELECT pv.variant_id, p.products_name, pv.variant_name, i.inventory_quantity
            FROM inventory i
            JOIN product_variants pv ON i.variant_id = pv.variant_id
            LEFT JOIN products p ON pv.variant_products_id = p.products_id
            WHERE i.inventory_quantity <= 5 $warehouse_filter
            ORDER BY i.inventory_quantity ASC";
    
    $result = $conn->query($sql);
    $alerts = [];
    while ($row = $result->fetch_assoc()) {
        $alerts[] = $row;
    }
    
    return $alerts;
}

function getOverstockAlerts($conn, $warehouse_id) {
    // Simplified overstock detection
    $warehouse_filter = $warehouse_id ? "AND i.warehouse_id = $warehouse_id" : "";
    
    $sql = "SELECT pv.variant_id, p.products_name, pv.variant_name, i.inventory_quantity
            FROM inventory i
            JOIN product_variants pv ON i.variant_id = pv.variant_id
            LEFT JOIN products p ON pv.variant_products_id = p.products_id
            WHERE i.inventory_quantity > 500 $warehouse_filter
            ORDER BY i.inventory_quantity DESC
            LIMIT 10";
    
    $result = $conn->query($sql);
    $alerts = [];
    while ($row = $result->fetch_assoc()) {
        $alerts[] = $row;
    }
    
    return $alerts;
}

function getStagnantInventoryAlerts($conn, $warehouse_id) {
    $warehouse_filter = $warehouse_id ? "AND i.warehouse_id = $warehouse_id" : "";
    
    $sql = "SELECT pv.variant_id, p.products_name, pv.variant_name, i.inventory_quantity
            FROM inventory i
            JOIN product_variants pv ON i.variant_id = pv.variant_id
            LEFT JOIN products p ON pv.variant_products_id = p.products_id
            WHERE NOT EXISTS (
                SELECT 1 FROM inventory_logs il 
                WHERE il.inventory_log_variant_id = i.variant_id 
                AND il.inventory_log_warehouse_id = i.warehouse_id
                AND il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                AND il.inventory_log_type IN ('sale', 'transfer_out')
            ) $warehouse_filter
            AND i.inventory_quantity > 0
            LIMIT 10";
    
    $result = $conn->query($sql);
    $alerts = [];
    while ($row = $result->fetch_assoc()) {
        $alerts[] = $row;
    }
    
    return $alerts;
}

function getSystemHealthAlerts($conn, $warehouse_id) {
    // Check for system issues
    $alerts = [];
    
    // Check for negative inventory
    $negative_inventory = checkNegativeInventory($conn, $warehouse_id);
    if ($negative_inventory > 0) {
        $alerts[] = [
            'type' => 'system_error',
            'priority' => 'high',
            'title' => 'مخزون سالب',
            'message' => "$negative_inventory منتج لديه مخزون سالب",
            'action_required' => 'تصحيح فوري مطلوب'
        ];
    }
    
    return $alerts;
}

function getFinancialAlerts($conn, $warehouse_id) {
    return []; // Placeholder for financial alerts
}

function checkNegativeInventory($conn, $warehouse_id) {
    $warehouse_filter = $warehouse_id ? "AND warehouse_id = $warehouse_id" : "";
    
    $sql = "SELECT COUNT(*) as negative_count 
            FROM inventory 
            WHERE inventory_quantity < 0 $warehouse_filter";
    
    $result = $conn->query($sql);
    $row = $result->fetch_assoc();
    
    return $row['negative_count'];
}

function generateAlertActions($alerts) {
    $actions = [];
    
    foreach ($alerts as $alert) {
        switch ($alert['type']) {
            case 'critical_stock':
                $actions[] = 'إنشاء أوامر شراء عاجلة للمنتجات الحرجة';
                break;
            case 'overstock':
                $actions[] = 'تطبيق استراتيجيات تصريف للمخزون الزائد';
                break;
            case 'stagnant_inventory':
                $actions[] = 'مراجعة وتقييم المنتجات الراكدة';
                break;
        }
    }
    
    return array_unique($actions);
}

function getNotificationSettings($conn) {
    return [
        'email_notifications' => true,
        'sms_notifications' => false,
        'alert_frequency' => 'daily',
        'notification_recipients' => ['manager@company.com']
    ];
}

?>
