<?php

require_once '../db_connect.php';
// functions.php is included automatically via db_connect.php

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get users_uuid from GET request
    $users_uuid = $_GET['users_uuid'] ?? null;

    // Check that user ID exists
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

    // Prepare data for dashboard
    $dashboard_data = [];

    // ========== 1. Dashboard Statistics ==========

    // Total Sales (sum of all sales orders total_amount)
    $total_sales_sql = "SELECT SUM(sales_orders_total_amount) as total_sales FROM sales_orders WHERE sales_orders_status != 'Cancelled'";
    $total_sales_result = $conn->query($total_sales_sql);
    $total_sales = $total_sales_result->fetch_assoc()['total_sales'] ?? 0;

    // New Orders Count (total orders)
    $new_orders_sql = "SELECT COUNT(*) as new_orders FROM sales_orders";
    $new_orders_result = $conn->query($new_orders_sql);
    $new_orders = $new_orders_result->fetch_assoc()['new_orders'] ?? 0;

    // New Clients Count (total clients)
    $new_clients_sql = "SELECT COUNT(*) as new_clients FROM clients WHERE clients_status = 'active'";
    $new_clients_result = $conn->query($new_clients_sql);
    $new_clients = $new_clients_result->fetch_assoc()['new_clients'] ?? 0;

    // Sold Products Count (sum of quantities from sales order items or invoices)
    // For now, we'll use a simplified approach - count distinct products that have been ordered
    $sold_products_sql = "
        SELECT COUNT(DISTINCT soi.sales_order_items_variant_id) as sold_products
        FROM sales_order_items soi
        INNER JOIN sales_orders so ON soi.sales_order_items_sales_order_id = so.sales_orders_id
        WHERE so.sales_orders_status != 'Cancelled'
    ";
    $sold_products_result = $conn->query($sold_products_sql);
    $sold_products = $sold_products_result->fetch_assoc()['sold_products'] ?? 0;

    $dashboard_data['statistics'] = [
        'total_sales' => number_format($total_sales, 2),
        'new_orders' => $new_orders,
        'new_clients' => $new_clients,
        'sold_products' => $sold_products
    ];

    // ========== 2. Recent Activities ==========

    $recent_activities = [];

    // Recent Orders
    $recent_orders_sql = "
        SELECT
            CONCAT('تمت إضافة طلب جديد #', so.sales_orders_id) as activity,
            u.users_name as user_name,
            DATE_FORMAT(so.sales_orders_created_at, '%Y-%m-%d %H:%i') as activity_date,
            so.sales_orders_created_at as sort_date
        FROM sales_orders so
        INNER JOIN users u ON so.sales_orders_representative_id = u.users_id
        ORDER BY so.sales_orders_created_at DESC
        LIMIT 5
    ";

    $recent_orders_result = $conn->query($recent_orders_sql);
    while ($row = $recent_orders_result->fetch_assoc()) {
        $recent_activities[] = [
            'activity' => $row['activity'],
            'user' => $row['user_name'],
            'date' => $row['activity_date'],
            'sort_date' => $row['sort_date']
        ];
    }

    // Recent Clients
    $recent_clients_sql = "
        SELECT
            CONCAT('تم تسجيل عميل جديد \"', clients_company_name, '\"') as activity,
            'النظام' as user_name,
            DATE_FORMAT(clients_created_at, '%Y-%m-%d %H:%i') as activity_date,
            clients_created_at as sort_date
        FROM clients
        ORDER BY clients_created_at DESC
        LIMIT 3
    ";

    $recent_clients_result = $conn->query($recent_clients_sql);
    while ($row = $recent_clients_result->fetch_assoc()) {
        $recent_activities[] = [
            'activity' => $row['activity'],
            'user' => $row['user_name'],
            'date' => $row['activity_date'],
            'sort_date' => $row['sort_date']
        ];
    }

    // Sort activities by date
    usort($recent_activities, function($a, $b) {
        return strtotime($b['sort_date']) - strtotime($a['sort_date']);
    });

    // Take only the most recent 4 activities
    $dashboard_data['recent_activities'] = array_slice($recent_activities, 0, 4);

    // ========== 3. Sales Chart Data (Monthly) ==========

    $sales_chart_sql = "
        SELECT
            DATE_FORMAT(sales_orders_created_at, '%Y-%m') as month,
            SUM(sales_orders_total_amount) as total_amount,
            COUNT(*) as order_count
        FROM sales_orders
        WHERE sales_orders_status != 'Cancelled'
        AND sales_orders_created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(sales_orders_created_at, '%Y-%m')
        ORDER BY month ASC
    ";

    $sales_chart_result = $conn->query($sales_chart_sql);
    $sales_chart_data = [];
    while ($row = $sales_chart_result->fetch_assoc()) {
        $sales_chart_data[] = [
            'month' => $row['month'],
            'total_amount' => (float)$row['total_amount'],
            'order_count' => (int)$row['order_count']
        ];
    }

    $dashboard_data['sales_chart'] = $sales_chart_data;

    // Return success response
    echo json_encode([
        "status" => "success",
        "message" => "Dashboard data retrieved successfully",
        "data" => $dashboard_data
    ]);

} catch (Exception $e) {
    echo json_encode([
        "status" => "failure",
        "message" => $e->getMessage()
    ]);
}
?>
