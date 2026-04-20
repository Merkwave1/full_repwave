<?php

require_once '../db_connect.php';

// Enable error reporting for mysqli
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // SQL query to fetch all variant data along with parent product info.
    // The search functionality has been removed.
    $sql_select = "
        SELECT
            -- Parent Product Data to be merged into each variant
            p.products_id,
            p.products_name,
            p.products_category_id,
            p.products_description,
            p.products_brand,
            p.products_supplier_id,
            p.products_expiry_period_in_days,
            p.products_unit_of_measure_id,
            p.products_has_tax,
            p.products_tax_rate,

            -- Variant-specific data
            pv.variant_id,
            pv.variant_name,
            pv.variant_sku,
            pv.variant_barcode,
            pv.variant_image_url,
            pv.variant_unit_price,
            pv.variant_cost_price,
            pv.variant_weight,
            pv.variant_volume,
            pv.variant_status,
            pv.variant_notes,
            pv.variant_has_tax,
            pv.variant_tax_rate,
            pv.variant_products_id, -- Keep for context if needed

            -- Attribute details for variants
            pa.attribute_id,
            pa.attribute_name,
            pav.attribute_value_id,
            pav.attribute_value_value,

            -- Preferred Packaging details (linked to the product)
            pt.packaging_types_id,
            pt.packaging_types_name,

            -- Base unit name
            bu.base_units_name
        FROM
            product_variants pv
        INNER JOIN products p ON pv.variant_products_id = p.products_id
        LEFT JOIN base_units bu ON p.products_unit_of_measure_id = bu.base_units_id
        LEFT JOIN product_variant_attribute_map pvam ON pv.variant_id = pvam.variant_attribute_map_variant_id
        LEFT JOIN product_attribute_values pav ON pvam.variant_attribute_map_attribute_value_id = pav.attribute_value_id
        LEFT JOIN product_attributes pa ON pav.attribute_value_attribute_id = pa.attribute_id
        LEFT JOIN product_preferred_packaging ppp ON p.products_id = ppp.products_id
        LEFT JOIN packaging_types pt ON ppp.packaging_type_id = pt.packaging_types_id
        ORDER BY pv.variant_id ASC, pa.attribute_id ASC, pt.packaging_types_id ASC"; // Order by variant_id to facilitate grouping

    $stmt = $conn->prepare($sql_select);
    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $variants_list = [];
    while ($row = $result->fetch_assoc()) {
        $variant_id = $row['variant_id'];

        // Initialize variant entry if not already present
        if (!isset($variants_list[$variant_id])) {
            $variants_list[$variant_id] = [
                // Product data merged into the variant
                'products_id' => $row['products_id'],
                'products_name' => $row['products_name'],
                'products_category_id' => $row['products_category_id'],
                'products_description' => $row['products_description'],
                'products_brand' => $row['products_brand'],
                'products_supplier_id' => $row['products_supplier_id'],
                'products_expiry_period_in_days' => $row['products_expiry_period_in_days'],
                'products_unit_of_measure_id' => $row['products_unit_of_measure_id'],
                'products_has_tax' => $row['products_has_tax'],
                'products_tax_rate' => $row['products_tax_rate'],
                'base_unit_name' => $row['base_units_name'],
                // 'products_id' => $row['variant_products_id'], // Not needed since we have the real products_id now

                // Variant data
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
                
                // Initialize containers for nested data
                'attributes' => [],
                'preferred_packaging' => []
            ];
        }

        // Add attribute details if they exist for this row
        if ($row['attribute_id'] !== null) {
            // Use attribute_id as key to prevent duplicates
            $variants_list[$variant_id]['attributes'][$row['attribute_id']] = [
                'attribute_id' => $row['attribute_id'],
                'attribute_name' => $row['attribute_name'],
                'attribute_value_id' => $row['attribute_value_id'],
                'attribute_value_value' => $row['attribute_value_value']
            ];
        }

        // Add preferred packaging details if they exist for this row
        $packaging_type_id = $row['packaging_types_id'];
        if ($packaging_type_id !== null && !isset($variants_list[$variant_id]['preferred_packaging'][$packaging_type_id])) {
            $variants_list[$variant_id]['preferred_packaging'][$packaging_type_id] = [
                'packaging_types_id' => $row['packaging_types_id'],
                'packaging_types_name' => $row['packaging_types_name']
            ];
        }
    }

    // Convert associative arrays to indexed arrays for the final JSON output
    $final_variants = [];
    foreach ($variants_list as $variant_data) {
        $variant_data['attributes'] = array_values($variant_data['attributes']);
        $variant_data['preferred_packaging'] = array_values($variant_data['preferred_packaging']);
        $final_variants[] = $variant_data;
    }

    print_success("All variants retrieved successfully.", ['variants' => $final_variants]);

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
