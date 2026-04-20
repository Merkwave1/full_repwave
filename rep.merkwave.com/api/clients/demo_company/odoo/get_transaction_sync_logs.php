<?php
/**
 * Get Transaction Sync Logs API
 * 
 * Returns unified view of all financial transaction sync logs:
 * - Payments (customer payments)
 * - Safe Transfers (internal transfers between safes)
 * 
 * All synced to Odoo as journal entries (account.move/account.payment)
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
        $where_clauses[] = "l.transaction_type = ?";
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
        $where_clauses[] = "(l.php_id LIKE ? OR l.odoo_id LIKE ? OR c.clients_company_name LIKE ? OR s_from.safes_name LIKE ?)";
        $searchParam = "%{$searchTerm}%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $types_str .= 'ssss';
    }
    
    $where_sql = !empty($where_clauses) ? "WHERE " . implode(' AND ', $where_clauses) : "";
    
    // Main query with JOINs for payment, refund, expense and transfer details
    $base_sql = "
        FROM odoo_transaction_sync_logs l
        LEFT JOIN payments p ON l.transaction_type = 'payment' AND l.php_id = p.payments_id
        LEFT JOIN refunds r ON l.transaction_type = 'refund' AND l.php_id = r.refunds_id
        LEFT JOIN clients c ON (p.payments_client_id = c.clients_id OR r.refunds_client_id = c.clients_id)
        LEFT JOIN payment_methods pm ON (p.payments_method_id = pm.payment_methods_id OR r.refunds_method_id = pm.payment_methods_id)
        LEFT JOIN safe_transactions st_out ON (l.transaction_type = 'transfer' OR l.transaction_type = 'expense') AND l.php_id = st_out.safe_transactions_id
        LEFT JOIN safes s_from ON st_out.safe_transactions_safe_id = s_from.safes_id
        LEFT JOIN safe_transactions st_in ON st_out.safe_transactions_related_id = st_in.safe_transactions_id
        LEFT JOIN safes s_to ON st_in.safe_transactions_safe_id = s_to.safes_id
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
        'payments' => ['total' => 0, 'success' => 0, 'failed' => 0],
        'refunds' => ['total' => 0, 'success' => 0, 'failed' => 0],
        'expenses' => ['total' => 0, 'success' => 0, 'failed' => 0],
        'transfers' => ['total' => 0, 'success' => 0, 'failed' => 0]
    ];
    
    $stats_sql = "
        SELECT 
            transaction_type,
            COUNT(*) as total,
            SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as success_count,
            SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed_count
        FROM odoo_transaction_sync_logs
        GROUP BY transaction_type
    ";
    $stats_result = $conn->query($stats_sql);
    while ($row = $stats_result->fetch_assoc()) {
        $key = $row['transaction_type'];
        if ($key === 'payment') $key = 'payments';
        elseif ($key === 'refund') $key = 'refunds';
        elseif ($key === 'expense') $key = 'expenses';
        else $key = 'transfers';
        
        $stats[$key] = [
            'total' => (int)$row['total'],
            'success' => (int)$row['success_count'],
            'failed' => (int)$row['failed_count']
        ];
    }
    $stats['total'] = $stats['payments']['total'] + $stats['refunds']['total'] + $stats['expenses']['total'] + $stats['transfers']['total'];
    $stats['success'] = $stats['payments']['success'] + $stats['refunds']['success'] + $stats['expenses']['success'] + $stats['transfers']['success'];
    $stats['failed'] = $stats['payments']['failed'] + $stats['refunds']['failed'] + $stats['expenses']['failed'] + $stats['transfers']['failed'];
    
    // Get paginated data
    $data_sql = "
        SELECT 
            l.log_id,
            l.transaction_type,
            l.php_id,
            l.odoo_id,
            l.sync_status,
            l.sync_action,
            l.error_message,
            l.synced_at,
            CASE 
                WHEN l.transaction_type = 'payment' THEN p.payments_amount
                WHEN l.transaction_type = 'refund' THEN r.refunds_amount
                ELSE ABS(st_out.safe_transactions_amount)
            END as amount,
            CASE 
                WHEN l.transaction_type = 'payment' THEN p.payments_date
                WHEN l.transaction_type = 'refund' THEN r.refunds_date
                ELSE st_out.safe_transactions_date
            END as transaction_date,
            CASE 
                WHEN l.transaction_type = 'payment' THEN COALESCE(c.clients_company_name, 'عميل')
                WHEN l.transaction_type = 'refund' THEN COALESCE(c.clients_company_name, 'عميل')
                WHEN l.transaction_type = 'expense' THEN COALESCE(s_from.safes_name, 'خزنة')
                ELSE CONCAT(COALESCE(s_from.safes_name, ''), ' → ', COALESCE(s_to.safes_name, 'خزنة'))
            END as entity_name,
            CASE 
                WHEN l.transaction_type = 'payment' THEN COALESCE(pm.payment_methods_name, 'نقدي')
                WHEN l.transaction_type = 'refund' THEN COALESCE(pm.payment_methods_name, 'نقدي')
                WHEN l.transaction_type = 'expense' THEN COALESCE(st_out.safe_transactions_description, 'مصروف')
                ELSE 'تحويل داخلي'
            END as method_name
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
        if ($row['amount']) {
            $row['amount'] = number_format((float)$row['amount'], 2, '.', '');
        }
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
