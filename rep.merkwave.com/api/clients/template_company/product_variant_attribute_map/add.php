<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $variant_attribute_map_variant_id       = $_POST['variant_attribute_map_variant_id']       ?? null;
    $variant_attribute_map_attribute_value_id = $_POST['variant_attribute_map_attribute_value_id'] ?? null;

    if (empty($variant_attribute_map_variant_id) || !is_numeric($variant_attribute_map_variant_id) || $variant_attribute_map_variant_id <= 0) {
        print_failure("Error: Valid Variant ID is required.");
    }
    if (empty($variant_attribute_map_attribute_value_id) || !is_numeric($variant_attribute_map_attribute_value_id) || $variant_attribute_map_attribute_value_id <= 0) {
        print_failure("Error: Valid Attribute Value ID is required.");
    }

    $conn->begin_transaction();

    try {
        // Check if variant_id exists in product_variants table
        $stmt_check_variant = $conn->prepare("SELECT variant_id FROM product_variants WHERE variant_id = ? LIMIT 1");
        if (!$stmt_check_variant) {
            throw new Exception("Prepare failed for variant check: " . $conn->error);
        }
        $stmt_check_variant->bind_param("i", $variant_attribute_map_variant_id);
        $stmt_check_variant->execute();
        if ($stmt_check_variant->get_result()->num_rows === 0) {
            print_failure("Error: Variant ID " . $variant_attribute_map_variant_id . " does not exist.");
        }
        $stmt_check_variant->close();

        // Check if attribute_value_id exists in product_attribute_values table
        $stmt_check_attribute_value = $conn->prepare("SELECT attribute_value_id FROM product_attribute_values WHERE attribute_value_id = ? LIMIT 1");
        if (!$stmt_check_attribute_value) {
            throw new Exception("Prepare failed for attribute value check: " . $conn->error);
        }
        $stmt_check_attribute_value->bind_param("i", $variant_attribute_map_attribute_value_id);
        $stmt_check_attribute_value->execute();
        if ($stmt_check_attribute_value->get_result()->num_rows === 0) {
            print_failure("Error: Attribute Value ID " . $variant_attribute_map_attribute_value_id . " does not exist.");
        }
        $stmt_check_attribute_value->close();

        $stmt = $conn->prepare("
            INSERT INTO product_variant_attribute_map (variant_attribute_map_variant_id, variant_attribute_map_attribute_value_id)
            VALUES (?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("ii", 
            $variant_attribute_map_variant_id, 
            $variant_attribute_map_attribute_value_id
        );

        if (!$stmt->execute()) {
            throw new Exception("Error mapping variant to attribute value: " . $stmt->error);
        }

        $new_id = $stmt->insert_id;

        $conn->commit();
        print_success("Variant attribute map added successfully.", ['variant_attribute_map_id' => $new_id]);

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
