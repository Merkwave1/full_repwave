<?php
// Get Odoo sales order sync logs with filtering and statistics

require_once '../db_connect.php';
require_once 'sync_contacts.php'; // For isOdooIntegrationEnabled()

try {
    // Check if Odoo integration is enabled
    if (!isOdooIntegrationEnabled()) {
        print_failure('Odoo integration is disabled.');
        exit;
    }
    
    // Ensure the sync logs table exists
    $createTable = "
        CREATE TABLE IF NOT EXISTS odoo_sales_order_sync_logs (
            log_id INT AUTO_INCREMENT PRIMARY KEY,
            php_order_id INT NOT NULL,
            odoo_order_id INT NULL,
            sync_status ENUM('success', 'failed') NOT NULL,
            sync_action ENUM('create', 'update') NOT NULL DEFAULT 'create',
            error_message TEXT NULL,
            synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_php_order_id (php_order_id),
            INDEX idx_odoo_order_id (odoo_order_id),
            INDEX idx_sync_status (sync_status),
            INDEX idx_synced_at (synced_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    $conn->query($createTable);
    
    // Build the base query with client and representative information
    $sql = "SELECT 
                l.log_id,
                l.php_order_id,
                l.odoo_order_id,
                l.odoo_invoice_id,
                l.sync_status,
                l.sync_action,
                l.error_message,
                l.synced_at,
                so.sales_orders_total_amount,
                so.sales_orders_status,
                c.clients_company_name,
                u.users_name as representative_name
            FROM odoo_sales_order_sync_logs l
            LEFT JOIN sales_orders so ON l.php_order_id = so.sales_orders_id
            LEFT JOIN clients c ON so.sales_orders_client_id = c.clients_id
            LEFT JOIN users u ON so.sales_orders_representative_id = u.users_id
            WHERE 1=1";
    
    $conditions = [];
    $types = "";
    $params = [];
    
    // Filter by status
    if (isset($_GET['status']) && $_GET['status'] !== 'all' && !empty($_GET['status'])) {
        $conditions[] = "l.sync_status = ?";
        $types .= "s";
        $params[] = $_GET['status'];
    }
    
    // Filter by action (create/update)
    if (isset($_GET['action']) && $_GET['action'] !== 'all' && !empty($_GET['action'])) {
        $conditions[] = "l.sync_action = ?";
        $types .= "s";
        $params[] = $_GET['action'];
    }
    
    // Search filter (search in error message, order IDs, client name)
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $conditions[] = "(l.error_message LIKE ? OR l.php_order_id LIKE ? OR l.odoo_order_id LIKE ? OR l.odoo_invoice_id LIKE ? OR c.clients_company_name LIKE ?)";
        $types .= "sssss";
        $searchTerm = '%' . $_GET['search'] . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    // Date from filter
    if (isset($_GET['date_from']) && !empty($_GET['date_from'])) {
        $conditions[] = "DATE(l.synced_at) >= ?";
        $types .= "s";
        $params[] = $_GET['date_from'];
    }
    
    // Date to filter
    if (isset($_GET['date_to']) && !empty($_GET['date_to'])) {
        $conditions[] = "DATE(l.synced_at) <= ?";
        $types .= "s";
        $params[] = $_GET['date_to'];
    }
    
    // Add conditions to query
    if (!empty($conditions)) {
        $sql .= " AND " . implode(" AND ", $conditions);
    }
    
    // Count total records (with filters applied)
    $count_sql = "SELECT COUNT(*) as total FROM odoo_sales_order_sync_logs l WHERE 1=1";
    
    // Apply same conditions for count query (without JOINs if search doesn't need them)
    $count_conditions = [];
    $count_types = "";
    $count_params = [];
    
    if (isset($_GET['status']) && $_GET['status'] !== 'all' && !empty($_GET['status'])) {
        $count_conditions[] = "l.sync_status = ?";
        $count_types .= "s";
        $count_params[] = $_GET['status'];
    }
    
    if (isset($_GET['action']) && $_GET['action'] !== 'all' && !empty($_GET['action'])) {
        $count_conditions[] = "l.sync_action = ?";
        $count_types .= "s";
        $count_params[] = $_GET['action'];
    }
    
    if (isset($_GET['date_from']) && !empty($_GET['date_from'])) {
        $count_conditions[] = "DATE(l.synced_at) >= ?";
        $count_types .= "s";
        $count_params[] = $_GET['date_from'];
    }
    
    if (isset($_GET['date_to']) && !empty($_GET['date_to'])) {
        $count_conditions[] = "DATE(l.synced_at) <= ?";
        $count_types .= "s";
        $count_params[] = $_GET['date_to'];
    }
    
    // For search, need to JOIN
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $count_sql = "SELECT COUNT(*) as total FROM odoo_sales_order_sync_logs l
                      LEFT JOIN sales_orders so ON l.php_order_id = so.sales_orders_id
                      LEFT JOIN clients c ON so.sales_orders_client_id = c.clients_id
                      WHERE 1=1";
        $count_conditions[] = "(l.error_message LIKE ? OR l.php_order_id LIKE ? OR l.odoo_order_id LIKE ? OR c.clients_company_name LIKE ?)";
        $count_types .= "ssss";
        $searchTerm = '%' . $_GET['search'] . '%';
        $count_params[] = $searchTerm;
        $count_params[] = $searchTerm;
        $count_params[] = $searchTerm;
        $count_params[] = $searchTerm;
    }
    
    if (!empty($count_conditions)) {
        $count_sql .= " AND " . implode(" AND ", $count_conditions);
    }
    
    $count_stmt = $conn->prepare($count_sql);
    if (!empty($count_params)) {
        $count_stmt->bind_param($count_types, ...$count_params);
    }
    $count_stmt->execute();
    $count_result = $count_stmt->get_result();
    $total_count = (int)$count_result->fetch_assoc()['total'];
    $count_stmt->close();
    
    // Pagination
    $page = isset($_GET['page']) && is_numeric($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $per_page = isset($_GET['per_page']) && is_numeric($_GET['per_page']) ? max(1, min(100, (int)$_GET['per_page'])) : 10;
    $offset = ($page - 1) * $per_page;
    $total_pages = ceil($total_count / $per_page);
    
    // Add ORDER BY and pagination
    $sql .= " ORDER BY l.synced_at DESC LIMIT ? OFFSET ?";
    $types .= "ii";
    $params[] = $per_page;
    $params[] = $offset;
    
    // Prepare and execute main query
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    // Bind parameters if any
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $logs[] = $row;
    }
    $stmt->close();
    
    // Get overall statistics (without filters)
    $stats_sql = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
                    SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN sync_action = 'create' THEN 1 ELSE 0 END) as creates,
                    SUM(CASE WHEN sync_action = 'update' THEN 1 ELSE 0 END) as updates,
                    MAX(synced_at) as last_sync
                  FROM odoo_sales_order_sync_logs";
    
    $stats_result = $conn->query($stats_sql);
    $stats = $stats_result->fetch_assoc();
    
    // Calculate success rate
    $success_rate = $stats['total'] > 0 
        ? round(((int)$stats['successful'] / (int)$stats['total']) * 100, 1) 
        : 0;
    
    // Get synced/unsynced sales orders count
    $synced_orders_sql = "SELECT COUNT(*) as count FROM sales_orders WHERE sales_orders_odoo_order_id IS NOT NULL";
    $synced_orders_result = $conn->query($synced_orders_sql);
    $synced_orders = (int)$synced_orders_result->fetch_assoc()['count'];
    
    $unsynced_orders_sql = "SELECT COUNT(*) as count FROM sales_orders WHERE sales_orders_odoo_order_id IS NULL AND sales_orders_status != 'Cancelled'";
    $unsynced_orders_result = $conn->query($unsynced_orders_sql);
    $unsynced_orders = (int)$unsynced_orders_result->fetch_assoc()['count'];
    
    // Get today's stats
    $today = date('Y-m-d');
    $today_stats_sql = "
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
            SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM odoo_sales_order_sync_logs
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
        FROM odoo_sales_order_sync_logs
        WHERE DATE(synced_at) BETWEEN ? AND ?
    ";
    $month_stmt = $conn->prepare($month_stats_sql);
    $month_stmt->bind_param('ss', $month_start, $month_end);
    $month_stmt->execute();
    $month_stats = $month_stmt->get_result()->fetch_assoc();
    $month_stmt->close();
    
    print_success("تم تحميل سجلات مزامنة أوامر البيع بنجاح", [
        'logs' => $logs,
        'stats' => [
            'total' => (int)$stats['total'],
            'successful' => (int)$stats['successful'],
            'failed' => (int)$stats['failed'],
            'creates' => (int)$stats['creates'],
            'updates' => (int)$stats['updates'],
            'success_rate' => $success_rate,
            'synced_orders' => $synced_orders,
            'unsynced_orders' => $unsynced_orders,
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
        ],
        'pagination' => [
            'total_count' => $total_count,
            'total_pages' => $total_pages,
            'current_page' => $page,
            'per_page' => $per_page
        ]
    ]);

} catch (Exception $e) {
    error_log('Error fetching sales order sync logs: ' . $e->getMessage());
    print_failure('فشل في تحميل سجلات مزامنة أوامر البيع: ' . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
