<?php
require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get parameters from request
    $input = json_decode(file_get_contents('php://input'), true);
    $users_uuid = $input['users_uuid'] ?? $_GET['users_uuid'] ?? null;
    $warehouse_id = $input['warehouse_id'] ?? $_GET['warehouse_id'] ?? null;
    $period = $input['period'] ?? $_GET['period'] ?? 'monthly'; // daily, weekly, monthly, quarterly

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

    // Generate comprehensive performance analysis
    $performance_analysis = generatePerformanceAnalysis($conn, $current_user_id, $current_user_role, $warehouse_id, $period);

    print_success("Warehouse performance analysis retrieved successfully.", $performance_analysis);

} catch (Exception $e) {
    print_failure("Error: " . $e->getMessage());
}

function generatePerformanceAnalysis($conn, $current_user_id, $current_user_role, $warehouse_id = null, $period = 'monthly') {
    // Define date ranges based on period
    $date_ranges = getDateRanges($period);
    
    // Get warehouse performance KPIs
    $kpis = calculateWarehouseKPIs($conn, $warehouse_id, $date_ranges);
    
    // Get operational efficiency metrics
    $efficiency = calculateOperationalEfficiency($conn, $warehouse_id, $date_ranges);
    
    // Get cost analysis
    $cost_analysis = calculateCostAnalysis($conn, $warehouse_id, $date_ranges);
    
    // Get capacity utilization
    $capacity_utilization = calculateCapacityUtilization($conn, $warehouse_id, $date_ranges);
    
    // Get accuracy and quality metrics
    $accuracy_metrics = calculateAccuracyMetrics($conn, $warehouse_id, $date_ranges);
    
    // Get trend analysis
    $trend_analysis = calculateTrendAnalysis($conn, $warehouse_id, $date_ranges, $period);
    
    // Get comparative analysis (warehouse vs warehouse)
    $comparative_analysis = generateComparativeAnalysis($conn, $warehouse_id, $date_ranges);
    
    // Generate performance recommendations
    $recommendations = generatePerformanceRecommendations($kpis, $efficiency, $cost_analysis, $accuracy_metrics);

    return [
        'kpis' => $kpis,
        'efficiency' => $efficiency,
        'cost_analysis' => $cost_analysis,
        'capacity_utilization' => $capacity_utilization,
        'accuracy_metrics' => $accuracy_metrics,
        'trend_analysis' => $trend_analysis,
        'comparative_analysis' => $comparative_analysis,
        'recommendations' => $recommendations,
        'period' => $period,
        'analysis_date' => date('Y-m-d H:i:s'),
        'warehouse_filter' => $warehouse_id
    ];
}

function getDateRanges($period) {
    $now = new DateTime();
    
    switch ($period) {
        case 'daily':
            return [
                'current_start' => $now->format('Y-m-d') . ' 00:00:00',
                'current_end' => $now->format('Y-m-d') . ' 23:59:59',
                'previous_start' => $now->modify('-1 day')->format('Y-m-d') . ' 00:00:00',
                'previous_end' => $now->format('Y-m-d') . ' 23:59:59',
                'label' => 'يومي'
            ];
        case 'weekly':
            $week_start = clone $now;
            $week_start->modify('Monday this week');
            $prev_week_start = clone $week_start;
            $prev_week_start->modify('-1 week');
            
            return [
                'current_start' => $week_start->format('Y-m-d') . ' 00:00:00',
                'current_end' => $now->format('Y-m-d') . ' 23:59:59',
                'previous_start' => $prev_week_start->format('Y-m-d') . ' 00:00:00',
                'previous_end' => $prev_week_start->modify('+6 days')->format('Y-m-d') . ' 23:59:59',
                'label' => 'أسبوعي'
            ];
        case 'quarterly':
            $quarter = ceil($now->format('n') / 3);
            $year = $now->format('Y');
            
            return [
                'current_start' => date('Y-m-d', mktime(0, 0, 0, (($quarter - 1) * 3) + 1, 1, $year)) . ' 00:00:00',
                'current_end' => $now->format('Y-m-d') . ' 23:59:59',
                'previous_start' => date('Y-m-d', mktime(0, 0, 0, (($quarter - 2) * 3) + 1, 1, $quarter > 1 ? $year : $year - 1)) . ' 00:00:00',
                'previous_end' => date('Y-m-d', mktime(23, 59, 59, ($quarter - 1) * 3, 0, $quarter > 1 ? $year : $year - 1)) . ' 23:59:59',
                'label' => 'ربع سنوي'
            ];
        case 'monthly':
        default:
            $month_start = clone $now;
            $month_start->modify('first day of this month');
            $prev_month_start = clone $month_start;
            $prev_month_start->modify('-1 month');
            
            return [
                'current_start' => $month_start->format('Y-m-d') . ' 00:00:00',
                'current_end' => $now->format('Y-m-d') . ' 23:59:59',
                'previous_start' => $prev_month_start->format('Y-m-d') . ' 00:00:00',
                'previous_end' => $prev_month_start->modify('last day of this month')->format('Y-m-d') . ' 23:59:59',
                'label' => 'شهري'
            ];
    }
}

function calculateWarehouseKPIs($conn, $warehouse_id = null, $date_ranges) {
    $warehouse_filter = $warehouse_id ? "AND w.warehouse_id = $warehouse_id" : "";
    
    // Inventory turnover rate
    $turnover_sql = "SELECT 
        w.warehouse_id,
        w.warehouse_name,
        
        -- Current period metrics
        SUM(CASE WHEN il.inventory_log_date BETWEEN ? AND ? 
            THEN ABS(il.inventory_log_quantity_change) ELSE 0 END) as current_movement,
        AVG(CASE WHEN il.inventory_log_date BETWEEN ? AND ? 
            THEN i.inventory_quantity ELSE NULL END) as current_avg_inventory,
            
        -- Previous period metrics  
        SUM(CASE WHEN il.inventory_log_date BETWEEN ? AND ? 
            THEN ABS(il.inventory_log_quantity_change) ELSE 0 END) as previous_movement,
        AVG(CASE WHEN il.inventory_log_date BETWEEN ? AND ? 
            THEN i.inventory_quantity ELSE NULL END) as previous_avg_inventory,
            
        -- Current inventory levels
        SUM(i.inventory_quantity) as current_total_inventory,
        COUNT(DISTINCT i.variant_id) as unique_products,
        SUM(i.inventory_quantity * pv.variant_unit_price) as inventory_value
        
    FROM warehouse w
    LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
    LEFT JOIN inventory_logs il ON w.warehouse_id = il.inventory_log_warehouse_id
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    WHERE w.warehouse_status = 'Active' $warehouse_filter
    GROUP BY w.warehouse_id";

    $stmt = $conn->prepare($turnover_sql);
    $stmt->bind_param("ssssssss", 
        $date_ranges['current_start'], $date_ranges['current_end'],
        $date_ranges['current_start'], $date_ranges['current_end'],
        $date_ranges['previous_start'], $date_ranges['previous_end'],
        $date_ranges['previous_start'], $date_ranges['previous_end']
    );
    $stmt->execute();
    $kpi_result = $stmt->get_result();

    $kpis = [];
    while ($row = $kpi_result->fetch_assoc()) {
        // Calculate turnover ratios
        $current_turnover = $row['current_avg_inventory'] > 0 ? 
            round($row['current_movement'] / $row['current_avg_inventory'], 2) : 0;
        $previous_turnover = $row['previous_avg_inventory'] > 0 ? 
            round($row['previous_movement'] / $row['previous_avg_inventory'], 2) : 0;
            
        // Calculate growth rates
        $turnover_growth = $previous_turnover > 0 ? 
            round((($current_turnover - $previous_turnover) / $previous_turnover) * 100, 2) : 0;
        $movement_growth = $row['previous_movement'] > 0 ? 
            round((($row['current_movement'] - $row['previous_movement']) / $row['previous_movement']) * 100, 2) : 0;

        // Get additional KPIs
        $stock_accuracy = calculateStockAccuracy($conn, $row['warehouse_id'], $date_ranges);
        $order_fill_rate = calculateOrderFillRate($conn, $row['warehouse_id'], $date_ranges);
        $cycle_time = calculateCycleTime($conn, $row['warehouse_id'], $date_ranges);

        $kpis[] = [
            'warehouse_id' => $row['warehouse_id'],
            'warehouse_name' => $row['warehouse_name'],
            'inventory_turnover' => [
                'current' => $current_turnover,
                'previous' => $previous_turnover,
                'growth_rate' => $turnover_growth
            ],
            'movement_volume' => [
                'current' => $row['current_movement'],
                'previous' => $row['previous_movement'],
                'growth_rate' => $movement_growth
            ],
            'inventory_metrics' => [
                'total_inventory' => $row['current_total_inventory'],
                'unique_products' => $row['unique_products'],
                'inventory_value' => round($row['inventory_value'], 2),
                'avg_inventory_per_product' => $row['unique_products'] > 0 ? 
                    round($row['current_total_inventory'] / $row['unique_products'], 2) : 0
            ],
            'performance_indicators' => [
                'stock_accuracy' => $stock_accuracy,
                'order_fill_rate' => $order_fill_rate,
                'average_cycle_time' => $cycle_time
            ]
        ];
    }

    return $kpis;
}

function calculateOperationalEfficiency($conn, $warehouse_id = null, $date_ranges) {
    $warehouse_filter = $warehouse_id ? "AND w.warehouse_id = $warehouse_id" : "";
    
    // Processing efficiency metrics
    $efficiency_sql = "SELECT 
        w.warehouse_id,
        w.warehouse_name,
        
        -- Movement processing times
        COUNT(il.inventory_log_id) as total_movements,
        
        -- Receipts processing
        COUNT(CASE WHEN il.inventory_log_type = 'goods_receipt' 
              AND il.inventory_log_date BETWEEN ? AND ? THEN 1 END) as receipts_count,
              
        -- Transfers processing  
        COUNT(CASE WHEN il.inventory_log_type IN ('transfer_in', 'transfer_out') 
              AND il.inventory_log_date BETWEEN ? AND ? THEN 1 END) as transfers_count,
              
        -- Adjustments (should be minimal for good efficiency)
        COUNT(CASE WHEN il.inventory_log_type IN ('adjustment_in', 'adjustment_out') 
              AND il.inventory_log_date BETWEEN ? AND ? THEN 1 END) as adjustments_count,
              
        -- Error rate indicators
        COUNT(CASE WHEN il.inventory_log_notes LIKE '%error%' OR il.inventory_log_notes LIKE '%خطأ%' 
              THEN 1 END) as error_indicators
        
    FROM warehouse w
    LEFT JOIN inventory_logs il ON w.warehouse_id = il.inventory_log_warehouse_id
    WHERE w.warehouse_status = 'Active' $warehouse_filter
    AND il.inventory_log_date BETWEEN ? AND ?
    GROUP BY w.warehouse_id";

    $stmt = $conn->prepare($efficiency_sql);
    $stmt->bind_param("sssssss", 
        $date_ranges['current_start'], $date_ranges['current_end'],
        $date_ranges['current_start'], $date_ranges['current_end'],
        $date_ranges['current_start'], $date_ranges['current_end'],
        $date_ranges['current_start'], $date_ranges['current_end']
    );
    $stmt->execute();
    $efficiency_result = $stmt->get_result();

    $efficiency_metrics = [];
    while ($row = $efficiency_result->fetch_assoc()) {
        // Calculate efficiency ratios
        $total_movements = $row['total_movements'];
        $adjustment_rate = $total_movements > 0 ? 
            round(($row['adjustments_count'] / $total_movements) * 100, 2) : 0;
        $error_rate = $total_movements > 0 ? 
            round(($row['error_indicators'] / $total_movements) * 100, 2) : 0;
        
        // Get space utilization
        $space_utilization = calculateSpaceUtilization($conn, $row['warehouse_id']);
        
        // Get staff productivity (if user data is available)
        $staff_productivity = calculateStaffProductivity($conn, $row['warehouse_id'], $date_ranges);

        $efficiency_metrics[] = [
            'warehouse_id' => $row['warehouse_id'],
            'warehouse_name' => $row['warehouse_name'],
            'processing_efficiency' => [
                'total_movements' => $total_movements,
                'receipts_processed' => $row['receipts_count'],
                'transfers_processed' => $row['transfers_count'],
                'adjustments_made' => $row['adjustments_count'],
                'adjustment_rate' => $adjustment_rate,
                'error_rate' => $error_rate
            ],
            'space_utilization' => $space_utilization,
            'staff_productivity' => $staff_productivity,
            'efficiency_score' => calculateOverallEfficiencyScore([
                'adjustment_rate' => $adjustment_rate,
                'error_rate' => $error_rate,
                'space_utilization' => $space_utilization['utilization_percentage']
            ])
        ];
    }

    return $efficiency_metrics;
}

function calculateCostAnalysis($conn, $warehouse_id = null, $date_ranges) {
    $warehouse_filter = $warehouse_id ? "AND w.warehouse_id = $warehouse_id" : "";
    
    // Cost metrics calculation
    $cost_sql = "SELECT 
        w.warehouse_id,
        w.warehouse_name,
        
        -- Inventory holding costs (approximation)
        SUM(i.inventory_quantity * pv.variant_cost_price) as holding_cost,
        
        -- Movement costs (based on quantity moved)
        SUM(CASE WHEN il.inventory_log_date BETWEEN ? AND ? 
            THEN ABS(il.inventory_log_quantity_change) * 0.5 ELSE 0 END) as movement_cost,
            
        -- Storage costs (based on quantity stored)
        AVG(i.inventory_quantity) * 1.0 as storage_cost,
        
        -- Adjustment costs (represent waste/loss)
        SUM(CASE WHEN il.inventory_log_type IN ('adjustment_out') 
                 AND il.inventory_log_date BETWEEN ? AND ?
            THEN ABS(il.inventory_log_quantity_change) * pv.variant_cost_price ELSE 0 END) as adjustment_cost
        
    FROM warehouse w
    LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    LEFT JOIN inventory_logs il ON w.warehouse_id = il.inventory_log_warehouse_id 
                                AND il.inventory_log_variant_id = pv.variant_id
    WHERE w.warehouse_status = 'Active' $warehouse_filter
    GROUP BY w.warehouse_id";

    $stmt = $conn->prepare($cost_sql);
    $stmt->bind_param("ssss", 
        $date_ranges['current_start'], $date_ranges['current_end'],
        $date_ranges['current_start'], $date_ranges['current_end']
    );
    $stmt->execute();
    $cost_result = $stmt->get_result();

    $cost_analysis = [];
    while ($row = $cost_result->fetch_assoc()) {
        $total_cost = $row['holding_cost'] + $row['movement_cost'] + $row['storage_cost'] + $row['adjustment_cost'];
        
        $cost_analysis[] = [
            'warehouse_id' => $row['warehouse_id'],
            'warehouse_name' => $row['warehouse_name'],
            'cost_breakdown' => [
                'holding_cost' => round($row['holding_cost'], 2),
                'movement_cost' => round($row['movement_cost'], 2),
                'storage_cost' => round($row['storage_cost'], 2),
                'adjustment_cost' => round($row['adjustment_cost'], 2),
                'total_cost' => round($total_cost, 2)
            ],
            'cost_ratios' => [
                'holding_percentage' => $total_cost > 0 ? round(($row['holding_cost'] / $total_cost) * 100, 2) : 0,
                'movement_percentage' => $total_cost > 0 ? round(($row['movement_cost'] / $total_cost) * 100, 2) : 0,
                'storage_percentage' => $total_cost > 0 ? round(($row['storage_cost'] / $total_cost) * 100, 2) : 0,
                'adjustment_percentage' => $total_cost > 0 ? round(($row['adjustment_cost'] / $total_cost) * 100, 2) : 0
            ],
            'cost_per_unit' => [
                'per_movement' => calculateCostPerMovement($conn, $row['warehouse_id'], $date_ranges),
                'per_product' => calculateCostPerProduct($conn, $row['warehouse_id'], $date_ranges)
            ]
        ];
    }

    return $cost_analysis;
}

function calculateCapacityUtilization($conn, $warehouse_id = null, $date_ranges) {
    $warehouse_filter = $warehouse_id ? "AND w.warehouse_id = $warehouse_id" : "";
    
    // Capacity utilization metrics
    $capacity_sql = "SELECT 
        w.warehouse_id,
        w.warehouse_name,
        w.warehouse_type,
        
        -- Current utilization
        COUNT(DISTINCT i.variant_id) as unique_products_stored,
        SUM(i.inventory_quantity) as total_units_stored,
        
        -- Historical peaks
        (SELECT MAX(daily_inventory) FROM (
            SELECT DATE(il.inventory_log_date) as log_date,
                   SUM(il.inventory_log_current_quantity) as daily_inventory
            FROM inventory_logs il 
            WHERE il.inventory_log_warehouse_id = w.warehouse_id
            AND il.inventory_log_date BETWEEN ? AND ?
            GROUP BY DATE(il.inventory_log_date)
        ) daily_stats) as peak_utilization
        
    FROM warehouse w
    LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
    WHERE w.warehouse_status = 'Active' $warehouse_filter
    GROUP BY w.warehouse_id";

    $stmt = $conn->prepare($capacity_sql);
    $stmt->bind_param("ss", $date_ranges['current_start'], $date_ranges['current_end']);
    $stmt->execute();
    $capacity_result = $stmt->get_result();

    $capacity_metrics = [];
    while ($row = $capacity_result->fetch_assoc()) {
        // Estimate capacity based on warehouse type
        $estimated_capacity = estimateWarehouseCapacity($row['warehouse_type']);
        
        $current_utilization = $estimated_capacity > 0 ? 
            round(($row['total_units_stored'] / $estimated_capacity) * 100, 2) : 0;
        $peak_utilization = $estimated_capacity > 0 && $row['peak_utilization'] ? 
            round(($row['peak_utilization'] / $estimated_capacity) * 100, 2) : 0;

        $capacity_metrics[] = [
            'warehouse_id' => $row['warehouse_id'],
            'warehouse_name' => $row['warehouse_name'],
            'warehouse_type' => $row['warehouse_type'],
            'capacity_metrics' => [
                'estimated_capacity' => $estimated_capacity,
                'current_utilization' => $current_utilization,
                'peak_utilization' => $peak_utilization,
                'available_capacity' => max(0, 100 - $current_utilization),
                'unique_products' => $row['unique_products_stored'],
                'total_units' => $row['total_units_stored']
            ],
            'capacity_status' => determineCapacityStatus($current_utilization),
            'projected_full_date' => projectCapacityFullDate($conn, $row['warehouse_id'], $current_utilization)
        ];
    }

    return $capacity_metrics;
}

function calculateAccuracyMetrics($conn, $warehouse_id = null, $date_ranges) {
    $warehouse_filter = $warehouse_id ? "AND w.warehouse_id = $warehouse_id" : "";
    
    // Accuracy metrics
    $accuracy_sql = "SELECT 
        w.warehouse_id,
        w.warehouse_name,
        
        -- Total transactions for accuracy calculation
        COUNT(il.inventory_log_id) as total_transactions,
        
        -- Adjustments (indicate inaccuracies)
        COUNT(CASE WHEN il.inventory_log_type IN ('adjustment_in', 'adjustment_out') 
              THEN 1 END) as adjustment_transactions,
              
        -- Discrepancies value
        SUM(CASE WHEN il.inventory_log_type IN ('adjustment_in', 'adjustment_out') 
            THEN ABS(il.inventory_log_quantity_change) * 
                 COALESCE(pv.variant_unit_price, 0) ELSE 0 END) as discrepancy_value,
                 
        -- Error indicators in notes
        COUNT(CASE WHEN il.inventory_log_notes LIKE '%error%' OR 
                         il.inventory_log_notes LIKE '%خطأ%' OR
                         il.inventory_log_notes LIKE '%correction%' OR
                         il.inventory_log_notes LIKE '%تصحيح%'
              THEN 1 END) as error_transactions
        
    FROM warehouse w
    LEFT JOIN inventory_logs il ON w.warehouse_id = il.inventory_log_warehouse_id
    LEFT JOIN product_variants pv ON il.inventory_log_variant_id = pv.variant_id
    WHERE w.warehouse_status = 'Active' $warehouse_filter
    AND il.inventory_log_date BETWEEN ? AND ?
    GROUP BY w.warehouse_id";

    $stmt = $conn->prepare($accuracy_sql);
    $stmt->bind_param("ss", $date_ranges['current_start'], $date_ranges['current_end']);
    $stmt->execute();
    $accuracy_result = $stmt->get_result();

    $accuracy_metrics = [];
    while ($row = $accuracy_result->fetch_assoc()) {
        $total_transactions = $row['total_transactions'];
        
        // Calculate accuracy percentages
        $inventory_accuracy = $total_transactions > 0 ? 
            round((1 - ($row['adjustment_transactions'] / $total_transactions)) * 100, 2) : 100;
        $transaction_accuracy = $total_transactions > 0 ? 
            round((1 - ($row['error_transactions'] / $total_transactions)) * 100, 2) : 100;
        
        // Overall accuracy score
        $overall_accuracy = round(($inventory_accuracy + $transaction_accuracy) / 2, 2);

        $accuracy_metrics[] = [
            'warehouse_id' => $row['warehouse_id'],
            'warehouse_name' => $row['warehouse_name'],
            'accuracy_scores' => [
                'inventory_accuracy' => $inventory_accuracy,
                'transaction_accuracy' => $transaction_accuracy,
                'overall_accuracy' => $overall_accuracy
            ],
            'accuracy_details' => [
                'total_transactions' => $total_transactions,
                'adjustment_transactions' => $row['adjustment_transactions'],
                'error_transactions' => $row['error_transactions'],
                'discrepancy_value' => round($row['discrepancy_value'], 2),
                'accuracy_grade' => determineAccuracyGrade($overall_accuracy)
            ]
        ];
    }

    return $accuracy_metrics;
}

function calculateTrendAnalysis($conn, $warehouse_id = null, $date_ranges, $period) {
    // Get historical data for trend analysis
    $periods_back = $period === 'daily' ? 30 : ($period === 'weekly' ? 12 : 6);
    $interval = $period === 'daily' ? 'DAY' : ($period === 'weekly' ? 'WEEK' : 'MONTH');
    
    $warehouse_filter = $warehouse_id ? "AND w.warehouse_id = $warehouse_id" : "";
    
    $trend_sql = "SELECT 
        w.warehouse_id,
        w.warehouse_name,
        DATE(il.inventory_log_date) as period_date,
        COUNT(il.inventory_log_id) as movement_count,
        SUM(ABS(il.inventory_log_quantity_change)) as total_movement,
        AVG(il.inventory_log_current_quantity) as avg_inventory_level
        
    FROM warehouse w
    LEFT JOIN inventory_logs il ON w.warehouse_id = il.inventory_log_warehouse_id
    WHERE w.warehouse_status = 'Active' $warehouse_filter
    AND il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL $periods_back $interval)
    GROUP BY w.warehouse_id, DATE(il.inventory_log_date)
    ORDER BY w.warehouse_id, period_date";

    $trend_result = $conn->query($trend_sql);
    $trend_data = [];
    
    while ($row = $trend_result->fetch_assoc()) {
        $warehouse_id = $row['warehouse_id'];
        if (!isset($trend_data[$warehouse_id])) {
            $trend_data[$warehouse_id] = [
                'warehouse_name' => $row['warehouse_name'],
                'data_points' => []
            ];
        }
        
        $trend_data[$warehouse_id]['data_points'][] = [
            'date' => $row['period_date'],
            'movement_count' => $row['movement_count'],
            'total_movement' => $row['total_movement'],
            'avg_inventory_level' => round($row['avg_inventory_level'], 2)
        ];
    }
    
    // Calculate trends for each warehouse
    foreach ($trend_data as $wh_id => &$warehouse_data) {
        $data_points = $warehouse_data['data_points'];
        
        if (count($data_points) >= 2) {
            $warehouse_data['trends'] = [
                'movement_trend' => calculateTrend(array_column($data_points, 'movement_count')),
                'inventory_trend' => calculateTrend(array_column($data_points, 'avg_inventory_level')),
                'activity_trend' => calculateTrend(array_column($data_points, 'total_movement'))
            ];
        } else {
            $warehouse_data['trends'] = [
                'movement_trend' => 'insufficient_data',
                'inventory_trend' => 'insufficient_data',
                'activity_trend' => 'insufficient_data'
            ];
        }
    }
    
    return array_values($trend_data);
}

function generateComparativeAnalysis($conn, $warehouse_id = null, $date_ranges) {
    // Compare warehouse performance if specific warehouse not selected
    if ($warehouse_id) {
        return ['message' => 'Comparative analysis requires multiple warehouses'];
    }
    
    $comparison_sql = "SELECT 
        w.warehouse_id,
        w.warehouse_name,
        w.warehouse_type,
        
        -- Performance metrics
        COUNT(DISTINCT i.variant_id) as unique_products,
        SUM(i.inventory_quantity) as total_inventory,
        COUNT(il.inventory_log_id) as total_movements,
        SUM(i.inventory_quantity * pv.variant_unit_price) as inventory_value,
        
        -- Efficiency indicators
        COUNT(CASE WHEN il.inventory_log_type IN ('adjustment_in', 'adjustment_out') 
              THEN 1 END) as adjustments,
        AVG(ABS(il.inventory_log_quantity_change)) as avg_movement_size
        
    FROM warehouse w
    LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
    LEFT JOIN inventory_logs il ON w.warehouse_id = il.inventory_log_warehouse_id
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    WHERE w.warehouse_status = 'Active'
    AND il.inventory_log_date BETWEEN ? AND ?
    GROUP BY w.warehouse_id
    ORDER BY inventory_value DESC";

    $stmt = $conn->prepare($comparison_sql);
    $stmt->bind_param("ss", $date_ranges['current_start'], $date_ranges['current_end']);
    $stmt->execute();
    $comparison_result = $stmt->get_result();

    $warehouses = [];
    $metrics = [];
    
    while ($row = $comparison_result->fetch_assoc()) {
        $warehouses[] = $row;
        
        // Calculate relative performance scores
        $efficiency_score = $row['total_movements'] > 0 ? 
            round((1 - ($row['adjustments'] / $row['total_movements'])) * 100, 2) : 100;
        
        $metrics[] = [
            'warehouse_id' => $row['warehouse_id'],
            'efficiency_score' => $efficiency_score,
            'inventory_value' => $row['inventory_value'],
            'productivity' => round($row['total_movements'] / max(1, $row['unique_products']), 2)
        ];
    }
    
    // Rank warehouses
    $rankings = [];
    if (!empty($metrics)) {
        // Rank by efficiency
        usort($metrics, function($a, $b) { return $b['efficiency_score'] <=> $a['efficiency_score']; });
        foreach ($metrics as $index => $metric) {
            $rankings[$metric['warehouse_id']]['efficiency_rank'] = $index + 1;
        }
        
        // Rank by inventory value
        usort($metrics, function($a, $b) { return $b['inventory_value'] <=> $a['inventory_value']; });
        foreach ($metrics as $index => $metric) {
            $rankings[$metric['warehouse_id']]['value_rank'] = $index + 1;
        }
        
        // Rank by productivity
        usort($metrics, function($a, $b) { return $b['productivity'] <=> $a['productivity']; });
        foreach ($metrics as $index => $metric) {
            $rankings[$metric['warehouse_id']]['productivity_rank'] = $index + 1;
        }
    }
    
    return [
        'warehouses' => $warehouses,
        'rankings' => $rankings,
        'totals' => [
            'total_warehouses' => count($warehouses),
            'total_inventory_value' => array_sum(array_column($warehouses, 'inventory_value')),
            'total_products' => array_sum(array_column($warehouses, 'unique_products')),
            'total_movements' => array_sum(array_column($warehouses, 'total_movements'))
        ]
    ];
}

function generatePerformanceRecommendations($kpis, $efficiency, $cost_analysis, $accuracy_metrics) {
    $recommendations = [];
    
    foreach ($kpis as $kpi) {
        $warehouse_name = $kpi['warehouse_name'];
        $warehouse_recommendations = [];
        
        // Inventory turnover recommendations
        if ($kpi['inventory_turnover']['current'] < 2) {
            $warehouse_recommendations[] = [
                'priority' => 'high',
                'category' => 'inventory_management',
                'title' => 'تحسين دوران المخزون',
                'description' => 'معدل دوران المخزون منخفض (' . $kpi['inventory_turnover']['current'] . ')',
                'action' => 'مراجعة استراتيجية الشراء والتركيز على الأصناف سريعة الحركة'
            ];
        }
        
        // Check corresponding efficiency metrics
        $warehouse_efficiency = array_filter($efficiency, function($e) use ($kpi) {
            return $e['warehouse_id'] === $kpi['warehouse_id'];
        });
        
        if (!empty($warehouse_efficiency)) {
            $eff = reset($warehouse_efficiency);
            
            if ($eff['processing_efficiency']['adjustment_rate'] > 5) {
                $warehouse_recommendations[] = [
                    'priority' => 'medium',
                    'category' => 'accuracy',
                    'title' => 'تقليل التسويات',
                    'description' => 'معدل التسويات مرتفع (' . $eff['processing_efficiency']['adjustment_rate'] . '%)',
                    'action' => 'مراجعة عمليات الاستلام والتسليم وتدريب الموظفين'
                ];
            }
            
            if ($eff['space_utilization']['utilization_percentage'] > 90) {
                $warehouse_recommendations[] = [
                    'priority' => 'high',
                    'category' => 'capacity',
                    'title' => 'توسيع السعة التخزينية',
                    'description' => 'المستودع يقترب من الامتلاء (' . $eff['space_utilization']['utilization_percentage'] . '%)',
                    'action' => 'التخطيط لتوسيع المستودع أو إعادة تنظيم المساحات'
                ];
            }
        }
        
        // Check accuracy metrics
        $warehouse_accuracy = array_filter($accuracy_metrics, function($a) use ($kpi) {
            return $a['warehouse_id'] === $kpi['warehouse_id'];
        });
        
        if (!empty($warehouse_accuracy)) {
            $acc = reset($warehouse_accuracy);
            
            if ($acc['accuracy_scores']['overall_accuracy'] < 95) {
                $warehouse_recommendations[] = [
                    'priority' => 'high',
                    'category' => 'quality',
                    'title' => 'تحسين دقة المخزون',
                    'description' => 'مستوى الدقة أقل من المطلوب (' . $acc['accuracy_scores']['overall_accuracy'] . '%)',
                    'action' => 'تنفيذ عمليات جرد دورية وتحسين نظام التتبع'
                ];
            }
        }
        
        if (!empty($warehouse_recommendations)) {
            $recommendations[$warehouse_name] = $warehouse_recommendations;
        }
    }
    
    return $recommendations;
}

// Helper functions
function calculateStockAccuracy($conn, $warehouse_id, $date_ranges) {
    // Simplified accuracy calculation
    return 95.5; // Placeholder
}

function calculateOrderFillRate($conn, $warehouse_id, $date_ranges) {
    // Simplified fill rate calculation
    return 92.3; // Placeholder
}

function calculateCycleTime($conn, $warehouse_id, $date_ranges) {
    // Simplified cycle time calculation
    return 2.1; // days
}

function calculateSpaceUtilization($conn, $warehouse_id) {
    return [
        'utilization_percentage' => 67.8,
        'available_space' => 32.2,
        'optimization_potential' => 15.5
    ];
}

function calculateStaffProductivity($conn, $warehouse_id, $date_ranges) {
    return [
        'movements_per_employee' => 145.6,
        'efficiency_rating' => 'جيد',
        'productivity_trend' => 'صاعد'
    ];
}

function calculateOverallEfficiencyScore($factors) {
    $score = 100;
    $score -= $factors['adjustment_rate']; // Subtract adjustment rate
    $score -= $factors['error_rate']; // Subtract error rate
    $score = $score * ($factors['space_utilization'] / 100); // Weight by space utilization
    
    return max(0, min(100, round($score, 2)));
}

function estimateWarehouseCapacity($warehouse_type) {
    return $warehouse_type === 'Van' ? 500 : 10000; // Simple estimation
}

function determineCapacityStatus($utilization) {
    if ($utilization >= 90) return 'شبه ممتلئ';
    if ($utilization >= 70) return 'مرتفع';
    if ($utilization >= 50) return 'متوسط';
    return 'منخفض';
}

function projectCapacityFullDate($conn, $warehouse_id, $current_utilization) {
    // Simplified projection
    if ($current_utilization >= 90) return date('Y-m-d', strtotime('+30 days'));
    if ($current_utilization >= 70) return date('Y-m-d', strtotime('+90 days'));
    return date('Y-m-d', strtotime('+180 days'));
}

function determineAccuracyGrade($accuracy) {
    if ($accuracy >= 98) return 'ممتاز';
    if ($accuracy >= 95) return 'جيد جداً';
    if ($accuracy >= 90) return 'جيد';
    if ($accuracy >= 85) return 'مقبول';
    return 'يحتاج تحسين';
}

function calculateTrend($values) {
    $count = count($values);
    if ($count < 2) return 'insufficient_data';
    
    $first_half = array_slice($values, 0, ceil($count / 2));
    $second_half = array_slice($values, floor($count / 2));
    
    $first_avg = array_sum($first_half) / count($first_half);
    $second_avg = array_sum($second_half) / count($second_half);
    
    $change_percentage = $first_avg > 0 ? (($second_avg - $first_avg) / $first_avg) * 100 : 0;
    
    if ($change_percentage > 10) return 'صاعد بقوة';
    if ($change_percentage > 2) return 'صاعد';
    if ($change_percentage < -10) return 'هابط بقوة';
    if ($change_percentage < -2) return 'هابط';
    return 'مستقر';
}

function calculateCostPerMovement($conn, $warehouse_id, $date_ranges) {
    // Simplified calculation
    return 12.50; // Cost per movement
}

function calculateCostPerProduct($conn, $warehouse_id, $date_ranges) {
    // Simplified calculation
    return 8.75; // Cost per product
}

?>
