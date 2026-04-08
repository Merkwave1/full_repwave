<?php
require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get users_uuid and report_type from request
    $input = json_decode(file_get_contents('php://input'), true);
    $users_uuid = $input['users_uuid'] ?? $_GET['users_uuid'] ?? null;
    $report_type = $input['report_type'] ?? $_GET['report_type'] ?? 'overview';

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

    // Build base products query with role-based filtering (no role restrictions for products)
    $base_where = "";
    $params = [];
    $types = "";

    // Check if required tables exist first
    $tables_check = $conn->query("SHOW TABLES LIKE 'product_variants'");
    if ($tables_check->num_rows === 0) {
        print_failure("Error: Product variants table does not exist.");
    }

    // Let's work with product_variants as the main products since that's what matters
    // First check if product_variants table exists
    $variants_check = $conn->query("SHOW TABLES LIKE 'product_variants'");
    if ($variants_check->num_rows === 0) {
        print_failure("Error: Product variants table does not exist.");
    }

    // Test query on product_variants to see what columns exist
    $sql = "SELECT * FROM product_variants LIMIT 5";
    
    try {
        $test_result = $conn->query($sql);
        if ($test_result) {
            $first_row = $test_result->fetch_assoc();
            $available_columns = $first_row ? array_keys($first_row) : [];
            error_log("Available columns in product_variants: " . implode(', ', $available_columns));
        }
    } catch (Exception $e) {
        error_log("Test query on product_variants failed: " . $e->getMessage());
        print_failure("Error: Cannot access product variants table.");
    }
    
    // Build query for product variants (treating them as products)
    $expected_columns = [
        'variant_id',
        'variant_products_id', 
        'variant_name',
        'variant_sku',
        'variant_barcode',
        'variant_unit_price',
        'variant_cost_price',
        'variant_status',
        'variant_created_at',
        'variant_updated_at'
    ];
    
    $safe_columns = [];
    foreach ($expected_columns as $col) {
        if (in_array($col, $available_columns)) {
            $safe_columns[] = "pv.$col";
        }
    }
    
    // Add defaults for missing columns
    $select_parts = $safe_columns;
    
    if (!in_array('variant_name', $available_columns)) {
        $select_parts[] = "'Default Variant' as variant_name";
    }
    if (!in_array('variant_status', $available_columns)) {
        $select_parts[] = "1 as variant_status";
    }
    if (!in_array('variant_unit_price', $available_columns)) {
        $select_parts[] = "0 as variant_unit_price";
    }
    if (!in_array('variant_created_at', $available_columns)) {
        $select_parts[] = "NOW() as variant_created_at";
    }
    
    // Try to get basic product info if products table exists
    $products_table_exists = $conn->query("SHOW TABLES LIKE 'products'")->num_rows > 0;
    if ($products_table_exists) {
        $select_parts[] = "COALESCE(p.products_name, 'Unknown Product') as products_name";
        $select_parts[] = "COALESCE(p.products_category_id, 0) as products_category_id";
        $select_parts[] = "COALESCE(p.products_brand, '') as products_brand";
        $select_parts[] = "COALESCE(p.products_is_active, 1) as products_is_active";
        
        $sql = "
            SELECT " . implode(', ', $select_parts) . "
            FROM product_variants pv
            LEFT JOIN products p ON pv.variant_products_id = p.products_id
            WHERE 1=1 $base_where
            ORDER BY pv.variant_name, p.products_name
        ";
    } else {
        $select_parts[] = "'Unknown Product' as products_name";
        $select_parts[] = "0 as products_category_id";
        $select_parts[] = "'' as products_brand";
        $select_parts[] = "1 as products_is_active";
        
        $sql = "
            SELECT " . implode(', ', $select_parts) . "
            FROM product_variants pv
            WHERE 1=1 $base_where
            ORDER BY pv.variant_name
        ";
    }
    
    error_log("Final SQL for variants: " . $sql);

    if (!empty($params)) {
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $result = $conn->query($sql);
    }

    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }

    $products = [];
    $products = [];
    while ($row = $result->fetch_assoc()) {
        // Add default values for missing relationships
        $row['base_units_name'] = null;
        $row['supplier_name'] = null;
        $row['variant_count'] = 1; // Each variant is treated as one product
        $row['total_inventory'] = 0; // Default to 0 inventory - will be calculated later
        $row['warehouses_with_stock'] = 0;
        
        // Get actual inventory for this variant if inventory table exists
        $inventory_check = $conn->query("SHOW TABLES LIKE 'inventory'");
        if ($inventory_check->num_rows > 0 && isset($row['variant_id'])) {
            $inventory_sql = "SELECT SUM(inventory_quantity) as total_quantity FROM inventory WHERE variant_id = ?";
            $inventory_stmt = $conn->prepare($inventory_sql);
            if ($inventory_stmt) {
                $inventory_stmt->bind_param("i", $row['variant_id']);
                $inventory_stmt->execute();
                $inventory_result = $inventory_stmt->get_result();
                if ($inventory_result && $inventory_row = $inventory_result->fetch_assoc()) {
                    $row['total_inventory'] = $inventory_row['total_quantity'] ?? 0;
                }
                $inventory_stmt->close();
            }
        }
        
        // Convert category_id to category name if we have the ID and categories table exists
        if (isset($row['products_category_id']) && $row['products_category_id'] && $products_table_exists) {
            // Try to get category name from categories table
            $categories_check = $conn->query("SHOW TABLES LIKE 'categories'");
            if ($categories_check->num_rows > 0) {
                $category_sql = "SELECT categories_name FROM categories WHERE categories_id = ?";
                $category_stmt = $conn->prepare($category_sql);
                if ($category_stmt) {
                    $category_stmt->bind_param("i", $row['products_category_id']);
                    $category_stmt->execute();
                    $category_result = $category_stmt->get_result();
                    if ($category_result && $category_row = $category_result->fetch_assoc()) {
                        $row['products_category'] = $category_row['categories_name'];
                    } else {
                        $row['products_category'] = 'غير محدد';
                    }
                    $category_stmt->close();
                } else {
                    $row['products_category'] = 'غير محدد';
                }
            } else {
                $row['products_category'] = 'غير محدد';
            }
        } else {
            $row['products_category'] = 'غير محدد';
        }
        
        // Map variant fields to product fields for compatibility
        if (isset($row['variant_id'])) {
            $row['products_id'] = $row['variant_id']; // Use variant_id as product_id
        }
        if (isset($row['variant_status'])) {
            $row['products_is_active'] = $row['variant_status'];
        }
        if (isset($row['variant_created_at'])) {
            $row['products_created_at'] = $row['variant_created_at'];
        }
        if (isset($row['variant_updated_at'])) {
            $row['products_updated_at'] = $row['variant_updated_at'];
        }
        
        $products[] = $row;
    }

    if (!empty($params)) {
        $stmt->close();
    }

    // Generate report based on type
    switch ($report_type) {
        case 'overview':
            $report_data = generateOverviewReport($products, $conn, $current_user_id, $current_user_role);
            break;
        case 'inventory':
            $report_data = generateInventoryReport($conn, $current_user_id, $current_user_role);
            break;
        case 'categories':
            $report_data = generateCategoriesReport($products, $conn);
            break;
        case 'suppliers':
            $report_data = generateSuppliersReport($products, $conn);
            break;
        case 'analytics':
            $report_data = generateAnalyticsReport($products, $conn, $current_user_id, $current_user_role);
            break;
        case 'interested_products':
            $report_data = generateInterestedProductsReport($conn, $current_user_id, $current_user_role);
            break;
        case 'stock_levels':
            $report_data = generateStockLevelsReport($conn, $current_user_id, $current_user_role);
            break;
        default:
            $report_data = generateOverviewReport($products, $conn, $current_user_id, $current_user_role);
            break;
    }

    print_success("Products report retrieved successfully.", $report_data);

} catch (Exception $e) {
    print_failure("Error: " . $e->getMessage());
}

function generateInterestedProductsReport($conn, $current_user_id, $current_user_role) {
    $table_check = $conn->query("SHOW TABLES LIKE 'client_interested_products'");
    if ($table_check === false) {
        throw new Exception("Error checking client_interested_products table: " . $conn->error);
    }

    if ($table_check->num_rows === 0) {
        return [
            'summary' => [
                'total_products' => 0,
                'total_interests' => 0,
                'unique_clients' => 0,
                'top_product' => null,
            ],
            'products' => [],
            'categories' => [],
        ];
    }

    $conditions = [];
    $params = [];
    $types = "";

    if ($current_user_role !== 'admin' && $current_user_role !== 'store_keeper') {
        $conditions[] = 'c.clients_rep_user_id = ?';
        $params[] = $current_user_id;
        $types .= 'i';
    }

    $whereClause = '';
    if (!empty($conditions)) {
        $whereClause = 'WHERE ' . implode(' AND ', $conditions);
    }

    $productsTableCheck = $conn->query("SHOW TABLES LIKE 'products'");
    if ($productsTableCheck === false) {
        throw new Exception('Error checking products table: ' . $conn->error);
    }
    $hasProductsTable = $productsTableCheck->num_rows > 0;
    $productsTableCheck->free();

    $categoriesTableCheck = $conn->query("SHOW TABLES LIKE 'categories'");
    if ($categoriesTableCheck === false) {
        throw new Exception('Error checking categories table: ' . $conn->error);
    }
    $hasCategoriesTable = $categoriesTableCheck->num_rows > 0;
    $categoriesTableCheck->free();

    $hasProductsCategoryColumn = false;
    $hasProductsCategoryIdColumn = false;
    if ($hasProductsTable) {
        $categoryColumnResult = $conn->query("SHOW COLUMNS FROM products LIKE 'products_category'");
        if ($categoryColumnResult) {
            $hasProductsCategoryColumn = $categoryColumnResult->num_rows > 0;
            $categoryColumnResult->free();
        }

        $categoryIdColumnResult = $conn->query("SHOW COLUMNS FROM products LIKE 'products_category_id'");
        if ($categoryIdColumnResult) {
            $hasProductsCategoryIdColumn = $categoryIdColumnResult->num_rows > 0;
            $categoryIdColumnResult->free();
        }
    }

    $categoryExpressionParts = [];
    $selectColumns = [
        "cip.products_id"
    ];
    $joinClauses = [
        "JOIN clients c ON c.clients_id = cip.client_id"
    ];

    if ($hasProductsTable) {
        $selectColumns[] = "MAX(COALESCE(p.products_name, CONCAT('منتج رقم ', cip.products_id))) AS products_name";
        $selectColumns[] = "MAX(COALESCE(p.products_brand, '')) AS products_brand";
        $selectColumns[] = "MAX(COALESCE(p.products_image_url, '')) AS products_image_url";
        $joinClauses[] = "LEFT JOIN products p ON p.products_id = cip.products_id";

        if ($hasCategoriesTable && $hasProductsCategoryIdColumn) {
            $joinClauses[] = "LEFT JOIN categories cat ON cat.categories_id = p.products_category_id";
            $categoryExpressionParts[] = "cat.categories_name";
        }

        if ($hasProductsCategoryColumn) {
            $categoryExpressionParts[] = "p.products_category";
        }
    } else {
        $selectColumns[] = "MAX(CONCAT('منتج رقم ', cip.products_id)) AS products_name";
        $selectColumns[] = "MAX('') AS products_brand";
        $selectColumns[] = "MAX('') AS products_image_url";
    }

    if (!empty($categoryExpressionParts)) {
        $categoryExpression = "MAX(COALESCE(" . implode(', ', $categoryExpressionParts) . ", 'غير مصنف')) AS products_category";
    } else {
        $categoryExpression = "MAX('غير مصنف') AS products_category";
    }
    $selectColumns[] = $categoryExpression;

    $selectColumns[] = "COUNT(*) AS interest_entries_count";
    $selectColumns[] = "COUNT(DISTINCT cip.client_id) AS interested_clients_count";

    $sql = "
        SELECT
            " . implode(",\n            ", $selectColumns) . "
        FROM client_interested_products cip
        " . implode("\n        ", $joinClauses) . "
        $whereClause
        GROUP BY cip.products_id
        ORDER BY interested_clients_count DESC, products_name ASC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Prepare failed for interested products summary: ' . $conn->error);
    }

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $products = [];
    $totalInterestEntries = 0;
    $categorySet = [];

    while ($row = $result->fetch_assoc()) {
        $row['products_id'] = isset($row['products_id']) ? (int)$row['products_id'] : null;
        $row['interested_clients_count'] = isset($row['interested_clients_count']) ? (int)$row['interested_clients_count'] : 0;
        $row['interest_entries_count'] = isset($row['interest_entries_count']) ? (int)$row['interest_entries_count'] : $row['interested_clients_count'];
        $row['products_brand'] = $row['products_brand'] ?? '';
        $row['products_category'] = $row['products_category'] ?? 'غير مصنف';
        $row['products_image_url'] = $row['products_image_url'] ?? '';

        $totalInterestEntries += $row['interested_clients_count'];

        if (!empty($row['products_category'])) {
            $categorySet[$row['products_category']] = true;
        }

        $products[] = $row;
    }

    $stmt->close();

    $uniqueClientsCount = 0;
    $uniqueSql = "
        SELECT COUNT(DISTINCT cip.client_id) AS unique_clients
        FROM client_interested_products cip
        JOIN clients c ON c.clients_id = cip.client_id
        $whereClause
    ";

    if (!empty($params)) {
        $uniqueStmt = $conn->prepare($uniqueSql);
        if (!$uniqueStmt) {
            throw new Exception('Prepare failed for unique interested clients: ' . $conn->error);
        }
        $uniqueStmt->bind_param($types, ...$params);
        $uniqueStmt->execute();
        $uniqueResult = $uniqueStmt->get_result()->fetch_assoc();
        $uniqueStmt->close();
    } else {
        $uniqueResult = $conn->query($uniqueSql)->fetch_assoc();
    }

    if (is_array($uniqueResult) && array_key_exists('unique_clients', $uniqueResult)) {
        $uniqueClientsCount = (int)$uniqueResult['unique_clients'];
    }

    $topProductSummary = null;
    if (!empty($products)) {
        $topProduct = $products[0];
        $topProductSummary = [
            'products_id' => $topProduct['products_id'],
            'products_name' => $topProduct['products_name'],
            'interested_clients_count' => $topProduct['interested_clients_count'],
        ];
    }

    $summary = [
        'total_products' => count($products),
        'total_interests' => $totalInterestEntries,
        'unique_clients' => $uniqueClientsCount,
        'top_product' => $topProductSummary,
    ];

    $categories = array_keys($categorySet);
    sort($categories, SORT_NATURAL | SORT_FLAG_CASE);

    return [
        'summary' => $summary,
        'products' => $products,
        'categories' => $categories,
    ];
}

function generateOverviewReport($products, $conn, $current_user_id, $current_user_role) {
    $total_products = count($products);
    $active_products = count(array_filter($products, fn($p) => $p['products_is_active'] == 1));
    $inactive_products = $total_products - $active_products;
    
    // Calculate products with variants
    $products_with_variants = count(array_filter($products, fn($p) => $p['variant_count'] > 1));
    $simple_products = $total_products - $products_with_variants;
    
    // Calculate inventory summary from inventory table
    $total_inventory_value = 0;
    $products_in_stock = 0;
    
    // Check if inventory table exists
    $inventory_check = $conn->query("SHOW TABLES LIKE 'inventory'");
    if ($inventory_check->num_rows > 0) {
        // Get inventory data
        $inventory_sql = "SELECT 
            pv.variant_id,
            SUM(i.inventory_quantity * COALESCE(pv.variant_unit_price, 0)) as inventory_value,
            SUM(i.inventory_quantity) as total_quantity
        FROM product_variants pv
        LEFT JOIN inventory i ON pv.variant_id = i.variant_id
        WHERE i.inventory_quantity > 0
        GROUP BY pv.variant_id";
        
        $inventory_result = $conn->query($inventory_sql);
        if ($inventory_result) {
            while ($inv_row = $inventory_result->fetch_assoc()) {
                $total_inventory_value += $inv_row['inventory_value'];
                if ($inv_row['total_quantity'] > 0) {
                    $products_in_stock++;
                }
            }
        }
    } else {
        // Fallback: calculate from product data if available
        $total_inventory_value = array_sum(array_map(function($p) {
            return isset($p['total_inventory']) ? $p['total_inventory'] : 0;
        }, $products));
        
        $products_in_stock = count(array_filter($products, function($p) {
            return isset($p['total_inventory']) && $p['total_inventory'] > 0;
        }));
    }
    
    $out_of_stock = $total_products - $products_in_stock;
    
    // Count categories
    $categories = array_unique(array_filter(array_column($products, 'products_category')));
    $total_categories = count($categories);
    
    // Count brands
    $brands = array_unique(array_filter(array_column($products, 'products_brand')));
    $total_brands = count($brands);
    
    // Calculate this period and last period new products (30 days each)
    $now = new DateTime();
    $thirty_days_ago = (clone $now)->modify('-30 days')->format('Y-m-d H:i:s');
    $sixty_days_ago = (clone $now)->modify('-60 days')->format('Y-m-d H:i:s');

    $new_products_last_30_days = count(array_filter($products, function($p) use ($thirty_days_ago) {
        return isset($p['variant_created_at']) && $p['variant_created_at'] >= $thirty_days_ago;
    }));

    $new_products_previous_30_days = count(array_filter($products, function($p) use ($thirty_days_ago, $sixty_days_ago) {
        return isset($p['variant_created_at']) && 
               $p['variant_created_at'] >= $sixty_days_ago && 
               $p['variant_created_at'] < $thirty_days_ago;
    }));

    // Calculate growth rate
    $growth_rate = 0;
    if ($new_products_previous_30_days > 0) {
        $growth_rate = round((($new_products_last_30_days - $new_products_previous_30_days) / $new_products_previous_30_days) * 100, 1);
    } elseif ($new_products_last_30_days > 0) {
        $growth_rate = 100;
    }

    return [
        'total_products' => $total_products,
        'active_products' => $active_products,
        'inactive_products' => $inactive_products,
        'active_percentage' => $total_products > 0 ? round(($active_products / $total_products) * 100, 1) : 0,
        'products_with_variants' => $products_with_variants,
        'simple_products' => $simple_products,
        'total_inventory_value' => round($total_inventory_value, 2),
        'products_in_stock' => $products_in_stock,
        'out_of_stock' => $out_of_stock,
        'stock_percentage' => $total_products > 0 ? round(($products_in_stock / $total_products) * 100, 1) : 0,
        'total_categories' => $total_categories,
        'total_brands' => $total_brands,
        'new_this_month' => $new_products_last_30_days,
        'new_last_month' => $new_products_previous_30_days,
        'growth_rate' => $growth_rate
    ];
}

function generateInventoryReport($conn, $current_user_id, $current_user_role) {
    // Check if required tables exist
    $tables_check = $conn->query("SHOW TABLES LIKE 'inventory'");
    if ($tables_check->num_rows === 0) {
        return [
            'warehouses' => [],
            'status_summary' => [],
            'top_products' => [],
            'total_warehouses' => 0
        ];
    }

    // Check if warehouse table exists
    $warehouse_check = $conn->query("SHOW TABLES LIKE 'warehouse'");
    if ($warehouse_check->num_rows === 0) {
        // Return inventory data without warehouse names
        $status_sql = "SELECT 
                          inventory_status,
                          COUNT(*) as count,
                          SUM(inventory_quantity) as total_quantity
                       FROM inventory 
                       GROUP BY inventory_status";
        
        $status_result = $conn->query($status_sql);
        $status_summary = [];
        while ($row = $status_result->fetch_assoc()) {
            $status_summary[$row['inventory_status']] = [
                'count' => $row['count'],
                'quantity' => $row['total_quantity']
            ];
        }
        
        return [
            'warehouses' => [],
            'status_summary' => $status_summary,
            'top_products' => [],
            'total_warehouses' => 0
        ];
    }

    // Get inventory summary by warehouse
    $sql = "SELECT 
                w.warehouse_name,
                w.warehouse_id,
                COUNT(DISTINCT i.variant_id) as unique_variants,
                SUM(i.inventory_quantity) as total_quantity,
                COUNT(CASE WHEN i.inventory_status = 'In Stock' THEN 1 END) as in_stock_count,
                COUNT(CASE WHEN i.inventory_status = 'Low Stock' THEN 1 END) as low_stock_count,
                COUNT(CASE WHEN i.inventory_status = 'Out of Stock' THEN 1 END) as out_of_stock_count
            FROM warehouse w
            LEFT JOIN inventory i ON w.warehouse_id = i.warehouse_id
            GROUP BY w.warehouse_id
            ORDER BY w.warehouse_name";
    
    $result = $conn->query($sql);
    $warehouses = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $warehouses[] = $row;
        }
    }
    
    // Get inventory by status
    $status_sql = "SELECT 
                      inventory_status,
                      COUNT(*) as count,
                      SUM(inventory_quantity) as total_quantity
                   FROM inventory 
                   GROUP BY inventory_status";
    
    $status_result = $conn->query($status_sql);
    $status_summary = [];
    if ($status_result) {
        while ($row = $status_result->fetch_assoc()) {
            $status_summary[$row['inventory_status']] = [
                'count' => $row['count'],
                'quantity' => $row['total_quantity']
            ];
        }
    }
    
    // Get top products by inventory quantity (simplified query)
    $top_products = [];
    $product_variants_check = $conn->query("SHOW TABLES LIKE 'product_variants'");
    if ($product_variants_check->num_rows > 0) {
        $top_products_sql = "SELECT 
                                COALESCE(p.products_name, 'Unknown Product') as products_name,
                                pv.variant_name,
                                SUM(i.inventory_quantity) as total_quantity,
                                COUNT(DISTINCT i.warehouse_id) as warehouse_count
                             FROM product_variants pv
                             LEFT JOIN products p ON pv.variant_products_id = p.products_id
                             JOIN inventory i ON pv.variant_id = i.variant_id
                             GROUP BY pv.variant_id
                             ORDER BY total_quantity DESC
                             LIMIT 10";
        
        $top_result = $conn->query($top_products_sql);
        if ($top_result) {
            while ($row = $top_result->fetch_assoc()) {
                $top_products[] = $row;
            }
        }
    }
    
    return [
        'warehouses' => $warehouses,
        'status_summary' => $status_summary,
        'top_products' => $top_products,
        'total_warehouses' => count($warehouses)
    ];
}

function generateCategoriesReport($products, $conn) {
    // Group products by category
    $categories = [];
    foreach ($products as $product) {
        $category = $product['products_category'] ?: 'غير محدد';
        if (!isset($categories[$category])) {
            $categories[$category] = [
                'category_name' => $category,
                'product_count' => 0,
                'active_count' => 0,
                'inactive_count' => 0,
                'total_inventory' => 0
            ];
        }
        
        $categories[$category]['product_count']++;
        if ($product['products_is_active']) {
            $categories[$category]['active_count']++;
        } else {
            $categories[$category]['inactive_count']++;
        }
        // Add actual inventory from product data (already calculated above)
        $categories[$category]['total_inventory'] += ($product['total_inventory'] ?? 0);
    }
    
    // Convert to array and sort by product count
    $categories_array = array_values($categories);
    usort($categories_array, function($a, $b) {
        return $b['product_count'] - $a['product_count'];
    });
    
    // Calculate percentages
    $total_products = count($products);
    foreach ($categories_array as &$category) {
        $category['percentage'] = $total_products > 0 ? round(($category['product_count'] / $total_products) * 100, 1) : 0;
    }
    
    return [
        'categories' => $categories_array,
        'total_categories' => count($categories_array)
    ];
}

function generateSuppliersReport($products, $conn) {
    // Check if suppliers table exists
    $suppliers_check = $conn->query("SHOW TABLES LIKE 'suppliers'");
    if ($suppliers_check->num_rows === 0) {
        return [
            'suppliers' => [],
            'total_suppliers' => 0
        ];
    }

    // Get basic supplier information
    $sql = "SELECT 
                supplier_id,
                supplier_name,
                supplier_phone,
                supplier_email,
                0 as product_count,
                0 as active_products,
                0 as total_inventory
            FROM suppliers
            ORDER BY supplier_name";
    
    $result = $conn->query($sql);
    $suppliers = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $suppliers[] = $row;
        }
    }
    
    // Try to count products for each supplier and get inventory data
    if (!empty($suppliers)) {
        foreach ($suppliers as &$supplier) {
            // Count total products (variants) for this supplier
            $product_count_sql = "SELECT COUNT(DISTINCT pv.variant_id) as count 
                                 FROM product_variants pv 
                                 LEFT JOIN products p ON pv.variant_products_id = p.products_id 
                                 WHERE p.products_supplier_id = ?";
            $stmt = $conn->prepare($product_count_sql);
            if ($stmt) {
                $stmt->bind_param("i", $supplier['supplier_id']);
                $stmt->execute();
                $result = $stmt->get_result();
                if ($result) {
                    $count = $result->fetch_assoc()['count'];
                    $supplier['product_count'] = $count;
                }
                $stmt->close();
            }
            
            // Count active products for this supplier
            $active_count_sql = "SELECT COUNT(DISTINCT pv.variant_id) as count 
                                FROM product_variants pv 
                                LEFT JOIN products p ON pv.variant_products_id = p.products_id 
                                WHERE p.products_supplier_id = ? AND pv.variant_status = 1";
            $stmt = $conn->prepare($active_count_sql);
            if ($stmt) {
                $stmt->bind_param("i", $supplier['supplier_id']);
                $stmt->execute();
                $result = $stmt->get_result();
                if ($result) {
                    $count = $result->fetch_assoc()['count'];
                    $supplier['active_products'] = $count;
                }
                $stmt->close();
            }
            
            // Get total inventory for this supplier's products
            $inventory_check = $conn->query("SHOW TABLES LIKE 'inventory'");
            if ($inventory_check->num_rows > 0) {
                $inventory_sql = "SELECT SUM(i.inventory_quantity) as total_inventory 
                                 FROM product_variants pv 
                                 LEFT JOIN products p ON pv.variant_products_id = p.products_id 
                                 LEFT JOIN inventory i ON pv.variant_id = i.variant_id
                                 WHERE p.products_supplier_id = ?";
                $stmt = $conn->prepare($inventory_sql);
                if ($stmt) {
                    $stmt->bind_param("i", $supplier['supplier_id']);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    if ($result) {
                        $inventory_data = $result->fetch_assoc();
                        $supplier['total_inventory'] = $inventory_data['total_inventory'] ?? 0;
                    }
                    $stmt->close();
                }
            }
        }
    }
    
    return [
        'suppliers' => $suppliers,
        'total_suppliers' => count($suppliers)
    ];
}

function generateAnalyticsReport($products, $conn, $current_user_id, $current_user_role) {
    $total_products = count($products);
    
    // Status analysis
    $active_products = count(array_filter($products, fn($p) => $p['products_is_active'] == 1));
    $inactive_products = $total_products - $active_products;
    
    $status_analysis = [
        'active' => $active_products,
        'inactive' => $inactive_products,
        'active_percentage' => $total_products > 0 ? round(($active_products / $total_products) * 100, 1) : 0,
        'inactive_percentage' => $total_products > 0 ? round(($inactive_products / $total_products) * 100, 1) : 0
    ];
    
    // Inventory analysis - get real data from inventory table
    $products_in_stock = 0;
    $out_of_stock = 0;
    $total_inventory_units = 0;
    
    $inventory_check = $conn->query("SHOW TABLES LIKE 'inventory'");
    if ($inventory_check->num_rows > 0) {
        // Get actual inventory data
        $inventory_sql = "SELECT 
            COUNT(DISTINCT CASE WHEN i.inventory_quantity > 0 THEN pv.variant_id END) as in_stock_count,
            COUNT(DISTINCT CASE WHEN i.inventory_quantity = 0 THEN pv.variant_id END) as out_of_stock_count,
            SUM(i.inventory_quantity) as total_units
        FROM product_variants pv
        LEFT JOIN inventory i ON pv.variant_id = i.variant_id";
        
        $inventory_result = $conn->query($inventory_sql);
        if ($inventory_result) {
            $inv_data = $inventory_result->fetch_assoc();
            $products_in_stock = $inv_data['in_stock_count'] ?? 0;
            $out_of_stock = $inv_data['out_of_stock_count'] ?? 0;
            $total_inventory_units = $inv_data['total_units'] ?? 0;
        }
    } else {
        // Fallback to product data
        $products_in_stock = count(array_filter($products, fn($p) => ($p['total_inventory'] ?? 0) > 0));
        $out_of_stock = $total_products - $products_in_stock;
        $total_inventory_units = array_sum(array_map(fn($p) => $p['total_inventory'] ?? 0, $products));
    }
    
    $inventory_analysis = [
        'in_stock' => $products_in_stock,
        'out_of_stock' => $out_of_stock,
        'stock_percentage' => $total_products > 0 ? round(($products_in_stock / $total_products) * 100, 1) : 0,
        'total_inventory_units' => $total_inventory_units
    ];
    
    // Category analysis (top 5)
    $categories = [];
    foreach ($products as $product) {
        $category = $product['products_category'] ?: 'غير محدد';
        $categories[$category] = ($categories[$category] ?? 0) + 1;
    }
    arsort($categories);
    $top_categories = array_slice($categories, 0, 5, true);
    
    $category_analysis = [];
    foreach ($top_categories as $category => $count) {
        $category_analysis[] = [
            'category_name' => $category,
            'count' => $count,
            'percentage' => $total_products > 0 ? round(($count / $total_products) * 100, 1) : 0
        ];
    }
    
    // Brand analysis (top 5)
    $brands = [];
    foreach ($products as $product) {
        $brand = $product['products_brand'] ?: 'بدون علامة تجارية';
        $brands[$brand] = ($brands[$brand] ?? 0) + 1;
    }
    arsort($brands);
    $top_brands = array_slice($brands, 0, 5, true);
    
    $brand_analysis = [];
    foreach ($top_brands as $brand => $count) {
        $brand_analysis[] = [
            'brand_name' => $brand,
            'count' => $count,
            'percentage' => $total_products > 0 ? round(($count / $total_products) * 100, 1) : 0
        ];
    }
    
    // Growth analysis - updated to use 30-day periods like overview
    $now = new DateTime();
    $thirty_days_ago = (clone $now)->modify('-30 days')->format('Y-m-d H:i:s');
    $sixty_days_ago = (clone $now)->modify('-60 days')->format('Y-m-d H:i:s');

    $new_last_30_days = count(array_filter($products, function($p) use ($thirty_days_ago) {
        return isset($p['variant_created_at']) && $p['variant_created_at'] >= $thirty_days_ago;
    }));

    $new_previous_30_days = count(array_filter($products, function($p) use ($thirty_days_ago, $sixty_days_ago) {
        return isset($p['variant_created_at']) && 
               $p['variant_created_at'] >= $sixty_days_ago && 
               $p['variant_created_at'] < $thirty_days_ago;
    }));

    $growth_rate = 0;
    if ($new_previous_30_days > 0) {
        $growth_rate = round((($new_last_30_days - $new_previous_30_days) / $new_previous_30_days) * 100, 1);
    } elseif ($new_last_30_days > 0) {
        $growth_rate = 100;
    }
    
    $growth_analysis = [
        'this_month' => $new_last_30_days,
        'last_month' => $new_previous_30_days,
        'growth_rate' => $growth_rate
    ];
    
    return [
        'total_products' => $total_products,
        'status_analysis' => $status_analysis,
        'inventory_analysis' => $inventory_analysis,
        'category_analysis' => $category_analysis,
        'brand_analysis' => $brand_analysis,
        'growth_analysis' => $growth_analysis
    ];
}

function generateStockLevelsReport($conn, $current_user_id, $current_user_role) {
    // Check if inventory table exists
    $inventory_check = $conn->query("SHOW TABLES LIKE 'inventory'");
    if ($inventory_check->num_rows === 0) {
        return [
            'low_stock_items' => [],
            'stock_summary' => [],
            'total_low_stock' => 0
        ];
    }

    // Get basic stock summary with actual inventory statuses
    $summary_sql = "SELECT 
                        inventory_status,
                        COUNT(*) as count
                    FROM inventory
                    GROUP BY inventory_status";
    
    $summary_result = $conn->query($summary_sql);
    $stock_summary = [];
    if ($summary_result) {
        while ($row = $summary_result->fetch_assoc()) {
            $stock_summary[$row['inventory_status']] = $row['count'];
        }
    }
    
    // Add computed stock levels if not present
    if (!isset($stock_summary['In Stock'])) {
        $in_stock_sql = "SELECT COUNT(*) as count FROM inventory WHERE inventory_quantity > 0";
        $in_stock_result = $conn->query($in_stock_sql);
        if ($in_stock_result) {
            $stock_summary['In Stock'] = $in_stock_result->fetch_assoc()['count'];
        }
    }
    
    if (!isset($stock_summary['Out of Stock'])) {
        $out_stock_sql = "SELECT COUNT(*) as count FROM inventory WHERE inventory_quantity = 0";
        $out_stock_result = $conn->query($out_stock_sql);
        if ($out_stock_result) {
            $stock_summary['Out of Stock'] = $out_stock_result->fetch_assoc()['count'];
        }
    }
    
    // Get low stock items with enhanced query
    $low_stock_items = [];
    $warehouse_check = $conn->query("SHOW TABLES LIKE 'warehouse'");
    $product_variants_check = $conn->query("SHOW TABLES LIKE 'product_variants'");
    
    if ($warehouse_check->num_rows > 0 && $product_variants_check->num_rows > 0) {
        $sql = "SELECT 
                    COALESCE(p.products_name, 'Unknown Product') as products_name,
                    COALESCE(pv.variant_name, 'المنتج الأساسي') as variant_name,
                    i.inventory_quantity,
                    CASE 
                        WHEN i.inventory_quantity = 0 THEN 'Out of Stock'
                        WHEN i.inventory_quantity <= 5 THEN 'Low Stock'
                        ELSE i.inventory_status
                    END as inventory_status,
                    w.warehouse_name,
                    i.inventory_last_movement_at
                FROM product_variants pv
                LEFT JOIN products p ON pv.variant_products_id = p.products_id
                LEFT JOIN inventory i ON pv.variant_id = i.variant_id
                LEFT JOIN warehouse w ON i.warehouse_id = w.warehouse_id
                WHERE (i.inventory_status IN ('Low Stock', 'Out of Stock') OR i.inventory_quantity <= 5)
                ORDER BY i.inventory_quantity ASC, i.inventory_status DESC
                LIMIT 50";
        
        $result = $conn->query($sql);
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $low_stock_items[] = $row;
            }
        }
    } else {
        // Enhanced fallback query
        $sql = "SELECT 
                    'Unknown Product' as products_name,
                    'المنتج الأساسي' as variant_name,
                    inventory_quantity,
                    CASE 
                        WHEN inventory_quantity = 0 THEN 'Out of Stock'
                        WHEN inventory_quantity <= 5 THEN 'Low Stock'
                        ELSE inventory_status
                    END as inventory_status,
                    'Unknown Warehouse' as warehouse_name,
                    inventory_last_movement_at
                FROM inventory
                WHERE (inventory_status IN ('Low Stock', 'Out of Stock') OR inventory_quantity <= 5)
                ORDER BY inventory_quantity ASC, inventory_status DESC
                LIMIT 50";
        
        $result = $conn->query($sql);
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $low_stock_items[] = $row;
            }
        }
    }
    
    return [
        'low_stock_items' => $low_stock_items,
        'stock_summary' => $stock_summary,
        'total_low_stock' => count($low_stock_items)
    ];
}
?>
