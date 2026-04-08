<?php

require_once '../db_connect.php';
require_once '../functions.php';

function tableExists(mysqli $conn, string $tableName): bool
{
    $check = $conn->prepare("SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
    $check->bind_param("s", $tableName);
    $check->execute();
    $exists = $check->get_result()->num_rows > 0;
    $check->close();

    return $exists;
}

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
    $today_start = date('Y-m-d 00:00:00');
    $tomorrow_start = date('Y-m-d 00:00:00', strtotime($today . ' +1 day'));
    $current_month_start = date('Y-m-01');
    $last_month_start = date('Y-m-01', strtotime('-1 month'));
    $last_month_end = date('Y-m-t', strtotime('-1 month'));

    // Initialize dashboard data array
    $dashboard_data = [];

    // ========== 1. Sales Orders Statistics ==========
    
    // Sales Orders - 30 days, 7 days, today (invoiced)
    $sales_orders_stats = $conn->prepare("
        SELECT 
            COUNT(CASE WHEN so.sales_orders_order_date >= ? AND so.sales_orders_status = 'Invoiced' THEN 1 END) as invoiced_30d_count,
            COALESCE(SUM(CASE WHEN so.sales_orders_order_date >= ? AND so.sales_orders_status = 'Invoiced' THEN so.sales_orders_total_amount END), 0) as invoiced_30d_value,
            
            COUNT(CASE WHEN so.sales_orders_order_date >= ? AND so.sales_orders_status = 'Invoiced' THEN 1 END) as invoiced_7d_count,
            COALESCE(SUM(CASE WHEN so.sales_orders_order_date >= ? AND so.sales_orders_status = 'Invoiced' THEN so.sales_orders_total_amount END), 0) as invoiced_7d_value,
            
            COUNT(CASE WHEN DATE(so.sales_orders_order_date) = ? AND so.sales_orders_status = 'Invoiced' THEN 1 END) as invoiced_today_count,
            COALESCE(SUM(CASE WHEN DATE(so.sales_orders_order_date) = ? AND so.sales_orders_status = 'Invoiced' THEN so.sales_orders_total_amount END), 0) as invoiced_today_value
        FROM sales_orders so
    ");
    
    $sales_orders_stats->bind_param("ssssss", $last_30_days, $last_30_days, $last_7_days, $last_7_days, $today, $today);
    $sales_orders_stats->execute();
    $sales_orders_result = $sales_orders_stats->get_result()->fetch_assoc();
    
    // Use 'sales' key to match frontend expectations
    $dashboard_data['sales'] = $sales_orders_result;

        // ========== 2. Purchase Orders Statistics ==========
    
    $purchase_orders_stats = $conn->prepare("
        SELECT 
            COUNT(CASE WHEN po.purchase_orders_order_date >= ? AND po.purchase_orders_status NOT IN ('Cancelled', 'Received', 'Draft') THEN 1 END) as active_30d_count,
            COALESCE(SUM(CASE WHEN po.purchase_orders_order_date >= ? AND po.purchase_orders_status NOT IN ('Cancelled', 'Received', 'Draft') THEN po.purchase_orders_total_amount END), 0) as active_30d_value,
            
            COUNT(CASE WHEN po.purchase_orders_order_date >= ? AND po.purchase_orders_status NOT IN ('Cancelled', 'Received', 'Draft') THEN 1 END) as active_7d_count,
            COALESCE(SUM(CASE WHEN po.purchase_orders_order_date >= ? AND po.purchase_orders_status NOT IN ('Cancelled', 'Received', 'Draft') THEN po.purchase_orders_total_amount END), 0) as active_7d_value,

            COUNT(CASE WHEN DATE(po.purchase_orders_order_date) = ? AND po.purchase_orders_status NOT IN ('Cancelled', 'Received', 'Draft') THEN 1 END) as active_today_count,
            COALESCE(SUM(CASE WHEN DATE(po.purchase_orders_order_date) = ? AND po.purchase_orders_status NOT IN ('Cancelled', 'Received', 'Draft') THEN po.purchase_orders_total_amount END), 0) as active_today_value
        FROM purchase_orders po
    ");
    
    $purchase_orders_stats->bind_param("ssssss", $last_30_days, $last_30_days, $last_7_days, $last_7_days, $today, $today);
    $purchase_orders_stats->execute();
    $purchase_orders_result = $purchase_orders_stats->get_result()->fetch_assoc();
    // Show all purchase orders except cancelled ones
    $purchase_orders_stats = $conn->prepare("
        SELECT 
            COUNT(CASE WHEN po.purchase_orders_order_date >= ? AND po.purchase_orders_status NOT IN ('Cancelled', 'Draft') THEN 1 END) as active_30d_count,
            COALESCE(SUM(CASE WHEN po.purchase_orders_order_date >= ? AND po.purchase_orders_status NOT IN ('Cancelled', 'Draft') THEN po.purchase_orders_total_amount END), 0) as active_30d_value,
            
            COUNT(CASE WHEN po.purchase_orders_order_date >= ? AND po.purchase_orders_status NOT IN ('Cancelled', 'Draft') THEN 1 END) as active_7d_count,
            COALESCE(SUM(CASE WHEN po.purchase_orders_order_date >= ? AND po.purchase_orders_status NOT IN ('Cancelled', 'Draft') THEN po.purchase_orders_total_amount END), 0) as active_7d_value,

            COUNT(CASE WHEN DATE(po.purchase_orders_order_date) = ? AND po.purchase_orders_status NOT IN ('Cancelled', 'Draft') THEN 1 END) as active_today_count,
            COALESCE(SUM(CASE WHEN DATE(po.purchase_orders_order_date) = ? AND po.purchase_orders_status NOT IN ('Cancelled', 'Draft') THEN po.purchase_orders_total_amount END), 0) as active_today_value
        FROM purchase_orders po
    ");
    
    $purchase_orders_stats->bind_param("ssssss", $last_30_days, $last_30_days, $last_7_days, $last_7_days, $today, $today);
    $purchase_orders_stats->execute();
    $purchase_orders_result = $purchase_orders_stats->get_result()->fetch_assoc();
    
    // Use 'purchases' key to match frontend expectations
    $dashboard_data['purchases'] = $purchase_orders_result;

    // ========== 3. Sales Returns Statistics ==========
    
    $sales_returns_stats = $conn->prepare("
        SELECT 
            COUNT(CASE WHEN sr.returns_date >= ? AND sr.returns_status != 'Cancelled' THEN 1 END) as returns_30d_count,
            COALESCE(SUM(CASE WHEN sr.returns_date >= ? AND sr.returns_status != 'Cancelled' THEN sr.returns_total_amount END), 0) as returns_30d_value,
            
            COUNT(CASE WHEN sr.returns_date >= ? AND sr.returns_status != 'Cancelled' THEN 1 END) as returns_7d_count,
            COALESCE(SUM(CASE WHEN sr.returns_date >= ? AND sr.returns_status != 'Cancelled' THEN sr.returns_total_amount END), 0) as returns_7d_value,

            COUNT(CASE WHEN DATE(sr.returns_date) = ? AND sr.returns_status != 'Cancelled' THEN 1 END) as returns_today_count,
            COALESCE(SUM(CASE WHEN DATE(sr.returns_date) = ? AND sr.returns_status != 'Cancelled' THEN sr.returns_total_amount END), 0) as returns_today_value
        FROM sales_returns sr
    ");
    
    $sales_returns_stats->bind_param("ssssss", $last_30_days, $last_30_days, $last_7_days, $last_7_days, $today, $today);
    $sales_returns_stats->execute();
    $sales_returns_result = $sales_returns_stats->get_result()->fetch_assoc();
    
    // Use 'returns' key to match frontend expectations
    $dashboard_data['returns'] = $sales_returns_result;

    // ========== 4. Financial Transactions Statistics ==========
    
    if (tableExists($conn, 'financial_transactions')) {
        $financial_stats = $conn->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN ft.financial_transactions_date >= ? AND ft.financial_transactions_type = 'Income' THEN ft.financial_transactions_amount END), 0) as income_30d,
                COALESCE(SUM(CASE WHEN ft.financial_transactions_date >= ? AND ft.financial_transactions_type = 'Expense' THEN ft.financial_transactions_amount END), 0) as expenses_30d,
                
                COALESCE(SUM(CASE WHEN ft.financial_transactions_date >= ? AND ft.financial_transactions_type = 'Income' THEN ft.financial_transactions_amount END), 0) as income_7d,
                COALESCE(SUM(CASE WHEN ft.financial_transactions_date >= ? AND ft.financial_transactions_type = 'Expense' THEN ft.financial_transactions_amount END), 0) as expenses_7d
            FROM financial_transactions ft
        ");
        
        $financial_stats->bind_param("ssss", $last_30_days, $last_30_days, $last_7_days, $last_7_days);
        $financial_stats->execute();
        $financial_result = $financial_stats->get_result()->fetch_assoc();
        
        $dashboard_data['financial'] = $financial_result;
    } elseif (tableExists($conn, 'safe_transactions')) {
        $financial_stats = $conn->prepare("
            SELECT
                COALESCE(SUM(CASE WHEN st.safe_transactions_date >= ? AND st.safe_transactions_type IN ('deposit','receipt','sale','transfer_in','other') THEN st.safe_transactions_amount END), 0) as income_30d,
                COALESCE(SUM(CASE WHEN st.safe_transactions_date >= ? AND st.safe_transactions_type IN ('withdrawal','supplier_payment','purchase','expense','transfer_out','payment') THEN st.safe_transactions_amount END), 0) as expenses_30d,

                COALESCE(SUM(CASE WHEN st.safe_transactions_date >= ? AND st.safe_transactions_type IN ('deposit','receipt','sale','transfer_in','other') THEN st.safe_transactions_amount END), 0) as income_7d,
                COALESCE(SUM(CASE WHEN st.safe_transactions_date >= ? AND st.safe_transactions_type IN ('withdrawal','supplier_payment','purchase','expense','transfer_out','payment') THEN st.safe_transactions_amount END), 0) as expenses_7d
            FROM safe_transactions st
            WHERE st.safe_transactions_status IN ('approved', 'pending')
        ");

        $financial_stats->bind_param("ssss", $last_30_days, $last_30_days, $last_7_days, $last_7_days);
        $financial_stats->execute();
        $financial_result = $financial_stats->get_result()->fetch_assoc();

        $dashboard_data['financial'] = $financial_result;
    } else {
        $dashboard_data['financial'] = [
            'income_30d' => 0,
            'expenses_30d' => 0,
            'income_7d' => 0,
            'expenses_7d' => 0,
        ];
    }

    // ========== 5. Client Statistics ==========
    
    $client_stats = $conn->prepare("\n        SELECT \n            COUNT(CASE WHEN c.clients_status = 'active' AND c.clients_created_at >= ? THEN 1 END) as new_clients_30d,\n            COUNT(CASE WHEN c.clients_status = 'active' AND c.clients_created_at >= ? THEN 1 END) as new_clients_7d,\n            COUNT(CASE WHEN c.clients_status = 'active' THEN 1 END) as total_active_clients,\n            COALESCE(SUM(c.clients_credit_balance), 0) as total_clients_balance\n        FROM clients c\n    ");
    
    $client_stats->bind_param("ss", $last_30_days, $last_7_days);
    $client_stats->execute();
    $client_result = $client_stats->get_result()->fetch_assoc();
    
    $dashboard_data['clients'] = $client_result;

    // ========== 6. Supplier Statistics ==========
    
    $supplier_stats = $conn->prepare("
        SELECT 
            COUNT(CASE WHEN s.supplier_created_at >= ? THEN 1 END) as new_suppliers_30d,
            COUNT(CASE WHEN s.supplier_created_at >= ? THEN 1 END) as new_suppliers_7d,
            COUNT(*) as total_active_suppliers,
            COALESCE(SUM(s.supplier_balance), 0) as total_balance
        FROM suppliers s
    ");
    
    $supplier_stats->bind_param("ss", $last_30_days, $last_7_days);
    $supplier_stats->execute();
    $supplier_result = $supplier_stats->get_result()->fetch_assoc();
    
    $dashboard_data['suppliers'] = $supplier_result;

    // ========== 7. Top Selling Products (Last 30 Days) ==========
    
    $top_selling_products = $conn->prepare("
        SELECT 
            pv.variant_name,
            p.products_name,
            SUM(soi.sales_order_items_quantity) as total_quantity,
            COALESCE(SUM(soi.sales_order_items_total_price), 0) as total_revenue,
            COUNT(DISTINCT so.sales_orders_id) as order_count
        FROM sales_order_items soi
        INNER JOIN sales_orders so ON soi.sales_order_items_sales_order_id = so.sales_orders_id
        INNER JOIN product_variants pv ON soi.sales_order_items_variant_id = pv.variant_id
        INNER JOIN products p ON pv.variant_products_id = p.products_id
    WHERE so.sales_orders_order_date >= ? 
    AND so.sales_orders_status IN ('Invoiced', 'Shipped', 'Delivered', 'Approved', 'Completed')
        GROUP BY soi.sales_order_items_variant_id, pv.variant_name, p.products_name
    ORDER BY total_quantity DESC
    LIMIT 20
    ");
    
    $top_selling_products->bind_param("s", $last_30_days);
    $top_selling_products->execute();
    $top_selling_result = $top_selling_products->get_result()->fetch_all(MYSQLI_ASSOC);
    
    $dashboard_data['top_selling_products'] = $top_selling_result;

    // ========== 8. Low Stock Products ==========
    
    // Get stock thresholds from settings
    $low_stock_threshold_stmt = $conn->prepare("SELECT settings_value FROM settings WHERE settings_key = 'low_stock_threshold' LIMIT 1");
    $low_stock_threshold_stmt->execute();
    $low_stock_threshold_result = $low_stock_threshold_stmt->get_result()->fetch_assoc();
    $low_stock_threshold = $low_stock_threshold_result ? (int)$low_stock_threshold_result['settings_value'] : 50;
    $low_stock_threshold_stmt->close();
    
    $out_of_stock_threshold_stmt = $conn->prepare("SELECT settings_value FROM settings WHERE settings_key = 'out_of_stock_threshold' LIMIT 1");
    $out_of_stock_threshold_stmt->execute();
    $out_of_stock_threshold_result = $out_of_stock_threshold_stmt->get_result()->fetch_assoc();
    $out_of_stock_threshold = $out_of_stock_threshold_result ? (int)$out_of_stock_threshold_result['settings_value'] : 5;
    $out_of_stock_threshold_stmt->close();
    
    $low_stock_products = $conn->prepare("
        SELECT 
            pv.variant_name,
            p.products_name,
            SUM(i.inventory_quantity) as total_stock,
            w.warehouse_name,
            MAX(i.inventory_status) as inventory_status,
            CASE 
                WHEN SUM(i.inventory_quantity) <= ? THEN 'Out of Stock'
                WHEN SUM(i.inventory_quantity) <= ? THEN 'Low Stock'
                ELSE 'In Stock'
            END as warning_type
        FROM inventory i
        INNER JOIN product_variants pv ON i.variant_id = pv.variant_id
        INNER JOIN products p ON pv.variant_products_id = p.products_id
        INNER JOIN warehouse w ON i.warehouse_id = w.warehouse_id
        GROUP BY i.variant_id, pv.variant_name, p.products_name, w.warehouse_name
        HAVING total_stock <= ?
        ORDER BY total_stock ASC
        LIMIT 50
    ");
    
    $low_stock_products->bind_param("iii", $out_of_stock_threshold, $low_stock_threshold, $low_stock_threshold);
    $low_stock_products->execute();
    $low_stock_result = $low_stock_products->get_result()->fetch_all(MYSQLI_ASSOC);
    
    $dashboard_data['low_stock_products'] = $low_stock_result;
    $dashboard_data['low_stock_settings'] = [
        'low_stock_threshold' => $low_stock_threshold,
        'out_of_stock_threshold' => $out_of_stock_threshold
    ];

    // ========== 9. Most Returned Products (Last 30 Days) ==========
    
    $top_returned_products = $conn->prepare("
        SELECT 
            pv.variant_name,
            p.products_name,
            SUM(sri.return_items_quantity) as total_returned_quantity,
            COALESCE(SUM(sri.return_items_total_price), 0) as total_returned_value,
            COUNT(DISTINCT sr.returns_id) as return_count
        FROM sales_return_items sri
        INNER JOIN sales_returns sr ON sri.return_items_return_id = sr.returns_id
        INNER JOIN sales_order_items soi ON sri.return_items_sales_order_item_id = soi.sales_order_items_id
        INNER JOIN product_variants pv ON soi.sales_order_items_variant_id = pv.variant_id
        INNER JOIN products p ON pv.variant_products_id = p.products_id
        WHERE sr.returns_date >= ? 
        AND sr.returns_status != 'Cancelled'
    GROUP BY soi.sales_order_items_variant_id, pv.variant_name, p.products_name
    ORDER BY total_returned_quantity DESC
    LIMIT 20
    ");
    
    $top_returned_products->bind_param("s", $last_30_days);
    $top_returned_products->execute();
    $top_returned_result = $top_returned_products->get_result()->fetch_all(MYSQLI_ASSOC);
    
    $dashboard_data['top_returned_products'] = $top_returned_result;

    // ========== 10. Recent Visits/Calls ==========
    
    $recent_visits = $conn->prepare("
        SELECT 
            v.visits_id,
            v.visits_client_id,
            c.clients_company_name AS client_company_name,
            v.visits_start_time,
            v.visits_status,
            v.visits_purpose,
            u.users_name as representative_name
        FROM visits v
        INNER JOIN clients c ON v.visits_client_id = c.clients_id
        INNER JOIN users u ON v.visits_rep_user_id = u.users_id
        WHERE v.visits_start_time >= ?
        ORDER BY v.visits_start_time DESC
        LIMIT 10
    ");
    
    $visits_since = $last_7_days . " 00:00:00";
    $recent_visits->bind_param("s", $visits_since);
    $recent_visits->execute();
    $recent_visits_result = $recent_visits->get_result()->fetch_all(MYSQLI_ASSOC);
    
    $dashboard_data['recent_visits'] = $recent_visits_result;

    // ========== 11. Monthly Comparison (Current vs Previous Month) ==========
    
    $monthly_comparison = $conn->prepare("
        SELECT 
            -- Current Month
            COALESCE(SUM(CASE WHEN so.sales_orders_order_date >= ? AND so.sales_orders_status = 'Invoiced' THEN so.sales_orders_total_amount END), 0) as current_month_sales,
            COUNT(CASE WHEN so.sales_orders_order_date >= ? AND so.sales_orders_status = 'Invoiced' THEN 1 END) as current_month_orders,
            
            -- Previous Month
            COALESCE(SUM(CASE WHEN so.sales_orders_order_date >= ? AND so.sales_orders_order_date <= ? AND so.sales_orders_status = 'Invoiced' THEN so.sales_orders_total_amount END), 0) as previous_month_sales,
            COUNT(CASE WHEN so.sales_orders_order_date >= ? AND so.sales_orders_order_date <= ? AND so.sales_orders_status = 'Invoiced' THEN 1 END) as previous_month_orders
        FROM sales_orders so
    ");
    
    $monthly_comparison->bind_param("ssssss", $current_month_start, $current_month_start, $last_month_start, $last_month_end, $last_month_start, $last_month_end);
    $monthly_comparison->execute();
    $monthly_result = $monthly_comparison->get_result()->fetch_assoc();
    
    $dashboard_data['monthly_comparison'] = $monthly_result;

    // ========== 12. Users Performance (Last 30 Days) ==========
    
    $user_performance = $conn->prepare("
        SELECT 
            u.users_id,
            u.users_name,
            u.users_role,
            COUNT(DISTINCT so.sales_orders_id) as orders_handled,
            COALESCE(SUM(so.sales_orders_total_amount), 0) as total_sales_value,
            COUNT(DISTINCT v.visits_id) as visits_conducted
        FROM users u
        LEFT JOIN sales_orders so ON u.users_id = so.sales_orders_representative_id 
            AND so.sales_orders_order_date >= ? 
            AND so.sales_orders_status = 'Invoiced'
        LEFT JOIN visits v ON u.users_id = v.visits_rep_user_id 
            AND v.visits_start_time >= ?
        WHERE u.users_status = 1
        GROUP BY u.users_id, u.users_name, u.users_role
        ORDER BY total_sales_value DESC
        LIMIT 10
    ");
    
    $user_performance->bind_param("ss", $last_30_days, $last_30_days);
    $user_performance->execute();
    $user_performance_result = $user_performance->get_result()->fetch_all(MYSQLI_ASSOC);
    
    $dashboard_data['user_performance'] = $user_performance_result;

    // Add metadata with generated timestamp
    $dashboard_data['meta'] = [
        'generated_at' => date('Y-m-d H:i:s')
    ];

    // Return successful response
    echo json_encode([
        'status' => 'success',
        'data' => $dashboard_data
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    // Log the error for debugging
    error_log("Dashboard API Error: " . $e->getMessage());
    
    // Return error response
    echo json_encode([
        'status' => 'failure',
        'message' => 'Internal Error: ' . $e->getMessage()
    ]);
}
?>
            