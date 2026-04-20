<?php


require_once '../db_connect.php'; 
require_once '../odoo/sync_products.php'; // Odoo product sync
// require_once '../utils/handle_image_upload.php'; // Uncommented this line

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Check admin authorization
    

    // Validate request method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        print_failure("Error: Only POST requests are allowed.");
        exit;
    }

    // --- Collect Main Product POST Data ---
    $products_name                     = trim($_POST['products_name'] ?? '');
    $products_unit_of_measure_id       = $_POST['products_unit_of_measure_id'] ?? null;
    $products_category_id              = $_POST['products_category_id'] ?? null;
    $products_description              = trim($_POST['products_description'] ?? '');
    $products_brand                    = trim($_POST['products_brand'] ?? '');
    $products_is_active                = $_POST['products_is_active'] ?? 1;
    $products_supplier_id              = $_POST['products_supplier_id'] ?? null;
    $products_expiry_period_in_days    = $_POST['products_expiry_period_in_days'] ?? null;

    // --- Collect Preferred Packaging Data ---
    $preferred_packaging_ids_json = $_POST['preferred_packaging_ids'] ?? '[]';
    $preferred_packaging_ids      = json_decode($preferred_packaging_ids_json, true);
    
    // Check JSON decode error
    if (json_last_error() !== JSON_ERROR_NONE) {
        print_failure("Error: Invalid JSON format for preferred packaging IDs.");
        exit;
    }

    // --- Handle empty strings for nullable product fields ---
    if ($products_description === "") { $products_description = null; }
    if ($products_brand === "") { $products_brand = null; }
    if ($products_supplier_id === "") { $products_supplier_id = null; }
    if ($products_expiry_period_in_days === "") { $products_expiry_period_in_days = null; }

    // --- Product Image Upload Handling ---
    $products_image_url_db_path = null; 
    if (isset($_FILES['products_image_url']) && $_FILES['products_image_url']['error'] === UPLOAD_ERR_OK) { 
        try {
            $products_image_url_db_path = handle_image_upload($_FILES['products_image_url'], 'products/');
        } catch (Exception $e) {
            print_failure("Product Image Upload Error: " . $e->getMessage());
            exit; 
        }
    }
    $products_image_url = ($products_image_url_db_path !== null) ? "https://your-domain.example/" . $products_image_url_db_path : null; 

    // --- Collect Variant Data ---
    $variants_data_json = $_POST['variants_data'] ?? '[]';
    $variants_data = json_decode($variants_data_json, true);
    
    // Check JSON decode error
    if (json_last_error() !== JSON_ERROR_NONE) {
        print_failure("Error: Invalid JSON format for variants data.");
        exit;
    }

    // --- Basic Product Validation ---
    if (empty($products_name)) { 
        print_failure("Error: Product name is required."); 
        exit; 
    }
    
    if (empty($products_unit_of_measure_id) || !is_numeric($products_unit_of_measure_id)) { 
        print_failure("Error: Valid Unit of Measure ID is required."); 
        exit; 
    }
    
    if (empty($products_category_id) || !is_numeric($products_category_id)) { 
        print_failure("Error: Valid Product category ID is required."); 
        exit; 
    }
    
    if ($products_supplier_id !== null && !is_numeric($products_supplier_id)) { 
        print_failure("Error: Invalid Supplier ID."); 
        exit; 
    }
    
    if ($products_expiry_period_in_days !== null && (!is_numeric($products_expiry_period_in_days) || $products_expiry_period_in_days < 0)) { 
        print_failure("Error: Expiry period must be a non-negative number."); 
        exit; 
    }

    // --- Validate Variants Data ---
    if (!is_array($variants_data)) { 
        print_failure("Error: Variants data must be a valid JSON array."); 
        exit; 
    }
    
    if (empty($variants_data)) { 
        print_failure("Error: At least one product variant is required."); 
        exit; 
    }
    
    $all_attribute_value_ids = []; 
    foreach ($variants_data as $index => $variant) {
        if (empty($variant['variant_name'])) { 
            print_failure("Error: Variant name is required for variant #" . ($index + 1) . "."); 
            exit; 
        }
        
        if (empty($variant['variant_unit_price']) || !is_numeric($variant['variant_unit_price']) || $variant['variant_unit_price'] < 0) { 
            print_failure("Error: Valid variant unit price is required for variant #" . ($index + 1) . "."); 
            exit; 
        }
        
        // Validate variant cost price if provided
        if (isset($variant['variant_cost_price']) && $variant['variant_cost_price'] !== null && $variant['variant_cost_price'] !== '' && (!is_numeric($variant['variant_cost_price']) || $variant['variant_cost_price'] < 0)) {
            print_failure("Error: Invalid variant cost price for variant #" . ($index + 1) . ".");
            exit;
        }
        
        if (isset($variant['attribute_value_ids']) && is_array($variant['attribute_value_ids'])) {
            foreach ($variant['attribute_value_ids'] as $attr_val_id) {
                if (!is_numeric($attr_val_id)) { 
                    print_failure("Error: Invalid attribute value ID for variant #" . ($index + 1) . "."); 
                    exit; 
                }
                $all_attribute_value_ids[] = (int)$attr_val_id;
            }
        }
    }

    // --- Validate Packaging Data ---
    if (!is_array($preferred_packaging_ids)) { 
        print_failure("Error: Preferred packaging IDs must be a valid JSON array."); 
        exit; 
    }
    
    foreach ($preferred_packaging_ids as $pkg_id) {
        if (!is_numeric($pkg_id)) { 
            print_failure("Error: Invalid preferred packaging ID."); 
            exit; 
        }
    }

    // --- Database Connection Check ---
    if (!isset($conn) || $conn === false) {
        print_failure("Error: Database connection failed.");
        exit;
    }

    // Start transaction
    $conn->begin_transaction();

    try {
        // --- Foreign Key Validation (Optional but recommended) ---
        // Validate category exists
        $stmt_check_category = $conn->prepare("SELECT categories_id FROM categories WHERE categories_id = ?");
        $stmt_check_category->bind_param("i", $products_category_id);
        $stmt_check_category->execute();
        $category_result = $stmt_check_category->get_result();
        if ($category_result->num_rows === 0) {
            throw new Exception("Invalid category ID: " . $products_category_id);
        }
        $stmt_check_category->close();

        // Validate supplier exists (if provided)
        if ($products_supplier_id !== null) {
            $stmt_check_supplier = $conn->prepare("SELECT supplier_id FROM suppliers WHERE supplier_id = ?");
            $stmt_check_supplier->bind_param("i", $products_supplier_id);
            $stmt_check_supplier->execute();
            $supplier_result = $stmt_check_supplier->get_result();
            if ($supplier_result->num_rows === 0) {
                throw new Exception("Invalid supplier ID: " . $products_supplier_id);
            }
            $stmt_check_supplier->close();
        }

        // 1. Insert into `products` table
        $stmt_product = $conn->prepare("
            INSERT INTO products (
                products_name, 
                products_unit_of_measure_id, products_category_id, products_description, 
                products_brand, products_image_url, products_is_active,
                products_supplier_id, products_expiry_period_in_days
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        if (!$stmt_product) { 
            throw new Exception("Prepare failed for product insert: " . $conn->error); 
        }

        // Updated bind_param - removed price fields
        $stmt_product->bind_param("siisssiii", 
            $products_name, 
            $products_unit_of_measure_id, 
            $products_category_id,
            $products_description, 
            $products_brand, 
            $products_image_url, 
            $products_is_active,
            $products_supplier_id,
            $products_expiry_period_in_days
        );

        if (!$stmt_product->execute()) { 
            throw new Exception("Error inserting product: " . $stmt_product->error); 
        }

        $new_products_id = $stmt_product->insert_id;
        $stmt_product->close();

        // 2. Insert into `product_variants` and `product_variant_attribute_map`
        if (!empty($variants_data)) {
            $stmt_variant = $conn->prepare("
                INSERT INTO product_variants (
                    variant_products_id, variant_name, variant_sku, variant_barcode, 
                    variant_image_url, variant_unit_price, variant_cost_price, 
                    variant_weight, variant_volume, variant_status, variant_notes,
                    variant_created_at, variant_updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            if (!$stmt_variant) { 
                throw new Exception("Prepare failed for variant insert: " . $conn->error); 
            }

            $stmt_variant_attr_map = $conn->prepare("
                INSERT INTO product_variant_attribute_map (variant_attribute_map_variant_id, variant_attribute_map_attribute_value_id)
                VALUES (?, ?)
            ");
            
            if (!$stmt_variant_attr_map) { 
                throw new Exception("Prepare failed for variant attribute map insert: " . $conn->error); 
            }

            foreach ($variants_data as $index => $variant) {
                // Handle variant image upload
                $variant_image_url_db_path = null;
                $variant_image_file_key = 'variant_image_url_' . $index;
                
                if (isset($_FILES[$variant_image_file_key]) && $_FILES[$variant_image_file_key]['error'] === UPLOAD_ERR_OK) {
                    try {
                        $variant_image_url_db_path = handle_image_upload($_FILES[$variant_image_file_key], 'variants/');
                    } catch (Exception $e) {
                        error_log("Variant image upload failed for variant #" . ($index + 1) . ": " . $e->getMessage());
                        // Continue without image rather than failing the entire operation
                    }
                }
                
                $final_variant_image_url = ($variant_image_url_db_path !== null) ? "https://your-domain.example/" . $variant_image_url_db_path : null;

                // Handle empty strings for nullable fields
                $variant_sku = !empty($variant['variant_sku']) ? $variant['variant_sku'] : null;
                $variant_barcode = !empty($variant['variant_barcode']) ? $variant['variant_barcode'] : null;
                $variant_cost_price = (!empty($variant['variant_cost_price']) && is_numeric($variant['variant_cost_price'])) ? $variant['variant_cost_price'] : null;
                $variant_weight = (!empty($variant['variant_weight']) && is_numeric($variant['variant_weight'])) ? $variant['variant_weight'] : null;
                $variant_volume = (!empty($variant['variant_volume']) && is_numeric($variant['variant_volume'])) ? $variant['variant_volume'] : null;
                $variant_status = isset($variant['variant_status']) ? $variant['variant_status'] : 1;
                $variant_notes = !empty($variant['variant_notes']) ? $variant['variant_notes'] : null;

                $stmt_variant->bind_param("issssddddis", 
                    $new_products_id,
                    $variant['variant_name'],
                    $variant_sku,
                    $variant_barcode,
                    $final_variant_image_url,
                    $variant['variant_unit_price'],
                    $variant_cost_price,
                    $variant_weight,
                    $variant_volume,
                    $variant_status,
                    $variant_notes
                );
                
                if (!$stmt_variant->execute()) { 
                    throw new Exception("Error inserting variant #" . ($index + 1) . ": " . $stmt_variant->error); 
                }
                
                $new_variant_id = $stmt_variant->insert_id;

                // Insert variant attribute mappings
                if (!empty($variant['attribute_value_ids']) && is_array($variant['attribute_value_ids'])) {
                    foreach ($variant['attribute_value_ids'] as $attr_val_id) {
                        $stmt_variant_attr_map->bind_param("ii", $new_variant_id, $attr_val_id);
                        if (!$stmt_variant_attr_map->execute()) {
                            error_log("Error mapping variant " . $new_variant_id . " to attribute " . $attr_val_id . ": " . $stmt_variant_attr_map->error);
                            // Log but don't fail the entire operation
                        }
                    }
                }
            }
            
            $stmt_variant->close();
            $stmt_variant_attr_map->close();
        }

        // 3. Insert into `product_preferred_packaging`
        if (!empty($preferred_packaging_ids)) {
            $stmt_packaging = $conn->prepare("
                INSERT INTO product_preferred_packaging (products_id, packaging_type_id) VALUES (?, ?)
            ");
            
            if (!$stmt_packaging) { 
                throw new Exception("Prepare failed for preferred packaging insert: " . $conn->error); 
            }

            foreach ($preferred_packaging_ids as $pkg_id) {
                $stmt_packaging->bind_param("ii", $new_products_id, $pkg_id);
                if (!$stmt_packaging->execute()) {
                    error_log("Could not insert packaging link (" . $new_products_id . ", " . $pkg_id . "): " . $stmt_packaging->error);
                    // Log but don't fail the entire operation
                }
            }
            $stmt_packaging->close();
        }

        // Commit transaction
        $conn->commit();
        
        // --- SYNC TO ODOO ---
        // Sync all newly created variants to Odoo
        try {
            // Get product data for sync
            $productData = [
                'products_id' => $new_products_id,
                'products_name' => $products_name,
                'products_description' => $products_description,
                'products_category' => null
            ];
            
            // Get category name for Odoo
            $stmt_cat = $conn->prepare("SELECT categories_name FROM categories WHERE categories_id = ?");
            $stmt_cat->bind_param("i", $products_category_id);
            $stmt_cat->execute();
            $cat_result = $stmt_cat->get_result();
            if ($cat_row = $cat_result->fetch_assoc()) {
                $productData['products_category'] = $cat_row['categories_name'];
            }
            $stmt_cat->close();
            
            // Fetch all newly created variants and sync each to Odoo
            $stmt_variants = $conn->prepare("SELECT * FROM product_variants WHERE variant_products_id = ?");
            $stmt_variants->bind_param("i", $new_products_id);
            $stmt_variants->execute();
            $variants_result = $stmt_variants->get_result();
            
            while ($variant_row = $variants_result->fetch_assoc()) {
                $odoo_product_id = syncProductVariantToOdoo($variant_row, $variant_row['variant_id'], $productData);
                if ($odoo_product_id) {
                    error_log("Variant #{$variant_row['variant_id']} synced to Odoo product ID: $odoo_product_id");
                }
            }
            $stmt_variants->close();
        } catch (Throwable $odooEx) {
            error_log('Odoo product sync failed: ' . $odooEx->getMessage());
            // Don't fail the main operation if Odoo sync fails
        }
        
        // Success response
        print_success("Product and all related data created successfully.", [
            'products_id' => $new_products_id, 
            'products_name' => $products_name, 
            'variants_count' => count($variants_data),
            'packaging_count' => count($preferred_packaging_ids)
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        print_failure( $e->getMessage() . " at line " . $e->getLine());
    }

} catch (Exception $e) {
    print_failure("Application Error: " . $e->getMessage() . " at line " . $e->getLine());
} catch (TypeError $e) {
    print_failure("Type Error: " . $e->getMessage() . " at line " . $e->getLine());
} catch (Error $e) {
    print_failure("Fatal Error: " . $e->getMessage() . " at line " . $e->getLine());
} finally {
    // Clean up database connection
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>