<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Removed IP and role authorization checks for public access

    $products_id = $_GET['products_id'] ?? $_POST['products_id'] ?? null;

    if (empty($products_id) || !is_numeric($products_id) || $products_id <= 0) {
        print_failure("Error: Product ID is required.");
        exit;
    }

    $stmt = $conn->prepare("
        SELECT 
            p.products_id, 
            p.products_name, 
            p.products_description, 
            p.products_unit_price, 
            p.products_image_url, 
            p.products_category, -- Fetching directly from products table
            p.products_sku,
            p.products_barcode,
            p.products_unit_of_measure,
            p.products_brand,
            p.products_created_at, -- Corrected timestamp column name
            p.products_updated_at -- Corrected timestamp column name
        FROM products p
        WHERE p.products_id = ?
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->bind_param("i", $products_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        print_failure("Error: Product not found.");
        exit;
    }

    $product_data = $result->fetch_assoc();
    print_success("Product details retrieved successfully.", $product_data);

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
