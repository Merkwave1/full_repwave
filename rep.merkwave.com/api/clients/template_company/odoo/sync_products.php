<?php
/**
 * Odoo Product Sync Functions
 * 
 * Handles synchronization of product variants to Odoo as products.
 * Each variant in RepWave is sent as an individual product in Odoo.
 * 
 * @author RepWave Integration
 * @version 2.0
 */

if (!function_exists('callOdooAPI')) {
    require_once __DIR__ . '/../functions.php';
}

// Include the isOdooIntegrationEnabled function
if (!function_exists('isOdooIntegrationEnabled')) {
    require_once __DIR__ . '/sync_contacts.php';
}

/**
 * Sync a product variant to Odoo as a product
 * 
 * @param array $variantData The variant data from product_variants table
 * @param int $php_variant_id The PHP variant ID
 * @param array $productData Optional parent product data
 * @return int|false Odoo product.product ID or false on failure
 */
function syncProductVariantToOdoo($variantData, $php_variant_id, $productData = null) {
    // Check if integration is enabled FIRST - don't proceed or log if disabled
    if (!isOdooIntegrationEnabled()) {
        error_log('Odoo product sync skipped: Integration is disabled');
        return false;
    }
    
    global $pdo;
    $sync_status = 'failed';
    $sync_action = 'create';
    $error_message = null;
    $odoo_product_id = false;
    
    try {
        // Build product name
        $product_name = '';
        if (!empty($variantData['variant_name'])) {
            $product_name = $variantData['variant_name'];
        } else {
            $error_message = 'Variant name is required';
            logProductSync($php_variant_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Prepare Odoo product data
        $odoo_product_data = [
            'name' => $product_name,
            'type' => 'consu',
            'is_storable' => true,
            'sale_ok' => true,
            'purchase_ok' => true,
            'invoice_policy' => 'order', // Force invoicing on ordered quantities
        ];
        
        // Repwave Product ID (rw_id field in Odoo)
        $odoo_product_data['rw_id'] = (string)$php_variant_id;
        
        // Internal Reference / SKU
        if (!empty($variantData['variant_sku'])) {
            $odoo_product_data['default_code'] = $variantData['variant_sku'];
        }
        
        // Sales Price
        if (!empty($variantData['variant_unit_price'])) {
            $odoo_product_data['list_price'] = (float)$variantData['variant_unit_price'];
        }
        
        // Cost Price
        if (!empty($variantData['variant_cost_price'])) {
            $odoo_product_data['standard_price'] = (float)$variantData['variant_cost_price'];
        }
        
        // Barcode
        if (!empty($variantData['variant_barcode'])) {
            $odoo_product_data['barcode'] = $variantData['variant_barcode'];
        }
        
        // Weight
        if (!empty($variantData['variant_weight'])) {
            $odoo_product_data['weight'] = (float)$variantData['variant_weight'];
        }
        
        // Volume
        if (!empty($variantData['variant_volume'])) {
            $odoo_product_data['volume'] = (float)$variantData['variant_volume'];
        }
        
        // Active status
        $odoo_product_data['active'] = !empty($variantData['variant_status']) && $variantData['variant_status'] == 1;
        
        // Product Category
        if (!empty($productData['products_category'])) {
            $odoo_categ_id = getOrCreateOdooProductCategory($productData['products_category']);
            if ($odoo_categ_id) {
                $odoo_product_data['categ_id'] = $odoo_categ_id;
            }
        }
        
        // Sales Taxes
        if (!empty($variantData['variant_has_tax']) && $variantData['variant_has_tax'] == 1) {
            $tax_rate = !empty($variantData['variant_tax_rate']) ? (float)$variantData['variant_tax_rate'] : 14.0;
            $odoo_tax_id = getOrCreateOdooSalesTax($tax_rate);
            if ($odoo_tax_id) {
                $odoo_product_data['taxes_id'] = [[6, 0, [$odoo_tax_id]]];
            }
        } else {
            $odoo_product_data['taxes_id'] = [[6, 0, []]];
        }
        
        // Description
        if (!empty($variantData['variant_notes'])) {
            $odoo_product_data['description_sale'] = $variantData['variant_notes'];
        }
        
        if (!empty($productData['products_description'])) {
            $odoo_product_data['description'] = $productData['products_description'];
        }
        
        // Check if product already exists by Repwave ID
        $existing_product = findOdooProductByRepwaveId($php_variant_id);
        
        if ($existing_product) {
            // Update existing product
            $sync_action = 'update';
            $result = callOdooAPI('product.product', 'write', [[$existing_product], $odoo_product_data]);
            
            if ($result) {
                $odoo_product_id = $existing_product;
                $sync_status = 'success';
                error_log("Odoo product sync successful: Updated product ID $odoo_product_id");
            } else {
                $error_message = 'Failed to update product in Odoo';
            }
        } else {
            // Create new product
            $odoo_product_id = callOdooAPI('product.product', 'create', [$odoo_product_data]);
            
            if ($odoo_product_id) {
                $sync_status = 'success';
                error_log("Odoo product sync successful: Created product ID $odoo_product_id");
            } else {
                $error_message = 'Failed to create product in Odoo';
            }
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Odoo product sync error: $error_message");
    }
    
    // Log the sync attempt
    if ($php_variant_id && $pdo) {
        logProductSync($php_variant_id, $odoo_product_id, $sync_status, $sync_action, $error_message);
        
        // Update the product_variants table
        if ($odoo_product_id !== false && $odoo_product_id > 0) {
            try {
                $updateStmt = $pdo->prepare("UPDATE product_variants SET variant_odoo_product_id = ? WHERE variant_id = ?");
                $updateStmt->execute([$odoo_product_id, $php_variant_id]);
            } catch (Exception $e) {
                error_log("Failed to update variant with Odoo product ID: " . $e->getMessage());
            }
        }
    }
    
    return $odoo_product_id;
}

/**
 * Find Odoo product by Repwave Product ID (rw_id)
 * First checks local database for cached odoo_product_id, then searches Odoo by rw_id
 */
function findOdooProductByRepwaveId($rw_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        if (empty($rw_id)) {
            return false;
        }
        
        global $pdo;
        
        // First check local database for cached Odoo product ID
        if ($pdo) {
            $stmt = $pdo->prepare("SELECT variant_odoo_product_id FROM product_variants WHERE variant_id = ?");
            $stmt->execute([$rw_id]);
            $variant = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($variant && !empty($variant['variant_odoo_product_id'])) {
                $cached_odoo_id = (int)$variant['variant_odoo_product_id'];
                // Verify the product exists in Odoo
                $exists = callOdooAPI('product.product', 'search', [[['id', '=', $cached_odoo_id]]], ['limit' => 1]);
                if ($exists && is_array($exists) && count($exists) > 0) {
                    return $cached_odoo_id;
                }
            }
        }
        
        // Fallback: Search in Odoo by rw_id field
        $domain = [['rw_id', '=', (string)$rw_id]];
        $result = callOdooAPI('product.product', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            $odoo_product_id = $result[0];
            
            // Cache it locally for future use
            if ($pdo) {
                try {
                    $updateStmt = $pdo->prepare("UPDATE product_variants SET variant_odoo_product_id = ? WHERE variant_id = ?");
                    $updateStmt->execute([$odoo_product_id, $rw_id]);
                } catch (Exception $e) {
                    error_log("Failed to cache Odoo product ID: " . $e->getMessage());
                }
            }
            
            return $odoo_product_id;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error finding Odoo product by Repwave ID: " . $e->getMessage());
        return false;
    }
}

/**
 * Find Odoo product by internal reference (SKU)
 */
function findOdooProductByReference($reference) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        if (empty($reference)) {
            return false;
        }
        
        $domain = [['default_code', '=', $reference]];
        $result = callOdooAPI('product.product', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error finding Odoo product by reference: " . $e->getMessage());
        return false;
    }
}

/**
 * Find Odoo product by barcode
 */
function findOdooProductByBarcode($barcode) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        if (empty($barcode)) {
            return false;
        }
        
        $domain = [['barcode', '=', $barcode]];
        $result = callOdooAPI('product.product', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error finding Odoo product by barcode: " . $e->getMessage());
        return false;
    }
}

/**
 * Get or create Odoo product category
 */
function getOrCreateOdooProductCategory($category_name) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        if (empty($category_name)) {
            return false;
        }
        
        $domain = [['name', '=', $category_name]];
        $existing_categories = callOdooAPI('product.category', 'search', [$domain], ['limit' => 1]);
        
        if (!empty($existing_categories) && is_array($existing_categories) && count($existing_categories) > 0) {
            return $existing_categories[0];
        }
        
        $category_data = ['name' => $category_name];
        return callOdooAPI('product.category', 'create', [$category_data]);
        
    } catch (Exception $e) {
        error_log("Error getting/creating Odoo product category: " . $e->getMessage());
        return false;
    }
}

/**
 * Get or create Odoo sales tax
 */
function getOrCreateOdooSalesTax($tax_rate) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        if ($tax_rate === null || $tax_rate < 0) {
            return false;
        }
        
        $tax_rate = (float)$tax_rate;
        
        $domain = [
            ['type_tax_use', '=', 'sale'],
            ['amount', '=', $tax_rate],
            ['amount_type', '=', 'percent']
        ];
        
        $existing_taxes = callOdooAPI('account.tax', 'search', [$domain], ['limit' => 1]);
        
        if (!empty($existing_taxes) && is_array($existing_taxes) && count($existing_taxes) > 0) {
            return $existing_taxes[0];
        }
        
        $tax_name = $tax_rate;
        $tax_data = [
            'name' => $tax_name,
            'type_tax_use' => 'sale',
            'amount_type' => 'percent',
            'amount' => $tax_rate,
            'active' => true,
        ];
        
        return callOdooAPI('account.tax', 'create', [$tax_data]);
        
    } catch (Exception $e) {
        error_log("Error getting/creating Odoo sales tax: " . $e->getMessage());
        return false;
    }
}

/**
 * Update existing product in Odoo
 */
function updateOdooProduct($odoo_product_id, $data) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        $result = callOdooAPI('product.product', 'write', [[$odoo_product_id], $data]);
        
        if ($result) {
            error_log("Odoo product update successful: ID $odoo_product_id");
            return true;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Odoo product update error: " . $e->getMessage());
        return false;
    }
}

/**
 * Log product sync attempt
 */
function logProductSync($php_variant_id, $odoo_product_id, $status, $action = 'create', $error_message = null) {
    try {
        global $pdo;
        
        if (!$pdo) {
            return false;
        }
        
        // Create table if it doesn't exist
        $createTable = "
            CREATE TABLE IF NOT EXISTS odoo_product_sync_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                php_variant_id INT NOT NULL,
                odoo_product_id INT NULL,
                sync_status ENUM('success', 'failed') NOT NULL,
                sync_action ENUM('create', 'update') NOT NULL DEFAULT 'create',
                error_message TEXT NULL,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_php_variant_id (php_variant_id),
                INDEX idx_odoo_product_id (odoo_product_id),
                INDEX idx_sync_status (sync_status),
                INDEX idx_synced_at (synced_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        
        $pdo->exec($createTable);
        
        $stmt = $pdo->prepare("
            INSERT INTO odoo_product_sync_logs 
            (php_variant_id, odoo_product_id, sync_status, sync_action, error_message) 
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $php_variant_id,
            $odoo_product_id ?: null,
            $status,
            $action,
            $error_message
        ]);
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error logging product sync: " . $e->getMessage());
        return false;
    }
}

/**
 * Sync a variant with all related data
 */
function syncVariantById($variant_id) {
    if (!isOdooIntegrationEnabled()) {
        error_log('Odoo product sync skipped: Integration is disabled');
        return false;
    }
    
    global $pdo;
    
    try {
        if (!$pdo) {
            return false;
        }
        
        $stmt = $pdo->prepare("
            SELECT 
                pv.*,
                p.products_id,
                p.products_name,
                p.products_category_id,
                c.categories_name AS products_category,
                p.products_description,
                p.products_brand
            FROM product_variants pv
            JOIN products p ON pv.variant_products_id = p.products_id
            LEFT JOIN categories c ON p.products_category_id = c.categories_id
            WHERE pv.variant_id = ?
        ");
        $stmt->execute([$variant_id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$data) {
            return false;
        }
        
        $productData = [
            'products_id' => $data['products_id'],
            'products_name' => $data['products_name'],
            'products_category' => $data['products_category'],
            'products_description' => $data['products_description'],
            'products_brand' => $data['products_brand'],
        ];
        
        return syncProductVariantToOdoo($data, $variant_id, $productData);
        
    } catch (Exception $e) {
        error_log("Error syncing variant by ID: " . $e->getMessage());
        return false;
    }
}

/**
 * Bulk sync all unsynced variants
 */
function bulkSyncUnsynceVariants($limit = 0) {
    if (!isOdooIntegrationEnabled()) {
        error_log('Odoo bulk product sync skipped: Integration is disabled');
        return ['total' => 0, 'success' => 0, 'failed' => 0, 'details' => []];
    }
    
    global $pdo;
    
    $results = [
        'total' => 0,
        'success' => 0,
        'failed' => 0,
        'details' => []
    ];
    
    try {
        if (!$pdo) {
            return $results;
        }
        
        $sql = "
            SELECT 
                pv.*,
                p.products_id,
                p.products_name,
                p.products_category_id,
                c.categories_name AS products_category,
                p.products_description,
                p.products_brand
            FROM product_variants pv
            JOIN products p ON pv.variant_products_id = p.products_id
            LEFT JOIN categories c ON p.products_category_id = c.categories_id
            WHERE pv.variant_odoo_product_id IS NULL
            AND pv.variant_status = 1
        ";
        
        if ($limit > 0) {
            $sql .= " LIMIT " . (int)$limit;
        }
        
        $stmt = $pdo->query($sql);
        $variants = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $results['total'] = count($variants);
        
        foreach ($variants as $data) {
            $variant_id = $data['variant_id'];
            
            $productData = [
                'products_id' => $data['products_id'],
                'products_name' => $data['products_name'],
                'products_category' => $data['products_category'],
                'products_description' => $data['products_description'],
                'products_brand' => $data['products_brand'],
            ];
            
            $odoo_id = syncProductVariantToOdoo($data, $variant_id, $productData);
            
            if ($odoo_id) {
                $results['success']++;
                $results['details'][] = [
                    'variant_id' => $variant_id,
                    'odoo_id' => $odoo_id,
                    'status' => 'success'
                ];
            } else {
                $results['failed']++;
                $results['details'][] = [
                    'variant_id' => $variant_id,
                    'odoo_id' => null,
                    'status' => 'failed'
                ];
            }
        }
        
    } catch (Exception $e) {
        error_log("Error in bulk sync: " . $e->getMessage());
    }
    
    return $results;
}
