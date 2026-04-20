<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get search parameters (applies to both product and variant fields)
    $search_term = $_GET['search'] ?? null; 

    // Build WHERE clause for search, applicable to the view
    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($search_term)) {
        $search_pattern = '%' . $search_term . '%';
        $where_clauses[] = "(
            products_name LIKE ? OR 
            product_base_sku LIKE ? OR 
            product_base_barcode LIKE ? OR 
            products_category LIKE ? OR 
            products_description LIKE ? OR 
            products_brand LIKE ? OR
            variant_name LIKE ? OR
            variant_sku LIKE ? OR
            variant_barcode LIKE ? OR
            variant_notes LIKE ?
        )";
        // Removed variant_color from search. Now 10 's' for the 10 LIKE clauses.
        $bind_types .= "ssssssssss"; 
        for ($i = 0; $i < 10; $i++) {
            $bind_params[] = $search_pattern;
        }
    }

    // Fetch products with their variants (flat list from view)
    // Selecting only necessary columns for list view
    $sql_select_view = "
        SELECT 
            products_id,
            products_name,
            product_base_sku,
            products_unit_of_measure_id,
            products_unit_of_measure_name,
            products_category,
            products_image_url,
            products_is_active,
            
            variant_id,
            variant_name,
            variant_sku,
            variant_barcode,
            variant_image_url,
            variant_unit_price,
            variant_status
        FROM products_with_variants_view
    ";
    if (!empty($where_clauses)) {
        $sql_select_view .= " WHERE " . implode(" AND ", $where_clauses);
    }
    // Order by products_id to ensure variants of the same product are contiguous
    $sql_select_view .= " ORDER BY products_id ASC"; 

    $stmt_view = $conn->prepare($sql_select_view);
    if (!$stmt_view) {
        throw new Exception("Prepare failed for view select: " . $conn->error);
    }
    // Bind search parameters
    if (!empty($bind_params)) {
        $stmt_view->bind_param($bind_types, ...$bind_params);
    }
    $stmt_view->execute();
    $result_view = $stmt_view->get_result();

    $grouped_products = [];
    while ($row = $result_view->fetch_assoc()) {
        $product_id = $row['products_id'];

        // Initialize product entry if not already present
        if (!isset($grouped_products[$product_id])) {
            $grouped_products[$product_id] = [
                'products_id' => $row['products_id'],
                'products_name' => $row['products_name'],
                'products_sku' => $row['product_base_sku'],
                'products_unit_of_measure_name' => $row['products_unit_of_measure_name'],
                'products_category' => $row['products_category'],
                'products_image_url' => $row['products_image_url'],
                'products_is_active' => $row['products_is_active'],
                'variants' => []
            ];
        }

        // Add variant details if they exist for this row
        if ($row['variant_id'] !== null) {
            $grouped_products[$product_id]['variants'][] = [
                'variant_id' => $row['variant_id'],
                'variant_name' => $row['variant_name'],
                'variant_sku' => $row['variant_sku'],
                'variant_barcode' => $row['variant_barcode'],
                'variant_image_url' => $row['variant_image_url'],
                'variant_unit_price' => $row['variant_unit_price'],
                'variant_status' => $row['variant_status'],
            ];
        }
    }
    $stmt_view->close();

    // Convert associative array to indexed array
    $final_products = array_values($grouped_products); 
    
    print_success("Products with variants retrieved successfully.", ['products' => $final_products]); 

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt_view) && $stmt_view !== false) {
        $stmt_view->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
