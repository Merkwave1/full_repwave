<?php
/**
 * Get All Odoo Sync Logs
 * 
 * Returns combined sync logs for both contacts and products with filtering and statistics.
 * 
 * GET Parameters:
 * - type: 'contacts', 'products', or 'all' (default: 'all')
 * - status: 'success', 'failed', or 'all' (default: 'all')
 * - search: Search term for error messages or IDs
 * - date_from: Start date filter (YYYY-MM-DD)
 * - date_to: End date filter (YYYY-MM-DD)
 * - page: Page number for pagination (default: 1)
 * - per_page: Items per page (default: 10, max: 100)
 */

require_once '../db_connect.php';
require_once 'sync_contacts.php'; // For isOdooIntegrationEnabled()

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

try {
    // Check if Odoo integration is enabled
    if (!isOdooIntegrationEnabled()) {
        print_failure('Odoo integration is disabled.');
        exit;
    }
    
    $type = $_GET['type'] ?? 'all';
    $status = $_GET['status'] ?? 'all';
    $search = $_GET['search'] ?? '';
    $date_from = $_GET['date_from'] ?? '';
    $date_to = $_GET['date_to'] ?? '';
    $page = max(1, (int)($_GET['page'] ?? 1));
    $per_page = max(1, min(100, (int)($_GET['per_page'] ?? 10)));
    $offset = ($page - 1) * $per_page;
    
    $results = [
        'logs' => [],
        'stats' => [
            'contacts' => ['total' => 0, 'successful' => 0, 'failed' => 0],
            'products' => ['total' => 0, 'successful' => 0, 'failed' => 0],
            'combined' => ['total' => 0, 'successful' => 0, 'failed' => 0]
        ],
        'pagination' => [
            'current_page' => $page,
            'per_page' => $per_page,
            'total_count' => 0,
            'total_pages' => 0
        ]
    ];
    
    // Get contact sync statistics
    $contact_stats_sql = "SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM odoo_contact_sync_logs";
    
    $contact_stats_result = $conn->query($contact_stats_sql);
    if ($contact_stats_result) {
        $contact_stats = $contact_stats_result->fetch_assoc();
        $results['stats']['contacts'] = [
            'total' => (int)$contact_stats['total'],
            'successful' => (int)$contact_stats['successful'],
            'failed' => (int)$contact_stats['failed']
        ];
    }
    
    // Get product sync statistics
    $product_stats_sql = "SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM odoo_product_sync_logs";
    
    $product_stats_result = $conn->query($product_stats_sql);
    if ($product_stats_result) {
        $product_stats = $product_stats_result->fetch_assoc();
        $results['stats']['products'] = [
            'total' => (int)$product_stats['total'],
            'successful' => (int)$product_stats['successful'],
            'failed' => (int)$product_stats['failed']
        ];
    }
    
    // Calculate combined stats
    $results['stats']['combined'] = [
        'total' => $results['stats']['contacts']['total'] + $results['stats']['products']['total'],
        'successful' => $results['stats']['contacts']['successful'] + $results['stats']['products']['successful'],
        'failed' => $results['stats']['contacts']['failed'] + $results['stats']['products']['failed']
    ];
    
    // Build logs query based on type
    $logs = [];
    
    if ($type === 'contacts' || $type === 'all') {
        $contact_sql = "SELECT 
            log_id,
            'contact' as log_type,
            php_client_id as php_id,
            odoo_partner_id as odoo_id,
            sync_status,
            sync_action,
            error_message,
            synced_at
            FROM odoo_contact_sync_logs
            WHERE 1=1";
        
        $params = [];
        $types = "";
        
        if ($status !== 'all' && !empty($status)) {
            $contact_sql .= " AND sync_status = ?";
            $params[] = $status;
            $types .= "s";
        }
        
        if (!empty($search)) {
            $contact_sql .= " AND (error_message LIKE ? OR php_client_id LIKE ? OR odoo_partner_id LIKE ?)";
            $searchTerm = '%' . $search . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $types .= "sss";
        }
        
        if (!empty($date_from)) {
            $contact_sql .= " AND DATE(synced_at) >= ?";
            $params[] = $date_from;
            $types .= "s";
        }
        
        if (!empty($date_to)) {
            $contact_sql .= " AND DATE(synced_at) <= ?";
            $params[] = $date_to;
            $types .= "s";
        }
        
        $stmt = $conn->prepare($contact_sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        while ($row = $result->fetch_assoc()) {
            $logs[] = $row;
        }
        $stmt->close();
    }
    
    if ($type === 'products' || $type === 'all') {
        $product_sql = "SELECT 
            log_id,
            'product' as log_type,
            php_variant_id as php_id,
            odoo_product_id as odoo_id,
            sync_status,
            sync_action,
            error_message,
            synced_at
            FROM odoo_product_sync_logs
            WHERE 1=1";
        
        $params = [];
        $types = "";
        
        if ($status !== 'all' && !empty($status)) {
            $product_sql .= " AND sync_status = ?";
            $params[] = $status;
            $types .= "s";
        }
        
        if (!empty($search)) {
            $product_sql .= " AND (error_message LIKE ? OR php_variant_id LIKE ? OR odoo_product_id LIKE ?)";
            $searchTerm = '%' . $search . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $types .= "sss";
        }
        
        if (!empty($date_from)) {
            $product_sql .= " AND DATE(synced_at) >= ?";
            $params[] = $date_from;
            $types .= "s";
        }
        
        if (!empty($date_to)) {
            $product_sql .= " AND DATE(synced_at) <= ?";
            $params[] = $date_to;
            $types .= "s";
        }
        
        $stmt = $conn->prepare($product_sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        while ($row = $result->fetch_assoc()) {
            $logs[] = $row;
        }
        $stmt->close();
    }
    
    // Sort all logs by synced_at descending
    usort($logs, function($a, $b) {
        return strtotime($b['synced_at']) - strtotime($a['synced_at']);
    });
    
    // Apply pagination
    $results['pagination']['total_count'] = count($logs);
    $results['pagination']['total_pages'] = ceil(count($logs) / $per_page);
    $results['logs'] = array_slice($logs, $offset, $per_page);
    
    print_success('Sync logs retrieved successfully', $results);
    
} catch (Exception $e) {
    error_log('Error fetching all sync logs: ' . $e->getMessage());
    print_failure('Failed to load sync logs: ' . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
