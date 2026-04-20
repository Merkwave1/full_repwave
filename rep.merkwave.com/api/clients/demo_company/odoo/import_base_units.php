<?php
/**
 * Import Base Units from Odoo UOM Categories
 * 
 * Imports uom.category from Odoo to base_units table in Rep
 * 
 * Mapping:
 * - base_units_id: Odoo category ID (to keep same ID)
 * - base_units_name: category name (Unit, Weight, Volume, etc.)
 * - base_units_description: null (Odoo categories don't have description)
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
        CURLOPT_TIMEOUT => 300,
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
    // Load Odoo settings from database
    // Odoo settings loaded from functions.php via db_connect.php
    $odoo_settings = getOdooSettings();
    $odoo_url = $odoo_settings['url'];
    $odoo_db = $odoo_settings['database'];
    
    // Authenticate with Odoo using database settings
    importOdooAuth($odoo_url, $odoo_db, $odoo_settings['username'], $odoo_settings['password'], $cookie_file);
    
    // Get all UOM categories from Odoo
    $uom_categories = importOdooCall($odoo_url, 'uom.category', 'search_read', $cookie_file, [[]], [
        'fields' => ['id', 'name']
    ]);
    
    if (empty($uom_categories)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على فئات وحدات القياس في Odoo',
            'data' => [
                'imported' => 0,
                'updated' => 0
            ]
        ]);
        exit;
    }
    
    $imported = 0;
    $updated = 0;
    $errors = [];
    
    foreach ($uom_categories as $cat) {
        $base_units_id = $cat['id'];
        $base_units_name = $cat['name'];
        
        // Check if exists by ID
        $stmt = $conn->prepare("SELECT base_units_id FROM base_units WHERE base_units_id = ?");
        $stmt->bind_param("i", $base_units_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists_by_id = $result->fetch_assoc();
        $stmt->close();
        
        if ($exists_by_id) {
            // Check if name already exists for different ID
            $stmt = $conn->prepare("SELECT base_units_id FROM base_units WHERE base_units_name = ? AND base_units_id != ?");
            $stmt->bind_param("si", $base_units_name, $base_units_id);
            $stmt->execute();
            $name_exists = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            
            if ($name_exists) {
                // Name exists for different ID, add suffix
                $base_units_name = $base_units_name . ' dd' . $base_units_id;
            }
            
            // Update existing
            $stmt = $conn->prepare("UPDATE base_units SET base_units_name = ? WHERE base_units_id = ?");
            $stmt->bind_param("si", $base_units_name, $base_units_id);
            if ($stmt->execute()) {
                $updated++;
            } else {
                $errors[] = "Failed to update base unit ID $base_units_id: " . $stmt->error;
            }
            $stmt->close();
        } else {
            // Check if name already exists
            $stmt = $conn->prepare("SELECT base_units_id FROM base_units WHERE base_units_name = ?");
            $stmt->bind_param("s", $base_units_name);
            $stmt->execute();
            $name_exists = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            
            if ($name_exists) {
                // Name exists, add suffix with ID
                $base_units_name = $base_units_name . ' dd' . $base_units_id;
            }
            
            // Insert new with specific ID
            $stmt = $conn->prepare("INSERT INTO base_units (base_units_id, base_units_name) VALUES (?, ?)");
            $stmt->bind_param("is", $base_units_id, $base_units_name);
            if ($stmt->execute()) {
                $imported++;
            } else {
                $errors[] = "Failed to insert base unit ID $base_units_id: " . $stmt->error;
            }
            $stmt->close();
        }
    }
    
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    $conn->close();
    
    echo json_encode([
        'status' => 'success',
        'message' => "تم استيراد وحدات القياس: $imported جديد، $updated محدث",
        'data' => [
            'imported' => $imported,
            'updated' => $updated,
            'total_from_odoo' => count($uom_categories),
            'errors' => $errors
        ]
    ]);
    
} catch (Exception $e) {
    // Clean up cookie file on error
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
