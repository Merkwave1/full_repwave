<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $attribute_value_attribute_id = $_POST['attribute_value_attribute_id'] ?? null;
    $attribute_value_value        = $_POST['attribute_value_value']        ?? null;

    if (empty($attribute_value_attribute_id) || !is_numeric($attribute_value_attribute_id) || $attribute_value_attribute_id <= 0) {
        print_failure("Error: Valid Attribute ID is required.");
    }
    if (empty($attribute_value_value)) {
        print_failure("Error: Attribute value is required.");
    }

    $conn->begin_transaction();

    try {
        // Check if attribute_value_attribute_id exists in product_attributes table
        $stmt_check_attribute = $conn->prepare("SELECT attribute_id FROM product_attributes WHERE attribute_id = ? LIMIT 1");
        if (!$stmt_check_attribute) {
            throw new Exception("Prepare failed for attribute check: " . $conn->error);
        }
        $stmt_check_attribute->bind_param("i", $attribute_value_attribute_id);
        $stmt_check_attribute->execute();
        if ($stmt_check_attribute->get_result()->num_rows === 0) {
            print_failure("Error: Attribute ID " . $attribute_value_attribute_id . " does not exist.");
        }
        $stmt_check_attribute->close();

        $stmt = $conn->prepare("
            INSERT INTO product_attribute_values (attribute_value_attribute_id, attribute_value_value)
            VALUES (?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("is", 
            $attribute_value_attribute_id, 
            $attribute_value_value
        );

        if (!$stmt->execute()) {
            throw new Exception("Error inserting product attribute value: " . $stmt->error);
        }

        $new_id = $stmt->insert_id;

        $conn->commit();
        print_success("Product attribute value added successfully.", ['attribute_value_id' => $new_id, 'attribute_value_value' => $attribute_value_value]);

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
