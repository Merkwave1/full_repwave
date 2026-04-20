<?php
/**
 * Import Product Variants from Odoo
 * 
 * Imports product.product from Odoo to product_variants table in Rep
 * 
 * Mapping:
 * - variant_id: Odoo product.product ID
 * - variant_products_id: product_tmpl_id (FK to products)
 * - variant_name: name (or variant combination name)
 * - variant_sku: default_code
 * - variant_barcode: barcode
 * - variant_unit_price: lst_price (sale price)
 * - variant_cost_price: standard_price (cost)
 * - variant_odoo_product_id: Odoo product.product ID
 * - variant_status: active
 * 
 * Note: Must run import_products first to ensure products exist
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
    
    // First, get all taxes to build a mapping
    $taxes = importOdooCall($odoo_url, 'account.tax', 'search_read', $cookie_file, [[['type_tax_use', '=', 'sale']]], [
        'fields' => ['id', 'name', 'amount']
    ]);
    $tax_rates = [];
    foreach ($taxes as $tax) {
        $tax_rates[$tax['id']] = $tax['amount'];
    }
    
    // Get all product variants from Odoo
    $variants = importOdooCall($odoo_url, 'product.product', 'search_read', $cookie_file, [[]], [
        'fields' => [
            'id', 'name', 'default_code', 'product_tmpl_id', 'barcode',
            'lst_price', 'standard_price', 'qty_available', 'uom_id', 'active',
            'weight', 'volume', 'product_template_attribute_value_ids', 'taxes_id'
        ]
    ]);
    
    if (empty($variants)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على متغيرات منتجات في Odoo',
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
    
    foreach ($variants as $variant) {
        $variant_id = $variant['id'];
        $variant_name = $variant['name'];
        
        // Get product template ID (parent product)
        $variant_products_id = getOdooValue($variant['product_tmpl_id'], 0);
        
        if (!$variant_products_id) {
            $errors[] = "Variant ID $variant_id has no product_tmpl_id";
            $skipped++;
            continue;
        }
        
        // Check if product exists
        $stmt = $conn->prepare("SELECT products_id FROM products WHERE products_id = ?");
        $stmt->bind_param("i", $variant_products_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $product_exists = $result->fetch_assoc();
        $stmt->close();
        
        if (!$product_exists) {
            $errors[] = "Product ID $variant_products_id not found for variant '$variant_name' (ID: $variant_id). Run import_products first.";
            $skipped++;
            continue;
        }
        
        // SKU (default_code)
        $variant_sku = (!empty($variant['default_code']) && $variant['default_code'] !== false) 
            ? substr($variant['default_code'], 0, 100) 
            : null;
        
        // Barcode
        $variant_barcode = (!empty($variant['barcode']) && $variant['barcode'] !== false) 
            ? substr($variant['barcode'], 0, 100) 
            : null;
        
        // Prices
        $variant_unit_price = $variant['lst_price'] ?? 0;
        $variant_cost_price = (!empty($variant['standard_price']) && $variant['standard_price'] !== false) 
            ? $variant['standard_price'] 
            : null;
        
        // Weight and volume
        $variant_weight = (!empty($variant['weight']) && $variant['weight'] !== false) ? $variant['weight'] : null;
        $variant_volume = (!empty($variant['volume']) && $variant['volume'] !== false) ? $variant['volume'] : null;
        
        // Active status
        $variant_status = $variant['active'] ? 1 : 0;
        
        // Odoo product ID for reference
        $variant_odoo_product_id = $variant['id'];
        
        // Tax settings
        $variant_has_tax = 0;
        $variant_tax_rate = null;
        if (!empty($variant['taxes_id']) && is_array($variant['taxes_id']) && count($variant['taxes_id']) > 0) {
            $variant_has_tax = 1;
            // Get the first tax rate
            $first_tax_id = $variant['taxes_id'][0];
            if (isset($tax_rates[$first_tax_id])) {
                $variant_tax_rate = $tax_rates[$first_tax_id];
            }
        }
        
        // Handle duplicate SKUs by checking if SKU exists with different ID
        if ($variant_sku) {
            $stmt = $conn->prepare("SELECT variant_id FROM product_variants WHERE variant_sku = ? AND variant_id != ?");
            $stmt->bind_param("si", $variant_sku, $variant_id);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->fetch_assoc()) {
                // SKU exists with different ID, append variant ID to make unique
                $variant_sku = $variant_sku . '-' . $variant_id;
            }
            $stmt->close();
        }
        
        // Check if variant exists by ID
        $stmt = $conn->prepare("SELECT variant_id FROM product_variants WHERE variant_id = ?");
        $stmt->bind_param("i", $variant_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists_by_id = $result->fetch_assoc();
        $stmt->close();
        
        // Also check if exists by SKU (different ID but same SKU)
        $exists_by_sku = null;
        if ($variant_sku) {
            $stmt = $conn->prepare("SELECT variant_id FROM product_variants WHERE variant_sku = ? AND variant_id != ?");
            $stmt->bind_param("si", $variant_sku, $variant_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $exists_by_sku = $result->fetch_assoc();
            $stmt->close();
        }
        
        if ($exists_by_sku) {
            // SKU exists with different ID - update that record's ID
            $old_id = $exists_by_sku['variant_id'];
            $stmt = $conn->prepare("UPDATE product_variants SET 
                variant_id = ?,
                variant_products_id = ?, 
                variant_name = ?, 
                variant_barcode = ?,
                variant_unit_price = ?,
                variant_cost_price = ?,
                variant_weight = ?,
                variant_volume = ?,
                variant_odoo_product_id = ?,
                variant_status = ?,
                variant_has_tax = ?,
                variant_tax_rate = ?
                WHERE variant_id = ?");
            $stmt->bind_param("iissddddiiidi", 
                $variant_id,
                $variant_products_id, 
                $variant_name, 
                $variant_barcode,
                $variant_unit_price,
                $variant_cost_price,
                $variant_weight,
                $variant_volume,
                $variant_odoo_product_id,
                $variant_status,
                $variant_has_tax,
                $variant_tax_rate,
                $old_id
            );
            if ($stmt->execute()) {
                $updated++;
            } else {
                $errors[] = "Failed to update variant SKU '$variant_sku' (ID $old_id -> $variant_id): " . $stmt->error;
            }
            $stmt->close();
        } elseif ($exists_by_id) {
            // Update existing
            $stmt = $conn->prepare("UPDATE product_variants SET 
                variant_products_id = ?, 
                variant_name = ?, 
                variant_sku = ?, 
                variant_barcode = ?,
                variant_unit_price = ?,
                variant_cost_price = ?,
                variant_weight = ?,
                variant_volume = ?,
                variant_odoo_product_id = ?,
                variant_status = ?,
                variant_has_tax = ?,
                variant_tax_rate = ?
                WHERE variant_id = ?");
            $stmt->bind_param("isssddddiiidi", 
                $variant_products_id, 
                $variant_name, 
                $variant_sku, 
                $variant_barcode,
                $variant_unit_price,
                $variant_cost_price,
                $variant_weight,
                $variant_volume,
                $variant_odoo_product_id,
                $variant_status,
                $variant_has_tax,
                $variant_tax_rate,
                $variant_id
            );
            if ($stmt->execute()) {
                $updated++;
            } else {
                $errors[] = "Failed to update variant ID $variant_id: " . $stmt->error;
            }
            $stmt->close();
        } else {
            // Insert new with specific ID
            $stmt = $conn->prepare("INSERT INTO product_variants (
                variant_id,
                variant_products_id, 
                variant_name, 
                variant_sku, 
                variant_barcode,
                variant_unit_price,
                variant_cost_price,
                variant_weight,
                variant_volume,
                variant_odoo_product_id,
                variant_status,
                variant_has_tax,
                variant_tax_rate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iisssdddiiiid", 
                $variant_id,
                $variant_products_id, 
                $variant_name, 
                $variant_sku, 
                $variant_barcode,
                $variant_unit_price,
                $variant_cost_price,
                $variant_weight,
                $variant_volume,
                $variant_odoo_product_id,
                $variant_status,
                $variant_has_tax,
                $variant_tax_rate
            );
            if ($stmt->execute()) {
                $imported++;
            } else {
                $errors[] = "Failed to insert variant ID $variant_id: " . $stmt->error;
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
        'message' => "تم استيراد متغيرات المنتجات: $imported جديد، $updated محدث، $skipped تم تخطيه",
        'data' => [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'total_from_odoo' => count($variants),
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
