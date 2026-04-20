<?php
/**
 * Import Product Attribute Values from Odoo
 * 
 * Imports product.attribute.value from Odoo to product_attribute_values table in Rep
 * 
 * Mapping:
 * - attribute_value_id: Odoo attribute value ID
 * - attribute_value_attribute_id: attribute_id (FK to product_attributes)
 * - attribute_value_value: value name (Red, Blue, Large, Small, etc.)
 * 
 * Note: Must run import_product_attributes first to ensure attributes exist
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

/**
 * Get value from Odoo field (handles [id, name] format)
 */
function getOdooValue($field, $index = 0) {
    if ($field === false || $field === null) return null;
    if (is_array($field) && isset($field[$index])) return $field[$index];
    return $field;
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
    
    // Get all product attribute values from Odoo
    $attribute_values = importOdooCall($odoo_url, 'product.attribute.value', 'search_read', $cookie_file, [[]], [
        'fields' => ['id', 'name', 'attribute_id', 'sequence']
    ]);
    
    if (empty($attribute_values)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على قيم خصائص منتجات في Odoo',
            'data' => [
                'imported' => 0,
                'updated' => 0
            ]
        ]);
        exit;
    }
    
    $imported = 0;
    $updated = 0;
    $skipped = 0;
    $errors = [];
    
    foreach ($attribute_values as $val) {
        $attribute_value_id = $val['id'];
        $attribute_value_value = $val['name'];
        
        // attribute_id is an array [id, name] in Odoo
        $attribute_value_attribute_id = getOdooValue($val['attribute_id'], 0);
        
        if (!$attribute_value_attribute_id) {
            $errors[] = "Attribute value ID $attribute_value_id has no attribute_id";
            $skipped++;
            continue;
        }
        
        // Check if attribute exists
        $stmt = $conn->prepare("SELECT attribute_id FROM product_attributes WHERE attribute_id = ?");
        $stmt->bind_param("i", $attribute_value_attribute_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $attr_exists = $result->fetch_assoc();
        $stmt->close();
        
        if (!$attr_exists) {
            $errors[] = "Attribute ID $attribute_value_attribute_id not found for value '$attribute_value_value' (ID: $attribute_value_id). Run import_product_attributes first.";
            $skipped++;
            continue;
        }
        
        // Check if attribute value exists by ID
        $stmt = $conn->prepare("SELECT attribute_value_id FROM product_attribute_values WHERE attribute_value_id = ?");
        $stmt->bind_param("i", $attribute_value_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->fetch_assoc();
        $stmt->close();
        
        if ($exists) {
            // Update existing
            $stmt = $conn->prepare("UPDATE product_attribute_values SET attribute_value_attribute_id = ?, attribute_value_value = ? WHERE attribute_value_id = ?");
            $stmt->bind_param("isi", $attribute_value_attribute_id, $attribute_value_value, $attribute_value_id);
            if ($stmt->execute()) {
                $updated++;
            } else {
                $errors[] = "Failed to update attribute value ID $attribute_value_id: " . $stmt->error;
            }
            $stmt->close();
        } else {
            // Insert new with specific ID
            $stmt = $conn->prepare("INSERT INTO product_attribute_values (attribute_value_id, attribute_value_attribute_id, attribute_value_value) VALUES (?, ?, ?)");
            $stmt->bind_param("iis", $attribute_value_id, $attribute_value_attribute_id, $attribute_value_value);
            if ($stmt->execute()) {
                $imported++;
            } else {
                $errors[] = "Failed to insert attribute value ID $attribute_value_id: " . $stmt->error;
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
        'message' => "تم استيراد قيم خصائص المنتجات: $imported جديد، $updated محدث، $skipped تم تخطيه",
        'data' => [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'total_from_odoo' => count($attribute_values),
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
