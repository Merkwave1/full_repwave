<?php
require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get parameters from request
    $input = json_decode(file_get_contents('php://input'), true);
    $users_uuid = $input['users_uuid'] ?? $_GET['users_uuid'] ?? null;
    $warehouse_id = $input['warehouse_id'] ?? $_GET['warehouse_id'] ?? null;
    $forecast_period = $input['forecast_period'] ?? $_GET['forecast_period'] ?? 30; // days
    $analysis_type = $input['analysis_type'] ?? $_GET['analysis_type'] ?? 'demand'; // demand, capacity, reorder

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

    // Generate forecasting and planning analysis
    $forecasting_analysis = generateForecastingAnalysis($conn, $current_user_id, $current_user_role, 
        $warehouse_id, $forecast_period, $analysis_type);

    print_success("Warehouse forecasting analysis retrieved successfully.", $forecasting_analysis);

} catch (Exception $e) {
    print_failure("Error: " . $e->getMessage());
}

function generateForecastingAnalysis($conn, $current_user_id, $current_user_role, $warehouse_id = null, 
    $forecast_period = 30, $analysis_type = 'demand') {
    
    // Get historical data for forecasting
    $historical_data = getHistoricalData($conn, $warehouse_id, $forecast_period * 3); // 3x period for historical analysis
    
    // Generate different types of forecasts
    $forecasts = [];
    
    switch ($analysis_type) {
        case 'demand':
            $forecasts = generateDemandForecast($conn, $warehouse_id, $forecast_period, $historical_data);
            break;
        case 'capacity':
            $forecasts = generateCapacityForecast($conn, $warehouse_id, $forecast_period, $historical_data);
            break;
        case 'reorder':
            $forecasts = generateReorderForecast($conn, $warehouse_id, $forecast_period, $historical_data);
            break;
        case 'all':
        default:
            $forecasts = [
                'demand_forecast' => generateDemandForecast($conn, $warehouse_id, $forecast_period, $historical_data),
                'capacity_forecast' => generateCapacityForecast($conn, $warehouse_id, $forecast_period, $historical_data),
                'reorder_forecast' => generateReorderForecast($conn, $warehouse_id, $forecast_period, $historical_data)
            ];
            break;
    }
    
    // Generate strategic recommendations
    $strategic_recommendations = generateStrategicRecommendations($forecasts, $historical_data);
    
    // Risk analysis
    $risk_analysis = generateRiskAnalysis($conn, $warehouse_id, $forecasts, $historical_data);
    
    // Optimization opportunities
    $optimization_opportunities = identifyOptimizationOpportunities($forecasts, $historical_data);

    return [
        'forecasts' => $forecasts,
        'historical_baseline' => $historical_data['summary'],
        'strategic_recommendations' => $strategic_recommendations,
        'risk_analysis' => $risk_analysis,
        'optimization_opportunities' => $optimization_opportunities,
        'forecast_parameters' => [
            'period_days' => $forecast_period,
            'analysis_type' => $analysis_type,
            'confidence_level' => 85, // Default confidence level
            'generated_at' => date('Y-m-d H:i:s')
        ]
    ];
}

function getHistoricalData($conn, $warehouse_id = null, $days_back = 90) {
    $warehouse_filter = $warehouse_id ? "AND il.inventory_log_warehouse_id = $warehouse_id" : "";
    
    // Get historical movement data
    $historical_sql = "SELECT 
        DATE(il.inventory_log_date) as movement_date,
        il.inventory_log_warehouse_id,
        w.warehouse_name,
        il.inventory_log_variant_id,
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        COALESCE(c.categories_name, 'غير محدد') as category_name,
        
        -- Movement metrics
        COUNT(il.inventory_log_id) as movement_count,
        SUM(CASE WHEN il.inventory_log_quantity_change > 0 THEN il.inventory_log_quantity_change ELSE 0 END) as total_inbound,
        SUM(CASE WHEN il.inventory_log_quantity_change < 0 THEN ABS(il.inventory_log_quantity_change) ELSE 0 END) as total_outbound,
        AVG(il.inventory_log_current_quantity) as avg_inventory_level,
        
        -- Value metrics
        SUM(ABS(il.inventory_log_quantity_change) * COALESCE(pv.variant_unit_price, 0)) as movement_value,
        
        -- Movement types
        COUNT(CASE WHEN il.inventory_log_type = 'sale' THEN 1 END) as sales_movements,
        COUNT(CASE WHEN il.inventory_log_type IN ('transfer_in', 'transfer_out') THEN 1 END) as transfer_movements,
        COUNT(CASE WHEN il.inventory_log_type = 'goods_receipt' THEN 1 END) as receipt_movements
        
    FROM inventory_logs il
    LEFT JOIN warehouse w ON il.inventory_log_warehouse_id = w.warehouse_id
    LEFT JOIN product_variants pv ON il.inventory_log_variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    LEFT JOIN categories c ON p.products_category_id = c.categories_id
    WHERE il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL ? DAY) $warehouse_filter
    GROUP BY DATE(il.inventory_log_date), il.inventory_log_warehouse_id, il.inventory_log_variant_id
    ORDER BY movement_date DESC, w.warehouse_name, p.products_name";

    $stmt = $conn->prepare($historical_sql);
    $stmt->bind_param("i", $days_back);
    $stmt->execute();
    $result = $stmt->get_result();

    $daily_data = [];
    $product_data = [];
    $warehouse_data = [];
    $summary_stats = [
        'total_days' => 0,
        'avg_daily_movements' => 0,
        'avg_daily_inbound' => 0,
        'avg_daily_outbound' => 0,
        'total_movement_value' => 0,
        'unique_products' => 0,
        'active_warehouses' => 0
    ];

    while ($row = $result->fetch_assoc()) {
        $date = $row['movement_date'];
        $warehouse_id = $row['inventory_log_warehouse_id'];
        $variant_id = $row['inventory_log_variant_id'];
        
        // Daily aggregation
        if (!isset($daily_data[$date])) {
            $daily_data[$date] = [
                'date' => $date,
                'total_movements' => 0,
                'total_inbound' => 0,
                'total_outbound' => 0,
                'total_value' => 0,
                'warehouses_active' => []
            ];
        }
        
        $daily_data[$date]['total_movements'] += $row['movement_count'];
        $daily_data[$date]['total_inbound'] += $row['total_inbound'];
        $daily_data[$date]['total_outbound'] += $row['total_outbound'];
        $daily_data[$date]['total_value'] += $row['movement_value'];
        $daily_data[$date]['warehouses_active'][$warehouse_id] = true;
        
        // Product-level data
        $product_key = $variant_id;
        if (!isset($product_data[$product_key])) {
            $product_data[$product_key] = [
                'variant_id' => $variant_id,
                'product_name' => $row['product_name'],
                'variant_name' => $row['variant_name'],
                'category_name' => $row['category_name'],
                'historical_movements' => [],
                'avg_daily_outbound' => 0,
                'movement_volatility' => 0,
                'seasonal_pattern' => 'stable'
            ];
        }
        
        $product_data[$product_key]['historical_movements'][] = [
            'date' => $date,
            'outbound' => $row['total_outbound'],
            'inbound' => $row['total_inbound'],
            'inventory_level' => $row['avg_inventory_level']
        ];
        
        // Warehouse-level data
        if (!isset($warehouse_data[$warehouse_id])) {
            $warehouse_data[$warehouse_id] = [
                'warehouse_id' => $warehouse_id,
                'warehouse_name' => $row['warehouse_name'],
                'daily_activity' => [],
                'capacity_trend' => 'stable',
                'utilization_pattern' => []
            ];
        }
        
        $warehouse_data[$warehouse_id]['daily_activity'][] = [
            'date' => $date,
            'movements' => $row['movement_count'],
            'inventory_level' => $row['avg_inventory_level'],
            'activity_value' => $row['movement_value']
        ];
    }

    // Calculate summary statistics
    $total_days = count($daily_data);
    if ($total_days > 0) {
        $summary_stats['total_days'] = $total_days;
        $summary_stats['avg_daily_movements'] = round(array_sum(array_column($daily_data, 'total_movements')) / $total_days, 2);
        $summary_stats['avg_daily_inbound'] = round(array_sum(array_column($daily_data, 'total_inbound')) / $total_days, 2);
        $summary_stats['avg_daily_outbound'] = round(array_sum(array_column($daily_data, 'total_outbound')) / $total_days, 2);
        $summary_stats['total_movement_value'] = round(array_sum(array_column($daily_data, 'total_value')), 2);
        $summary_stats['unique_products'] = count($product_data);
        $summary_stats['active_warehouses'] = count($warehouse_data);
    }

    // Calculate additional analytics for each product
    foreach ($product_data as &$product) {
        if (count($product['historical_movements']) > 1) {
            $outbound_values = array_column($product['historical_movements'], 'outbound');
            $product['avg_daily_outbound'] = round(array_sum($outbound_values) / count($outbound_values), 2);
            $product['movement_volatility'] = calculateVolatility($outbound_values);
            $product['seasonal_pattern'] = detectSeasonalPattern($product['historical_movements']);
        }
    }

    return [
        'daily_data' => array_values($daily_data),
        'product_data' => array_values($product_data),
        'warehouse_data' => array_values($warehouse_data),
        'summary' => $summary_stats
    ];
}

function generateDemandForecast($conn, $warehouse_id = null, $forecast_period = 30, $historical_data) {
    $product_forecasts = [];
    $total_forecast = [
        'forecasted_demand' => 0,
        'confidence_intervals' => [],
        'trend_direction' => 'stable',
        'seasonality_detected' => false
    ];
    
    foreach ($historical_data['product_data'] as $product) {
        if (count($product['historical_movements']) < 7) continue; // Need at least a week of data
        
        // Simple moving average forecast
        $recent_movements = array_slice($product['historical_movements'], -14); // Last 14 days
        $recent_outbound = array_column($recent_movements, 'outbound');
        
        $avg_daily_demand = array_sum($recent_outbound) / count($recent_outbound);
        $forecasted_total_demand = $avg_daily_demand * $forecast_period;
        
        // Adjust for trend
        $trend_factor = calculateTrendFactor($recent_outbound);
        $adjusted_forecast = $forecasted_total_demand * $trend_factor;
        
        // Calculate confidence intervals
        $volatility = $product['movement_volatility'];
        $confidence_margin = $adjusted_forecast * ($volatility / 100) * 0.5;
        
        $product_forecast = [
            'variant_id' => $product['variant_id'],
            'product_name' => $product['product_name'],
            'variant_name' => $product['variant_name'],
            'category_name' => $product['category_name'],
            'historical_avg_daily' => $product['avg_daily_outbound'],
            'forecasted_daily' => round($avg_daily_demand, 2),
            'forecasted_total' => round($adjusted_forecast, 2),
            'trend_factor' => $trend_factor,
            'confidence_interval' => [
                'lower' => round($adjusted_forecast - $confidence_margin, 2),
                'upper' => round($adjusted_forecast + $confidence_margin, 2)
            ],
            'volatility_risk' => determineVolatilityRisk($volatility),
            'seasonal_pattern' => $product['seasonal_pattern'],
            'forecast_accuracy_expected' => calculateExpectedAccuracy($volatility, count($recent_movements))
        ];
        
        $product_forecasts[] = $product_forecast;
        $total_forecast['forecasted_demand'] += $adjusted_forecast;
    }
    
    // Overall trend analysis
    $total_forecast['trend_direction'] = analyzeTotalTrend($product_forecasts);
    
    // Sort products by forecasted demand and get top 10
    $sorted_products = $product_forecasts;
    usort($sorted_products, function($a, $b) { return $b['forecasted_total'] <=> $a['forecasted_total']; });
    $total_forecast['high_demand_products'] = array_slice($sorted_products, 0, 10);
    
    return [
        'total_forecast' => $total_forecast,
        'product_forecasts' => $product_forecasts,
        'forecast_summary' => [
            'total_products_analyzed' => count($product_forecasts),
            'total_forecasted_demand' => round($total_forecast['forecasted_demand'], 2),
            'avg_daily_demand' => round($total_forecast['forecasted_demand'] / $forecast_period, 2),
            'high_risk_products' => count(array_filter($product_forecasts, function($p) {
                return $p['volatility_risk'] === 'high';
            }))
        ]
    ];
}

function generateCapacityForecast($conn, $warehouse_id = null, $forecast_period = 30, $historical_data) {
    $capacity_forecasts = [];
    
    foreach ($historical_data['warehouse_data'] as $warehouse) {
        if (count($warehouse['daily_activity']) < 7) continue;
        
        // Analyze capacity utilization trend
        $recent_activity = array_slice($warehouse['daily_activity'], -14);
        $inventory_levels = array_column($recent_activity, 'inventory_level');
        
        $current_avg_level = array_sum($inventory_levels) / count($inventory_levels);
        $capacity_trend = calculateTrendFactor($inventory_levels);
        
        // Forecast future capacity needs
        $projected_inventory_level = $current_avg_level * $capacity_trend;
        $estimated_capacity = estimateWarehouseMaxCapacity($warehouse['warehouse_id']);
        
        $utilization_forecast = $estimated_capacity > 0 ? 
            ($projected_inventory_level / $estimated_capacity) * 100 : 0;
        
        // Calculate when capacity might be reached
        $days_to_capacity = calculateDaysToCapacity($inventory_levels, $estimated_capacity, $capacity_trend);
        
        $capacity_forecast = [
            'warehouse_id' => $warehouse['warehouse_id'],
            'warehouse_name' => $warehouse['warehouse_name'],
            'current_avg_inventory' => round($current_avg_level, 2),
            'projected_inventory' => round($projected_inventory_level, 2),
            'estimated_max_capacity' => $estimated_capacity,
            'current_utilization' => round(($current_avg_level / $estimated_capacity) * 100, 2),
            'forecasted_utilization' => round($utilization_forecast, 2),
            'capacity_trend' => $capacity_trend > 1.1 ? 'increasing' : ($capacity_trend < 0.9 ? 'decreasing' : 'stable'),
            'days_to_capacity' => $days_to_capacity,
            'capacity_alert' => $utilization_forecast > 85 ? 'critical' : ($utilization_forecast > 70 ? 'warning' : 'normal'),
            'recommendations' => generateCapacityRecommendations($utilization_forecast, $capacity_trend, $days_to_capacity)
        ];
        
        $capacity_forecasts[] = $capacity_forecast;
    }
    
    return [
        'warehouse_forecasts' => $capacity_forecasts,
        'system_wide_analysis' => [
            'total_warehouses' => count($capacity_forecasts),
            'warehouses_at_risk' => count(array_filter($capacity_forecasts, function($c) {
                return $c['capacity_alert'] !== 'normal';
            })),
            'avg_utilization_forecast' => count($capacity_forecasts) > 0 ? 
                round(array_sum(array_column($capacity_forecasts, 'forecasted_utilization')) / count($capacity_forecasts), 2) : 0,
            'expansion_needed' => array_filter($capacity_forecasts, function($c) {
                return $c['days_to_capacity'] !== null && $c['days_to_capacity'] < 90;
            })
        ]
    ];
}

function generateReorderForecast($conn, $warehouse_id = null, $forecast_period = 30, $historical_data) {
    $reorder_recommendations = [];
    
    foreach ($historical_data['product_data'] as $product) {
        if (count($product['historical_movements']) < 7) continue;
        
        // Calculate reorder parameters
        $recent_movements = array_slice($product['historical_movements'], -14);
        $recent_outbound = array_column($recent_movements, 'outbound');
        $current_inventory = end($recent_movements)['inventory_level'];
        
        $avg_daily_consumption = array_sum($recent_outbound) / count($recent_outbound);
        $max_daily_consumption = max($recent_outbound);
        $volatility = calculateVolatility($recent_outbound);
        
        // Calculate safety stock (considering volatility)
        $lead_time_days = 7; // Assume 7 days lead time
        $safety_stock = ($max_daily_consumption - $avg_daily_consumption) * $lead_time_days * 1.5;
        
        // Calculate reorder point
        $reorder_point = ($avg_daily_consumption * $lead_time_days) + $safety_stock;
        
        // Calculate EOQ (simplified)
        $annual_demand = $avg_daily_consumption * 365;
        $ordering_cost = 100; // Assumed ordering cost
        $carrying_cost_rate = 0.25; // 25% annually
        
        // Get current unit cost
        $unit_cost = getCurrentUnitCost($conn, $product['variant_id']);
        $carrying_cost = $unit_cost * $carrying_cost_rate;
        
        $eoq = $carrying_cost > 0 ? sqrt((2 * $annual_demand * $ordering_cost) / $carrying_cost) : $avg_daily_consumption * 30;
        
        // Determine if reorder is needed
        $days_until_stockout = $avg_daily_consumption > 0 ? 
            round($current_inventory / $avg_daily_consumption, 1) : 999;
        
        $reorder_needed = $current_inventory <= $reorder_point;
        $urgent_reorder = $days_until_stockout <= $lead_time_days;
        
        $reorder_recommendation = [
            'variant_id' => $product['variant_id'],
            'product_name' => $product['product_name'],
            'variant_name' => $product['variant_name'],
            'category_name' => $product['category_name'],
            'current_inventory' => $current_inventory,
            'avg_daily_consumption' => round($avg_daily_consumption, 2),
            'max_daily_consumption' => round($max_daily_consumption, 2),
            'volatility' => round($volatility, 2),
            'safety_stock' => round($safety_stock, 2),
            'reorder_point' => round($reorder_point, 2),
            'economic_order_quantity' => round($eoq, 2),
            'days_until_stockout' => $days_until_stockout,
            'reorder_needed' => $reorder_needed,
            'urgent_reorder' => $urgent_reorder,
            'priority' => $urgent_reorder ? 'critical' : ($reorder_needed ? 'high' : 'normal'),
            'suggested_order_quantity' => round(max($eoq, $reorder_point - $current_inventory), 2),
            'cost_analysis' => [
                'unit_cost' => $unit_cost,
                'total_order_value' => round(max($eoq, $reorder_point - $current_inventory) * $unit_cost, 2),
                'carrying_cost_annual' => round($carrying_cost * $current_inventory, 2)
            ]
        ];
        
        $reorder_recommendations[] = $reorder_recommendation;
    }
    
    // Sort by priority
    usort($reorder_recommendations, function($a, $b) {
        $priority_order = ['critical' => 1, 'high' => 2, 'normal' => 3];
        return $priority_order[$a['priority']] - $priority_order[$b['priority']];
    });
    
    return [
        'reorder_recommendations' => $reorder_recommendations,
        'summary' => [
            'total_products_analyzed' => count($reorder_recommendations),
            'critical_reorders' => count(array_filter($reorder_recommendations, function($r) {
                return $r['priority'] === 'critical';
            })),
            'high_priority_reorders' => count(array_filter($reorder_recommendations, function($r) {
                return $r['priority'] === 'high';
            })),
            'total_suggested_order_value' => round(array_sum(array_column($reorder_recommendations, 'cost_analysis'))),
            'products_needing_immediate_action' => array_filter($reorder_recommendations, function($r) {
                return $r['urgent_reorder'];
            })
        ]
    ];
}

function generateStrategicRecommendations($forecasts, $historical_data) {
    $recommendations = [];
    
    // Demand-based recommendations
    if (isset($forecasts['demand_forecast'])) {
        $high_demand_products = $forecasts['demand_forecast']['total_forecast']['high_demand_products'] ?? [];
        if (!empty($high_demand_products)) {
            $recommendations[] = [
                'category' => 'demand_management',
                'priority' => 'high',
                'title' => 'تحسين إدارة الطلب',
                'description' => 'التركيز على الأصناف عالية الطلب وتحسين توفرها',
                'action_items' => [
                    'زيادة مستويات الأمان للأصناف عالية الطلب',
                    'تحسين عمليات التنبؤ والتخطيط',
                    'مراجعة شروط الموردين للأصناف الحرجة'
                ],
                'expected_impact' => 'تحسين مستوى الخدمة وتقليل نفاد المخزون'
            ];
        }
    }
    
    // Capacity-based recommendations
    if (isset($forecasts['capacity_forecast'])) {
        $at_risk_warehouses = $forecasts['capacity_forecast']['system_wide_analysis']['warehouses_at_risk'] ?? 0;
        if ($at_risk_warehouses > 0) {
            $recommendations[] = [
                'category' => 'capacity_planning',
                'priority' => 'medium',
                'title' => 'تخطيط السعة التخزينية',
                'description' => "يوجد {$at_risk_warehouses} مستودع يقترب من الامتلاء",
                'action_items' => [
                    'تقييم إمكانيات التوسع في المستودعات الحرجة',
                    'إعادة توزيع المخزون بين المستودعات',
                    'تحسين كفاءة استغلال المساحات'
                ],
                'expected_impact' => 'تجنب اختناقات السعة وتحسين التدفق'
            ];
        }
    }
    
    // Reorder-based recommendations
    if (isset($forecasts['reorder_forecast'])) {
        $critical_reorders = $forecasts['reorder_forecast']['summary']['critical_reorders'] ?? 0;
        if ($critical_reorders > 0) {
            $recommendations[] = [
                'category' => 'inventory_management',
                'priority' => 'critical',
                'title' => 'إعادة ترتيب عاجلة للمخزون',
                'description' => "يوجد {$critical_reorders} صنف يحتاج طلب عاجل",
                'action_items' => [
                    'معالجة الطلبات العاجلة فوراً',
                    'مراجعة مستويات إعادة الطلب',
                    'تحسين التواصل مع الموردين'
                ],
                'expected_impact' => 'تجنب نفاد المخزون وضمان الاستمرارية'
            ];
        }
    }
    
    // Optimization recommendations based on historical patterns
    $avg_volatility = calculateAverageVolatility($historical_data['product_data']);
    if ($avg_volatility > 30) { // High volatility threshold
        $recommendations[] = [
            'category' => 'risk_management',
            'priority' => 'medium',
            'title' => 'إدارة التقلبات في الطلب',
            'description' => 'مستوى التقلب في الطلب مرتفع',
            'action_items' => [
                'تطبيق نماذج تنبؤ أكثر تطوراً',
                'زيادة مرونة سلسلة التوريد',
                'تنويع قاعدة الموردين'
            ],
            'expected_impact' => 'تقليل مخاطر التقلبات وتحسين الاستقرار'
        ];
    }
    
    return $recommendations;
}

function generateRiskAnalysis($conn, $warehouse_id = null, $forecasts, $historical_data) {
    $risks = [];
    
    // Stockout risk analysis
    if (isset($forecasts['reorder_forecast'])) {
        $critical_items = count(array_filter($forecasts['reorder_forecast']['reorder_recommendations'], function($r) {
            return $r['days_until_stockout'] <= 7;
        }));
        
        if ($critical_items > 0) {
            $risks[] = [
                'type' => 'stockout_risk',
                'level' => 'high',
                'title' => 'مخاطر نفاد المخزون',
                'description' => "{$critical_items} صنف معرض لنفاد المخزون خلال أسبوع",
                'probability' => 85,
                'impact' => 'high',
                'mitigation_strategies' => [
                    'تسريع أوامر الشراء العاجلة',
                    'البحث عن موردين بديلين',
                    'إعادة توزيع المخزون بين المستودعات'
                ]
            ];
        }
    }
    
    // Capacity overflow risk
    if (isset($forecasts['capacity_forecast'])) {
        $critical_capacity = array_filter($forecasts['capacity_forecast']['warehouse_forecasts'], function($w) {
            return $w['forecasted_utilization'] > 90;
        });
        
        if (!empty($critical_capacity)) {
            $risks[] = [
                'type' => 'capacity_risk',
                'level' => 'medium',
                'title' => 'مخاطر امتلاء المستودعات',
                'description' => count($critical_capacity) . ' مستودع قد يمتلئ قريباً',
                'probability' => 70,
                'impact' => 'medium',
                'mitigation_strategies' => [
                    'تخطيط توسعات المستودعات',
                    'تحسين كفاءة التخزين',
                    'تسريع دوران المخزون البطيء'
                ]
            ];
        }
    }
    
    // Demand volatility risk
    $high_volatility_products = array_filter($historical_data['product_data'], function($p) {
        return $p['movement_volatility'] > 50;
    });
    
    if (count($high_volatility_products) > 0) {
        $risks[] = [
            'type' => 'volatility_risk',
            'level' => 'medium',
            'title' => 'مخاطر تقلبات الطلب',
            'description' => count($high_volatility_products) . ' منتج لديه تقلبات عالية في الطلب',
            'probability' => 60,
            'impact' => 'medium',
            'mitigation_strategies' => [
                'زيادة مستويات الأمان',
                'تحسين دقة التنبؤات',
                'تطوير مرونة سلسلة التوريد'
            ]
        ];
    }
    
    // Financial risk (high inventory value)
    $total_inventory_value = $historical_data['summary']['total_movement_value'] ?? 0;
    if ($total_inventory_value > 1000000) { // Threshold for high value
        $risks[] = [
            'type' => 'financial_risk',
            'level' => 'low',
            'title' => 'مخاطر القيمة المالية العالية',
            'description' => 'قيمة المخزون الإجمالية مرتفعة',
            'probability' => 30,
            'impact' => 'high',
            'mitigation_strategies' => [
                'تحسين دوران المخزون',
                'مراجعة السياسات التأمينية',
                'تطبيق إجراءات أمان إضافية'
            ]
        ];
    }
    
    return [
        'identified_risks' => $risks,
        'overall_risk_score' => calculateOverallRiskScore($risks),
        'risk_matrix' => generateRiskMatrix($risks),
        'recommended_actions' => prioritizeRiskActions($risks)
    ];
}

function identifyOptimizationOpportunities($forecasts, $historical_data) {
    $opportunities = [];
    
    // Inventory reduction opportunities
    $slow_movers = array_filter($historical_data['product_data'], function($p) {
        return $p['avg_daily_outbound'] < 0.1 && count($p['historical_movements']) > 14;
    });
    
    if (!empty($slow_movers)) {
        $total_slow_value = array_sum(array_map(function($p) {
            return end($p['historical_movements'])['inventory_level'] * 10; // Estimated value
        }, $slow_movers));
        
        $opportunities[] = [
            'type' => 'inventory_reduction',
            'title' => 'تقليل المخزون بطيء الحركة',
            'description' => count($slow_movers) . ' منتج بطيء الحركة',
            'potential_savings' => round($total_slow_value * 0.2, 2), // 20% of inventory value
            'implementation_difficulty' => 'medium',
            'timeframe' => '3-6 months',
            'action_steps' => [
                'مراجعة الأصناف بطيئة الحركة',
                'تطبيق استراتيجيات تصريف',
                'تحسين عمليات الشراء'
            ]
        ];
    }
    
    // Space utilization optimization
    if (isset($forecasts['capacity_forecast'])) {
        $underutilized_warehouses = array_filter($forecasts['capacity_forecast']['warehouse_forecasts'], function($w) {
            return $w['current_utilization'] < 50;
        });
        
        if (!empty($underutilized_warehouses)) {
            $opportunities[] = [
                'type' => 'space_optimization',
                'title' => 'تحسين استغلال المساحات',
                'description' => count($underutilized_warehouses) . ' مستودع غير مستغل بالكامل',
                'potential_savings' => 50000, // Estimated cost savings
                'implementation_difficulty' => 'low',
                'timeframe' => '1-3 months',
                'action_steps' => [
                    'إعادة تنظيم تخطيط المستودعات',
                    'دمج العمليات في مستودعات أقل',
                    'تأجير المساحات الفائضة'
                ]
            ];
        }
    }
    
    // Automation opportunities
    $high_movement_products = array_filter($historical_data['product_data'], function($p) {
        return $p['avg_daily_outbound'] > 10;
    });
    
    if (count($high_movement_products) > 20) {
        $opportunities[] = [
            'type' => 'automation',
            'title' => 'فرص الأتمتة',
            'description' => 'عدد كبير من المنتجات عالية الحركة',
            'potential_savings' => 100000, // Labor cost savings
            'implementation_difficulty' => 'high',
            'timeframe' => '6-12 months',
            'action_steps' => [
                'دراسة جدوى أنظمة الأتمتة',
                'تطبيق أتمتة تدريجية',
                'تدريب الموظفين على الأنظمة الجديدة'
            ]
        ];
    }
    
    // Process optimization
    $total_adjustments = array_sum(array_map(function($wh) {
        return array_sum(array_filter(array_column($wh['daily_activity'], 'movements'), function($m) {
            return strpos($m, 'adjustment') !== false;
        }));
    }, $historical_data['warehouse_data']));
    
    if ($total_adjustments > 100) {
        $opportunities[] = [
            'type' => 'process_improvement',
            'title' => 'تحسين العمليات',
            'description' => 'عدد مرتفع من تسويات المخزون',
            'potential_savings' => 25000, // Process efficiency savings
            'implementation_difficulty' => 'medium',
            'timeframe' => '2-4 months',
            'action_steps' => [
                'مراجعة إجراءات الاستلام والتسليم',
                'تطبيق أنظمة تتبع أفضل',
                'تدريب الموظفين على الدقة'
            ]
        ];
    }
    
    return [
        'opportunities' => $opportunities,
        'total_potential_savings' => array_sum(array_column($opportunities, 'potential_savings')),
        'prioritized_opportunities' => usort($opportunities, function($a, $b) {
            return $b['potential_savings'] <=> $a['potential_savings'];
        })
    ];
}

// Helper functions
function calculateVolatility($values) {
    if (count($values) < 2) return 0;
    
    $mean = array_sum($values) / count($values);
    $variance = array_sum(array_map(function($x) use ($mean) {
        return pow($x - $mean, 2);
    }, $values)) / count($values);
    
    $std_dev = sqrt($variance);
    return $mean > 0 ? ($std_dev / $mean) * 100 : 0;
}

function calculateTrendFactor($values) {
    if (count($values) < 2) return 1;
    
    $first_half = array_slice($values, 0, ceil(count($values) / 2));
    $second_half = array_slice($values, floor(count($values) / 2));
    
    $first_avg = array_sum($first_half) / count($first_half);
    $second_avg = array_sum($second_half) / count($second_half);
    
    return $first_avg > 0 ? $second_avg / $first_avg : 1;
}

function detectSeasonalPattern($movements) {
    // Simplified seasonal detection
    if (count($movements) < 28) return 'insufficient_data';
    
    $weekly_averages = [];
    foreach ($movements as $movement) {
        $week = date('W', strtotime($movement['date']));
        $weekly_averages[$week] = ($weekly_averages[$week] ?? 0) + $movement['outbound'];
    }
    
    $volatility = calculateVolatility(array_values($weekly_averages));
    
    if ($volatility > 30) return 'seasonal';
    if ($volatility > 15) return 'moderate_variation';
    return 'stable';
}

function determineVolatilityRisk($volatility) {
    if ($volatility > 50) return 'high';
    if ($volatility > 25) return 'medium';
    return 'low';
}

function calculateExpectedAccuracy($volatility, $data_points) {
    $base_accuracy = 85;
    $volatility_penalty = $volatility * 0.3;
    $data_bonus = min(15, $data_points * 0.5);
    
    return max(50, min(95, $base_accuracy - $volatility_penalty + $data_bonus));
}

function analyzeTotalTrend($product_forecasts) {
    $trend_factors = array_column($product_forecasts, 'trend_factor');
    $avg_trend = array_sum($trend_factors) / count($trend_factors);
    
    if ($avg_trend > 1.1) return 'strong_growth';
    if ($avg_trend > 1.05) return 'moderate_growth';
    if ($avg_trend < 0.9) return 'declining';
    if ($avg_trend < 0.95) return 'moderate_decline';
    return 'stable';
}

function estimateWarehouseMaxCapacity($warehouse_id) {
    // Simplified capacity estimation
    return 10000; // Default capacity
}

function calculateDaysToCapacity($inventory_levels, $max_capacity, $trend_factor) {
    if ($trend_factor <= 1) return null; // Not growing
    
    $current_level = end($inventory_levels);
    $daily_growth = ($current_level * ($trend_factor - 1)) / count($inventory_levels);
    
    if ($daily_growth <= 0) return null;
    
    $remaining_capacity = $max_capacity - $current_level;
    return $remaining_capacity > 0 ? ceil($remaining_capacity / $daily_growth) : 0;
}

function generateCapacityRecommendations($utilization, $trend_factor, $days_to_capacity) {
    $recommendations = [];
    
    if ($utilization > 85) {
        $recommendations[] = 'توسيع المستودع أو إيجاد مساحة إضافية';
    }
    
    if ($days_to_capacity && $days_to_capacity < 60) {
        $recommendations[] = 'التخطيط الفوري لزيادة السعة';
    }
    
    if ($trend_factor > 1.2) {
        $recommendations[] = 'مراجعة استراتيجية النمو والتوسع';
    }
    
    return empty($recommendations) ? ['المستودع يعمل بكفاءة جيدة'] : $recommendations;
}

function getCurrentUnitCost($conn, $variant_id) {
    $sql = "SELECT variant_cost_price FROM product_variants WHERE variant_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $variant_id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    
    return $result ? $result['variant_cost_price'] : 0;
}

function calculateAverageVolatility($product_data) {
    $volatilities = array_column($product_data, 'movement_volatility');
    return count($volatilities) > 0 ? array_sum($volatilities) / count($volatilities) : 0;
}

function calculateOverallRiskScore($risks) {
    $weight_map = ['high' => 3, 'medium' => 2, 'low' => 1];
    $total_score = 0;
    
    foreach ($risks as $risk) {
        $level_weight = $weight_map[$risk['level']] ?? 1;
        $probability = $risk['probability'] / 100;
        $impact_weight = $weight_map[$risk['impact']] ?? 1;
        
        $total_score += $level_weight * $probability * $impact_weight;
    }
    
    return round($total_score, 2);
}

function generateRiskMatrix($risks) {
    $matrix = [];
    foreach ($risks as $risk) {
        $matrix[] = [
            'title' => $risk['title'],
            'probability' => $risk['probability'],
            'impact' => $risk['impact'],
            'level' => $risk['level']
        ];
    }
    return $matrix;
}

function prioritizeRiskActions($risks) {
    usort($risks, function($a, $b) {
        $weight_map = ['high' => 3, 'medium' => 2, 'low' => 1];
        $score_a = $weight_map[$a['level']] * $a['probability'];
        $score_b = $weight_map[$b['level']] * $b['probability'];
        return $score_b <=> $score_a;
    });
    
    return array_slice($risks, 0, 5); // Top 5 priority actions
}

?>
