<?php
/**
 * Import Client Types from Odoo
 * 
 * Imports contact.type from Odoo to client_types table in Rep
 * Uses Odoo contact type ID as Rep client type ID for synchronization.
 */

require_once __DIR__ . '/../db_connect.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

$cookie_file = '/tmp/odoo_import_cookies_' . uniqid() . '.txt';

/**
 * Authenticate with Odoo
 */
function importOdooAuth($url, $database, $username, $password, $cookie_file) {
    $auth_url = rtrim($url, '/') . '/web/session/authenticate';
    
    $payload = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => ['db' => $database, 'login' => $username, 'password' => $password],
        'id' => rand(1, 999999)
    ];
    
    $ch = curl_init($auth_url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_HEADER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_COOKIEJAR => $cookie_file,
        CURLOPT_COOKIEFILE => $cookie_file,
    ]);
    
    $response = curl_exec($ch);
    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $body = substr($response, $header_size);
    curl_close($ch);
    
    $result = json_decode($body, true);
    if (isset($result['result']['uid']) && $result['result']['uid']) return $result['result'];
    throw new Exception($result['error']['data']['message'] ?? 'فشل المصادقة');
}

/**
 * Call Odoo API
 */
function importOdooCall($url, $model, $method, $cookie_file, $args = [], $kwargs = []) {
    $call_url = rtrim($url, '/') . '/web/dataset/call_kw/' . $model . '/' . $method;
    
    $payload = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => ['model' => $model, 'method' => $method, 'args' => $args, 'kwargs' => $kwargs],
        'id' => rand(1, 999999)
    ];
    
    $ch = curl_init($call_url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_COOKIEJAR => $cookie_file,
        CURLOPT_COOKIEFILE => $cookie_file,
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    if (isset($result['error'])) throw new Exception($result['error']['data']['message'] ?? json_encode($result['error']));
    return $result['result'] ?? null;
}

// Main execution
try {
    $json_input = file_get_contents('php://input');
    $input = json_decode($json_input, true) ?? [];
    $input = array_merge($_POST, $input);
    
    $mode = $input['mode'] ?? 'update';
    $dry_run = isset($input['dry_run']) && ($input['dry_run'] === true || $input['dry_run'] === 'true');
    
    $stats = ['created' => 0, 'updated' => 0, 'failed' => 0, 'details' => []];
    
    // Get Odoo settings
    $stmt = $conn->prepare("SELECT settings_key, settings_value FROM settings WHERE settings_key LIKE 'odoo_%'");
    $stmt->execute();
    $result = $stmt->get_result();
    $odooSettings = [];
    while ($row = $result->fetch_assoc()) {
        $odooSettings[$row['settings_key']] = $row['settings_value'];
    }
    $stmt->close();
    
    $odoo_url = $odooSettings['odoo_url'] ?? '';
    $odoo_database = $odooSettings['odoo_database'] ?? '';
    $odoo_username = $odooSettings['odoo_username'] ?? '';
    $odoo_password = $odooSettings['odoo_password'] ?? '';
    
    if (empty($odoo_url) || empty($odoo_database)) {
        print_failure('Odoo settings are incomplete');
        exit;
    }
    
    // Authenticate
    importOdooAuth($odoo_url, $odoo_database, $odoo_username, $odoo_password, $cookie_file);
    
    // Fetch contact types from Odoo
    $types = importOdooCall($odoo_url, 'contact.type', 'search_read', $cookie_file,
        [[]],
        ['context' => ['active_test' => false],

        'fields' => ['id', 'name'], 'order' => 'name ASC']
    );
    
    if (file_exists($cookie_file)) unlink($cookie_file);
    
    if (!is_array($types) || empty($types)) {
        print_failure('No contact types found in Odoo');
        exit;
    }
    
    // Get existing types
    $existing = [];
    $stmt = $conn->prepare("SELECT client_type_id FROM client_types");
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $existing[(int)$row['client_type_id']] = true;
    }
    $stmt->close();
    
    // Process types
    foreach ($types as $index => $type) {
        try {
            $id = $type['id'];
            $name = $type['name'] ?? 'Unknown';
            
            if (isset($existing[$id])) {
                // Update
                if (!$dry_run) {
                    $stmt = $conn->prepare("UPDATE client_types SET client_type_name = ?, client_type_sort_order = ? WHERE client_type_id = ?");
                    $stmt->bind_param('sii', $name, $index, $id);
                    $stmt->execute();
                    $stmt->close();
                }
                $stats['updated']++;
                $stats['details'][] = ['action' => 'updated', 'id' => $id, 'name' => $name];
            } else {
                // Insert
                if (!$dry_run) {
                    $stmt = $conn->prepare("INSERT INTO client_types (client_type_id, client_type_name, client_type_sort_order) VALUES (?, ?, ?)");
                    $stmt->bind_param('isi', $id, $name, $index);
                    $stmt->execute();
                    $stmt->close();
                }
                $stats['created']++;
                $stats['details'][] = ['action' => 'created', 'id' => $id, 'name' => $name];
            }
        } catch (Exception $e) {
            $stats['failed']++;
            $stats['details'][] = ['action' => 'failed', 'id' => $type['id'] ?? 0, 'error' => $e->getMessage()];
        }
    }
    
    $message = sprintf('تم استيراد أنواع العملاء: %d جديد، %d محدث، %d فشل', $stats['created'], $stats['updated'], $stats['failed']);
    if ($dry_run) $message = '[محاكاة] ' . $message;
    
    print_success($message, [
        'created' => $stats['created'],
        'updated' => $stats['updated'],
        'failed' => $stats['failed'],
        'total_from_odoo' => count($types),
        'dry_run' => $dry_run,
        'details' => $stats['details']
    ]);
    
} catch (Exception $e) {
    if (isset($cookie_file) && file_exists($cookie_file)) unlink($cookie_file);
    print_failure('خطأ في الاستيراد: ' . $e->getMessage());
}
?>
