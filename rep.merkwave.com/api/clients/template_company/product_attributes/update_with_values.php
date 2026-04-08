<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $attribute_id          = $_POST['attribute_id']          ?? null;
    $attribute_name        = $_POST['attribute_name']        ?? null;
    $attribute_description = $_POST['attribute_description'] ?? null;
    $attribute_values      = json_decode($_POST['attribute_values'] ?? '[]', true); // Array of values like ["Small", "Medium"]

    if (empty($attribute_id) || !is_numeric($attribute_id) || $attribute_id <= 0) {
        print_failure("Error: Valid Attribute ID is required for update.");
    }

    if ($attribute_description === "") {$attribute_description = null;}

    // --- Validate Attribute Values Data Structure ---
    if (!is_array($attribute_values)) {
        print_failure("Error: Attribute values data must be a valid JSON array.");
        exit;
    }
    
    $all_attribute_value_ids_in_request = []; // To track existing values provided in request
    foreach ($attribute_values as $index => $value_data) {
        if (!isset($value_data['value']) || empty($value_data['value']) || !is_string($value_data['value'])) {
            print_failure("Error: Value is required for attribute value entry #" . ($index + 1) . ".");
            exit;
        }
        if (isset($value_data['attribute_value_id'])) {
            if (!is_numeric($value_data['attribute_value_id']) || $value_data['attribute_value_id'] <= 0) {
                print_failure("Error: Invalid attribute_value_id for entry #" . ($index + 1) . ".");
                exit;
            }
            $all_attribute_value_ids_in_request[] = (int)$value_data['attribute_value_id'];
        }
    }

    $conn->begin_transaction();

    try {
        // 1. Update `product_attributes` table (if name or description provided)
        $update_attribute_fields = [];
        $bind_attribute_types = "";
        $bind_attribute_params = [];

        if (!empty($attribute_name)) {
            $update_attribute_fields[] = "attribute_name = ?";
            $bind_attribute_types .= "s";
            $bind_attribute_params[] = $attribute_name;
        } else if (isset($_POST['attribute_name']) && $_POST['attribute_name'] === '') {
            print_failure("Error: Attribute name cannot be empty.");
        }

        if (array_key_exists('attribute_description', $_POST)) {
            $update_attribute_fields[] = "attribute_description = ?";
            $bind_attribute_types .= "s";
            $bind_attribute_params[] = $attribute_description;
        }

        if (!empty($update_attribute_fields)) {
            $sql_attribute_update = "UPDATE product_attributes SET " . implode(", ", $update_attribute_fields) . " WHERE attribute_id = ?";
            $bind_attribute_types .= "i"; 
            $bind_attribute_params[] = $attribute_id;

            $stmt_attribute_update = $conn->prepare($sql_attribute_update);
            if (!$stmt_attribute_update) throw new Exception("Prepare failed for attribute update: " . $conn->error);
            $stmt_attribute_update->bind_param($bind_attribute_types, ...$bind_attribute_params);
            if (!$stmt_attribute_update->execute()) throw new Exception("Error updating attribute: " . $stmt_attribute_update->error);
            if ($stmt_attribute_update->affected_rows === 0) {
                // If no rows affected, it could mean ID not found or no changes.
                // We'll let the overall success/failure handle it unless it's a critical error.
            }
            $stmt_attribute_update->close();
        }


        // 2. Manage `product_attribute_values`
        // Fetch existing values for this attribute
        $stmt_get_existing_values = $conn->prepare("SELECT attribute_value_id FROM product_attribute_values WHERE attribute_value_attribute_id = ?");
        if (!$stmt_get_existing_values) throw new Exception("Prepare failed to get existing attribute values: " . $conn->error);
        $stmt_get_existing_values->bind_param("i", $attribute_id);
        $stmt_get_existing_values->execute();
        $result_existing_values = $stmt_get_existing_values->get_result();
        $current_value_ids_in_db = [];
        while($row = $result_existing_values->fetch_assoc()) {
            $current_value_ids_in_db[] = $row['attribute_value_id'];
        }
        $stmt_get_existing_values->close();

        // Identify values to delete (in DB but not in request)
        $values_to_delete = array_diff($current_value_ids_in_db, $all_attribute_value_ids_in_request);
        if (!empty($values_to_delete)) {
            $placeholders_delete = implode(',', array_fill(0, count($values_to_delete), '?'));
            $bind_types_delete = str_repeat('i', count($values_to_delete));
            $sql_delete_values = "DELETE FROM product_attribute_values WHERE attribute_value_id IN (" . $placeholders_delete . ")";
            $stmt_delete_values = $conn->prepare($sql_delete_values);
            if (!$stmt_delete_values) throw new Exception("Prepare failed for deleting old attribute values: " . $conn->error);
            $stmt_delete_values->bind_param($bind_types_delete, ...$values_to_delete);
            if (!$stmt_delete_values->execute()) throw new Exception("Error deleting old attribute values: " . $stmt_delete_values->error);
            $stmt_delete_values->close();
        }

        // Add/Update new/existing values
        $stmt_upsert_value = $conn->prepare("
            INSERT INTO product_attribute_values (attribute_value_attribute_id, attribute_value_value)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE attribute_value_value = VALUES(attribute_value_value)
        ");
        if (!$stmt_upsert_value) throw new Exception("Prepare failed for upserting attribute values: " . $conn->error);

        $stmt_update_value = $conn->prepare("
            UPDATE product_attribute_values SET attribute_value_value = ?
            WHERE attribute_value_id = ? AND attribute_value_attribute_id = ?
        ");
        if (!$stmt_update_value) throw new Exception("Prepare failed for updating attribute value: " . $conn->error);

        foreach ($attribute_values as $value_data) {
            $value_id = $value_data['attribute_value_id'] ?? null;
            $value_text = $value_data['value'];

            if ($value_id === null) { // New value, insert
                $stmt_upsert_value->bind_param("is", $attribute_id, $value_text);
                if (!$stmt_upsert_value->execute()) {
                    // Log error for duplicate key if it's an insert, but allow others to proceed
                    error_log("Error inserting new attribute value '" . $value_text . "': " . $stmt_upsert_value->error);
                }
            } else { // Existing value, update
                $stmt_update_value->bind_param("sii", $value_text, $value_id, $attribute_id);
                if (!$stmt_update_value->execute()) {
                    error_log("Error updating attribute value ID " . $value_id . ": " . $stmt_update_value->error);
                }
            }
        }
        $stmt_upsert_value->close();
        $stmt_update_value->close();

        $conn->commit();
        print_success("Product attribute and values updated successfully.", ['attribute_id' => $attribute_id]);

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
