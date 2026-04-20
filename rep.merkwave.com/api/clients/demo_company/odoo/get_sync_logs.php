<?php
// Get Odoo sync logs with filtering and statistics

require_once '../db_connect.php';
require_once 'sync_contacts.php'; // For isOdooIntegrationEnabled()

try {
    // Check if Odoo integration is enabled
    if (!isOdooIntegrationEnabled()) {
        print_failure('Odoo integration is disabled.');
        exit;
    }
    
    // Build the base query
    $sql = "SELECT 
                log_id,
                php_client_id,
                odoo_partner_id,
                sync_status,
                error_message,
                synced_at
            FROM odoo_contact_sync_logs
            WHERE 1=1";
    
    $conditions = [];
    $types = "";
    $params = [];
    
    // Filter by status
    if (isset($_GET['status']) && $_GET['status'] !== 'all' && !empty($_GET['status'])) {
        $conditions[] = "sync_status = ?";
        $types .= "s";
        $params[] = $_GET['status'];
    }
    
    // Search filter (search in error message or IDs)
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $conditions[] = "(error_message LIKE ? OR php_client_id LIKE ? OR odoo_partner_id LIKE ?)";
        $types .= "sss";
        $searchTerm = '%' . $_GET['search'] . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    // Date from filter
    if (isset($_GET['date_from']) && !empty($_GET['date_from'])) {
        $conditions[] = "DATE(synced_at) >= ?";
        $types .= "s";
        $params[] = $_GET['date_from'];
    }
    
    // Date to filter
    if (isset($_GET['date_to']) && !empty($_GET['date_to'])) {
        $conditions[] = "DATE(synced_at) <= ?";
        $types .= "s";
        $params[] = $_GET['date_to'];
    }
    
    // Add conditions to query
    if (!empty($conditions)) {
        $sql .= " AND " . implode(" AND ", $conditions);
    }
    
    // Count total records (with filters applied)
    $count_sql = "SELECT COUNT(*) as total FROM odoo_contact_sync_logs WHERE 1=1";
    if (!empty($conditions)) {
        $count_sql .= " AND " . implode(" AND ", $conditions);
    }
    
    $count_stmt = $conn->prepare($count_sql);
    if (!empty($params)) {
        $count_stmt->bind_param($types, ...$params);
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
    $sql .= " ORDER BY synced_at DESC LIMIT ? OFFSET ?";
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
                    MAX(synced_at) as last_sync
                  FROM odoo_contact_sync_logs";
    
    $stats_result = $conn->query($stats_sql);
    $stats = $stats_result->fetch_assoc();
    
    // Calculate success rate
    $success_rate = $stats['total'] > 0 
        ? round(((int)$stats['successful'] / (int)$stats['total']) * 100, 1) 
        : 0;
    
    // Get synced/unsynced clients count
    $synced_clients_sql = "SELECT COUNT(*) as count FROM clients WHERE clients_odoo_partner_id IS NOT NULL";
    $synced_clients_result = $conn->query($synced_clients_sql);
    $synced_clients = (int)$synced_clients_result->fetch_assoc()['count'];
    
    $unsynced_clients_sql = "SELECT COUNT(*) as count FROM clients WHERE clients_odoo_partner_id IS NULL AND clients_status = 'active'";
    $unsynced_clients_result = $conn->query($unsynced_clients_sql);
    $unsynced_clients = (int)$unsynced_clients_result->fetch_assoc()['count'];
    
    // Get today's stats
    $today = date('Y-m-d');
    $today_stats_sql = "
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
            SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM odoo_contact_sync_logs
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
        FROM odoo_contact_sync_logs
        WHERE DATE(synced_at) BETWEEN ? AND ?
    ";
    $month_stmt = $conn->prepare($month_stats_sql);
    $month_stmt->bind_param('ss', $month_start, $month_end);
    $month_stmt->execute();
    $month_stats = $month_stmt->get_result()->fetch_assoc();
    $month_stmt->close();
    
    print_success("تم تحميل السجلات بنجاح", [
        'logs' => $logs,
        'stats' => [
            'total' => (int)$stats['total'],
            'successful' => (int)$stats['successful'],
            'failed' => (int)$stats['failed'],
            'success_rate' => $success_rate,
            'synced_clients' => $synced_clients,
            'unsynced_clients' => $unsynced_clients,
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
    error_log('Error fetching sync logs: ' . $e->getMessage());
    print_failure('فشل في تحميل السجلات: ' . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
