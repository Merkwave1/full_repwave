<?php
require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get parameters from request
    $input = json_decode(file_get_contents('php://input'), true);
    $users_uuid = $input['users_uuid'] ?? $_GET['users_uuid'] ?? null;
    $warehouse_id = $input['warehouse_id'] ?? $_GET['warehouse_id'] ?? null;
    $date_from = $input['date_from'] ?? $_GET['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
    $date_to = $input['date_to'] ?? $_GET['date_to'] ?? date('Y-m-d');
    $movement_type = $input['movement_type'] ?? $_GET['movement_type'] ?? null;
    $variant_id = $input['variant_id'] ?? $_GET['variant_id'] ?? null;

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

    // Generate detailed movement tracking report
    $movement_tracking = generateMovementTrackingReport($conn, $current_user_id, $current_user_role, 
        $warehouse_id, $date_from, $date_to, $movement_type, $variant_id);

    print_success("Movement tracking report retrieved successfully.", $movement_tracking);

} catch (Exception $e) {
    print_failure("Error: " . $e->getMessage());
}

function generateMovementTrackingReport($conn, $current_user_id, $current_user_role, $warehouse_id = null, 
    $date_from = null, $date_to = null, $movement_type = null, $variant_id = null) {
    
    // Build filters
    $filters = ["il.inventory_log_date >= ? AND il.inventory_log_date <= ?"];
    $params = [$date_from, $date_to];
    $types = "ss";
    
    if ($warehouse_id) {
        $filters[] = "il.inventory_log_warehouse_id = ?";
        $params[] = $warehouse_id;
        $types .= "i";
    }
    
    if ($movement_type) {
        $filters[] = "il.inventory_log_type = ?";
        $params[] = $movement_type;
        $types .= "s";
    }
    
    if ($variant_id) {
        $filters[] = "il.inventory_log_variant_id = ?";
        $params[] = $variant_id;
        $types .= "i";
    }
    
    $where_clause = "WHERE " . implode(" AND ", $filters);

    // Get detailed movement logs
    $movements_sql = "SELECT 
        il.inventory_log_id,
        il.inventory_log_type,
        il.inventory_log_quantity_change,
        il.inventory_log_current_quantity,
        il.inventory_log_date,
        il.inventory_log_reference_id,
        il.inventory_log_notes,
        
        -- Warehouse information
        w.warehouse_name,
        w.warehouse_type,
        w.warehouse_code,
        
        -- Product information
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        COALESCE(pv.variant_sku, '') as sku,
        COALESCE(pv.variant_barcode, '') as barcode,
        pv.variant_unit_price,
        pv.variant_cost_price,
        
        -- Category and supplier information
        COALESCE(c.categories_name, 'غير محدد') as category_name,
        COALESCE(s.supplier_name, 'غير محدد') as supplier_name,
        
        -- Packaging information
        COALESCE(pt.packaging_types_name, 'الوحدة الأساسية') as packaging_type,
        
        -- User information
        COALESCE(u.users_name, 'نظام') as performed_by,
        COALESCE(u.users_role, 'system') as user_role,
        
        -- Calculate movement value
        ABS(il.inventory_log_quantity_change * pv.variant_unit_price) as movement_value,
        ABS(il.inventory_log_quantity_change * pv.variant_cost_price) as movement_cost
        
    FROM inventory_logs il
    LEFT JOIN warehouse w ON il.inventory_log_warehouse_id = w.warehouse_id
    LEFT JOIN product_variants pv ON il.inventory_log_variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    LEFT JOIN categories c ON p.products_category_id = c.categories_id
    LEFT JOIN suppliers s ON p.products_supplier_id = s.supplier_id
    LEFT JOIN packaging_types pt ON il.inventory_log_packaging_type_id = pt.packaging_types_id
    LEFT JOIN users u ON il.inventory_log_user_id = u.users_id
    $where_clause
    ORDER BY il.inventory_log_date DESC, il.inventory_log_id DESC
    LIMIT 5000";

    $stmt = $conn->prepare($movements_sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $movements_result = $stmt->get_result();

    $movements = [];
    $summary = [
        'total_movements' => 0,
        'total_in' => 0,
        'total_out' => 0,
        'total_adjustments' => 0,
        'total_value_in' => 0,
        'total_value_out' => 0,
        'by_type' => [],
        'by_warehouse' => [],
        'by_category' => [],
        'by_user' => [],
        'by_date' => [],
        'hourly_distribution' => array_fill(0, 24, 0)
    ];

    while ($row = $movements_result->fetch_assoc()) {
        // Add movement classification
        $row['movement_direction'] = $row['inventory_log_quantity_change'] >= 0 ? 'in' : 'out';
        $row['movement_category'] = classifyMovementType($row['inventory_log_type']);
        
        // Add time analysis
        $movement_time = new DateTime($row['inventory_log_date']);
        $row['hour'] = (int)$movement_time->format('H');
        $row['day_of_week'] = $movement_time->format('w'); // 0 = Sunday
        $row['formatted_date'] = $movement_time->format('Y-m-d H:i:s');
        
        $movements[] = $row;
        
        // Update summary statistics
        $summary['total_movements']++;
        
        $quantity_change = abs($row['inventory_log_quantity_change']);
        $movement_value = $row['movement_value'];
        $movement_type = $row['inventory_log_type'];
        $warehouse_name = $row['warehouse_name'];
        $category_name = $row['category_name'];
        $user_name = $row['performed_by'];
        $date = $movement_time->format('Y-m-d');
        $hour = $row['hour'];
        
        if ($row['inventory_log_quantity_change'] >= 0) {
            $summary['total_in'] += $quantity_change;
            $summary['total_value_in'] += $movement_value;
        } else {
            $summary['total_out'] += $quantity_change;
            $summary['total_value_out'] += $movement_value;
        }
        
        if (in_array($movement_type, ['adjustment_in', 'adjustment_out'])) {
            $summary['total_adjustments'] += $quantity_change;
        }
        
        // Group by type
        if (!isset($summary['by_type'][$movement_type])) {
            $summary['by_type'][$movement_type] = [
                'count' => 0, 'quantity' => 0, 'value' => 0, 
                'in' => 0, 'out' => 0
            ];
        }
        $summary['by_type'][$movement_type]['count']++;
        $summary['by_type'][$movement_type]['quantity'] += $quantity_change;
        $summary['by_type'][$movement_type]['value'] += $movement_value;
        
        if ($row['movement_direction'] === 'in') {
            $summary['by_type'][$movement_type]['in'] += $quantity_change;
        } else {
            $summary['by_type'][$movement_type]['out'] += $quantity_change;
        }
        
        // Group by warehouse
        if (!isset($summary['by_warehouse'][$warehouse_name])) {
            $summary['by_warehouse'][$warehouse_name] = [
                'count' => 0, 'quantity' => 0, 'value' => 0,
                'in' => 0, 'out' => 0
            ];
        }
        $summary['by_warehouse'][$warehouse_name]['count']++;
        $summary['by_warehouse'][$warehouse_name]['quantity'] += $quantity_change;
        $summary['by_warehouse'][$warehouse_name]['value'] += $movement_value;
        
        if ($row['movement_direction'] === 'in') {
            $summary['by_warehouse'][$warehouse_name]['in'] += $quantity_change;
        } else {
            $summary['by_warehouse'][$warehouse_name]['out'] += $quantity_change;
        }
        
        // Group by category
        if (!isset($summary['by_category'][$category_name])) {
            $summary['by_category'][$category_name] = [
                'count' => 0, 'quantity' => 0, 'value' => 0
            ];
        }
        $summary['by_category'][$category_name]['count']++;
        $summary['by_category'][$category_name]['quantity'] += $quantity_change;
        $summary['by_category'][$category_name]['value'] += $movement_value;
        
        // Group by user
        if (!isset($summary['by_user'][$user_name])) {
            $summary['by_user'][$user_name] = [
                'count' => 0, 'quantity' => 0, 'value' => 0
            ];
        }
        $summary['by_user'][$user_name]['count']++;
        $summary['by_user'][$user_name]['quantity'] += $quantity_change;
        $summary['by_user'][$user_name]['value'] += $movement_value;
        
        // Group by date
        if (!isset($summary['by_date'][$date])) {
            $summary['by_date'][$date] = [
                'count' => 0, 'quantity' => 0, 'value' => 0,
                'in' => 0, 'out' => 0
            ];
        }
        $summary['by_date'][$date]['count']++;
        $summary['by_date'][$date]['quantity'] += $quantity_change;
        $summary['by_date'][$date]['value'] += $movement_value;
        
        if ($row['movement_direction'] === 'in') {
            $summary['by_date'][$date]['in'] += $quantity_change;
        } else {
            $summary['by_date'][$date]['out'] += $quantity_change;
        }
        
        // Hourly distribution
        $summary['hourly_distribution'][$hour]++;
    }

    // Generate insights and patterns
    $insights = generateMovementInsights($summary, $movements);
    
    // Get movement velocity analysis
    $velocity_analysis = generateVelocityAnalysis($conn, $warehouse_id, $date_from, $date_to);
    
    // Get exception analysis (unusual movements)
    $exceptions = detectMovementExceptions($movements, $summary);

    return [
        'movements' => $movements,
        'summary' => $summary,
        'insights' => $insights,
        'velocity_analysis' => $velocity_analysis,
        'exceptions' => $exceptions,
        'filters_applied' => [
            'date_from' => $date_from,
            'date_to' => $date_to,
            'warehouse_id' => $warehouse_id,
            'movement_type' => $movement_type,
            'variant_id' => $variant_id
        ]
    ];
}

function classifyMovementType($movement_type) {
    $classifications = [
        'add' => 'إضافة',
        'transfer_out' => 'تحويل خارج',
        'transfer_in' => 'تحويل داخل',
        'adjustment_in' => 'تسوية موجبة',
        'adjustment_out' => 'تسوية سالبة',
        'initial_stock' => 'مخزون أولي',
        'sale' => 'بيع',
        'return' => 'مرتجع',
        'goods_receipt' => 'استلام بضاعة',
        'repack_out' => 'إعادة تعبئة خارج',
        'repack_in' => 'إعادة تعبئة داخل'
    ];
    
    return $classifications[$movement_type] ?? $movement_type;
}

function generateMovementInsights($summary, $movements) {
    $insights = [];
    
    // Movement frequency analysis
    $total_movements = $summary['total_movements'];
    $date_range_days = count($summary['by_date']);
    $avg_movements_per_day = $date_range_days > 0 ? round($total_movements / $date_range_days, 1) : 0;
    
    $insights[] = [
        'type' => 'frequency',
        'title' => 'معدل الحركة',
        'message' => "متوسط {$avg_movements_per_day} حركة يومياً",
        'value' => $avg_movements_per_day
    ];
    
    // Net movement analysis
    $net_quantity = $summary['total_in'] - $summary['total_out'];
    $net_value = $summary['total_value_in'] - $summary['total_value_out'];
    
    $movement_direction = $net_quantity >= 0 ? 'زيادة' : 'نقص';
    $insights[] = [
        'type' => 'net_movement',
        'title' => 'صافي الحركة',
        'message' => "{$movement_direction} صافي قدره " . abs($net_quantity) . " وحدة",
        'quantity' => $net_quantity,
        'value' => $net_value
    ];
    
    // Peak activity analysis
    $peak_hour = array_keys($summary['hourly_distribution'], max($summary['hourly_distribution']))[0];
    $peak_activity_count = max($summary['hourly_distribution']);
    
    $insights[] = [
        'type' => 'peak_activity',
        'title' => 'ذروة النشاط',
        'message' => "أعلى نشاط في الساعة {$peak_hour}:00 ({$peak_activity_count} حركة)",
        'hour' => $peak_hour,
        'count' => $peak_activity_count
    ];
    
    // Most active warehouse
    if (count($summary['by_warehouse']) > 1) {
        $most_active_warehouse = '';
        $max_warehouse_movements = 0;
        
        foreach ($summary['by_warehouse'] as $warehouse => $data) {
            if ($data['count'] > $max_warehouse_movements) {
                $max_warehouse_movements = $data['count'];
                $most_active_warehouse = $warehouse;
            }
        }
        
        $insights[] = [
            'type' => 'most_active_warehouse',
            'title' => 'أكثر المستودعات نشاطاً',
            'message' => "{$most_active_warehouse} ({$max_warehouse_movements} حركة)",
            'warehouse' => $most_active_warehouse,
            'count' => $max_warehouse_movements
        ];
    }
    
    // Movement type distribution
    $most_common_type = '';
    $max_type_count = 0;
    
    foreach ($summary['by_type'] as $type => $data) {
        if ($data['count'] > $max_type_count) {
            $max_type_count = $data['count'];
            $most_common_type = $type;
        }
    }
    
    $type_percentage = round(($max_type_count / $total_movements) * 100, 1);
    $insights[] = [
        'type' => 'common_movement_type',
        'title' => 'أكثر أنواع الحركة',
        'message' => classifyMovementType($most_common_type) . " ({$type_percentage}% من إجمالي الحركات)",
        'movement_type' => $most_common_type,
        'percentage' => $type_percentage
    ];
    
    return $insights;
}

function generateVelocityAnalysis($conn, $warehouse_id = null, $date_from = null, $date_to = null) {
    $warehouse_filter = $warehouse_id ? "AND il.inventory_log_warehouse_id = $warehouse_id" : "";
    
    // Get product movement velocity
    $velocity_sql = "SELECT 
        pv.variant_id,
        COALESCE(p.products_name, 'Unknown Product') as product_name,
        COALESCE(pv.variant_name, 'الأساسي') as variant_name,
        COUNT(il.inventory_log_id) as movement_count,
        SUM(ABS(il.inventory_log_quantity_change)) as total_movement_quantity,
        AVG(ABS(il.inventory_log_quantity_change)) as avg_movement_size,
        MIN(il.inventory_log_date) as first_movement,
        MAX(il.inventory_log_date) as last_movement,
        
        -- Calculate velocity metrics
        COUNT(DISTINCT DATE(il.inventory_log_date)) as active_days,
        SUM(CASE WHEN il.inventory_log_quantity_change > 0 THEN il.inventory_log_quantity_change ELSE 0 END) as total_in,
        SUM(CASE WHEN il.inventory_log_quantity_change < 0 THEN ABS(il.inventory_log_quantity_change) ELSE 0 END) as total_out,
        
        -- Current inventory
        (SELECT inventory_quantity FROM inventory i 
         WHERE i.variant_id = pv.variant_id 
         AND i.warehouse_id = il.inventory_log_warehouse_id 
         LIMIT 1) as current_inventory
         
    FROM inventory_logs il
    LEFT JOIN product_variants pv ON il.inventory_log_variant_id = pv.variant_id
    LEFT JOIN products p ON pv.variant_products_id = p.products_id
    WHERE il.inventory_log_date >= ? AND il.inventory_log_date <= ? $warehouse_filter
    GROUP BY pv.variant_id, il.inventory_log_warehouse_id
    HAVING movement_count > 0
    ORDER BY movement_count DESC, total_movement_quantity DESC";

    $stmt = $conn->prepare($velocity_sql);
    $stmt->bind_param("ss", $date_from, $date_to);
    $stmt->execute();
    $velocity_result = $stmt->get_result();

    $velocity_items = [];
    $velocity_summary = [
        'fast_movers' => [], // >10 movements
        'medium_movers' => [], // 5-10 movements  
        'slow_movers' => [], // 2-4 movements
        'minimal_movers' => [] // 1 movement
    ];

    while ($row = $velocity_result->fetch_assoc()) {
        // Calculate additional metrics
        $movement_count = $row['movement_count'];
        $total_days = max(1, $row['active_days']);
        
        $row['movements_per_day'] = round($movement_count / $total_days, 2);
        $row['turnover_ratio'] = $row['current_inventory'] > 0 ? 
            round($row['total_out'] / $row['current_inventory'], 2) : 0;
        $row['net_change'] = $row['total_in'] - $row['total_out'];
        
        // Days since last movement
        if ($row['last_movement']) {
            $last_movement_date = new DateTime($row['last_movement']);
            $now = new DateTime();
            $row['days_since_last_movement'] = $now->diff($last_movement_date)->days;
        }
        
        // Classify velocity
        if ($movement_count > 10) {
            $row['velocity_class'] = 'سريع الحركة';
            $velocity_summary['fast_movers'][] = $row;
        } elseif ($movement_count >= 5) {
            $row['velocity_class'] = 'متوسط الحركة';
            $velocity_summary['medium_movers'][] = $row;
        } elseif ($movement_count >= 2) {
            $row['velocity_class'] = 'بطيء الحركة';
            $velocity_summary['slow_movers'][] = $row;
        } else {
            $row['velocity_class'] = 'حركة محدودة';
            $velocity_summary['minimal_movers'][] = $row;
        }
        
        $velocity_items[] = $row;
    }

    return [
        'velocity_items' => $velocity_items,
        'summary' => [
            'total_analyzed' => count($velocity_items),
            'fast_movers_count' => count($velocity_summary['fast_movers']),
            'medium_movers_count' => count($velocity_summary['medium_movers']),
            'slow_movers_count' => count($velocity_summary['slow_movers']),
            'minimal_movers_count' => count($velocity_summary['minimal_movers'])
        ],
        'classifications' => $velocity_summary
    ];
}

function detectMovementExceptions($movements, $summary) {
    $exceptions = [];
    
    // Large quantity movements (outliers)
    $all_quantities = array_map(function($m) { 
        return abs($m['inventory_log_quantity_change']); 
    }, $movements);
    
    if (!empty($all_quantities)) {
        $avg_quantity = array_sum($all_quantities) / count($all_quantities);
        $std_dev = calculateStandardDeviation($all_quantities);
        $threshold = $avg_quantity + (2 * $std_dev); // 2 standard deviations
        
        $large_movements = array_filter($movements, function($m) use ($threshold) {
            return abs($m['inventory_log_quantity_change']) > $threshold;
        });
        
        if (!empty($large_movements)) {
            $exceptions[] = [
                'type' => 'large_quantity',
                'title' => 'حركات بكميات كبيرة غير اعتيادية',
                'count' => count($large_movements),
                'threshold' => round($threshold, 2),
                'items' => array_slice($large_movements, 0, 10) // Top 10
            ];
        }
    }
    
    // Off-hours movements (outside 8 AM - 6 PM)
    $off_hours_movements = array_filter($movements, function($m) {
        $hour = $m['hour'];
        return $hour < 8 || $hour > 18;
    });
    
    if (!empty($off_hours_movements)) {
        $exceptions[] = [
            'type' => 'off_hours',
            'title' => 'حركات خارج ساعات العمل',
            'count' => count($off_hours_movements),
            'items' => array_slice($off_hours_movements, 0, 20)
        ];
    }
    
    // Rapid consecutive movements (same product, same warehouse, within 1 hour)
    $rapid_movements = [];
    for ($i = 0; $i < count($movements) - 1; $i++) {
        $current = $movements[$i];
        $next = $movements[$i + 1];
        
        if ($current['inventory_log_variant_id'] === $next['inventory_log_variant_id'] &&
            $current['inventory_log_warehouse_id'] === $next['inventory_log_warehouse_id']) {
            
            $time_diff = abs(strtotime($current['inventory_log_date']) - strtotime($next['inventory_log_date']));
            if ($time_diff <= 3600) { // Within 1 hour
                $rapid_movements[] = [$current, $next];
            }
        }
    }
    
    if (!empty($rapid_movements)) {
        $exceptions[] = [
            'type' => 'rapid_consecutive',
            'title' => 'حركات متتالية سريعة',
            'count' => count($rapid_movements),
            'items' => array_slice($rapid_movements, 0, 10)
        ];
    }
    
    // High-value movements
    $high_value_movements = array_filter($movements, function($m) {
        return $m['movement_value'] > 50000; // Movements over 50,000
    });
    
    if (!empty($high_value_movements)) {
        $exceptions[] = [
            'type' => 'high_value',
            'title' => 'حركات عالية القيمة',
            'count' => count($high_value_movements),
            'total_value' => array_sum(array_column($high_value_movements, 'movement_value')),
            'items' => array_slice($high_value_movements, 0, 15)
        ];
    }
    
    return $exceptions;
}

function calculateStandardDeviation($values) {
    $count = count($values);
    if ($count === 0) return 0;
    
    $mean = array_sum($values) / $count;
    $sum_squares = array_sum(array_map(function($x) use ($mean) {
        return pow($x - $mean, 2);
    }, $values));
    
    return sqrt($sum_squares / $count);
}

?>
