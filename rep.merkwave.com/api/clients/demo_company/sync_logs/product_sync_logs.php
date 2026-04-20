<?php
/**
 * Product Sync Logs API Endpoint
 * 
 * Retrieves Odoo product sync logs with filtering, pagination, and statistics.
 * 
 * Query Parameters:
 * - status: Filter by 'success' or 'failed'
 * - search: Search term for variant name or IDs
 * - page: Page number (default: 1)
 * - per_page: Number of records per page (default: 10)
 * - date_from: Filter logs from this date (YYYY-MM-DD)
 * - date_to: Filter logs to this date (YYYY-MM-DD)
 * 
 * @author RepWave Integration
 * @version 1.1
 */

require_once '../db_connect.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

try {
    // Validate user session
    validate_user_session();
    
    // Get query parameters
    $status = $_GET['status'] ?? null;
    $search = $_GET['search'] ?? '';
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $per_page = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 10;
    $date_from = $_GET['date_from'] ?? null;
    $date_to = $_GET['date_to'] ?? null;
    
    // Validate parameters
    if ($status && !in_array($status, ['success', 'failed'])) {
        print_failure('Invalid status. Must be "success" or "failed".');
        exit;
    }
    
    if ($per_page < 1 || $per_page > 100) {
        $per_page = 10;
    }
    
    $offset = ($page - 1) * $per_page;
    
    // Check if the sync logs table exists
    $tableCheck = $conn->query("SHOW TABLES LIKE 'odoo_product_sync_logs'");
    if ($tableCheck->num_rows === 0) {
        // Table doesn't exist yet
        print_success('No sync logs available yet.', [
            'logs' => [],
            'pagination' => [
                'total_count' => 0,
                'total_pages' => 1,
                'current_page' => $page,
                'per_page' => $per_page
            ],
            'stats' => [
                'total_syncs' => 0,
                'successful_syncs' => 0,
                'failed_syncs' => 0,
                'success_rate' => 0,
                'synced_variants' => 0,
                'unsynced_variants' => 0
            ]
        ]);
        exit;
    }
    
    // Build WHERE clause
    $where_conditions = [];
    $params = [];
    $types = '';
    
    if ($status) {
        $where_conditions[] = 'sl.sync_status = ?';
        $params[] = $status;
        $types .= 's';
    }
    
    if ($search) {
        $search_term = "%$search%";
        $where_conditions[] = '(
            pv.variant_name LIKE ? OR 
            pv.variant_sku LIKE ? OR 
            CAST(sl.php_variant_id AS CHAR) LIKE ? OR 
            CAST(sl.odoo_product_id AS CHAR) LIKE ?
        )';
        $params[] = $search_term;
        $params[] = $search_term;
        $params[] = $search_term;
        $params[] = $search_term;
        $types .= 'ssss';
    }
    
    if ($date_from) {
        $where_conditions[] = 'DATE(sl.synced_at) >= ?';
        $params[] = $date_from;
        $types .= 's';
    }
    
    if ($date_to) {
        $where_conditions[] = 'DATE(sl.synced_at) <= ?';
        $params[] = $date_to;
        $types .= 's';
    }
    
    $where_clause = '';
    if (!empty($where_conditions)) {
        $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
    }
    
    // Get total count with filters
    $count_sql = "
        SELECT COUNT(*) as total 
        FROM odoo_product_sync_logs sl
        LEFT JOIN product_variants pv ON sl.php_variant_id = pv.variant_id
        $where_clause
    ";
    $count_stmt = $conn->prepare($count_sql);
    if (!empty($params)) {
        $count_stmt->bind_param($types, ...$params);
    }
    $count_stmt->execute();
    $total = $count_stmt->get_result()->fetch_assoc()['total'];
    $count_stmt->close();
    
    $total_pages = max(1, ceil($total / $per_page));
    
    // Get logs with variant and product info
    $sql = "
        SELECT 
            sl.*,
            pv.variant_name,
            pv.variant_sku,
            pv.variant_barcode,
            pv.variant_unit_price,
            pv.variant_cost_price,
            pv.variant_status,
            p.products_name,
            c.categories_name
        FROM odoo_product_sync_logs sl
        LEFT JOIN product_variants pv ON sl.php_variant_id = pv.variant_id
        LEFT JOIN products p ON pv.variant_products_id = p.products_id
        LEFT JOIN categories c ON p.products_category_id = c.categories_id
        $where_clause
        ORDER BY sl.synced_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $conn->prepare($sql);
    
    // Add limit and offset to params
    $params[] = $per_page;
    $params[] = $offset;
    $types .= 'ii';
    
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $logs[] = [
            'log_id' => (int)$row['log_id'],
            'php_variant_id' => (int)$row['php_variant_id'],
            'odoo_product_id' => $row['odoo_product_id'] ? (int)$row['odoo_product_id'] : null,
            'sync_status' => $row['sync_status'],
            'sync_action' => $row['sync_action'],
            'error_message' => $row['error_message'],
            'synced_at' => $row['synced_at'],
            'variant_name' => $row['variant_name'],
            'variant_sku' => $row['variant_sku'],
            'products_name' => $row['products_name'],
            'category_name' => $row['categories_name'],
            'variant_unit_price' => $row['variant_unit_price'],
            'variant_cost_price' => $row['variant_cost_price']
        ];
    }
    $stmt->close();
    
    // Get global statistics (without filters)
    $stats_sql = "
        SELECT 
            COUNT(*) as total_syncs,
            SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful_syncs,
            SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed_syncs,
            MAX(synced_at) as last_sync
        FROM odoo_product_sync_logs
    ";
    $stats_result = $conn->query($stats_sql);
    $stats = $stats_result->fetch_assoc();
    
    $total_syncs = (int)$stats['total_syncs'];
    $successful_syncs = (int)$stats['successful_syncs'];
    $failed_syncs = (int)$stats['failed_syncs'];
    $success_rate = $total_syncs > 0 ? round(($successful_syncs / $total_syncs) * 100, 2) : 0;
    
    // Get synced/unsynced variants count
    $synced_count_sql = "SELECT COUNT(*) as count FROM product_variants WHERE variant_odoo_product_id IS NOT NULL";
    $synced_result = $conn->query($synced_count_sql);
    $synced_variants = (int)$synced_result->fetch_assoc()['count'];
    
    $unsynced_count_sql = "SELECT COUNT(*) as count FROM product_variants WHERE variant_odoo_product_id IS NULL AND variant_status = 'active'";
    $unsynced_result = $conn->query($unsynced_count_sql);
    $unsynced_variants = (int)$unsynced_result->fetch_assoc()['count'];
    
    // Get today's stats
    $today = date('Y-m-d');
    $today_stats_sql = "
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
            SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM odoo_product_sync_logs
        WHERE DATE(synced_at) = ?
    ";
    $today_stmt = $conn->prepare($today_stats_sql);
    $today_stmt->bind_param('s', $today);
    $today_stmt->execute();
    $today_stats = $today_stmt->get_result()->fetch_assoc();
    $today_stmt->close();
    
    // Get this month's stats
    $month_start = date('Y-m-01');
    $month_end = date('Y-m-t');
    $month_stats_sql = "
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
            SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM odoo_product_sync_logs
        WHERE DATE(synced_at) BETWEEN ? AND ?
    ";
    $month_stmt = $conn->prepare($month_stats_sql);
    $month_stmt->bind_param('ss', $month_start, $month_end);
    $month_stmt->execute();
    $month_stats = $month_stmt->get_result()->fetch_assoc();
    $month_stmt->close();
    
    print_success('Product sync logs retrieved successfully.', [
        'logs' => $logs,
        'pagination' => [
            'total_count' => (int)$total,
            'total_pages' => $total_pages,
            'current_page' => $page,
            'per_page' => $per_page
        ],
        'stats' => [
            'total_syncs' => $total_syncs,
            'successful_syncs' => $successful_syncs,
            'failed_syncs' => $failed_syncs,
            'success_rate' => $success_rate,
            'synced_variants' => $synced_variants,
            'unsynced_variants' => $unsynced_variants,
            'last_sync' => $stats['last_sync'],
            'today' => [
                'total' => (int)($today_stats['total'] ?? 0),
                'successful' => (int)($today_stats['successful'] ?? 0),
                'failed' => (int)($today_stats['failed'] ?? 0)
            ],
            'this_month' => [
                'total' => (int)($month_stats['total'] ?? 0),
                'successful' => (int)($month_stats['successful'] ?? 0),
                'failed' => (int)($month_stats['failed'] ?? 0)
            ]
        ]
    ]);
    
} catch (Exception $e) {
    error_log('Product sync logs error: ' . $e->getMessage());
    print_failure('Error retrieving product sync logs: ' . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
