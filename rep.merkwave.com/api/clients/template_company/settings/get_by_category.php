<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get operations

    // Get all settings and organize them by categories
    $stmt = $conn->prepare("
        SELECT 
            settings_id, 
            settings_key, 
            settings_value, 
            settings_description, 
            settings_type
        FROM settings
        ORDER BY settings_key ASC
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $settings_by_category = [
        'company' => [],
        'system' => [],
        'financial' => [],
        'business_rules' => [],
        'inventory' => [],
        'mobile_gps' => [],
        'visit_management' => [],
        'safe_financial' => [],
        'warehouse_transfers' => [],
        'client_management' => [],
        'notifications' => [],
        'security' => [],
        'backup_maintenance' => [],
        'reports_analytics' => [],
        'product_packaging' => [],
        'ui_ux' => [],
        'integration_api' => [],
        'performance' => [],
        'advanced_features' => [],
        'document_prefixes' => [],
        'other' => []
    ];

    while ($row = $result->fetch_assoc()) {
        $key = $row['settings_key'];
        $category = 'other'; // default category
        
        // Categorize based on key patterns
        if (strpos($key, 'company_') === 0) {
            $category = 'company';
        } elseif (in_array($key, ['users_limits', 'expiration_date', 'timezone', 'date_format', 'time_format', 'language', 'fiscal_year_start'])) {
            $category = 'system';
        } elseif (strpos($key, 'currency_') === 0 || strpos($key, 'tax_') === 0 || strpos($key, 'payment_') === 0 || strpos($key, 'decimal_') === 0 || $key === 'default_currency') {
            $category = 'financial';
        } elseif (strpos($key, 'auto_approve_') === 0 || strpos($key, 'credit_limit_') === 0 || strpos($key, 'require_visit_') === 0 || strpos($key, 'order_') === 0 || strpos($key, 'invoice_') === 0 || strpos($key, 'return_') === 0 || strpos($key, 'max_discount_') === 0) {
            $category = 'business_rules';
        } elseif (strpos($key, 'low_stock_') === 0 || strpos($key, 'allow_negative_') === 0 || strpos($key, 'require_batch_') === 0 || strpos($key, 'auto_reorder_') === 0 || strpos($key, 'reorder_') === 0 || strpos($key, 'max_expiry_') === 0) {
            $category = 'inventory';
        } elseif (strpos($key, 'gps_') === 0 || strpos($key, 'location_') === 0 || strpos($key, 'offline_') === 0 || strpos($key, 'max_photo_') === 0 || strpos($key, 'require_check_') === 0) {
            $category = 'mobile_gps';
        } elseif (strpos($key, 'visit_') === 0 || strpos($key, 'daily_visit_') === 0 || strpos($key, 'client_visit_') === 0 || strpos($key, 'auto_schedule_') === 0) {
            $category = 'visit_management';
        } elseif (strpos($key, 'expense_') === 0 || strpos($key, 'safe_') === 0 || strpos($key, 'collection_') === 0 || strpos($key, 'daily_closing_') === 0) {
            $category = 'safe_financial';
        } elseif (strpos($key, 'transfer_') === 0 || strpos($key, 'goods_receipt_') === 0 || strpos($key, 'inventory_adjustment_') === 0 || strpos($key, 'inter_warehouse_') === 0 || strpos($key, 'van_to_main_') === 0) {
            $category = 'warehouse_transfers';
        } elseif (strpos($key, 'client_') === 0 || strpos($key, 'require_client_') === 0 || strpos($key, 'overdue_payment_') === 0) {
            $category = 'client_management';
        } elseif (strpos($key, 'notification_') === 0 || strpos($key, 'email_') === 0 || strpos($key, 'sms_') === 0 || strpos($key, 'push_') === 0 || strpos($key, 'admin_email') === 0) {
            $category = 'notifications';
        } elseif (strpos($key, 'session_') === 0 || strpos($key, 'password_') === 0 || strpos($key, 'max_login_') === 0 || strpos($key, 'lockout_') === 0 || strpos($key, 'require_password_') === 0 || strpos($key, 'two_factor_') === 0) {
            $category = 'security';
        } elseif (strpos($key, 'backup_') === 0 || strpos($key, 'auto_backup_') === 0 || strpos($key, 'maintenance_') === 0 || strpos($key, 'data_retention_') === 0) {
            $category = 'backup_maintenance';
        } elseif (strpos($key, 'default_report_') === 0 || strpos($key, 'enable_advanced_') === 0 || strpos($key, 'dashboard_') === 0 || strpos($key, 'sales_report_') === 0) {
            $category = 'reports_analytics';
        } elseif (strpos($key, 'default_expiry_') === 0 || strpos($key, 'barcode_') === 0 || strpos($key, 'require_product_') === 0 || strpos($key, 'variant_') === 0) {
            $category = 'product_packaging';
        } elseif (strpos($key, 'items_per_page') === 0 || strpos($key, 'theme_') === 0 || strpos($key, 'show_help_') === 0 || strpos($key, 'default_language_') === 0) {
            $category = 'ui_ux';
        } elseif (strpos($key, 'api_') === 0 || strpos($key, 'webhook_') === 0 || strpos($key, 'external_') === 0) {
            $category = 'integration_api';
        } elseif (strpos($key, 'cache_') === 0 || strpos($key, 'database_optimization_') === 0) {
            $category = 'performance';
        } elseif (strpos($key, 'multi_warehouse_') === 0 || strpos($key, 'representative_commission_') === 0 || strpos($key, 'supplier_credit_') === 0 || strpos($key, 'seasonal_pricing_') === 0 || strpos($key, 'loyalty_program_') === 0 || strpos($key, 'route_optimization_') === 0 || strpos($key, 'competitor_price_') === 0 || strpos($key, 'quality_control_') === 0) {
            $category = 'advanced_features';
        } elseif (strpos($key, '_prefix') !== false) {
            $category = 'document_prefixes';
        }
        
        $settings_by_category[$category][] = [
            'id' => $row['settings_id'],
            'key' => $row['settings_key'],
            'value' => $row['settings_value'],
            'description' => $row['settings_description'],
            'type' => $row['settings_type']
        ];
    }

    // Remove empty categories
    $settings_by_category = array_filter($settings_by_category, function($category) {
        return !empty($category);
    });

    print_success("Settings by category retrieved successfully.", $settings_by_category);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
