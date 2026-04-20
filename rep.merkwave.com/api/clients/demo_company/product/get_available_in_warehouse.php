<?php
/**
 * API endpoint to get products with their available quantities in a specific warehouse
 * This ensures sales orders only show items that are actually available in the selected warehouse
 */

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get parameters from request
    $warehouse_id = $_GET['warehouse_id'] ?? $_POST['warehouse_id'] ?? null;
    $search_term = $_GET['search'] ?? null;
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;

    // Validation
    if (empty($warehouse_id) || !is_numeric($warehouse_id)) {
        print_failure("Error: Valid Warehouse ID is required.");
    }

    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    // Verify user exists and get user ID
    $user_id = get_user_id_from_uuid_local($users_uuid);
    if (empty($user_id) || !is_numeric($user_id) || $user_id <= 0) {
        print_failure("Error: Valid User ID not found for provided UUID.");
    }

    // Build search conditions
    $where_clauses = ["inv.warehouse_id = ? AND inv.inventory_quantity > 0"];
    $bind_types = "i";
    $bind_params = [$warehouse_id];

    if (!empty($search_term)) {
        $search_pattern = '%' . $search_term . '%';
        $where_clauses[] = "(
            p.products_name LIKE ? OR
            p.products_description LIKE ? OR
            p.products_brand LIKE ? OR
            pv.variant_name LIKE ? OR
            pv.variant_sku LIKE ? OR
            pv.variant_barcode LIKE ?
        )";
        $bind_types .= "ssssss"; // 6 's' for the search parameters
        for ($i = 0; $i < 6; $i++) {
            $bind_params[] = $search_pattern;
        }
    }

    $sql_select = "
        SELECT
            -- Product details
            p.products_id,
            p.products_name,
            p.products_unit_of_measure_id,
            p.products_category_id,
            p.products_description,
            p.products_brand,
            p.products_image_url,
            p.products_is_active,
            p.products_weight,
            p.products_volume,
            p.products_supplier_id,
            p.products_expiry_period_in_days,
            p.products_has_tax,
            p.products_tax_rate,

            -- Variant details
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

            -- Inventory details
            inv.inventory_id,
            inv.packaging_type_id,
            inv.inventory_quantity,
            inv.inventory_production_date,
            inv.inventory_status,

            -- Packaging type details
            pt.packaging_types_name,
            pt.packaging_types_default_conversion_factor,
            pt.packaging_types_compatible_base_unit_id,

            -- Attribute details
            pa.attribute_id,
            pa.attribute_name,
            pav.attribute_value_id,
            pav.attribute_value_value

        FROM inventory inv
        JOIN product_variants pv ON inv.variant_id = pv.variant_id
        JOIN products p ON pv.variant_products_id = p.products_id
        LEFT JOIN packaging_types pt ON inv.packaging_type_id = pt.packaging_types_id
        LEFT JOIN product_variant_attribute_map pvam ON pv.variant_id = pvam.variant_attribute_map_variant_id
        LEFT JOIN product_attribute_values pav ON pvam.variant_attribute_map_attribute_value_id = pav.attribute_value_id
        LEFT JOIN product_attributes pa ON pav.attribute_value_attribute_id = pa.attribute_id
    ";

    if (!empty($where_clauses)) {
        $sql_select .= " WHERE " . implode(" AND ", $where_clauses);
    }

    // Order by product name and variant name for better organization
    $sql_select .= " ORDER BY p.products_name ASC, pv.variant_name ASC, inv.packaging_type_id ASC, inv.inventory_production_date ASC";

    $stmt = $conn->prepare($sql_select);
    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    if (!empty($bind_params)) {
        $stmt->bind_param($bind_types, ...$bind_params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $available_variants = [];
    
    while ($row = $result->fetch_assoc()) {
        $variant_id = $row['variant_id'];
        $packaging_type_id = $row['packaging_type_id'];
        $inventory_id = $row['inventory_id'];

        // Initialize variant entry if not already present
        if (!isset($available_variants[$variant_id])) {
            $available_variants[$variant_id] = [
                // Product info
                'products_id' => $row['products_id'],
                'products_name' => $row['products_name'],
                'products_unit_of_measure_id' => $row['products_unit_of_measure_id'],
                'products_category_id' => $row['products_category_id'],
                'products_description' => $row['products_description'],
                'products_brand' => $row['products_brand'],
                'products_image_url' => $row['products_image_url'],
                'products_is_active' => $row['products_is_active'],
                'products_weight' => $row['products_weight'],
                'products_volume' => $row['products_volume'],
                'products_supplier_id' => $row['products_supplier_id'],
                'products_expiry_period_in_days' => $row['products_expiry_period_in_days'],
                'products_has_tax' => $row['products_has_tax'],
                'products_tax_rate' => $row['products_tax_rate'],
                
                // Variant info
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
                
                'attributes' => [],
                'available_packaging' => [], // Track available quantities by packaging type
                'total_available_in_base_units' => 0.0
            ];
        }

        // Add attribute details if they exist
        if ($row['attribute_id'] !== null && $row['attribute_value_id'] !== null) {
            $attribute_key = $row['attribute_id'] . '_' . $row['attribute_value_id'];
            if (!isset($available_variants[$variant_id]['attributes'][$attribute_key])) {
                $available_variants[$variant_id]['attributes'][$attribute_key] = [
                    'attribute_id' => $row['attribute_id'],
                    'attribute_name' => $row['attribute_name'],
                    'attribute_value_id' => $row['attribute_value_id'],
                    'attribute_value_value' => $row['attribute_value_value']
                ];
            }
        }

        // Add packaging availability info
        $packaging_key = $packaging_type_id ?? 'null';
        if (!isset($available_variants[$variant_id]['available_packaging'][$packaging_key])) {
            $available_variants[$variant_id]['available_packaging'][$packaging_key] = [
                'packaging_type_id' => $row['packaging_type_id'],
                'packaging_types_name' => $row['packaging_types_name'],
                'packaging_types_factor' => $row['packaging_types_default_conversion_factor'],
                'packaging_types_compatible_base_unit_id' => $row['packaging_types_compatible_base_unit_id'],
                'total_quantity' => 0.0,
                'inventory_batches' => []
            ];
        }

        // Add this inventory batch to the packaging type
        $available_variants[$variant_id]['available_packaging'][$packaging_key]['inventory_batches'][] = [
            'inventory_id' => $row['inventory_id'],
            'quantity' => (float)$row['inventory_quantity'],
            'production_date' => $row['inventory_production_date'],
            'status' => $row['inventory_status']
        ];

        // Update total quantity for this packaging type
        $available_variants[$variant_id]['available_packaging'][$packaging_key]['total_quantity'] += (float)$row['inventory_quantity'];

        // Calculate base units equivalent for total availability
        $factor = $row['packaging_types_default_conversion_factor'] ?? 1.0;
        $available_variants[$variant_id]['total_available_in_base_units'] += (float)$row['inventory_quantity'] * $factor;
    }

    // Convert nested arrays to indexed arrays for easier JSON handling
    foreach ($available_variants as &$variant) {
        $variant['attributes'] = array_values($variant['attributes']);
        $variant['available_packaging'] = array_values($variant['available_packaging']);
    }

    $response_data = [
        'warehouse_id' => (int)$warehouse_id,
        'available_variants' => array_values($available_variants),
        'total_variants_count' => count($available_variants)
    ];

    print_success("Available products retrieved successfully.", $response_data);

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
