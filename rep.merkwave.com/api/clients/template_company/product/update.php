<?php

require_once '../db_connect.php';
require_once '../odoo/sync_products.php'; // Odoo product sync

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Check admin authorization
    

    // Validate request method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        print_failure("Error: Only POST requests are allowed.");
        exit;
    }

    // --- Collect Product ID for Update ---
    $products_id = $_POST['products_id'] ?? null;

    // Basic validation for products_id
    if (empty($products_id) || !is_numeric($products_id)) {
        print_failure("Error: Valid Product ID is required for update.");
        exit;
    }

    // --- Collect Main Product POST Data ---
    $products_name                   = trim($_POST['products_name'] ?? '');
    $products_unit_of_measure_id     = $_POST['products_unit_of_measure_id'] ?? null;
    $products_category_id            = $_POST['products_category_id'] ?? null;
    $products_description            = trim($_POST['products_description'] ?? '');
    $products_brand                  = trim($_POST['products_brand'] ?? '');
    $products_is_active              = $_POST['products_is_active'] ?? 1; // Default to 1 (active) if not provided
    $products_supplier_id            = $_POST['products_supplier_id'] ?? null;
    $products_expiry_period_in_days  = $_POST['products_expiry_period_in_days'] ?? null;
    $products_has_tax                = $_POST['products_has_tax'] ?? null;
    $products_tax_rate               = $_POST['products_tax_rate'] ?? null;
    $remove_current_product_image    = isset($_POST['remove_current_product_image']) && $_POST['remove_current_product_image'] === 'true';

    // --- Collect Preferred Packaging Data ---
    $preferred_packaging_ids_json = $_POST['preferred_packaging_ids'] ?? '[]';
    $preferred_packaging_ids      = json_decode($preferred_packaging_ids_json, true);

    // Check JSON decode error for packaging
    if (json_last_error() !== JSON_ERROR_NONE) {
        print_failure("Error: Invalid JSON format for preferred packaging IDs.");
        exit;
    }

    // --- Handle empty strings for nullable product fields ---
    if ($products_description === "") { $products_description = null; }
    if ($products_brand === "") { $products_brand = null; }
    if ($products_supplier_id === "") { $products_supplier_id = null; }
    if ($products_expiry_period_in_days === "") { $products_expiry_period_in_days = null; }
    if ($products_tax_rate === "") { $products_tax_rate = null; }

    // --- Product Image Upload Handling ---
    $products_image_url_db_path = null;
    $current_products_image_url = null; // To store existing image URL if no new upload/removal

    // Get current product image URL if no new file is uploaded or removal is requested
    if (!$remove_current_product_image && (!isset($_FILES['products_image_url']) || $_FILES['products_image_url']['error'] !== UPLOAD_ERR_OK)) {
        // Fetch current image URL from DB if no new image is uploaded and not explicitly removed
        $stmt_get_current_image = $conn->prepare("SELECT products_image_url FROM products WHERE products_id = ?");
        $stmt_get_current_image->bind_param("i", $products_id);
        $stmt_get_current_image->execute();
        $stmt_get_current_image->bind_result($current_products_image_url);
        $stmt_get_current_image->fetch();
        $stmt_get_current_image->close();
    }

    if (isset($_FILES['products_image_url']) && $_FILES['products_image_url']['error'] === UPLOAD_ERR_OK) {
        try {
            $products_image_url_db_path = handle_image_upload($_FILES['products_image_url'], '');
            $products_image_url = "https://your-domain.example/" . $products_image_url_db_path;
        } catch (Exception $e) {
            print_failure("Product Image Upload Error: " . $e->getMessage());
            exit;
        }
    } elseif ($remove_current_product_image) {
        $products_image_url = null; // Explicitly set to null if removal requested
    } else {
        $products_image_url = $current_products_image_url; // Retain existing image
    }

    // --- Collect Variant Data ---
    $variants_data_json = $_POST['variants_data'] ?? '[]';
    $variants_data = json_decode($variants_data_json, true);

    // Check JSON decode error for variants
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

        // 1. Update `products` table
        $stmt_product = $conn->prepare("
            UPDATE products SET
                products_name = ?,
                products_unit_of_measure_id = ?,
                products_category_id = ?,
                products_description = ?,
                products_brand = ?,
                products_image_url = ?,
                products_is_active = ?,
                products_supplier_id = ?,
                products_expiry_period_in_days = ?,
                products_has_tax = ?,
                products_tax_rate = ?,
                products_updated_at = NOW()
            WHERE products_id = ?
        ");

        if (!$stmt_product) {
            throw new Exception("Prepare failed for product update: " . $conn->error);
        }

        $stmt_product->bind_param("siisssiiiiid",
            $products_name,
            $products_unit_of_measure_id,
            $products_category_id,
            $products_description,
            $products_brand,
            $products_image_url,
            $products_is_active,
            $products_supplier_id,
            $products_expiry_period_in_days,
            $products_has_tax,
            $products_tax_rate,
            $products_id // WHERE clause parameter
        );

        if (!$stmt_product->execute()) {
            throw new Exception("Error updating product: " . $stmt_product->error);
        }

        $stmt_product->close();

        // 2. Update `product_variants` and `product_variant_attribute_map`
        // Fetch existing variants for this product
        $existing_variants = [];
        $stmt_get_variants = $conn->prepare("SELECT variant_id FROM product_variants WHERE variant_products_id = ?");
        $stmt_get_variants->bind_param("i", $products_id);
        $stmt_get_variants->execute();
        $result_get_variants = $stmt_get_variants->get_result();
        while ($row = $result_get_variants->fetch_assoc()) {
            $existing_variants[] = $row['variant_id'];
        }
        $stmt_get_variants->close();

        $variants_to_keep = []; // Track variants that are updated or newly added

        $stmt_variant_update = $conn->prepare("
            UPDATE product_variants SET
                variant_name = ?, variant_sku = ?, variant_barcode = ?,
                variant_image_url = ?, variant_unit_price = ?, variant_cost_price = ?,
                variant_weight = ?, variant_volume = ?, variant_status = ?, variant_notes = ?,
                variant_has_tax = ?, variant_tax_rate = ?, variant_odoo_product_id = ?, variant_updated_at = NOW()
            WHERE variant_id = ? AND variant_products_id = ?
        ");

        $stmt_variant_insert = $conn->prepare("
            INSERT INTO product_variants (
                variant_products_id, variant_name, variant_sku, variant_barcode,
                variant_image_url, variant_unit_price, variant_cost_price,
                variant_weight, variant_volume, variant_status, variant_notes,
                variant_has_tax, variant_tax_rate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt_delete_variant_attr_map = $conn->prepare("DELETE FROM product_variant_attribute_map WHERE variant_attribute_map_variant_id = ?");
        $stmt_insert_variant_attr_map = $conn->prepare("INSERT IGNORE INTO product_variant_attribute_map (variant_attribute_map_variant_id, variant_attribute_map_attribute_value_id) VALUES (?, ?)");

        if (!$stmt_variant_update || !$stmt_variant_insert || !$stmt_delete_variant_attr_map || !$stmt_insert_variant_attr_map) {
            throw new Exception("Prepare failed for variant operations: " . $conn->error);
        }

        // Add debugging log
        error_log("Processing variants for product ID: " . $products_id);
        error_log("Number of variants to process: " . count($variants_data));

        foreach ($variants_data as $index => $variant) {
            $variant_id = $variant['variant_id'] ?? null;
            $remove_current_variant_image = isset($variant['remove_current_variant_image']) && $variant['remove_current_variant_image'] === 'true';

            // Handle variant image upload
            $final_variant_image_url = null;
            $variant_image_file_key = 'variant_image_url_' . $index; // Key for uploaded file

            // Fetch current variant image URL if no new file is uploaded or removal is requested
            if ($variant_id && !$remove_current_variant_image && (!isset($_FILES[$variant_image_file_key]) || $_FILES[$variant_image_file_key]['error'] !== UPLOAD_ERR_OK)) {
                $stmt_get_current_variant_image = $conn->prepare("SELECT variant_image_url FROM product_variants WHERE variant_id = ?");
                $stmt_get_current_variant_image->bind_param("i", $variant_id);
                $stmt_get_current_variant_image->execute();
                $stmt_get_current_variant_image->bind_result($current_variant_image_url);
                $stmt_get_current_variant_image->fetch();
                $stmt_get_current_variant_image->close();
                $final_variant_image_url = $current_variant_image_url;
            }

            if (isset($_FILES[$variant_image_file_key]) && $_FILES[$variant_image_file_key]['error'] === UPLOAD_ERR_OK) {
                try {
                    $variant_image_url_db_path = handle_image_upload($_FILES[$variant_image_file_key], '');
                    $final_variant_image_url = "https://your-domain.example/" . $variant_image_url_db_path;
                } catch (Exception $e) {
                    error_log("Variant image upload failed for variant #" . ($index + 1) . ": " . $e->getMessage());
                    // Continue without image rather than failing the entire operation
                }
            } elseif ($remove_current_variant_image) {
                $final_variant_image_url = null; // Explicitly set to null if removal requested
            }

            // Handle empty strings for nullable fields
            $variant_sku = !empty($variant['variant_sku']) ? $variant['variant_sku'] : null;
            $variant_barcode = !empty($variant['variant_barcode']) ? $variant['variant_barcode'] : null;
            $variant_cost_price = (!empty($variant['variant_cost_price']) && is_numeric($variant['variant_cost_price'])) ? $variant['variant_cost_price'] : null;
            $variant_weight = (!empty($variant['variant_weight']) && is_numeric($variant['variant_weight'])) ? $variant['variant_weight'] : null;
            $variant_volume = (!empty($variant['variant_volume']) && is_numeric($variant['variant_volume'])) ? $variant['variant_volume'] : null;
            $variant_status = isset($variant['variant_status']) ? $variant['variant_status'] : 1;
            $variant_notes = !empty($variant['variant_notes']) ? $variant['variant_notes'] : null;
            $variant_has_tax = isset($variant['variant_has_tax']) ? $variant['variant_has_tax'] : $products_has_tax;
            $variant_tax_rate = (!empty($variant['variant_tax_rate']) && is_numeric($variant['variant_tax_rate'])) ? $variant['variant_tax_rate'] : null;
            $variant_odoo_product_id = (!empty($variant['variant_odoo_product_id']) && is_numeric($variant['variant_odoo_product_id'])) ? intval($variant['variant_odoo_product_id']) : null;

            if ($variant_id && in_array($variant_id, $existing_variants)) {
                // Update existing variant
                // Types: name(s), sku(s), barcode(s), image(s), price(d), cost(d), weight(d), volume(d), status(i), notes(s), has_tax(i), tax_rate(d), odoo_id(i), variant_id(i), products_id(i)
                $stmt_variant_update->bind_param("ssssddddisidiii",
                    $variant['variant_name'],
                    $variant_sku,
                    $variant_barcode,
                    $final_variant_image_url,
                    $variant['variant_unit_price'],
                    $variant_cost_price,
                    $variant_weight,
                    $variant_volume,
                    $variant_status,
                    $variant_notes,
                    $variant_has_tax,
                    $variant_tax_rate,
                    $variant_odoo_product_id,
                    $variant_id,
                    $products_id
                );
                if (!$stmt_variant_update->execute()) {
                    throw new Exception("Error updating variant ID " . $variant_id . ": " . $stmt_variant_update->error);
                }
                $current_variant_id = $variant_id;
                $variants_to_keep[] = $variant_id;
            } else {
                // Insert new variant
                $stmt_variant_insert->bind_param("issssddddiiid",
                    $products_id,
                    $variant['variant_name'],
                    $variant_sku,
                    $variant_barcode,
                    $final_variant_image_url,
                    $variant['variant_unit_price'],
                    $variant_cost_price,
                    $variant_weight,
                    $variant_volume,
                    $variant_status,
                    $variant_notes,
                    $variant_has_tax,
                    $variant_tax_rate
                );
                if (!$stmt_variant_insert->execute()) {
                    throw new Exception("Error inserting new variant: " . $stmt_variant_insert->error);
                }
                $current_variant_id = $stmt_variant_insert->insert_id;
                $variants_to_keep[] = $current_variant_id;
            }

            // Update/Insert variant attribute mappings
            // Delete existing mappings for this variant first
            $stmt_delete_variant_attr_map->bind_param("i", $current_variant_id);
            if (!$stmt_delete_variant_attr_map->execute()) {
                error_log("Error deleting existing attribute mappings for variant " . $current_variant_id . ": " . $stmt_delete_variant_attr_map->error);
            } else {
                error_log("Successfully deleted " . $stmt_delete_variant_attr_map->affected_rows . " existing mappings for variant " . $current_variant_id);
            }

            // Insert new mappings with duplicate prevention
            if (!empty($variant['attribute_value_ids']) && is_array($variant['attribute_value_ids'])) {
                // Remove duplicates from attribute_value_ids to prevent duplicate key errors
                $unique_attribute_value_ids = array_unique($variant['attribute_value_ids']);
                error_log("Processing " . count($unique_attribute_value_ids) . " unique attribute values for variant " . $current_variant_id);
                
                foreach ($unique_attribute_value_ids as $attr_val_id) {
                    $stmt_insert_variant_attr_map->bind_param("ii", $current_variant_id, $attr_val_id);
                    if (!$stmt_insert_variant_attr_map->execute()) {
                        error_log("Error mapping variant " . $current_variant_id . " to attribute " . $attr_val_id . ": " . $stmt_insert_variant_attr_map->error);
                    } else {
                        error_log("Successfully mapped variant " . $current_variant_id . " to attribute " . $attr_val_id);
                    }
                }
            }
        }

        $stmt_variant_update->close();
        $stmt_variant_insert->close();
        $stmt_delete_variant_attr_map->close();
        $stmt_insert_variant_attr_map->close();

        // Delete variants that were not in the POST data
        $variants_to_delete = array_diff($existing_variants, $variants_to_keep);
        if (!empty($variants_to_delete)) {
            $placeholders = implode(',', array_fill(0, count($variants_to_delete), '?'));
            $types = str_repeat('i', count($variants_to_delete));
            $stmt_delete_variants = $conn->prepare("DELETE FROM product_variants WHERE variant_id IN ($placeholders) AND variant_products_id = ?");
            if (!$stmt_delete_variants) {
                throw new Exception("Prepare failed for variant deletion: " . $conn->error);
            }
            
            // Use spread operator for dynamic binding
            $delete_params = array_merge(array_values($variants_to_delete), [$products_id]);
            $stmt_delete_variants->bind_param($types . 'i', ...$delete_params);
            if (!$stmt_delete_variants->execute()) {
                error_log("Error deleting old variants: " . $stmt_delete_variants->error);
            }
            $stmt_delete_variants->close();
        }

        // 3. Update `product_preferred_packaging`
        // Delete all existing packaging links for this product
        $stmt_delete_packaging = $conn->prepare("DELETE FROM product_preferred_packaging WHERE products_id = ?");
        if (!$stmt_delete_packaging) {
            throw new Exception("Prepare failed for packaging deletion: " . $conn->error);
        }
        $stmt_delete_packaging->bind_param("i", $products_id);
        if (!$stmt_delete_packaging->execute()) {
            error_log("Error deleting existing packaging links: " . $stmt_delete_packaging->error);
        }
        $stmt_delete_packaging->close();

        // Insert new packaging links
        if (!empty($preferred_packaging_ids)) {
            $stmt_packaging = $conn->prepare("
                INSERT INTO product_preferred_packaging (products_id, packaging_type_id) VALUES (?, ?)
            ");

            if (!$stmt_packaging) {
                throw new Exception("Prepare failed for preferred packaging insert: " . $conn->error);
            }

            foreach ($preferred_packaging_ids as $pkg_id) {
                $stmt_packaging->bind_param("ii", $products_id, $pkg_id);
                if (!$stmt_packaging->execute()) {
                    error_log("Could not insert packaging link (" . $products_id . ", " . $pkg_id . "): " . $stmt_packaging->error);
                    // Log but don't fail the entire operation
                }
            }
            $stmt_packaging->close();
        }

        // Commit transaction
        $conn->commit();
        
        // --- SYNC TO ODOO ---
        // Sync all variants to Odoo (both updated and newly created)
        try {
            // Get product data for sync
            $productData = [
                'products_id' => $products_id,
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
            
            // Fetch all variants for this product and sync each to Odoo
            $stmt_variants = $conn->prepare("SELECT * FROM product_variants WHERE variant_products_id = ?");
            $stmt_variants->bind_param("i", $products_id);
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
        print_success("Product and all related data updated successfully.", [
            'products_id' => $products_id,
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