<?php
require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get users_uuid from request
    $input = json_decode(file_get_contents('php://input'), true);
    $users_uuid = $input['users_uuid'] ?? $_GET['users_uuid'] ?? null;
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

    // Generate warehouse inventory snapshot
    $inventory_snapshot = generateInventorySnapshot($conn, $current_user_id, $current_user_role, $warehouse_id);

    print_success("Warehouse inventory snapshot retrieved successfully.", $inventory_snapshot);

} catch (Exception $e) {
    print_failure("Error: " . $e->getMessage());
}

function generateInventorySnapshot($conn, $current_user_id, $current_user_role, $warehouse_id = null) {
    $warehouse_filter = $warehouse_id ? "AND i.warehouse_id = $warehouse_id" : "";

    // Get detailed inventory snapshot
    $snapshot_sql = "SELECT 
        i.inventory_id,
        i.variant_id,
        i.warehouse_id,
        w.warehouse_name,
        w.warehouse_type,
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        COALESCE(pv.variant_sku, '') as sku,
        COALESCE(pv.variant_barcode, '') as barcode,
        i.inventory_quantity,
        i.inventory_status,
        i.inventory_production_date,
        i.inventory_last_movement_at,
        pv.variant_unit_price,
        pv.variant_cost_price,
        (i.inventory_quantity * pv.variant_unit_price) as inventory_value,
        (i.inventory_quantity * pv.variant_cost_price) as inventory_cost,
        COALESCE(c.categories_name, 'غير محدد') as category_name,
        COALESCE(pt.packaging_types_name, 'الوحدة الأساسية') as packaging_type,
        COALESCE(s.supplier_name, 'غير محدد') as supplier_name,
        -- Calculate days since last movement
        CASE 
            WHEN i.inventory_last_movement_at IS NOT NULL 
            THEN DATEDIFF(NOW(), i.inventory_last_movement_at)
            ELSE NULL 
        END as days_since_movement,
        -- Calculate expiry information
        CASE 
            WHEN p.products_expiry_period_in_days IS NOT NULL AND i.inventory_production_date IS NOT NULL 
            THEN DATEDIFF(DATE_ADD(i.inventory_production_date, INTERVAL p.products_expiry_period_in_days DAY), CURDATE())
            ELSE NULL
        END as days_to_expiry,
        -- Calculate velocity (movement frequency)
        (SELECT COUNT(*) FROM inventory_logs il 
         WHERE il.inventory_log_variant_id = i.variant_id 
         AND il.inventory_log_warehouse_id = i.warehouse_id
         AND il.inventory_log_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as movement_frequency_30d
    FROM inventory i
    LEFT JOIN warehouse w ON i.warehouse_id = w.warehouse_id
    LEFT JOIN product_variants pv ON i.variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    LEFT JOIN categories c ON p.products_category_id = c.categories_id
    LEFT JOIN packaging_types pt ON i.packaging_type_id = pt.packaging_types_id
    LEFT JOIN suppliers s ON p.products_supplier_id = s.supplier_id
    WHERE w.warehouse_status = 'Active' $warehouse_filter
    ORDER BY i.inventory_quantity DESC, w.warehouse_name, p.products_name";

    $snapshot_result = $conn->query($snapshot_sql);
    $inventory_items = [];
    
    // Summary counters
    $summary = [
        'total_items' => 0,
        'total_value' => 0,
        'total_cost' => 0,
        'total_quantity' => 0,
        'by_status' => [],
        'by_category' => [],
        'by_warehouse' => [],
        'by_supplier' => [],
        'expiry_analysis' => [
            'expired' => 0,
            'expiring_7_days' => 0,
            'expiring_30_days' => 0,
            'good' => 0,
            'no_expiry' => 0
        ],
        'movement_analysis' => [
            'fast_moving' => 0,      // >10 movements in 30 days
            'medium_moving' => 0,    // 3-10 movements in 30 days
            'slow_moving' => 0,      // 1-2 movements in 30 days
            'dead_stock' => 0        // 0 movements in 30 days
        ]
    ];

    while ($row = $snapshot_result->fetch_assoc()) {
        // Add calculated fields
        $row['profit_margin'] = $row['variant_unit_price'] > 0 ? 
            round((($row['variant_unit_price'] - $row['variant_cost_price']) / $row['variant_unit_price']) * 100, 2) : 0;
        
        // Classify expiry status
        $days_to_expiry = $row['days_to_expiry'];
        if ($days_to_expiry === null) {
            $row['expiry_status'] = 'غير محدد';
            $summary['expiry_analysis']['no_expiry']++;
        } elseif ($days_to_expiry < 0) {
            $row['expiry_status'] = 'منتهي الصلاحية';
            $summary['expiry_analysis']['expired']++;
        } elseif ($days_to_expiry <= 7) {
            $row['expiry_status'] = 'ينتهي خلال 7 أيام';
            $summary['expiry_analysis']['expiring_7_days']++;
        } elseif ($days_to_expiry <= 30) {
            $row['expiry_status'] = 'ينتهي خلال 30 يوم';
            $summary['expiry_analysis']['expiring_30_days']++;
        } else {
            $row['expiry_status'] = 'جيد';
            $summary['expiry_analysis']['good']++;
        }
        
        // Classify movement velocity
        $movement_freq = $row['movement_frequency_30d'];
        if ($movement_freq > 10) {
            $row['velocity_class'] = 'سريع الحركة';
            $summary['movement_analysis']['fast_moving']++;
        } elseif ($movement_freq >= 3) {
            $row['velocity_class'] = 'متوسط الحركة';
            $summary['movement_analysis']['medium_moving']++;
        } elseif ($movement_freq >= 1) {
            $row['velocity_class'] = 'بطيء الحركة';
            $summary['movement_analysis']['slow_moving']++;
        } else {
            $row['velocity_class'] = 'راكد';
            $summary['movement_analysis']['dead_stock']++;
        }
        
        $inventory_items[] = $row;
        
        // Update summary
        $summary['total_items']++;
        $summary['total_value'] += $row['inventory_value'];
        $summary['total_cost'] += $row['inventory_cost'];
        $summary['total_quantity'] += $row['inventory_quantity'];
        
        // Group by status
        $status = $row['inventory_status'];
        if (!isset($summary['by_status'][$status])) {
            $summary['by_status'][$status] = ['count' => 0, 'value' => 0, 'quantity' => 0];
        }
        $summary['by_status'][$status]['count']++;
        $summary['by_status'][$status]['value'] += $row['inventory_value'];
        $summary['by_status'][$status]['quantity'] += $row['inventory_quantity'];
        
        // Group by category
        $category = $row['category_name'];
        if (!isset($summary['by_category'][$category])) {
            $summary['by_category'][$category] = ['count' => 0, 'value' => 0, 'quantity' => 0];
        }
        $summary['by_category'][$category]['count']++;
        $summary['by_category'][$category]['value'] += $row['inventory_value'];
        $summary['by_category'][$category]['quantity'] += $row['inventory_quantity'];
        
        // Group by warehouse
        $warehouse = $row['warehouse_name'];
        if (!isset($summary['by_warehouse'][$warehouse])) {
            $summary['by_warehouse'][$warehouse] = ['count' => 0, 'value' => 0, 'quantity' => 0];
        }
        $summary['by_warehouse'][$warehouse]['count']++;
        $summary['by_warehouse'][$warehouse]['value'] += $row['inventory_value'];
        $summary['by_warehouse'][$warehouse]['quantity'] += $row['inventory_quantity'];
        
        // Group by supplier
        $supplier = $row['supplier_name'];
        if (!isset($summary['by_supplier'][$supplier])) {
            $summary['by_supplier'][$supplier] = ['count' => 0, 'value' => 0, 'quantity' => 0];
        }
        $summary['by_supplier'][$supplier]['count']++;
        $summary['by_supplier'][$supplier]['value'] += $row['inventory_value'];
        $summary['by_supplier'][$supplier]['quantity'] += $row['inventory_quantity'];
    }

    // Calculate additional insights
    $insights = generateInventoryInsights($summary, $inventory_items);
    
    // Get recommended actions
    $recommendations = generateInventoryRecommendations($inventory_items, $summary);

    return [
        'inventory_items' => $inventory_items,
        'summary' => $summary,
        'insights' => $insights,
        'recommendations' => $recommendations,
        'generated_at' => date('Y-m-d H:i:s'),
        'total_profit_potential' => round($summary['total_value'] - $summary['total_cost'], 2)
    ];
}

function generateInventoryInsights($summary, $inventory_items) {
    $insights = [];
    
    // Value concentration analysis
    $total_value = $summary['total_value'];
    if ($total_value > 0) {
        // Find top 20% of items by value (Pareto principle)
        $sorted_items = $inventory_items;
        usort($sorted_items, function($a, $b) {
            return $b['inventory_value'] <=> $a['inventory_value'];
        });
        
        $top_20_percent_count = ceil(count($sorted_items) * 0.2);
        $top_20_percent_value = array_sum(array_slice(array_column($sorted_items, 'inventory_value'), 0, $top_20_percent_count));
        $value_concentration = round(($top_20_percent_value / $total_value) * 100, 1);
        
        $insights[] = [
            'type' => 'value_concentration',
            'title' => 'تركز القيمة',
            'message' => "أعلى 20% من الأصناف تمثل {$value_concentration}% من إجمالي قيمة المخزون",
            'value' => $value_concentration
        ];
    }
    
    // Stock turnover insights
    $fast_moving_percentage = round(($summary['movement_analysis']['fast_moving'] / $summary['total_items']) * 100, 1);
    $dead_stock_percentage = round(($summary['movement_analysis']['dead_stock'] / $summary['total_items']) * 100, 1);
    
    $insights[] = [
        'type' => 'turnover',
        'title' => 'دوران المخزون',
        'message' => "{$fast_moving_percentage}% من الأصناف سريعة الحركة، {$dead_stock_percentage}% راكدة",
        'fast_moving' => $fast_moving_percentage,
        'dead_stock' => $dead_stock_percentage
    ];
    
    // Expiry risk analysis
    $at_risk_count = $summary['expiry_analysis']['expired'] + $summary['expiry_analysis']['expiring_7_days'];
    $at_risk_percentage = $summary['total_items'] > 0 ? round(($at_risk_count / $summary['total_items']) * 100, 1) : 0;
    
    if ($at_risk_count > 0) {
        $insights[] = [
            'type' => 'expiry_risk',
            'title' => 'مخاطر انتهاء الصلاحية',
            'message' => "{$at_risk_count} صنف في خطر ({$at_risk_percentage}% من المخزون)",
            'count' => $at_risk_count,
            'percentage' => $at_risk_percentage
        ];
    }
    
    // Warehouse distribution analysis
    $warehouse_count = count($summary['by_warehouse']);
    if ($warehouse_count > 1) {
        $max_warehouse_value = max(array_column($summary['by_warehouse'], 'value'));
        $min_warehouse_value = min(array_column($summary['by_warehouse'], 'value'));
        $value_variance = $max_warehouse_value > 0 ? round((($max_warehouse_value - $min_warehouse_value) / $max_warehouse_value) * 100, 1) : 0;
        
        $insights[] = [
            'type' => 'warehouse_distribution',
            'title' => 'توزيع المستودعات',
            'message' => "التباين في قيم المخزون بين المستودعات: {$value_variance}%",
            'variance' => $value_variance
        ];
    }
    
    return $insights;
}

function generateInventoryRecommendations($inventory_items, $summary) {
    $recommendations = [];
    
    // Dead stock recommendations
    $dead_stock_count = $summary['movement_analysis']['dead_stock'];
    if ($dead_stock_count > 0) {
        $recommendations[] = [
            'priority' => 'high',
            'type' => 'dead_stock',
            'title' => 'التعامل مع المخزون الراكد',
            'description' => "يوجد {$dead_stock_count} صنف راكد بدون حركة لمدة 30 يوم",
            'action' => 'مراجعة استراتيجية التسويق أو تقديم خصومات للتخلص من المخزون الراكد',
            'affected_items' => $dead_stock_count
        ];
    }
    
    // Expiry recommendations
    $expired_count = $summary['expiry_analysis']['expired'];
    $expiring_soon_count = $summary['expiry_analysis']['expiring_7_days'];
    
    if ($expired_count > 0) {
        $recommendations[] = [
            'priority' => 'critical',
            'type' => 'expired_items',
            'title' => 'أصناف منتهية الصلاحية',
            'description' => "يوجد {$expired_count} صنف منتهي الصلاحية",
            'action' => 'إزالة فورية من المخزون وتسجيلها كخسائر',
            'affected_items' => $expired_count
        ];
    }
    
    if ($expiring_soon_count > 0) {
        $recommendations[] = [
            'priority' => 'high',
            'type' => 'expiring_soon',
            'title' => 'أصناف تنتهي صلاحيتها قريباً',
            'description' => "يوجد {$expiring_soon_count} صنف ينتهي خلال 7 أيام",
            'action' => 'تقديم خصومات أو ترقيات للبيع السريع',
            'affected_items' => $expiring_soon_count
        ];
    }
    
    // Low stock recommendations
    $low_stock_count = $summary['by_status']['Low Stock']['count'] ?? 0;
    if ($low_stock_count > 0) {
        $recommendations[] = [
            'priority' => 'medium',
            'type' => 'low_stock',
            'title' => 'مستوى مخزون منخفض',
            'description' => "يوجد {$low_stock_count} صنف بمستوى مخزون منخفض",
            'action' => 'مراجعة أوامر الشراء وإعادة التموين',
            'affected_items' => $low_stock_count
        ];
    }
    
    // High value concentration recommendation
    $high_value_items = array_filter($inventory_items, function($item) {
        return $item['inventory_value'] > 10000; // Assuming 10,000 as high value threshold
    });
    
    if (count($high_value_items) > 0) {
        $total_high_value = array_sum(array_column($high_value_items, 'inventory_value'));
        $recommendations[] = [
            'priority' => 'medium',
            'type' => 'high_value_items',
            'title' => 'أصناف عالية القيمة',
            'description' => count($high_value_items) . " صنف عالي القيمة بإجمالي " . number_format($total_high_value, 2) . " جنيه",
            'action' => 'تعزيز أمان المستودع وتأمين إضافي ومراقبة دقيقة',
            'affected_items' => count($high_value_items)
        ];
    }
    
    // Inventory optimization recommendations
    $total_items = $summary['total_items'];
    $fast_moving_percentage = ($summary['movement_analysis']['fast_moving'] / $total_items) * 100;
    
    if ($fast_moving_percentage < 30) {
        $recommendations[] = [
            'priority' => 'low',
            'type' => 'inventory_optimization',
            'title' => 'تحسين تركيبة المخزون',
            'description' => "نسبة الأصناف سريعة الحركة منخفضة ({$fast_moving_percentage}%)",
            'action' => 'مراجعة استراتيجية الشراء والتركيز على الأصناف سريعة الحركة',
            'affected_items' => null
        ];
    }
    
    // Sort recommendations by priority
    $priority_order = ['critical' => 1, 'high' => 2, 'medium' => 3, 'low' => 4];
    usort($recommendations, function($a, $b) use ($priority_order) {
        return $priority_order[$a['priority']] - $priority_order[$b['priority']];
    });
    
    return $recommendations;
}

?>
