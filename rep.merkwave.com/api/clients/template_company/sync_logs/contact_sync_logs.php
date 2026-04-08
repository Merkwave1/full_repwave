<?php
/**
 * Get all Odoo contact sync logs
 * 
 * This endpoint retrieves all synchronization logs between PHP clients and Odoo contacts
 * 
 * @method GET
 * @return JSON Array of sync logs with client details
 */

require_once '../db_connect.php';

try {
    // Validate user session
    validate_user_session();
    
    // Get optional filters from query parameters
    $sync_status = $_GET['sync_status'] ?? null; // 'success' or 'failed'
    $php_client_id = $_GET['php_client_id'] ?? null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    
    // Build query
    $query = "
        SELECT 
            l.log_id,
            l.php_client_id,
            l.odoo_partner_id,
            l.sync_status,
            l.error_message,
            l.synced_at,
            c.clients_company_name,
            c.clients_email,
            c.clients_contact_name,
            c.clients_status,
            u.users_name as rep_name
        FROM odoo_contact_sync_logs l
        LEFT JOIN clients c ON l.php_client_id = c.clients_id
        LEFT JOIN users u ON c.clients_rep_user_id = u.users_id
        WHERE 1=1
    ";
    
    $params = [];
    $types = '';
    
    // Add filters
    if ($sync_status) {
        $query .= " AND l.sync_status = ?";
        $params[] = $sync_status;
        $types .= 's';
    }
    
    if ($php_client_id) {
        $query .= " AND l.php_client_id = ?";
        $params[] = $php_client_id;
        $types .= 'i';
    }
    
    // Add ordering and pagination
    $query .= " ORDER BY l.synced_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= 'ii';
    
    // Execute query
    global $conn;
    $stmt = $conn->prepare($query);
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $logs[] = [
            'log_id' => (int)$row['log_id'],
            'php_client_id' => (int)$row['php_client_id'],
            'odoo_partner_id' => $row['odoo_partner_id'] ? (int)$row['odoo_partner_id'] : null,
            'sync_status' => $row['sync_status'],
            'error_message' => $row['error_message'],
            'synced_at' => $row['synced_at'],
            'client_info' => [
                'company_name' => $row['clients_company_name'],
                'email' => $row['clients_email'],
                'contact_name' => $row['clients_contact_name'],
                'status' => $row['clients_status'],
                'rep_name' => $row['rep_name']
            ]
        ];
    }
    
    // Get total count for pagination
    $countQuery = "
        SELECT COUNT(*) as total 
        FROM odoo_contact_sync_logs l 
        WHERE 1=1
    ";
    
    $countParams = [];
    $countTypes = '';
    
    if ($sync_status) {
        $countQuery .= " AND l.sync_status = ?";
        $countParams[] = $sync_status;
        $countTypes .= 's';
    }
    
    if ($php_client_id) {
        $countQuery .= " AND l.php_client_id = ?";
        $countParams[] = $php_client_id;
        $countTypes .= 'i';
    }
    
    $countStmt = $conn->prepare($countQuery);
    
    if (!empty($countParams)) {
        $countStmt->bind_param($countTypes, ...$countParams);
    }
    
    $countStmt->execute();
    $countResult = $countStmt->get_result();
    $totalRow = $countResult->fetch_assoc();
    $total = (int)$totalRow['total'];
    
    // Get sync statistics
    $statsQuery = "
        SELECT 
            COUNT(*) as total_syncs,
            SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
            SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed,
            MAX(synced_at) as last_sync
        FROM odoo_contact_sync_logs
    ";
    
    $statsResult = $conn->query($statsQuery);
    $stats = $statsResult->fetch_assoc();
    
    print_success("Sync logs retrieved successfully", [
        'logs' => $logs,
        'pagination' => [
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'returned' => count($logs)
        ],
        'statistics' => [
            'total_syncs' => (int)$stats['total_syncs'],
            'successful' => (int)$stats['successful'],
            'failed' => (int)$stats['failed'],
            'success_rate' => $stats['total_syncs'] > 0 
                ? round(($stats['successful'] / $stats['total_syncs']) * 100, 2) 
                : 0,
            'last_sync' => $stats['last_sync']
        ]
    ]);
    
} catch (Exception $e) {
    catchError($e, 'Get sync logs error');
}
