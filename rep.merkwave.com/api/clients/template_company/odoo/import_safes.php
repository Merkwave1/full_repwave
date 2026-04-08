<?php
/**
 * Import Journals (Safes) from Odoo
 * 
 * Maps Odoo account.journal (type = cash or bank) to local safes table
 */

require_once __DIR__ . '/../db_connect.php';

header('Content-Type: application/json; charset=utf-8');
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
        CURLOPT_TIMEOUT => 300,
        CURLOPT_COOKIEJAR => $cookie_file,
        CURLOPT_COOKIEFILE => $cookie_file,
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    if (isset($result['error'])) throw new Exception($result['error']['data']['message'] ?? 'API call failed');
    return $result['result'] ?? [];
}

try {    // Load Odoo settings from database
    // Odoo settings loaded from functions.php via db_connect.php
    $odoo_settings = getOdooSettings();
    $odoo_url = $odoo_settings['url'];
    $odoo_db = $odoo_settings['database'];
    
    // Authenticate with Odoo using database settings
    importOdooAuth($odoo_url, $odoo_db, $odoo_settings['username'], $odoo_settings['password'], $cookie_file);
    
    // Get default payment method (first one or create "General")
    $default_payment_method_id = 1;
    $result = $conn->query("SELECT payment_methods_id FROM payment_methods ORDER BY payment_methods_id ASC LIMIT 1");
    if ($result && $row = $result->fetch_assoc()) {
        $default_payment_method_id = $row['payment_methods_id'];
    } else {
        // Create "General" payment method
        $conn->query("INSERT INTO payment_methods (payment_methods_name, payment_methods_description, payment_methods_type, payment_methods_is_active) VALUES ('General', 'طريقة دفع عامة', 'other', 1)");
        $default_payment_method_id = $conn->insert_id;
    }
    
    // Get first user ID for safes_rep_user_id
    $default_user_id = null;
    $result = $conn->query("SELECT users_id FROM users ORDER BY users_id ASC LIMIT 1");
    if ($result && $row = $result->fetch_assoc()) {
        $default_user_id = $row['users_id'];
    }
    
    // Fetch journals from Odoo (cash and bank types)
    $journals = importOdooCall(
        $odoo_url, 
        'account.journal', 
        'search_read', 
        $cookie_file,
        [[['type', 'in', ['cash', 'bank']]]],
        ['context' => ['active_test' => false],

        'fields' => ['id', 'name', 'type', 'code', 'active', 'company_id']]
    );
    
    $imported = 0;
    $updated = 0;
    $skipped = 0;
    $details = [];
    
    foreach ($journals as $journal) {
        $odoo_id = $journal['id'];
        $name = $journal['name'];
        $type = $journal['type']; // cash or bank
        $code = $journal['code'] ?? '';
        $is_active = $journal['active'] ?? true;
        
        // Check if safe already exists by safes_id (same as odoo_id)
        $stmt = $conn->prepare("SELECT safes_id FROM safes WHERE safes_id = ?");
        $stmt->bind_param("i", $odoo_id);
        $stmt->execute();
        $exists = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        
        if ($exists) {
            // Update existing safe
            $stmt = $conn->prepare("UPDATE safes SET 
                safes_name = ?,
                safes_description = ?,
                safes_is_active = ?,
                safes_odoo_journal_id = ?,
                safes_updated_at = CURRENT_TIMESTAMP
                WHERE safes_id = ?");
            $description = "Odoo Journal: $code";
            $active = $is_active ? 1 : 0;
            $stmt->bind_param("ssiii", $name, $description, $active, $odoo_id, $odoo_id);
            $stmt->execute();
            $stmt->close();
            $updated++;
            $details[] = ['id' => $odoo_id, 'name' => $name, 'action' => 'updated'];
        } else {
            // Insert new safe with safes_id = odoo_id
            $stmt = $conn->prepare("INSERT INTO safes (
                safes_id,
                safes_name,
                safes_description,
                safes_balance,
                safes_type,
                safes_rep_user_id,
                safes_payment_method_id,
                safes_is_active,
                safes_odoo_journal_id,
                safes_color
            ) VALUES (?, ?, ?, 0.00, 'company', ?, ?, ?, ?, 'white')");
            
            $description = "Odoo Journal: $code";
            $active = $is_active ? 1 : 0;
            $stmt->bind_param("issiiii", 
                $odoo_id,
                $name, 
                $description, 
                $default_user_id,
                $default_payment_method_id,
                $active,
                $odoo_id
            );
            
            if ($stmt->execute()) {
                $imported++;
                $details[] = ['id' => $odoo_id, 'name' => $name, 'action' => 'imported'];
            } else {
                $skipped++;
                $details[] = ['id' => $odoo_id, 'name' => $name, 'action' => 'failed', 'error' => $stmt->error];
            }
            $stmt->close();
        }
    }
    
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => "تم استيراد الخزائن: $imported جديد، $updated محدث، $skipped تم تخطيه",
        'data' => [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'total_from_odoo' => count($journals),
            'default_payment_method_id' => $default_payment_method_id,
            'default_user_id' => $default_user_id,
            'details' => $details
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    echo json_encode([
        'status' => 'error',
        'message' => 'فشل استيراد الخزائن: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
