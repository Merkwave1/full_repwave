<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $attribute_name        = $_POST['attribute_name']        ?? null;
    $attribute_description = $_POST['attribute_description'] ?? null;
    $attribute_values      = json_decode($_POST['attribute_values'] ?? '[]', true); // Array of values like ["Small", "Medium"]

    if ($attribute_description === "") {$attribute_description = null;}

    if (empty($attribute_name)) {
        print_failure("Error: Attribute name is required.");
    }
    if (empty($attribute_values) || !is_array($attribute_values)) {
        print_failure("Error: At least one attribute value is required.");
    }

    $conn->begin_transaction();

    try {
        // 1. Insert into product_attributes table
        $stmt_attribute = $conn->prepare("
            INSERT INTO product_attributes (attribute_name, attribute_description)
            VALUES (?, ?)
        ");

        if (!$stmt_attribute) {
            throw new Exception("Prepare failed for attribute insert: " . $conn->error);
        }

        $stmt_attribute->bind_param("ss", 
            $attribute_name, 
            $attribute_description
        );

        if (!$stmt_attribute->execute()) {
            throw new Exception("Error inserting product attribute: " . $stmt_attribute->error);
        }

        $new_attribute_id = $stmt_attribute->insert_id;
        $stmt_attribute->close();

        // 2. Insert into product_attribute_values table
        $stmt_value = $conn->prepare("
            INSERT INTO product_attribute_values (attribute_value_attribute_id, attribute_value_value)
            VALUES (?, ?)
        ");

        if (!$stmt_value) {
            throw new Exception("Prepare failed for attribute value insert: " . $conn->error);
        }

        $inserted_values_count = 0;
        foreach ($attribute_values as $value) {
            if (empty($value) || !is_string($value)) {
                // Skip invalid values or print a warning/error if strict
                error_log("Skipping invalid attribute value: " . var_export($value, true));
                continue;
            }
            $stmt_value->bind_param("is", 
                $new_attribute_id, 
                $value
            );
            if (!$stmt_value->execute()) {
                // If a value fails (e.g., duplicate), log it but continue or throw based on strictness
                error_log("Error inserting attribute value '" . $value . "': " . $stmt_value->error);
                // Optionally: throw new Exception("Error inserting attribute value: " . $stmt_value->error);
            } else {
                $inserted_values_count++;
            }
        }
        $stmt_value->close();

        if ($inserted_values_count === 0 && !empty($attribute_values)) {
            // If values were provided but none were inserted (e.g., all duplicates)
            $conn->rollback();
            print_failure("Error: No attribute values were successfully added. They might already exist.");
        }

        $conn->commit();
        print_success("Product attribute and " . $inserted_values_count . " value(s) added successfully.", ['attribute_id' => $new_attribute_id, 'attribute_name' => $attribute_name, 'inserted_values_count' => $inserted_values_count]);

    } catch (Exception $e) {
        $conn->rollback();
        print_failure("Internal Error: " . $e->getMessage());
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
