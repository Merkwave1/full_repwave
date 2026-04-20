<?php
/**
 * Import Categories from Odoo Product Categories
 * 
 * Imports product.category from Odoo to categories table in Rep
 * 
 * Mapping:
 * - categories_id: Odoo category ID
 * - categories_name: complete_name (full path like "All / Saleable")
 * - categories_description: empty
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
    
    // Get all product categories from Odoo
    $categories = importOdooCall($odoo_url, 'product.category', 'search_read', $cookie_file, [[]], [
        'fields' => ['id', 'name', 'parent_id', 'complete_name']
    ]);
    
    if (empty($categories)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على تصنيفات في Odoo',
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
    
    foreach ($categories as $cat) {
        $categories_id = $cat['id'];
        // Use complete_name for full path, or just name if not available
        $categories_name = !empty($cat['complete_name']) ? $cat['complete_name'] : $cat['name'];
        $categories_description = ''; // Odoo doesn't have description for categories
        
        // Check if exists by ID
        $stmt = $conn->prepare("SELECT categories_id FROM categories WHERE categories_id = ?");
        $stmt->bind_param("i", $categories_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->fetch_assoc();
        $stmt->close();
        
        if ($exists) {
            // Update existing
            $stmt = $conn->prepare("UPDATE categories SET categories_name = ?, categories_description = ? WHERE categories_id = ?");
            $stmt->bind_param("ssi", $categories_name, $categories_description, $categories_id);
            if ($stmt->execute()) {
                $updated++;
            } else {
                $errors[] = "Failed to update category ID $categories_id: " . $stmt->error;
            }
            $stmt->close();
        } else {
            // Insert new with specific ID
            $stmt = $conn->prepare("INSERT INTO categories (categories_id, categories_name, categories_description) VALUES (?, ?, ?)");
            $stmt->bind_param("iss", $categories_id, $categories_name, $categories_description);
            if ($stmt->execute()) {
                $imported++;
            } else {
                $errors[] = "Failed to insert category ID $categories_id: " . $stmt->error;
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
        'message' => "تم استيراد التصنيفات: $imported جديد، $updated محدث",
        'data' => [
            'imported' => $imported,
            'updated' => $updated,
            'total_from_odoo' => count($categories),
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
