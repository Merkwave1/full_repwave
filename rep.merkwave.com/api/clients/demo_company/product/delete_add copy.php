<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    // --- Image Upload Handling ---
    $products_image_url_db_path = null; 
    if (isset($_FILES['products_image_url'])) { // Assuming the file input name is 'products_image_url'
        try {
            $products_image_url_db_path = handle_image_upload($_FILES['products_image_url'], '');
        } catch (Exception $e) {
            print_failure("Image Upload Error: " . $e->getMessage());
        }
    }
    // If products_image_url is explicitly sent as an empty string (e.g., to clear an existing image), set to null
    if (array_key_exists('products_image_url', $_POST) && $_POST['products_image_url'] === "") {
        $products_image_url_db_path = null;
    }
    // Use the path returned by the function, prefixed with your base URL
    $products_image_url = ($products_image_url_db_path !== null) ? "https://your-domain.example/" . $products_image_url_db_path : null; 


    $products_name        = $_POST['products_name']        ?? null;
    $products_unit_price = $_POST['products_unit_price'] ?? null;
    $products_category    = $_POST['products_category']    ?? null;
    $products_description = $_POST['products_description'] ?? null; // Changed to nullable
    $products_sku         = $_POST['products_sku']         ?? null;
    $products_barcode     = $_POST['products_barcode']     ?? null;
    $products_unit_of_measure = $_POST['products_unit_of_measure'] ?? null; // Changed to nullable
    $products_brand       = $_POST['products_brand']       ?? null; // Changed to nullable

    // Handle empty strings for nullable fields
    if ($products_sku === "" ) {$products_sku = null;}
    if ($products_barcode === "" ) {$products_barcode = null;}
    if ($products_description === "" ) {$products_description = null;}
    if ($products_unit_of_measure === "" ) {$products_unit_of_measure = null;}
    if ($products_brand === "" ) {$products_brand = null;}
    

    if (empty($products_name)) {
        print_failure("Error: Product name is required.");
        exit;
    }
    if (empty($products_unit_price) || !is_numeric($products_unit_price) || $products_unit_price < 0) {
        print_failure("Error: Valid product unit price is required and must be non-negative.");
        exit;
    }
    if (empty($products_category)) {
        print_failure("Error: Product category is required.");
        exit;
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            INSERT INTO products (
                products_name, products_description, products_unit_price, products_image_url, 
                products_category, products_sku, products_barcode, products_unit_of_measure, products_brand
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        // Bind parameters: s s d s s s s s s (9 parameters)
        $stmt->bind_param("ssdssssss", 
            $products_name, 
            $products_description, 
            $products_unit_price, 
            $products_image_url, // Use the uploaded image URL
            $products_category, 
            $products_sku, 
            $products_barcode, 
            $products_unit_of_measure, 
            $products_brand 
        );

        if (!$stmt->execute()) {
            throw new Exception("Error inserting product: " . $stmt->error);
        }

        $new_products_id = $stmt->insert_id;
        $conn->commit();
        print_success("Product created successfully.", ['products_id' => $new_products_id, 'products_name' => $products_name]);

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
