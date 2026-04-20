<?php
// Test Odoo connection endpoint
// This endpoint tests the Odoo connection with provided credentials
// Note: This endpoint should work even when integration is disabled,
// as users need to test connection before enabling integration.

require_once '../db_connect.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

try {
    // Read JSON input (frontend sends JSON with Content-Type: application/json)
    $json_input = file_get_contents('php://input');
    $input_data = json_decode($json_input, true) ?? [];
    
    // Merge with $_POST for backwards compatibility
    $data = array_merge($_POST, $input_data);
    
    // Get test credentials - support both naming conventions
    $odoo_url = $data['url'] ?? $data['odoo_url'] ?? '';
    $odoo_database = $data['database'] ?? $data['odoo_database'] ?? '';
    $odoo_username = $data['username'] ?? $data['odoo_username'] ?? '';
    $odoo_password = $data['password'] ?? $data['odoo_password'] ?? '';
    
    // Validate required fields
    if (empty($odoo_url) || empty($odoo_database) || empty($odoo_username) || empty($odoo_password)) {
        print_failure('جميع حقول الاتصال مطلوبة');
        exit;
    }
    
    // Test authentication
    $auth_url = $odoo_url . '/web/session/authenticate';
    $auth_data = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => [
            'db' => $odoo_database,
            'login' => $odoo_username,
            'password' => $odoo_password
        ],
        'id' => rand()
    ];
    
    $ch = curl_init($auth_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($auth_data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10); // 10 second timeout
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    // Check for cURL errors
    if ($curl_error) {
        print_failure('فشل الاتصال بـ Odoo: ' . $curl_error);
        exit;
    }
    
    // Check HTTP status
    if ($http_code !== 200) {
        print_failure('فشل الاتصال: خطأ HTTP ' . $http_code);
        exit;
    }
    
    // Parse response
    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $body = substr($response, $header_size);
    $json_response = json_decode($body, true);
    
    // Check if authentication was successful
    if (isset($json_response['result']) && isset($json_response['result']['uid'])) {
        $user_id = $json_response['result']['uid'];
        if ($user_id) {
            print_success('نجح الاتصال بـ Odoo! User ID: ' . $user_id, [
                'uid' => $user_id,
                'username' => $json_response['result']['username'] ?? $odoo_username,
                'db' => $odoo_database
            ]);
        } else {
            print_failure('فشلت المصادقة: بيانات الدخول غير صحيحة');
        }
    } else {
        $error_msg = $json_response['error']['data']['message'] ?? 'خطأ غير معروف';
        print_failure('فشلت المصادقة: ' . $error_msg);
    }
    
} catch (Exception $e) {
    error_log('Odoo connection test error: ' . $e->getMessage());
    print_failure('خطأ في الاختبار: ' . $e->getMessage());
}
?>
