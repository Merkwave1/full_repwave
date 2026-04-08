<?php
require_once '../db_connect.php';

/**
 * Warehouse Reports API Index
 * 
 * This file provides an overview of all available warehouse reporting endpoints
 * and serves as a central access point for warehouse analytics.
 */

try {
    // Get request parameters
    $input = json_decode(file_get_contents('php://input'), true);
    $users_uuid = $input['users_uuid'] ?? $_GET['users_uuid'] ?? null;
    $action = $input['action'] ?? $_GET['action'] ?? 'list_reports';

    if (empty($users_uuid) && $action !== 'list_reports') {
        print_failure("Error: User UUID is required for this action.");
    }

    switch ($action) {
        case 'list_reports':
            $available_reports = getAvailableReports();
            print_success("Available warehouse reports retrieved successfully.", $available_reports);
            break;
            
        case 'dashboard_summary':
            $dashboard_data = generateDashboardSummary($conn, $users_uuid);
            print_success("Warehouse dashboard summary retrieved successfully.", $dashboard_data);
            break;
            
        case 'system_health':
            $health_check = performSystemHealthCheck($conn);
            print_success("Warehouse system health check completed.", $health_check);
            break;
            
        default:
            print_failure("Invalid action specified.");
    }

} catch (Exception $e) {
    print_failure("Error: " . $e->getMessage());
}

function getAvailableReports() {
    return [
        'comprehensive_reports' => [
            'endpoint' => 'reports_comprehensive.php',
            'description' => 'تقارير شاملة للمستودعات',
            'report_types' => [
                'overview' => 'نظرة عامة على المستودعات',
                'inventory_levels' => 'مستويات المخزون',
                'stock_movements' => 'حركة المخزون',
                'warehouse_performance' => 'أداء المستودعات',
                'storage_utilization' => 'استغلال المساحات التخزينية',
                'transfer_analysis' => 'تحليل التحويلات',
                'goods_receipt_tracking' => 'تتبع استلام البضائع',
                'expiry_tracking' => 'تتبع انتهاء الصلاحية'
            ],
            'parameters' => [
                'users_uuid' => 'required - معرف المستخدم',
                'report_type' => 'required - نوع التقرير',
                'warehouse_id' => 'optional - معرف مستودع محدد'
            ]
        ],
        
        'inventory_snapshot' => [
            'endpoint' => 'inventory_snapshot.php',
            'description' => 'لقطة تفصيلية للمخزون الحالي',
            'features' => [
                'تحليل مفصل لكل صنف في المخزون',
                'تصنيف الأصناف حسب الحركة والانتهاء',
                'توصيات للتحسين والتطوير',
                'تحليل الربحية والقيمة'
            ],
            'parameters' => [
                'users_uuid' => 'required - معرف المستخدم',
                'warehouse_id' => 'optional - معرف مستودع محدد'
            ]
        ],
        
        'movement_tracking' => [
            'endpoint' => 'movement_tracking.php',
            'description' => 'تتبع مفصل لحركة المخزون',
            'features' => [
                'تحليل تفصيلي لجميع حركات المخزون',
                'اكتشاف الأنماط والاستثناءات',
                'تحليل سرعة الدوران والأداء',
                'تقارير الشذوذ والحركات غير الطبيعية'
            ],
            'parameters' => [
                'users_uuid' => 'required - معرف المستخدم',
                'warehouse_id' => 'optional - معرف مستودع محدد',
                'date_from' => 'optional - تاريخ البداية (افتراضي: 30 يوم مضت)',
                'date_to' => 'optional - تاريخ النهاية (افتراضي: اليوم)',
                'movement_type' => 'optional - نوع الحركة المحدد',
                'variant_id' => 'optional - معرف صنف محدد'
            ]
        ],
        
        'performance_analysis' => [
            'endpoint' => 'performance_analysis.php',
            'description' => 'تحليل شامل لأداء المستودعات',
            'features' => [
                'مؤشرات الأداء الرئيسية (KPIs)',
                'تحليل الكفاءة التشغيلية',
                'تحليل التكاليف والعائد',
                'مقارنة أداء المستودعات',
                'توصيات التحسين'
            ],
            'parameters' => [
                'users_uuid' => 'required - معرف المستخدم',
                'warehouse_id' => 'optional - معرف مستودع محدد',
                'period' => 'optional - الفترة الزمنية (daily, weekly, monthly, quarterly)'
            ]
        ],
        
        'forecasting_planning' => [
            'endpoint' => 'forecasting_planning.php',
            'description' => 'التنبؤات والتخطيط الاستراتيجي',
            'features' => [
                'تنبؤات الطلب المستقبلي',
                'تخطيط السعة التخزينية',
                'توصيات إعادة الطلب',
                'تحليل المخاطر والفرص',
                'الخطط الاستراتيجية طويلة المدى'
            ],
            'parameters' => [
                'users_uuid' => 'required - معرف المستخدم',
                'warehouse_id' => 'optional - معرف مستودع محدد',
                'forecast_period' => 'optional - فترة التنبؤ بالأيام (افتراضي: 30)',
                'analysis_type' => 'optional - نوع التحليل (demand, capacity, reorder, all)'
            ]
        ],
        
        'dashboard_summary' => [
            'endpoint' => 'dashboard_summary.php',
            'description' => 'لوحة التحكم التنفيذية الشاملة مع ملخصات متنوعة',
            'features' => [
                'الملخص التنفيذي الشامل',
                'لوحة العمليات التشغيلية', 
                'الملخص المالي والتكاليف',
                'مؤشرات الأداء المتقدمة',
                'التنبيهات والإشعارات الذكية'
            ],
            'parameters' => [
                'users_uuid' => 'required - معرف المستخدم',
                'warehouse_id' => 'optional - معرف مستودع محدد',
                'report_type' => 'optional - نوع اللوحة (executive_summary, operational_dashboard, financial_summary, performance_metrics, alerts_notifications)'
            ]
        ]
    ];
}

function generateDashboardSummary($conn, $users_uuid) {
    // Verify user
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $user_data = $stmt_user->get_result()->fetch_assoc();
    $stmt_user->close();

    if (!$user_data) {
        throw new Exception("Invalid User UUID provided.");
    }

    // Get quick summary statistics
    $summary = [];
    
    // Warehouse count and status
    $warehouse_sql = "SELECT 
        COUNT(*) as total_warehouses,
        COUNT(CASE WHEN warehouse_status = 'Active' THEN 1 END) as active_warehouses,
        COUNT(CASE WHEN warehouse_status = 'Inactive' THEN 1 END) as inactive_warehouses
    FROM warehouse";
    
    $warehouse_result = $conn->query($warehouse_sql);
    if ($warehouse_result) {
        $summary['warehouses'] = $warehouse_result->fetch_assoc();
    }
    
    // Inventory summary
    $inventory_sql = "SELECT 
        COUNT(DISTINCT variant_id) as unique_products,
        SUM(inventory_quantity) as total_inventory_units,
        COUNT(CASE WHEN inventory_status = 'In Stock' THEN 1 END) as in_stock_items,
        COUNT(CASE WHEN inventory_status = 'Low Stock' THEN 1 END) as low_stock_items,
        COUNT(CASE WHEN inventory_status = 'Out of Stock' THEN 1 END) as out_of_stock_items
    FROM inventory";
    
    $inventory_result = $conn->query($inventory_sql);
    if ($inventory_result) {
        $summary['inventory'] = $inventory_result->fetch_assoc();
    }
    
    // Today's movements
    $movements_sql = "SELECT 
        COUNT(*) as total_movements,
        COUNT(CASE WHEN inventory_log_quantity_change > 0 THEN 1 END) as inbound_movements,
        COUNT(CASE WHEN inventory_log_quantity_change < 0 THEN 1 END) as outbound_movements
    FROM inventory_logs 
    WHERE DATE(inventory_log_date) = CURDATE()";
    
    $movements_result = $conn->query($movements_sql);
    if ($movements_result) {
        $summary['todays_activity'] = $movements_result->fetch_assoc();
    }
    
    // Alerts and notifications
    $alerts = [];
    
    // Low stock alerts
    $low_stock_count = $summary['inventory']['low_stock_items'] ?? 0;
    if ($low_stock_count > 0) {
        $alerts[] = [
            'type' => 'warning',
            'title' => 'مخزون منخفض',
            'message' => "يوجد {$low_stock_count} صنف بمستوى مخزون منخفض",
            'count' => $low_stock_count
        ];
    }
    
    // Out of stock alerts
    $out_of_stock_count = $summary['inventory']['out_of_stock_items'] ?? 0;
    if ($out_of_stock_count > 0) {
        $alerts[] = [
            'type' => 'error',
            'title' => 'نفاد المخزون',
            'message' => "يوجد {$out_of_stock_count} صنف نافد من المخزون",
            'count' => $out_of_stock_count
        ];
    }
    
    // Check for expiring items (if applicable)
    $expiring_sql = "SELECT COUNT(*) as expiring_count 
                    FROM inventory i
                    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
                    LEFT JOIN products p ON pv.variant_products_id = p.products_id
                    WHERE p.products_expiry_period_in_days IS NOT NULL 
                    AND i.inventory_production_date IS NOT NULL
                    AND DATEDIFF(DATE_ADD(i.inventory_production_date, INTERVAL p.products_expiry_period_in_days DAY), CURDATE()) <= 7
                    AND i.inventory_quantity > 0";
    
    $expiring_result = $conn->query($expiring_sql);
    if ($expiring_result) {
        $expiring_count = $expiring_result->fetch_assoc()['expiring_count'];
        if ($expiring_count > 0) {
            $alerts[] = [
                'type' => 'warning',
                'title' => 'انتهاء صلاحية قريب',
                'message' => "يوجد {$expiring_count} صنف ينتهي خلال أسبوع",
                'count' => $expiring_count
            ];
        }
    }
    
    // Recent activity summary
    $recent_activity_sql = "SELECT 
        inventory_log_type,
        inventory_log_date,
        COUNT(*) as count
    FROM inventory_logs 
    WHERE inventory_log_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY inventory_log_type
    ORDER BY count DESC
    LIMIT 5";
    
    $recent_result = $conn->query($recent_activity_sql);
    $recent_activity = [];
    while ($row = $recent_result->fetch_assoc()) {
        $recent_activity[] = $row;
    }
    
    return [
        'summary_statistics' => $summary,
        'alerts' => $alerts,
        'recent_activity' => $recent_activity,
        'system_status' => [
            'database_connected' => true,
            'last_updated' => date('Y-m-d H:i:s'),
            'total_alerts' => count($alerts)
        ],
        'quick_actions' => [
            [
                'title' => 'عرض المخزون المنخفض',
                'endpoint' => 'reports_comprehensive.php',
                'parameters' => ['report_type' => 'inventory_levels', 'filter' => 'low_stock']
            ],
            [
                'title' => 'تقرير الحركة اليومية',
                'endpoint' => 'movement_tracking.php',
                'parameters' => ['date_from' => date('Y-m-d'), 'date_to' => date('Y-m-d')]
            ],
            [
                'title' => 'تحليل الأداء الشهري',
                'endpoint' => 'performance_analysis.php',
                'parameters' => ['period' => 'monthly']
            ]
        ]
    ];
}

function performSystemHealthCheck($conn) {
    $health_status = [
        'overall_status' => 'healthy',
        'checks' => [],
        'performance_metrics' => [],
        'recommendations' => []
    ];
    
    $issues_found = 0;
    
    // Database connectivity check
    try {
        $conn->query("SELECT 1");
        $health_status['checks'][] = [
            'name' => 'Database Connectivity',
            'status' => 'pass',
            'message' => 'Database connection successful'
        ];
    } catch (Exception $e) {
        $health_status['checks'][] = [
            'name' => 'Database Connectivity',
            'status' => 'fail',
            'message' => 'Database connection failed: ' . $e->getMessage()
        ];
        $issues_found++;
    }
    
    // Check required tables
    $required_tables = ['warehouse', 'inventory', 'inventory_logs', 'product_variants'];
    foreach ($required_tables as $table) {
        $result = $conn->query("SHOW TABLES LIKE '$table'");
        if ($result && $result->num_rows > 0) {
            $health_status['checks'][] = [
                'name' => "Table: $table",
                'status' => 'pass',
                'message' => "Table $table exists"
            ];
        } else {
            $health_status['checks'][] = [
                'name' => "Table: $table",
                'status' => 'fail',
                'message' => "Table $table is missing"
            ];
            $issues_found++;
        }
    }
    
    // Check data consistency
    $consistency_checks = [
        'Orphaned inventory records' => "SELECT COUNT(*) as count FROM inventory i 
                                       LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id 
                                       WHERE pv.variant_id IS NULL",
        'Negative inventory quantities' => "SELECT COUNT(*) as count FROM inventory WHERE inventory_quantity < 0",
        'Missing warehouse references' => "SELECT COUNT(*) as count FROM inventory i 
                                          LEFT JOIN warehouse w ON i.warehouse_id = w.warehouse_id 
                                          WHERE w.warehouse_id IS NULL"
    ];
    
    foreach ($consistency_checks as $check_name => $sql) {
        try {
            $result = $conn->query($sql);
            if ($result) {
                $count = $result->fetch_assoc()['count'];
                if ($count == 0) {
                    $health_status['checks'][] = [
                        'name' => $check_name,
                        'status' => 'pass',
                        'message' => 'No issues found'
                    ];
                } else {
                    $health_status['checks'][] = [
                        'name' => $check_name,
                        'status' => 'warning',
                        'message' => "$count records need attention"
                    ];
                    if ($count > 100) $issues_found++;
                }
            }
        } catch (Exception $e) {
            $health_status['checks'][] = [
                'name' => $check_name,
                'status' => 'error',
                'message' => 'Check failed: ' . $e->getMessage()
            ];
            $issues_found++;
        }
    }
    
    // Performance metrics
    try {
        // Query performance test
        $start_time = microtime(true);
        $conn->query("SELECT COUNT(*) FROM inventory");
        $query_time = (microtime(true) - $start_time) * 1000;
        
        $health_status['performance_metrics'][] = [
            'metric' => 'Average Query Time',
            'value' => round($query_time, 2) . ' ms',
            'status' => $query_time < 100 ? 'good' : ($query_time < 500 ? 'acceptable' : 'slow')
        ];
        
        // Database size check
        $size_result = $conn->query("SELECT 
            ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS db_size_mb 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()");
        
        if ($size_result) {
            $db_size = $size_result->fetch_assoc()['db_size_mb'];
            $health_status['performance_metrics'][] = [
                'metric' => 'Database Size',
                'value' => $db_size . ' MB',
                'status' => $db_size < 1000 ? 'good' : ($db_size < 5000 ? 'acceptable' : 'large')
            ];
        }
        
    } catch (Exception $e) {
        $health_status['performance_metrics'][] = [
            'metric' => 'Performance Check',
            'value' => 'Failed',
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
    
    // Generate recommendations
    if ($issues_found > 0) {
        $health_status['overall_status'] = $issues_found > 5 ? 'critical' : 'warning';
        $health_status['recommendations'][] = 'Review and fix identified issues';
    }
    
    if ($issues_found == 0) {
        $health_status['recommendations'][] = 'System is running optimally';
    }
    
    // Add maintenance recommendations
    $health_status['recommendations'][] = 'Consider regular database optimization';
    $health_status['recommendations'][] = 'Monitor disk space and performance regularly';
    $health_status['recommendations'][] = 'Keep regular backups of warehouse data';
    
    return $health_status;
}

?>
