<?php
require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

const NOTIFICATIONS_PAGE_SIZE = 10;

/**
 * Execute a COUNT(*) query safely and return the integer result.
 *
 * @param mysqli $conn
 * @param string $sql
 * @param string $types
 * @param array $params
 * @return int
 */
function safe_count(mysqli $conn, string $sql, string $types = '', array $params = []): int {
    try {
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception('Prepare failed');
        }
        if ($types !== '' && !empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result ? $result->fetch_assoc() : null;
        $stmt->close();
        return isset($row['cnt']) ? (int)$row['cnt'] : 0;
    } catch (Throwable $e) {
        error_log('Pending count query failed: ' . $e->getMessage());
        return 0;
    }
}

/**
 * Build the pending operations summary used by the admin dashboard.
 *
 * @param mysqli $conn
 * @return array<string,array<string,int|string>>
 */
function get_pending_operations_summary(mysqli $conn): array {
    $summary = [];

    $summary['sales_orders'] = [
        'label' => 'أوامر البيع',
        'route' => '/dashboard/sales-management/sales-orders',
        'count' => safe_count($conn, "SELECT COUNT(*) AS cnt FROM sales_orders WHERE sales_orders_status = 'Pending'")
    ];

    $summary['sales_returns'] = [
        'label' => 'مرتجعات البيع',
        'route' => '/dashboard/sales-management/sales-returns',
        'count' => safe_count($conn, "SELECT COUNT(*) AS cnt FROM sales_returns WHERE returns_status = 'Pending'")
    ];

    $summary['purchase_orders'] = [
        'label' => 'أوامر الشراء',
        'route' => '/dashboard/purchases-management/purchase-orders',
        'count' => safe_count($conn, "SELECT COUNT(*) AS cnt FROM purchase_orders WHERE purchase_orders_status IN ('Ordered','Partially Received')")
    ];

    $summary['purchase_returns'] = [
        'label' => 'مرتجعات الشراء',
        'route' => '/dashboard/purchases-management/purchase-returns',
        'count' => safe_count($conn, "SELECT COUNT(*) AS cnt FROM purchase_returns WHERE purchase_returns_status = 'Pending'")
    ];

    $inventoryTransfers = safe_count($conn, "SELECT COUNT(*) AS cnt FROM transfer_requests WHERE request_status = 'Pending'")
        + safe_count($conn, "SELECT COUNT(*) AS cnt FROM transfers WHERE transfer_status IN ('Pending','In Transit')");
    $summary['inventory_transfers'] = [
        'label' => 'تحويلات المخزون',
        'route' => '/dashboard/inventory-management/transfers',
        'count' => $inventoryTransfers
    ];

    $summary['inventory_deliveries'] = [
        'label' => 'تسليم البضائع (مخزن)',
        'route' => '/dashboard/inventory-management/deliver-products',
        'count' => safe_count($conn, "SELECT COUNT(*) AS cnt FROM sales_deliveries WHERE sales_deliveries_delivery_status IN ('Preparing','Shipped')")
    ];

    $summary['safe_transactions'] = [
        'label' => 'المعاملات المالية',
        'route' => '/dashboard/safe-management/safe-transactions',
        'count' => safe_count($conn, "SELECT COUNT(*) AS cnt FROM safe_transactions WHERE safe_transactions_status = 'pending' AND (safe_transactions_related_table IS NULL OR safe_transactions_related_table <> 'safe_transfers')")
    ];

    $summary['safe_transfers'] = [
        'label' => 'تحويلات الخزائن',
        'route' => '/dashboard/safe-management/safe-transfers',
        'count' => safe_count($conn, "SELECT COUNT(*) AS cnt FROM safe_transactions WHERE safe_transactions_status = 'pending' AND safe_transactions_related_table = 'safe_transfers' AND safe_transactions_type = 'transfer_out'")
    ];

    return $summary;
}

try {
    // Get users_uuid from GET request (admin authentication)
    $users_uuid = $_GET['users_uuid'] ?? null;

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
        print_failure("Error: Invalid user UUID.");
    }

    $user_id = $user_data['users_id'];
    $user_role = $user_data['users_role'];

    if (strtolower($user_role) !== 'admin') {
        print_failure("Error: Unauthorized. Admin access required.");
    }

    // Optional filters
    $is_read = $_GET['is_read'] ?? null; // null = all, 0 = unread, 1 = read
    $page = max((int)($_GET['page'] ?? 1), 1);
    $limit = NOTIFICATIONS_PAGE_SIZE;
    $offset = ($page - 1) * $limit;

    // Build WHERE clause
    $where_conditions = ["(notifications_user_id = ? OR (notifications_user_id IS NULL AND notifications_role = ?))"];
    $bind_params = [$user_id, $user_role];
    $bind_types = "is";

    if ($is_read !== null) {
        $where_conditions[] = "notifications_is_read = ?";
        $bind_params[] = (int)$is_read;
        $bind_types .= "i";
    }

    $where_clause = "WHERE " . implode(" AND ", $where_conditions);

    $count_bind_params = $bind_params;
    $count_bind_types = $bind_types;

    // Get notifications
    $sql = "SELECT 
                notifications_id,
                notifications_title,
                notifications_body,
                notifications_data,
                notifications_channel,
                notifications_priority,
                notifications_is_read,
                notifications_read_at,
                notifications_sent_at,
                notifications_reference_table,
                notifications_reference_id,
                notifications_created_at,
                notifications_role
        FROM notifications 
        $where_clause 
        ORDER BY notifications_created_at DESC 
        LIMIT ? OFFSET ?";

    $stmt = $conn->prepare($sql);
    $bind_types .= "ii";
    $bind_params[] = $limit;
    $bind_params[] = $offset;

    $stmt->bind_param($bind_types, ...$bind_params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $notifications = [];
    while ($row = $result->fetch_assoc()) {
        // Decode JSON data if present
        if ($row['notifications_data']) {
            $row['notifications_data'] = json_decode($row['notifications_data'], true);
        }
        $notifications[] = $row;
    }
    $stmt->close();

    // Get total count for pagination
    $total_sql = "SELECT COUNT(*) AS total_count FROM notifications $where_clause";
    $total_stmt = $conn->prepare($total_sql);
    if (!empty($count_bind_params)) {
        $total_stmt->bind_param($count_bind_types, ...$count_bind_params);
    }
    $total_stmt->execute();
    $total_result = $total_stmt->get_result()->fetch_assoc();
    $total_stmt->close();
    $total_notifications = (int)($total_result['total_count'] ?? 0);

    // Get unread count
    $count_sql = "SELECT COUNT(*) as unread_count FROM notifications WHERE (notifications_user_id = ? OR (notifications_user_id IS NULL AND notifications_role = ?)) AND notifications_is_read = 0";
    $count_stmt = $conn->prepare($count_sql);
    $count_stmt->bind_param("is", $user_id, $user_role);
    $count_stmt->execute();
    $count_result = $count_stmt->get_result()->fetch_assoc();
    $count_stmt->close();

    $pending_operations = get_pending_operations_summary($conn);
    $pending_total = array_sum(array_map(fn($item) => (int)($item['count'] ?? 0), $pending_operations));

    $pagination = [
        'current_page' => $page,
        'per_page' => $limit,
        'total_items' => $total_notifications,
        'total_pages' => $limit > 0 ? (int)ceil($total_notifications / $limit) : 1
    ];

    print_success("Notifications retrieved successfully.", [
        'notifications' => $notifications,
        'unread_count' => $count_result['unread_count'],
        'total_returned' => count($notifications),
        'total_notifications' => $total_notifications,
        'pagination' => $pagination,
        'pending_operations' => $pending_operations,
        'pending_operations_total' => $pending_total
    ]);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage() . " on line " . $e->getLine());
}
?>
