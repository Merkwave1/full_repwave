<?php
/**
 * Get Inventory Sync Logs API
 * 
 * Returns unified view of all inventory operation sync logs:
 * - Deliveries (outgoing stock.picking)
 * - Internal Transfers (internal stock.picking)
 * 
 * All synced to Odoo as stock.picking records
 * 
 * @author RepWave Integration
 * @version 1.0
 */

require_once __DIR__ . '/../db_connect.php';

header('Content-Type: application/json');

try {
    // Pagination
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['perPage']) ? min(100, max(1, (int)$_GET['perPage'])) : 10;
    $offset = ($page - 1) * $limit;
    
    // Filters
    $status = isset($_GET['status']) && $_GET['status'] !== 'all' ? $_GET['status'] : null;
    $type = isset($_GET['type']) && $_GET['type'] !== 'all' ? $_GET['type'] : null;
    $searchTerm = isset($_GET['searchTerm']) ? trim($_GET['searchTerm']) : '';
    $dateFrom = isset($_GET['dateFrom']) ? $_GET['dateFrom'] : '';
    $dateTo = isset($_GET['dateTo']) ? $_GET['dateTo'] : '';
    
    // Build WHERE clauses
    $where_clauses = [];
    $params = [];
    $types_str = '';
    
    // Type filter
    if ($type) {
        $where_clauses[] = "l.operation_type = ?";
        $params[] = $type;
        $types_str .= 's';
    }
    
    // Status filter
    if ($status) {
        $where_clauses[] = "l.sync_status = ?";
        $params[] = $status;
        $types_str .= 's';
    }
    
    // Date range filter
    if ($dateFrom) {
        $where_clauses[] = "DATE(l.synced_at) >= ?";
        $params[] = $dateFrom;
        $types_str .= 's';
    }
    if ($dateTo) {
        $where_clauses[] = "DATE(l.synced_at) <= ?";
        $params[] = $dateTo;
        $types_str .= 's';
    }
    
    // Search filter
    if ($searchTerm) {
        $where_clauses[] = "(l.php_id LIKE ? OR l.odoo_picking_id LIKE ? OR c.clients_company_name LIKE ? OR sw.warehouse_name LIKE ? OR dw.warehouse_name LIKE ?)";
        $searchParam = "%{$searchTerm}%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $types_str .= 'sssss';
    }
    
    $where_sql = !empty($where_clauses) ? "WHERE " . implode(' AND ', $where_clauses) : "";
    
    // Main query with JOINs for delivery and transfer details
    $base_sql = "
        FROM odoo_inventory_sync_logs l
        LEFT JOIN sales_deliveries sd ON l.operation_type = 'delivery' AND l.php_id = sd.sales_deliveries_id
        LEFT JOIN sales_orders so ON sd.sales_deliveries_sales_order_id = so.sales_orders_id
        LEFT JOIN clients c ON so.sales_orders_client_id = c.clients_id
        LEFT JOIN warehouse dw_del ON sd.sales_deliveries_warehouse_id = dw_del.warehouse_id
        LEFT JOIN transfers t ON l.operation_type = 'transfer' AND l.php_id = t.transfer_id
        LEFT JOIN warehouse sw ON t.transfer_source_warehouse_id = sw.warehouse_id
        LEFT JOIN warehouse dw ON t.transfer_destination_warehouse_id = dw.warehouse_id
        $where_sql
    ";
    
    // Count total
    $count_sql = "SELECT COUNT(*) as total $base_sql";
    $stmt_count = $conn->prepare($count_sql);
    if (!empty($params)) {
        $stmt_count->bind_param($types_str, ...$params);
    }
    $stmt_count->execute();
    $total = $stmt_count->get_result()->fetch_assoc()['total'];
    $stmt_count->close();
    
    // Get stats
    $stats = [
        'total' => 0,
        'success' => 0,
        'failed' => 0,
        'deliveries' => ['total' => 0, 'success' => 0, 'failed' => 0],
        'transfers' => ['total' => 0, 'success' => 0, 'failed' => 0]
    ];
    
    $stats_sql = "
        SELECT 
            operation_type,
            COUNT(*) as total,
            SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as success_count,
            SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed_count
        FROM odoo_inventory_sync_logs
        GROUP BY operation_type
    ";
    $stats_result = $conn->query($stats_sql);
    while ($row = $stats_result->fetch_assoc()) {
        $key = $row['operation_type'];
        if ($key === 'delivery') $key = 'deliveries';
        else $key = 'transfers';
        
        $stats[$key] = [
            'total' => (int)$row['total'],
            'success' => (int)$row['success_count'],
            'failed' => (int)$row['failed_count']
        ];
    }
    $stats['total'] = $stats['deliveries']['total'] + $stats['transfers']['total'];
    $stats['success'] = $stats['deliveries']['success'] + $stats['transfers']['success'];
    $stats['failed'] = $stats['deliveries']['failed'] + $stats['transfers']['failed'];
    
    // Get paginated data
    $data_sql = "
        SELECT 
            l.log_id,
            l.operation_type,
            l.php_id,
            l.odoo_picking_id,
            l.sync_status,
            l.sync_action,
            l.error_message,
            l.synced_at,
            CASE 
                WHEN l.operation_type = 'delivery' THEN COALESCE(c.clients_company_name, 'عميل')
                ELSE CONCAT(COALESCE(sw.warehouse_name, ''), ' → ', COALESCE(dw.warehouse_name, ''))
            END as entity_name,
            CASE 
                WHEN l.operation_type = 'delivery' THEN sd.sales_deliveries_delivery_date
                ELSE t.transfer_created_at
            END as operation_date,
            CASE 
                WHEN l.operation_type = 'delivery' THEN sd.sales_deliveries_delivery_status
                ELSE t.transfer_status
            END as operation_status,
            CASE 
                WHEN l.operation_type = 'delivery' THEN COALESCE(dw_del.warehouse_name, 'مخزن')
                ELSE NULL
            END as warehouse_name,
            CASE 
                WHEN l.operation_type = 'delivery' THEN so.sales_orders_id
                ELSE NULL
            END as sales_order_id,
            CASE 
                WHEN l.operation_type = 'delivery' THEN 
                    (SELECT COUNT(*) FROM sales_delivery_items sdi WHERE sdi.sales_delivery_items_delivery_id = sd.sales_deliveries_id)
                ELSE 
                    (SELECT COUNT(*) FROM transfer_items ti WHERE ti.transfer_id = t.transfer_id)
            END as items_count
        $base_sql
        ORDER BY l.synced_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $data_params = array_merge($params, [$limit, $offset]);
    $data_types = $types_str . 'ii';
    
    $stmt_data = $conn->prepare($data_sql);
    if (!empty($data_params)) {
        $stmt_data->bind_param($data_types, ...$data_params);
    }
    $stmt_data->execute();
    $result = $stmt_data->get_result();
    
    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $logs[] = $row;
    }
    $stmt_data->close();
    
    // Calculate pagination
    $total_pages = $total > 0 ? ceil($total / $limit) : 1;
    
    echo json_encode([
        'status' => 'success',
        'logs' => $logs,
        'pagination' => [
            'current_page' => $page,
            'per_page' => $limit,
            'total' => (int)$total,
            'total_pages' => $total_pages
        ],
        'stats' => $stats
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
