<?php

require_once '../db_connect.php'; 
require_once '../odoo/sync_products.php'; // Odoo product sync

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $variant_products_id = $_POST['variant_products_id'] ?? null;
    $variant_name        = $_POST['variant_name']        ?? null;
    $variant_sku         = $_POST['variant_sku']         ?? null;
    $variant_barcode     = $_POST['variant_barcode']     ?? null;
    $variant_color       = $_POST['variant_color']       ?? null;
    $variant_image_url   = $_POST['variant_image_url']   ?? null; // Assuming URL for now
    $variant_unit_price  = $_POST['variant_unit_price']  ?? null;
    $variant_cost_price  = $_POST['variant_cost_price']  ?? null;
    $variant_weight      = $_POST['variant_weight']      ?? null;
    $variant_volume      = $_POST['variant_volume']      ?? null;
    $variant_status      = $_POST['variant_status']      ?? 1; // Default to active (TINYINT(1))
    $variant_notes       = $_POST['variant_notes']       ?? null;

    // Handle empty strings for nullable fields
    if ($variant_name === "") {$variant_name = null;}
    if ($variant_sku === "") {$variant_sku = null;}
    if ($variant_barcode === "") {$variant_barcode = null;}
    if ($variant_color === "") {$variant_color = null;}
    if ($variant_image_url === "") {$variant_image_url = null;}
    if ($variant_cost_price === "") {$variant_cost_price = null;}
    if ($variant_weight === "") {$variant_weight = null;}
    if ($variant_volume === "") {$variant_volume = null;}
    if ($variant_notes === "") {$variant_notes = null;}

    // --- Image Upload Handling for Variant Image ---
    $variant_image_url_db_path = null; 
    if (isset($_FILES['variant_image_url'])) { 
        try {
            $variant_image_url_db_path = handle_image_upload($_FILES['variant_image_url'], 'variants/'); // New subdirectory
        } catch (Exception $e) {
            print_failure("Variant Image Upload Error: " . $e->getMessage());
            exit; 
        }
    }
    $variant_image_url = ($variant_image_url_db_path !== null) ? "https://your-domain.example/" . $variant_image_url_db_path : null; 

    // Basic Validation
    if (empty($variant_products_id) || !is_numeric($variant_products_id) || $variant_products_id <= 0) {
        print_failure("Error: Valid Product ID is required for the variant.");
    }
    if (empty($variant_unit_price) || !is_numeric($variant_unit_price) || $variant_unit_price < 0) {
        print_failure("Error: Valid variant unit price is required and must be non-negative.");
    }
    if ($variant_cost_price !== null && (!is_numeric($variant_cost_price) || $variant_cost_price < 0)) {
        print_failure("Error: Invalid variant cost price.");
    }
    if ($variant_weight !== null && (!is_numeric($variant_weight) || $variant_weight < 0)) {
        print_failure("Error: Invalid variant weight.");
    }
    if ($variant_volume !== null && (!is_numeric($variant_volume) || $variant_volume < 0)) {
        print_failure("Error: Invalid variant volume.");
    }
    if (!in_array((int)$variant_status, [0, 1])) {
        print_failure("Error: Invalid variant status. Must be 0 (inactive) or 1 (active).");
    }

    $conn->begin_transaction();

    try {
        // Check if variant_products_id exists in products table
        $stmt_check_product = $conn->prepare("SELECT products_id FROM products WHERE products_id = ? LIMIT 1");
        if (!$stmt_check_product) {
            throw new Exception("Prepare failed for product check: " . $conn->error);
        }
        $stmt_check_product->bind_param("i", $variant_products_id);
        $stmt_check_product->execute();
        if ($stmt_check_product->get_result()->num_rows === 0) {
            print_failure("Error: Product ID " . $variant_products_id . " for variant does not exist.");
        }
        $stmt_check_product->close();


        $stmt = $conn->prepare("
            INSERT INTO product_variants (
                variant_products_id, variant_name, variant_sku, variant_barcode, variant_color, 
                variant_image_url, variant_unit_price, variant_cost_price, variant_weight, 
                variant_volume, variant_status, variant_notes,
                variant_created_at, variant_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        // Bind parameters: i s s s s s d d d d i s (12 parameters)
        $stmt->bind_param("isssssddddis", 
            $variant_products_id, 
            $variant_name, 
            $variant_sku, 
            $variant_barcode, 
            $variant_color, 
            $variant_image_url, 
            $variant_unit_price, 
            $variant_cost_price, 
            $variant_weight, 
            $variant_volume, 
            $variant_status, 
            $variant_notes
        );

        if (!$stmt->execute()) {
            throw new Exception("Error inserting product variant: " . $stmt->error);
        }

        $new_id = $stmt->insert_id;
        $conn->commit();
        
        // --- SYNC TO ODOO ---
        try {
            // Get variant data for sync
            $variantData = [
                'variant_id' => $new_id,
                'variant_products_id' => $variant_products_id,
                'variant_name' => $variant_name,
                'variant_sku' => $variant_sku,
                'variant_barcode' => $variant_barcode,
                'variant_unit_price' => $variant_unit_price,
                'variant_cost_price' => $variant_cost_price,
                'variant_weight' => $variant_weight,
                'variant_volume' => $variant_volume,
                'variant_status' => $variant_status,
                'variant_notes' => $variant_notes
            ];
            
            // Get product data for category
            $productData = null;
            $stmt_product = $conn->prepare("
                SELECT p.*, c.categories_name 
                FROM products p 
                LEFT JOIN categories c ON p.products_category_id = c.categories_id 
                WHERE p.products_id = ?
            ");
            $stmt_product->bind_param("i", $variant_products_id);
            $stmt_product->execute();
            $product_result = $stmt_product->get_result();
            if ($product_row = $product_result->fetch_assoc()) {
                $productData = [
                    'products_id' => $product_row['products_id'],
                    'products_name' => $product_row['products_name'],
                    'products_description' => $product_row['products_description'],
                    'products_category' => $product_row['categories_name']
                ];
            }
            $stmt_product->close();
            
            $odoo_product_id = syncProductVariantToOdoo($variantData, $new_id, $productData);
            if ($odoo_product_id) {
                error_log("New variant #$new_id synced to Odoo product ID: $odoo_product_id");
            }
        } catch (Throwable $odooEx) {
            error_log('Odoo product sync failed: ' . $odooEx->getMessage());
        }
        
        print_success("Product variant added successfully.", ['variant_id' => $new_id, 'variant_name' => $variant_name]);

    } catch (Exception $e) {
        $conn->rollback();
        print_failure("Internal Error: " . $e->getMessage());
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
