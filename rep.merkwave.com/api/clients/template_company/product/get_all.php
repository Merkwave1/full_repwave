<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $search_term = $_GET['search'] ?? null;

    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($search_term)) {
        $search_pattern = '%' . $search_term . '%';
        $where_clauses[] = "(
            p.products_name LIKE ? OR
            p.products_category_id LIKE ? OR
            p.products_description LIKE ? OR
            p.products_brand LIKE ? OR
            p.products_expiry_period_in_days LIKE ? OR
            pv.variant_name LIKE ? OR
            pv.variant_sku LIKE ? OR
            pv.variant_barcode LIKE ? OR
            pv.variant_notes LIKE ? OR
            pa.attribute_name LIKE ? OR
            pav.attribute_value_value LIKE ?
        )";
        $bind_types .= "sssssssssss"; // 11 's' for the search parameters
        for ($i = 0; $i < 11; $i++) {
            $bind_params[] = $search_pattern;
        }
    }

    $sql_select = "
        SELECT
            p.products_id,
            p.products_name,
            p.products_unit_of_measure_id,
            p.products_category_id,
            p.products_description,
            p.products_brand,
            p.products_image_url AS products_image_url,
            p.products_is_active AS products_is_active,
            p.products_weight AS products_weight,
            p.products_volume AS products_volume,
            p.products_supplier_id,
            p.products_expiry_period_in_days,
            p.products_has_tax,
            p.products_tax_rate,

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
            pv.variant_has_tax,
            pv.variant_tax_rate,
            pv.variant_odoo_product_id,

            -- Attribute details for variants
            pa.attribute_id,
            pa.attribute_name,
            pav.attribute_value_id,
            pav.attribute_value_value,

            -- Preferred Packaging details
            pt.packaging_types_id,
            pt.packaging_types_name
        FROM products p
        LEFT JOIN product_variants pv ON p.products_id = pv.variant_products_id
        LEFT JOIN base_units bu ON p.products_unit_of_measure_id = bu.base_units_id
        LEFT JOIN product_variant_attribute_map pvam ON pv.variant_id = pvam.variant_attribute_map_variant_id
        LEFT JOIN product_attribute_values pav ON pvam.variant_attribute_map_attribute_value_id = pav.attribute_value_id
        LEFT JOIN product_attributes pa ON pav.attribute_value_attribute_id = pa.attribute_id
        LEFT JOIN product_preferred_packaging ppp ON p.products_id = ppp.products_id
        LEFT JOIN packaging_types pt ON ppp.packaging_type_id = pt.packaging_types_id
    ";
    if (!empty($where_clauses)) {
        $sql_select .= " WHERE " . implode(" AND ", $where_clauses);
    }
    // Order by product_id, then variant_id, then attribute_id, then packaging_type_id to facilitate grouping in PHP
    $sql_select .= " ORDER BY p.products_id ASC, pv.variant_id ASC, pa.attribute_id ASC, pt.packaging_types_id ASC";

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
        $variant_id = $row['variant_id'];
        $packaging_type_id = $row['packaging_types_id'];

        // Initialize product entry if not already present
        if (!isset($grouped_products[$product_id])) {
            $grouped_products[$product_id] = [
                'products_id' => $row['products_id'],
                'products_name' => $row['products_name'],
                'products_unit_of_measure_id' => $row['products_unit_of_measure_id'],
                'products_category_id' => $row['products_category_id'],
                'products_description' => $row['products_description'],
                'products_brand' => $row['products_brand'],
                'products_image_url' => $row['products_image_url'],
                'products_is_active' => $row['products_is_active'],
                'products_has_tax' => $row['products_has_tax'],
                'products_tax_rate' => $row['products_tax_rate'],
                'products_weight' => $row['products_weight'],
                'products_volume' => $row['products_volume'],
                'products_supplier_id' => $row['products_supplier_id'],
                'products_expiry_period_in_days' => $row['products_expiry_period_in_days'],
                'variants' => [],
                'preferred_packaging' => [] // Initialize preferred packaging array
            ];
        }

        // Add variant details if they exist for this row
        if ($variant_id !== null) {
            // Initialize variant entry if not already present
            if (!isset($grouped_products[$product_id]['variants'][$variant_id])) {
                $grouped_products[$product_id]['variants'][$variant_id] = [
                    'variant_id' => $row['variant_id'],
                    'variant_name' => $row['variant_name'],
                    'variant_sku' => $row['variant_sku'],
                    'variant_barcode' => $row['variant_barcode'],
                    'variant_image_url' => $row['variant_image_url'],
                    'variant_unit_price' => $row['variant_unit_price'],
                    'variant_cost_price' => $row['variant_cost_price'],
                    'variant_weight' => $row['variant_weight'],
                    'variant_volume' => $row['variant_volume'],
                    'variant_status' => $row['variant_status'],
                    'variant_notes' => $row['variant_notes'],
                    'variant_has_tax' => $row['variant_has_tax'],
                    'variant_tax_rate' => $row['variant_tax_rate'],
                    'variant_odoo_product_id' => $row['variant_odoo_product_id'],
                    'attributes' => [] // Initialize attributes array for this variant
                ];
            }

            // Add attribute details if they exist for this row
            if ($row['attribute_id'] !== null) {
                $grouped_products[$product_id]['variants'][$variant_id]['attributes'][] = [
                    'attribute_id' => $row['attribute_id'],
                    'attribute_name' => $row['attribute_name'],
                    'attribute_value_id' => $row['attribute_value_id'],
                    'attribute_value_value' => $row['attribute_value_value']
                ];
            }
        }

        // Add preferred packaging details if they exist for this row
        if ($packaging_type_id !== null) {
            // Ensure unique packaging types are added
            $packaging_exists = false;
            foreach ($grouped_products[$product_id]['preferred_packaging'] as $pkg) {
                if ($pkg['packaging_types_id'] === $packaging_type_id) {
                    $packaging_exists = true;
                    break;
                }
            }
            if (!$packaging_exists) {
                $grouped_products[$product_id]['preferred_packaging'][] = [
                    'packaging_types_id' => $row['packaging_types_id'],
                    'packaging_types_name' => $row['packaging_types_name']
                ];
            }
        }
    }
    $stmt->close();

    // Convert associative arrays to indexed arrays for final output
    foreach ($grouped_products as $product_id => $product_data) {
        $grouped_products[$product_id]['variants'] = array_values($product_data['variants']);
    }
    $final_products = array_values($grouped_products);

    print_success("Products with variants, attributes, and preferred packaging retrieved successfully.", ['products' => $final_products]);

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
