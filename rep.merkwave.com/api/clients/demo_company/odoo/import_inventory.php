<?php
/**
 * Import Inventory from Odoo
 * 
 * Imports stock.quant from Odoo to inventory table in Rep
 * Only imports inventory from internal warehouse locations with positive quantities
 * 
 * Mapping:
 * - variant_id: Odoo product_id (product.product)
 * - warehouse_id: Mapped from location_id via warehouse's lot_stock_id
 * - inventory_quantity: quantity from stock.quant
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
    
    // Step 1: Get all warehouses with their stock location IDs
    $warehouses = importOdooCall($odoo_url, 'stock.warehouse', 'search_read', $cookie_file, [[]], [
        'fields' => ['id', 'name', 'lot_stock_id']
    ]);
    
    // Build location_id to warehouse_id mapping
    $location_to_warehouse = [];
    foreach ($warehouses as $wh) {
        if (isset($wh['lot_stock_id']) && is_array($wh['lot_stock_id']) && count($wh['lot_stock_id']) > 0) {
            $location_id = $wh['lot_stock_id'][0];
            $warehouse_id = $wh['id'];
            $location_to_warehouse[$location_id] = $warehouse_id;
        }
    }
    
    // Get location IDs that belong to warehouses
    $warehouse_location_ids = array_keys($location_to_warehouse);
    
    if (empty($warehouse_location_ids)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على مواقع مستودعات في Odoo',
            'data' => [
                'imported' => 0,
                'updated' => 0
            ]
        ]);
        exit;
    }
    
    // Step 2: Get inventory (stock.quant) for warehouse locations with positive quantities
    $quants = importOdooCall($odoo_url, 'stock.quant', 'search_read', $cookie_file, [
        [
            ['location_id', 'in', $warehouse_location_ids],
            ['quantity', '>', 0]
        ]
    ], [
        'fields' => ['id', 'product_id', 'location_id', 'quantity', 'reserved_quantity']
    ]);
    
    if (empty($quants)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على مخزون in Odoo warehouse locations',
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
    
    // Clear existing inventory before import (full sync)
    $conn->query("DELETE FROM inventory");
    
    foreach ($quants as $quant) {
        $location_id = $quant['location_id'][0] ?? null;
        $product_id = $quant['product_id'][0] ?? null; // This is product.product ID (variant)
        $quantity = $quant['quantity'] ?? 0;
        
        if (!$location_id || !$product_id || $quantity <= 0) {
            $skipped++;
            continue;
        }
        
        // Map location to warehouse
        $warehouse_id = $location_to_warehouse[$location_id] ?? null;
        if (!$warehouse_id) {
            $skipped++;
            continue;
        }
        
        // Check if variant exists in Rep database
        $check_variant = $conn->prepare("SELECT variant_id FROM product_variants WHERE variant_id = ?");
        $check_variant->bind_param("i", $product_id);
        $check_variant->execute();
        $variant_exists = $check_variant->get_result()->fetch_assoc();
        $check_variant->close();
        
        if (!$variant_exists) {
            // Skip silently - variant may be archived in Odoo
            $skipped++;
            continue;
        }
        
        // Check if warehouse exists in Rep database
        $check_warehouse = $conn->prepare("SELECT warehouse_id FROM warehouse WHERE warehouse_id = ?");
        $check_warehouse->bind_param("i", $warehouse_id);
        $check_warehouse->execute();
        $warehouse_exists = $check_warehouse->get_result()->fetch_assoc();
        $check_warehouse->close();
        
        if (!$warehouse_exists) {
            $skipped++;
            continue;
        }
        
        // Determine inventory status based on quantity
        $inventory_status = 'In Stock';
        if ($quantity <= 0) {
            $inventory_status = 'Out of Stock';
        } elseif ($quantity <= 10) {
            $inventory_status = 'Low Stock';
        }
        
        // Get the correct packaging_type_id based on product's base unit
        // We need to find a packaging type that is compatible with the product's UoM and has factor=1 (reference)
        $stmt = $conn->prepare("
            SELECT pt.packaging_types_id 
            FROM product_variants pv
            JOIN products p ON pv.variant_products_id = p.products_id
            JOIN packaging_types pt ON pt.packaging_types_compatible_base_unit_id = p.products_unit_of_measure_id
            WHERE pv.variant_id = ? 
            AND pt.packaging_types_default_conversion_factor = 1.0000
            LIMIT 1
        ");
        $stmt->bind_param("i", $product_id);
        $stmt->execute();
        $packaging_result = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        
        // Use the matching packaging type or fall back to Units (1)
        $packaging_type_id = $packaging_result ? $packaging_result['packaging_types_id'] : 1;
        
        // Check if inventory record exists for this variant+warehouse+packaging+date combination
        $today = date('Y-m-d');
        $stmt = $conn->prepare("SELECT inventory_id FROM inventory WHERE variant_id = ? AND warehouse_id = ? AND packaging_type_id = ? AND inventory_production_date = ?");
        $stmt->bind_param("iiis", $product_id, $warehouse_id, $packaging_type_id, $today);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->fetch_assoc();
        $stmt->close();
        
        if ($exists) {
            // Update existing
            $stmt = $conn->prepare("UPDATE inventory SET 
                inventory_quantity = ?, 
                inventory_status = ?,
                inventory_updated_at = CURRENT_TIMESTAMP
                WHERE inventory_id = ?");
            $stmt->bind_param("dsi", $quantity, $inventory_status, $exists['inventory_id']);
            if ($stmt->execute()) {
                $updated++;
            } else {
                $errors[] = "Failed to update inventory for variant $product_id in warehouse $warehouse_id: " . $stmt->error;
            }
            $stmt->close();
        } else {
            // Insert new
            $stmt = $conn->prepare("INSERT INTO inventory (
                variant_id, 
                warehouse_id, 
                inventory_quantity, 
                inventory_status,
                inventory_production_date,
                packaging_type_id
            ) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iidssi", $product_id, $warehouse_id, $quantity, $inventory_status, $today, $packaging_type_id);
            if ($stmt->execute()) {
                $imported++;
            } else {
                $errors[] = "Failed to insert inventory for variant $product_id in warehouse $warehouse_id: " . $stmt->error;
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
        'message' => "تم استيراد المخزون: $imported جديد، $updated محدث، $skipped تم تخطيه",
        'data' => [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'total_from_odoo' => count($quants),
            'errors' => array_slice($errors, 0, 10) // Limit errors to first 10
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
