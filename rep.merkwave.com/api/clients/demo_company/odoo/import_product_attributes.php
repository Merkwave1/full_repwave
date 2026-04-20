<?php
/**
 * Import Product Attributes from Odoo
 * 
 * Imports product.attribute from Odoo to product_attributes table in Rep
 * 
 * Mapping:
 * - attribute_id: Odoo attribute ID
 * - attribute_name: attribute name (color, size, etc.)
 * - attribute_description: display_type from Odoo
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
    
    // First, get all attribute values to know which attributes have values
    $attribute_values = importOdooCall($odoo_url, 'product.attribute.value', 'search_read', $cookie_file, [[]], [
        'fields' => ['attribute_id']
    ]);
    
    // Build set of attribute IDs that have values
    $attributes_with_values = [];
    foreach ($attribute_values as $val) {
        if (isset($val['attribute_id']) && is_array($val['attribute_id']) && count($val['attribute_id']) > 0) {
            $attributes_with_values[$val['attribute_id'][0]] = true;
        }
    }
    
    // Get all product attributes from Odoo
    $attributes = importOdooCall($odoo_url, 'product.attribute', 'search_read', $cookie_file, [[]], [
        'fields' => ['id', 'name', 'display_type', 'create_variant']
    ]);
    
    if (empty($attributes)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على خصائص منتجات في Odoo',
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
    
    foreach ($attributes as $attr) {
        $attribute_id = $attr['id'];
        
        // Skip attributes that don't have any values
        if (!isset($attributes_with_values[$attribute_id])) {
            $skipped++;
            continue;
        }
        
        $attribute_name = $attr['name'];
        // Store display_type and create_variant as description
        $attribute_description = "Type: " . ($attr['display_type'] ?? 'radio') . ", Variant: " . ($attr['create_variant'] ?? 'always');
        
        // Check if exists by ID
        $stmt = $conn->prepare("SELECT attribute_id FROM product_attributes WHERE attribute_id = ?");
        $stmt->bind_param("i", $attribute_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->fetch_assoc();
        $stmt->close();
        
        if ($exists) {
            // Update existing
            $stmt = $conn->prepare("UPDATE product_attributes SET attribute_name = ?, attribute_description = ? WHERE attribute_id = ?");
            $stmt->bind_param("ssi", $attribute_name, $attribute_description, $attribute_id);
            if ($stmt->execute()) {
                $updated++;
            } else {
                $errors[] = "Failed to update attribute ID $attribute_id: " . $stmt->error;
            }
            $stmt->close();
        } else {
            // Insert new with specific ID
            $stmt = $conn->prepare("INSERT INTO product_attributes (attribute_id, attribute_name, attribute_description) VALUES (?, ?, ?)");
            $stmt->bind_param("iss", $attribute_id, $attribute_name, $attribute_description);
            if ($stmt->execute()) {
                $imported++;
            } else {
                $errors[] = "Failed to insert attribute ID $attribute_id: " . $stmt->error;
            }
            $stmt->close();
        }
    }
    
    // Delete attributes that don't have values (were skipped)
    // Get all attribute IDs from Odoo that DON'T have values
    $deleted = 0;
    $attributes_to_delete = [];
    foreach ($attributes as $attr) {
        if (!isset($attributes_with_values[$attr['id']])) {
            $attributes_to_delete[] = $attr['id'];
        }
    }
    
    if (!empty($attributes_to_delete)) {
        // Delete these attributes from the database
        $placeholders = implode(',', array_fill(0, count($attributes_to_delete), '?'));
        $stmt = $conn->prepare("DELETE FROM product_attributes WHERE attribute_id IN ($placeholders)");
        $types = str_repeat('i', count($attributes_to_delete));
        $stmt->bind_param($types, ...$attributes_to_delete);
        if ($stmt->execute()) {
            $deleted = $stmt->affected_rows;
        }
        $stmt->close();
    }
    
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    $conn->close();
    
    echo json_encode([
        'status' => 'success',
        'message' => "تم استيراد خصائص المنتجات: $imported جديد، $updated محدث، $skipped تم تخطيه (بدون قيم)، $deleted محذوف",
        'data' => [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'deleted' => $deleted,
            'total_from_odoo' => count($attributes),
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
