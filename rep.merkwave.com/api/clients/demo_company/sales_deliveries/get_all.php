<?php

require_once '../db_connect.php'; 
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Optional mobile auth via users_uuid (rep/admin). If provided, override IP auth.
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    $user_role = null; $user_id = null; $rep_warehouse_ids = [];
    if ($users_uuid) {
        $stmt_user = $conn->prepare('SELECT users_id, users_role FROM users WHERE users_uuid = ? LIMIT 1');
        $stmt_user->bind_param('s', $users_uuid);
        $stmt_user->execute();
        $res_u = $stmt_user->get_result();
        $u = $res_u->fetch_assoc();
        $stmt_user->close();
        if (!$u) { print_failure('Invalid users_uuid'); }
        $user_id = (int)$u['users_id'];
        $user_role = $u['users_role'];
        if ($user_role === 'rep') {
            $stmt_wh = $conn->prepare('SELECT warehouse_id FROM warehouse WHERE warehouse_representative_user_id = ?');
            $stmt_wh->bind_param('i', $user_id);
            $stmt_wh->execute();
            $res_wh = $stmt_wh->get_result();
            while ($r = $res_wh->fetch_assoc()) { $rep_warehouse_ids[] = (int)$r['warehouse_id']; }
            $stmt_wh->close();
            if (!$rep_warehouse_ids) {
                echo json_encode(['status'=>'success','sales_deliveries'=>[], 'count'=>0,'user_role'=>$user_role]);
                exit;
            }
        }
    } else {
        // Fallback to old admin IP auth if no UUID (e.g., legacy dashboard)
        
    }

    $filter_sales_order_id = isset($_GET['sales_order_id']) && is_numeric($_GET['sales_order_id']) ? (int)$_GET['sales_order_id'] : null;
    $search_term_raw = isset($_GET['search']) ? trim((string)$_GET['search']) : '';
    $date_from_raw = isset($_GET['date_from']) ? trim((string)$_GET['date_from']) : '';
    $date_to_raw = isset($_GET['date_to']) ? trim((string)$_GET['date_to']) : '';
    $warehouse_filter = isset($_GET['warehouse_id']) && is_numeric($_GET['warehouse_id']) ? (int)$_GET['warehouse_id'] : null;
    $client_filter = isset($_GET['client_id']) && is_numeric($_GET['client_id']) ? (int)$_GET['client_id'] : null;

    $page = isset($_GET['page']) && is_numeric($_GET['page']) && (int)$_GET['page']>0 ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) && (int)$_GET['limit']>0 ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $sql = "SELECT 
            sd.*,
            so.sales_orders_client_id,
            so.sales_orders_status,
            so.sales_orders_delivery_status,
            so.sales_orders_order_date,
            so.sales_orders_total_amount,
            c.clients_company_name,
            w.warehouse_name,
            u.users_name as delivered_by_name,
            COUNT(sdi.sales_delivery_items_id) as total_items,
            SUM(sdi.sales_delivery_items_quantity_delivered) as total_quantity_delivered
        FROM sales_deliveries sd
        LEFT JOIN sales_orders so ON sd.sales_deliveries_sales_order_id = so.sales_orders_id
        LEFT JOIN clients c ON so.sales_orders_client_id = c.clients_id
        LEFT JOIN warehouse w ON sd.sales_deliveries_warehouse_id = w.warehouse_id
        LEFT JOIN users u ON sd.sales_deliveries_delivered_by_user_id = u.users_id
    LEFT JOIN sales_delivery_items sdi ON sd.sales_deliveries_id = sdi.sales_delivery_items_delivery_id";

    $conditions = [];
    $types = '';
    $bind = [];
    if ($filter_sales_order_id) { $conditions[] = 'sd.sales_deliveries_sales_order_id = ?'; $types .= 'i'; $bind[] = $filter_sales_order_id; }

    if ($warehouse_filter) {
        $conditions[] = 'sd.sales_deliveries_warehouse_id = ?';
        $types .= 'i';
        $bind[] = $warehouse_filter;
    }

    if ($client_filter) {
        $conditions[] = 'so.sales_orders_client_id = ?';
        $types .= 'i';
        $bind[] = $client_filter;
    }

    if ($user_role === 'rep') {
        if ($rep_warehouse_ids) {
            $placeholders = implode(',', array_fill(0, count($rep_warehouse_ids), '?'));
            // Allow deliveries either in rep warehouses OR belonging to orders of this rep
            $conditions[] = '(sd.sales_deliveries_warehouse_id IN (' . $placeholders . ') OR so.sales_orders_representative_id = ?)';
            $types .= str_repeat('i', count($rep_warehouse_ids)) . 'i';
            $bind = array_merge($bind, $rep_warehouse_ids, [$user_id]);
        } else {
            // No explicit warehouses assigned; fallback to orders owned by rep
            $conditions[] = 'so.sales_orders_representative_id = ?';
            $types .= 'i';
            $bind[] = $user_id;
        }
    }

    if ($search_term_raw !== '') {
        $search_numeric = ctype_digit(str_replace('#', '', $search_term_raw));
        if ($search_numeric) {
            $search_int = (int)str_replace('#', '', $search_term_raw);
            $conditions[] = '(
                sd.sales_deliveries_id = ?
                OR sd.sales_deliveries_sales_order_id = ?
                OR so.sales_orders_id = ?
            )';
            $types .= 'iii';
            $bind[] = $search_int;
            $bind[] = $search_int;
            $bind[] = $search_int;
        } else {
            $wild = '%' . $search_term_raw . '%';
            $conditions[] = '(
                c.clients_company_name LIKE ?
                OR sd.sales_deliveries_delivery_notes LIKE ?
                OR w.warehouse_name LIKE ?
                OR u.users_name LIKE ?
            )';
            $types .= 'ssss';
            $bind[] = $wild;
            $bind[] = $wild;
            $bind[] = $wild;
            $bind[] = $wild;
        }
    }

    $date_from = null;
    if ($date_from_raw !== '') {
        $dt_from = DateTime::createFromFormat('Y-m-d', $date_from_raw);
        if ($dt_from) {
            $date_from = $dt_from->format('Y-m-d');
            $conditions[] = 'DATE(sd.sales_deliveries_delivery_date) >= ?';
            $types .= 's';
            $bind[] = $date_from;
        }
    }

    if ($date_to_raw !== '') {
        $dt_to = DateTime::createFromFormat('Y-m-d', $date_to_raw);
        if ($dt_to) {
            $date_to = $dt_to->format('Y-m-d');
            $conditions[] = 'DATE(sd.sales_deliveries_delivery_date) <= ?';
            $types .= 's';
            $bind[] = $date_to;
        }
    }
    if ($conditions) { $sql .= ' WHERE ' . implode(' AND ', $conditions); }
    $sql .= ' GROUP BY sd.sales_deliveries_id ORDER BY sd.sales_deliveries_delivery_date DESC';

    // Count total with same filters (on sd)
    $sql_count = "SELECT COUNT(*) AS cnt FROM sales_deliveries sd LEFT JOIN sales_orders so ON sd.sales_deliveries_sales_order_id = so.sales_orders_id" . ($conditions ? ' WHERE ' . implode(' AND ', $conditions) : '');
    $stmt_count = $conn->prepare($sql_count);
    if ($types) { $stmt_count->bind_param($types, ...$bind); }
    $stmt_count->execute();
    $res_count = $stmt_count->get_result();
    $rowc = $res_count->fetch_assoc();
    $total_items = (int)($rowc['cnt'] ?? 0);
    $stmt_count->close();

    // Apply paging
    $sql .= " LIMIT ? OFFSET ?";
    $types_paged = $types . 'ii';
    $bind_paged = array_merge($bind, [$limit, $offset]);

    $stmt = $conn->prepare($sql);
    if (!$stmt) { throw new Exception('Prepare failed: ' . $conn->error); }
    $stmt->bind_param($types_paged, ...$bind_paged);

    if (!$stmt) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to prepare statement']);
        exit;
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $deliveries = [];

    while ($row = $result->fetch_assoc()) {
        $deliveries[] = [
            'sales_deliveries_id' => (int)$row['sales_deliveries_id'],
            'sales_deliveries_sales_order_id' => (int)$row['sales_deliveries_sales_order_id'],
            'sales_deliveries_warehouse_id' => (int)$row['sales_deliveries_warehouse_id'],
            'sales_deliveries_delivery_date' => $row['sales_deliveries_delivery_date'],
            'sales_deliveries_delivered_by_user_id' => $row['sales_deliveries_delivered_by_user_id'] ? (int)$row['sales_deliveries_delivered_by_user_id'] : null,
            'sales_deliveries_delivery_status' => $row['sales_deliveries_delivery_status'],
            'sales_deliveries_delivery_notes' => $row['sales_deliveries_delivery_notes'],
            'sales_deliveries_delivery_address' => $row['sales_deliveries_delivery_address'],
            'sales_deliveries_created_at' => $row['sales_deliveries_created_at'],
            'sales_deliveries_updated_at' => $row['sales_deliveries_updated_at'],
            
            // Sales Order Info
            'sales_orders_client_id' => $row['sales_orders_client_id'] ? (int)$row['sales_orders_client_id'] : null,
            'sales_orders_status' => $row['sales_orders_status'],
            'sales_orders_delivery_status' => $row['sales_orders_delivery_status'],
            'sales_orders_order_date' => $row['sales_orders_order_date'],
            'sales_orders_total_amount' => $row['sales_orders_total_amount'] ? (float)$row['sales_orders_total_amount'] : 0,
            
            // Related Info
            'clients_company_name' => $row['clients_company_name'],
            'warehouse_name' => $row['warehouse_name'],
            'delivered_by_name' => $row['delivered_by_name'],
            'total_items' => (int)$row['total_items'],
            'total_quantity_delivered' => $row['total_quantity_delivered'] ? (float)$row['total_quantity_delivered'] : 0
        ];
    }

    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'sales_deliveries' => $deliveries,
        'data' => $deliveries,
        'count' => count($deliveries),
        'user_role' => $user_role,
        'filtered' => ($user_role === 'rep'),
        'pagination' => [
            'total' => $total_items,
            'per_page' => $limit,
            'page' => $page,
            'total_pages' => ($limit>0 ? max(1, (int)ceil($total_items/$limit)) : 1)
        ]
    ]);

} catch (Exception | TypeError $e) {
    echo json_encode([
        'status' => 'error', 
        'message' => 'Database error: ' . $e->getMessage(),
        'line' => $e->getLine()
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}

?>
