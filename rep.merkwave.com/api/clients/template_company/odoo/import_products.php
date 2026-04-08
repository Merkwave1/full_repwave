<?php
/**
 * Import Products from Odoo Product Templates
 * 
 * Imports product.template from Odoo to products table in Rep
 * 
 * Mapping:
 * - products_id: Odoo template ID
 * - products_name: name
 * - products_unit_of_measure_id: uom_id (FK to base_units - actually this is packaging_types)
 * - products_category_id: categ_id (FK to categories)
 * - products_description: description_sale
 * - products_brand: (from product attributes if available)
 * - products_is_active: active
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
    
    // First, get all UOMs to build a mapping of UOM ID -> Category ID
    // and also collect all UOM IDs per category for preferred packaging
    $uoms = importOdooCall($odoo_url, 'uom.uom', 'search_read', $cookie_file, [[]], [
        'fields' => ['id', 'category_id']
    ]);
    $uom_to_category = [];
    $category_to_uoms = []; // category_id => [uom_id1, uom_id2, ...]
    foreach ($uoms as $uom) {
        $cat_id = getOdooValue($uom['category_id'], 0);
        $uom_to_category[$uom['id']] = $cat_id;
        if (!isset($category_to_uoms[$cat_id])) {
            $category_to_uoms[$cat_id] = [];
        }
        $category_to_uoms[$cat_id][] = $uom['id'];
    }
    
    // Get all product templates from Odoo
    $products = importOdooCall($odoo_url, 'product.template', 'search_read', $cookie_file, [[]], [
        'fields' => [
            'id', 'name', 'default_code', 'categ_id', 'list_price', 'standard_price',
            'uom_id', 'uom_po_id', 'type', 'sale_ok', 'purchase_ok', 'active',
            'barcode', 'description_sale', 'weight', 'volume'
        ]
    ]);
    
    if (empty($products)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على منتجات في Odoo',
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
    
    foreach ($products as $product) {
        $products_id = $product['id'];
        $products_name = $product['name'];
        
        // Handle duplicate names by checking if name exists with different ID
        $stmt = $conn->prepare("SELECT products_id FROM products WHERE products_name = ? AND products_id != ?");
        $stmt->bind_param("si", $products_name, $products_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->fetch_assoc()) {
            // Name exists with different ID, append Odoo ID to make unique
            $products_name = $products_name . ' (ID:' . $products_id . ')';
        }
        $stmt->close();
        
        // Get category ID
        $products_category_id = getOdooValue($product['categ_id'], 0);
        
        // Get UOM ID and map to category (base_unit)
        // In Odoo, uom_id is the unit of measure for the product
        // Rep's products_unit_of_measure_id references base_units (UOM categories)
        $uom_id = getOdooValue($product['uom_id'], 0);
        $base_unit_id = isset($uom_to_category[$uom_id]) ? $uom_to_category[$uom_id] : 1; // Default to 1 (Unit)
        
        // Verify base_unit exists in database
        $stmt = $conn->prepare("SELECT base_units_id FROM base_units WHERE base_units_id = ?");
        $stmt->bind_param("i", $base_unit_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if (!$result->fetch_assoc()) {
            // Base unit doesn't exist, use default Unit (1)
            $base_unit_id = 1;
        }
        $stmt->close();
        $products_unit_of_measure_id = $base_unit_id;
        
        // Description
        $products_description = (!empty($product['description_sale']) && $product['description_sale'] !== false) 
            ? substr($product['description_sale'], 0, 500) 
            : null;
        
        // Active status
        $products_is_active = $product['active'] ? 1 : 0;
        
        // Weight and volume
        $products_weight = (!empty($product['weight']) && $product['weight'] !== false) ? $product['weight'] : null;
        $products_volume = (!empty($product['volume']) && $product['volume'] !== false) ? $product['volume'] : null;
        
        // Check if exists by ID
        $stmt = $conn->prepare("SELECT products_id FROM products WHERE products_id = ?");
        $stmt->bind_param("i", $products_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->fetch_assoc();
        $stmt->close();
        
        if ($exists) {
            // Update existing
            $stmt = $conn->prepare("UPDATE products SET 
                products_name = ?, 
                products_unit_of_measure_id = ?, 
                products_category_id = ?, 
                products_description = ?,
                products_is_active = ?,
                products_weight = ?,
                products_volume = ?
                WHERE products_id = ?");
            $stmt->bind_param("siisiddi", 
                $products_name, 
                $products_unit_of_measure_id, 
                $products_category_id, 
                $products_description,
                $products_is_active,
                $products_weight,
                $products_volume,
                $products_id
            );
            if ($stmt->execute()) {
                $updated++;
            } else {
                $errors[] = "Failed to update product ID $products_id: " . $stmt->error;
            }
            $stmt->close();
        } else {
            // Insert new with specific ID
            $stmt = $conn->prepare("INSERT INTO products (
                products_id, 
                products_name, 
                products_unit_of_measure_id, 
                products_category_id, 
                products_description,
                products_is_active,
                products_weight,
                products_volume
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isiisidd", 
                $products_id, 
                $products_name, 
                $products_unit_of_measure_id, 
                $products_category_id, 
                $products_description,
                $products_is_active,
                $products_weight,
                $products_volume
            );
            if ($stmt->execute()) {
                $imported++;
            } else {
                $errors[] = "Failed to insert product ID $products_id: " . $stmt->error;
            }
            $stmt->close();
        }
        
        // Insert preferred packaging types for this product
        // Get all UOM IDs from the product's UoM category and add them as preferred packaging
        $uom_category_id = $products_unit_of_measure_id; // This is the category/base_unit ID
        if (isset($category_to_uoms[$uom_category_id])) {
            foreach ($category_to_uoms[$uom_category_id] as $packaging_type_id) {
                // Check if this packaging_type_id exists in packaging_types table
                $stmt = $conn->prepare("SELECT packaging_types_id FROM packaging_types WHERE packaging_types_id = ?");
                $stmt->bind_param("i", $packaging_type_id);
                $stmt->execute();
                $packaging_exists = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                
                if ($packaging_exists) {
                    // Insert preferred packaging (ignore if already exists)
                    $stmt = $conn->prepare("INSERT IGNORE INTO product_preferred_packaging (products_id, packaging_type_id) VALUES (?, ?)");
                    $stmt->bind_param("ii", $products_id, $packaging_type_id);
                    $stmt->execute();
                    $stmt->close();
                }
            }
        }
    }
    
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    $conn->close();
    
    echo json_encode([
        'status' => 'success',
        'message' => "تم استيراد المنتجات: $imported جديد، $updated محدث، $skipped تم تخطيه",
        'data' => [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'total_from_odoo' => count($products),
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
