<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Validate user session (UUID validation)
    validate_user_session();
    
    // Get user data from global variables set by validation function
    $current_user_id = $GLOBALS['current_user_id'];
    $current_user_role = $GLOBALS['current_user_role'];

    // Date ranges for calculations
    $today = date('Y-m-d');
    $last_7_days = date('Y-m-d', strtotime('-7 days'));
    $last_30_days = date('Y-m-d', strtotime('-30 days'));

    // Initialize dashboard data array with simple data
    $dashboard_data = [
        'sales_statistics' => [
            'invoiced_30d' => ['count' => 0, 'value' => 0],
            'invoiced_7d' => ['count' => 0, 'value' => 0],
            'invoiced_today' => ['count' => 0, 'value' => 0],
            'total_30d' => ['count' => 0, 'value' => 0]
        ],
        'purchase_statistics' => [
            'count_30d' => 0,
            'value_30d' => 0,
            'pending_count' => 0
        ],
        'operations' => [
            'pending_deliveries' => 0,
            'pending_receipts' => 0
        ],
        'returns_statistics' => [
            'returns_30d' => ['count' => 0, 'value' => 0],
            'returns_7d' => ['count' => 0, 'value' => 0]
        ],
        'top_performers' => [
            'top_clients' => [],
            'top_representatives' => []
        ],
        'product_insights' => [
            'top_selling_products' => [],
            'most_returned_products' => [],
            'low_stock_alerts' => []
        ],
        'trends' => [
            'monthly_sales' => []
        ],
        'meta' => [
            'generated_at' => date('Y-m-d H:i:s'),
            'user_role' => $current_user_role,
            'date_ranges' => [
                'today' => $today,
                'last_7_days' => $last_7_days,
                'last_30_days' => $last_30_days
            ]
        ]
    ];

    // Try to get basic sales data
    try {
        $sales_count_query = "SELECT COUNT(*) as total_orders FROM sales_orders WHERE sales_orders_status != 'Cancelled'";
        $sales_result = $conn->query($sales_count_query);
        if ($sales_result) {
            $sales_data = $sales_result->fetch_assoc();
            $dashboard_data['sales_statistics']['total_30d']['count'] = (int)$sales_data['total_orders'];
        }
    } catch (Exception $e) {
        error_log("Error fetching sales data: " . $e->getMessage());
    }

    // Try to get basic purchase data
    try {
        $purchase_count_query = "SELECT COUNT(*) as total_orders FROM purchase_orders WHERE purchase_orders_status != 'Cancelled'";
        $purchase_result = $conn->query($purchase_count_query);
        if ($purchase_result) {
            $purchase_data = $purchase_result->fetch_assoc();
            $dashboard_data['purchase_statistics']['count_30d'] = (int)$purchase_data['total_orders'];
        }
    } catch (Exception $e) {
        error_log("Error fetching purchase data: " . $e->getMessage());
    }

    // Return success response
    print_success("Dashboard data retrieved successfully", $dashboard_data);

} catch (Exception | TypeError $e) {
    error_log("Dashboard comprehensive error: " . $e->getMessage());
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>