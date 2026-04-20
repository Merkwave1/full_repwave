<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $search_term = $_GET['search'] ?? null; 

    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($search_term)) {
        // For case-insensitivity with utf8mb4_unicode_ci, LIKE is often sufficient.
        // If your database/table collation is case-sensitive, you would use LOWER() like:
        // LOWER(p.products_name) LIKE LOWER(?)
        $search_pattern = '%' . $search_term . '%';
        $where_clauses[] = "(
            p.products_name LIKE ? OR 
            p.products_sku LIKE ? OR 
            p.products_barcode LIKE ? OR 
            p.products_category LIKE ? OR 
            p.products_description LIKE ? OR 
            p.products_brand LIKE ? OR
            pv.variant_name LIKE ? OR
            pv.variant_sku LIKE ? OR
            pv.variant_barcode LIKE ? OR
            pv.variant_notes LIKE ?
        )";
        $bind_types .= "ssssssssss"; 
        for ($i = 0; $i < 10; $i++) { // Changed 'i++' to '$i++' for correct syntax
            $bind_params[] = $search_pattern;
        }
    }

    $sql_select = "
        SELECT 
            p.products_id,
            p.products_name,
            p.products_sku AS product_base_sku,
            p.products_barcode AS product_base_barcode,
            p.products_unit_price AS product_base_unit_price,
            p.products_unit_of_measure_id,
            bu.base_units_name AS products_unit_of_measure_name,
            p.products_category,
            p.products_description,
            p.products_brand,
            p.products_image_url AS products_image_url,
            p.products_cost_price AS products_cost_price,
            p.products_is_active AS products_is_active,
            p.products_weight AS products_weight,
            p.products_volume AS products_volume,
            p.products_supplier_id,
            p.products_created_at AS products_created_at,
            p.products_updated_at AS products_updated_at,
            
            pv.variant_id,
            pv.variant_name,
            pv.variant_sku AS variant_sku,
            pv.variant_barcode AS variant_barcode,
            pv.variant_image_url AS variant_image_url,
            pv.variant_unit_price AS variant_unit_price,
            pv.variant_cost_price AS variant_cost_price,
            pv.variant_weight AS variant_weight,
            pv.variant_volume AS variant_volume,
            pv.variant_status AS variant_status, 
            pv.variant_notes AS variant_notes,
            pv.variant_created_at AS variant_created_at,
            pv.variant_updated_at AS variant_updated_at
        FROM products p
        LEFT JOIN product_variants pv ON p.products_id = pv.variant_products_id
        LEFT JOIN base_units bu ON p.products_unit_of_measure_id = bu.base_units_id
    ";
    if (!empty($where_clauses)) {
        $sql_select .= " WHERE " . implode(" AND ", $where_clauses);
    }
    $sql_select .= " ORDER BY p.products_id ASC"; 

    $stmt = $conn->prepare($sql_select);
    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }
    if (!empty($bind_params)) {
        $stmt->bind_param($bind_types, ...$bind_params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $grouped_products = [];
    while ($row = $result->fetch_assoc()) {
        $product_id = $row['products_id'];

        if (!isset($grouped_products[$product_id])) {
            $grouped_products[$product_id] = [
                'products_id' => $row['products_id'],
                'products_name' => $row['products_name'],
                'products_sku' => $row['product_base_sku'],
                'products_barcode' => $row['product_base_barcode'],
                'products_unit_price' => $row['product_base_unit_price'],
                'products_unit_of_measure_id' => $row['products_unit_of_measure_id'],
                'products_unit_of_measure_name' => $row['products_unit_of_measure_name'],
                'products_category' => $row['products_category'],
                'products_description' => $row['products_description'],
                'products_brand' => $row['products_brand'],
                'products_image_url' => $row['products_image_url'],
                'products_cost_price' => $row['products_cost_price'],
                'products_is_active' => $row['products_is_active'],
                'products_weight' => $row['products_weight'],
                'products_volume' => $row['products_volume'],
                'products_supplier_id' => $row['products_supplier_id'],
                'products_created_at' => $row['products_created_at'],
                'products_updated_at' => $row['products_updated_at'],
                'variants' => []
            ];
        }

        if ($row['variant_id'] !== null) {
            $grouped_products[$product_id]['variants'][] = [
                'variant_id' => $row['variant_id'],
                'variant_name' => $row['variant_name'],
                'variant_sku' => $row['variant_sku'],
                'variant_barcode' => $row['variant_barcode'],
                'variant_color' => $row['variant_color'],
                'variant_image_url' => $row['variant_image_url'],
                'variant_unit_price' => $row['variant_unit_price'],
                'variant_cost_price' => $row['variant_cost_price'],
                'variant_weight' => $row['variant_weight'],
                'variant_volume' => $row['variant_volume'],
                'variant_status' => $row['variant_status'], 
                'variant_notes' => $row['variant_notes'],
                'variant_created_at' => $row['variant_created_at'],
                'variant_updated_at' => $row['variant_updated_at'],
            ];
        }
    }
    $stmt->close();

    $final_products = array_values($grouped_products); 
    
    print_success("Products with variants retrieved successfully.", ['products' => $final_products]); 

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
