<?php
/**
 * Odoo Product Sync Functions
 * 
 * This file handles synchronization of product variants to Odoo as products.
 * Each variant in RepWave is sent as an individual product in Odoo.
 * 
 * Odoo Product Fields Mapping:
 * - name: Variant name (or product name + variant name)
 * - detailed_type: 'product' (Storable Product with inventory tracking)
 * - list_price: Sales price (variant_unit_price)
 * - standard_price: Cost price (variant_cost_price)
 * - taxes_id: Sales taxes (from variant_tax_rate)
 * - categ_id: Product category
 * - default_code: Internal reference (variant_id from RepWave)
 * - barcode: Barcode (variant_barcode)
 * - tracking: 'lot' for tracking by quantity
 * 
 * @author RepWave Integration
 * @version 1.0
 */

if (!function_exists('callOdooAPI')) {
    require_once '../functions.php';
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
    global $pdo;
    $sync_status = 'failed';
    $sync_action = 'create';
    $error_message = null;
    $odoo_product_id = false;
    
    try {
        // Build product name: use variant name only
        $product_name = '';
        if (!empty($variantData['variant_name'])) {
            $product_name = $variantData['variant_name'];
        } else {
            $error_message = 'Variant name is required';
            logProductSync($php_variant_id, null, $sync_status, $sync_action, $error_message);
            return false;
        }
        
        // Prepare Odoo product data
        // Note: For Odoo 17+, product type values are:
        // 'consu' (Goods - storable), 'service', 'combo'
        $odoo_product_data = [
            'name' => $product_name,
            'type' => 'consu',             // Goods (storable product with inventory)
            'is_storable' => true,         // Enable inventory tracking
            'sale_ok' => true,             // Can be sold
            'purchase_ok' => true,         // Can be purchased
        ];
        
        // Internal Reference - Always use variant_id from RepWave
        $odoo_product_data['default_code'] = (string)$php_variant_id;
        
        // Sales Price (list_price)
        if (!empty($variantData['variant_unit_price'])) {
            $odoo_product_data['list_price'] = (float)$variantData['variant_unit_price'];
        }
        
        // Cost Price (standard_price)
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
        
        // Product Category - Map from products table category
        if (!empty($productData['products_category'])) {
            $odoo_categ_id = getOrCreateOdooProductCategory($productData['products_category']);
            if ($odoo_categ_id) {
                $odoo_product_data['categ_id'] = $odoo_categ_id;
            }
        }
        
        // Sales Taxes - Handle tax based on variant settings
        if (!empty($variantData['variant_has_tax']) && $variantData['variant_has_tax'] == 1) {
            $tax_rate = !empty($variantData['variant_tax_rate']) ? (float)$variantData['variant_tax_rate'] : 14.0;
            $odoo_tax_id = getOrCreateOdooSalesTax($tax_rate);
            if ($odoo_tax_id) {
                // taxes_id is a Many2many field, needs to be set as [(6, 0, [tax_ids])]
                $odoo_product_data['taxes_id'] = [[6, 0, [$odoo_tax_id]]];
            }
        } else {
            // No tax - clear taxes
            $odoo_product_data['taxes_id'] = [[6, 0, []]];
        }
        
        // Description/Notes
        if (!empty($variantData['variant_notes'])) {
            $odoo_product_data['description_sale'] = $variantData['variant_notes'];
        }
        
        // Product description from parent
        if (!empty($productData['products_description'])) {
            $odoo_product_data['description'] = $productData['products_description'];
        }
        
        // Check if product already exists in Odoo (by internal reference)
        $existing_product = findOdooProductByReference($odoo_product_data['default_code']);
        
        if ($existing_product) {
            // Update existing product
            $sync_action = 'update';
            $result = callOdooAPI('product.product', 'write', [[$existing_product], $odoo_product_data]);
            
            if ($result) {
                $odoo_product_id = $existing_product;
                $sync_status = 'success';
                error_log("Odoo product sync successful: Updated product ID $odoo_product_id for variant $php_variant_id");
            } else {
                $error_message = 'Failed to update product in Odoo';
                error_log("Odoo product sync failed: $error_message");
            }
        } else {
            // Create new product
            $odoo_product_id = callOdooAPI('product.product', 'create', [$odoo_product_data]);
            
            if ($odoo_product_id) {
                $sync_status = 'success';
                error_log("Odoo product sync successful: Created product ID $odoo_product_id for variant $php_variant_id");
            } else {
                $error_message = 'Failed to create product in Odoo';
                error_log("Odoo product sync failed: $error_message");
            }
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Odoo product sync error: $error_message");
    }
    
    // Log the sync attempt
    if ($php_variant_id && $pdo) {
        logProductSync($php_variant_id, $odoo_product_id, $sync_status, $sync_action, $error_message);
        
        // Update the product_variants table with the Odoo product ID
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
 * Find Odoo product by internal reference (default_code)
 * 
 * @param string $reference Internal reference/SKU
 * @return int|false Odoo product ID or false if not found
 */
function findOdooProductByReference($reference) {
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
 * 
 * @param string $barcode Product barcode
 * @return int|false Odoo product ID or false if not found
 */
function findOdooProductByBarcode($barcode) {
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
 * 
 * @param string $category_name Category name
 * @return int|false Odoo category ID or false on failure
 */
function getOrCreateOdooProductCategory($category_name) {
    try {
        if (empty($category_name)) {
            return false;
        }
        
        // Search for existing category by name
        $domain = [['name', '=', $category_name]];
        $existing_categories = callOdooAPI('product.category', 'search', [$domain], ['limit' => 1]);
        
        if (!empty($existing_categories) && is_array($existing_categories) && count($existing_categories) > 0) {
            error_log("Odoo product category found: ID {$existing_categories[0]} for '$category_name'");
            return $existing_categories[0];
        }
        
        // Create new category
        $category_data = ['name' => $category_name];
        $category_id = callOdooAPI('product.category', 'create', [$category_data]);
        
        if ($category_id) {
            error_log("Odoo product category created: ID $category_id for '$category_name'");
            return $category_id;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error getting/creating Odoo product category: " . $e->getMessage());
        return false;
    }
}

/**
 * Get or create Odoo sales tax
 * 
 * @param float $tax_rate Tax rate percentage (e.g., 14.0 for 14%)
 * @return int|false Odoo tax ID or false on failure
 */
function getOrCreateOdooSalesTax($tax_rate) {
    try {
        if ($tax_rate === null || $tax_rate < 0) {
            return false;
        }
        
        $tax_rate = (float)$tax_rate;
        
        // Search for existing sales tax with this rate
        // Odoo stores tax amount as percentage (e.g., 14.0)
        $domain = [
            ['type_tax_use', '=', 'sale'],
            ['amount', '=', $tax_rate],
            ['amount_type', '=', 'percent']
        ];
        
        $existing_taxes = callOdooAPI('account.tax', 'search', [$domain], ['limit' => 1]);
        
        if (!empty($existing_taxes) && is_array($existing_taxes) && count($existing_taxes) > 0) {
            error_log("Odoo sales tax found: ID {$existing_taxes[0]} for rate {$tax_rate}%");
            return $existing_taxes[0];
        }
        
        // Create new tax
        $tax_name = $tax_rate;
        $tax_data = [
            'name' => $tax_name,
            'type_tax_use' => 'sale',
            'amount_type' => 'percent',
            'amount' => $tax_rate,
            'active' => true,
        ];
        
        $tax_id = callOdooAPI('account.tax', 'create', [$tax_data]);
        
        if ($tax_id) {
            error_log("Odoo sales tax created: ID $tax_id for rate {$tax_rate}%");
            return $tax_id;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Error getting/creating Odoo sales tax: " . $e->getMessage());
        return false;
    }
}

/**
 * Update existing product in Odoo
 * 
 * @param int $odoo_product_id Odoo product ID
 * @param array $data Data to update
 * @return bool True on success, false on failure
 */
function updateOdooProduct($odoo_product_id, $data) {
    try {
        $result = callOdooAPI('product.product', 'write', [[$odoo_product_id], $data]);
        
        if ($result) {
            error_log("Odoo product update successful: ID $odoo_product_id");
            return true;
        } else {
            error_log("Odoo product update failed: ID $odoo_product_id");
            return false;
        }
        
    } catch (Exception $e) {
        error_log("Odoo product update error: " . $e->getMessage());
        return false;
    }
}

/**
 * Log product sync attempt to database
 * 
 * @param int $php_variant_id PHP variant ID
 * @param int|false $odoo_product_id Odoo product ID (false if failed)
 * @param string $status 'success' or 'failed'
 * @param string $action 'create' or 'update'
 * @param string|null $error_message Error message if failed
 * @return bool True on success
 */
function logProductSync($php_variant_id, $odoo_product_id, $status, $action = 'create', $error_message = null) {
    try {
        global $pdo;
        
        if (!$pdo) {
            error_log("Cannot log product sync: PDO connection not available");
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
        
        // Insert log entry
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
 * Fetches product data and calls the main sync function
 * 
 * @param int $variant_id The variant ID to sync
 * @return int|false Odoo product ID or false on failure
 */
function syncVariantById($variant_id) {
    global $pdo;
    
    try {
        if (!$pdo) {
            error_log("Cannot sync variant: PDO connection not available");
            return false;
        }
        
        // Get variant data with product info and category name
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
            error_log("Variant not found: ID $variant_id");
            return false;
        }
        
        // Extract product data
        $productData = [
            'products_id' => $data['products_id'],
            'products_name' => $data['products_name'],
            'products_category' => $data['products_category'],
            'products_description' => $data['products_description'],
            'products_brand' => $data['products_brand'],
        ];
        
        // Sync to Odoo
        return syncProductVariantToOdoo($data, $variant_id, $productData);
        
    } catch (Exception $e) {
        error_log("Error syncing variant by ID: " . $e->getMessage());
        return false;
    }
}

/**
 * Bulk sync all variants that haven't been synced yet
 * 
 * @param int $limit Maximum number of variants to sync (0 for all)
 * @return array Summary of sync results
 */
function bulkSyncUnsynceVariants($limit = 0) {
    global $pdo;
    
    $results = [
        'total' => 0,
        'success' => 0,
        'failed' => 0,
        'details' => []
    ];
    
    try {
        if (!$pdo) {
            error_log("Cannot bulk sync: PDO connection not available");
            return $results;
        }
        
        // Get variants that haven't been synced (no Odoo ID)
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
