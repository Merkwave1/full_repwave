<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
     // Only admin can update settings

    $settings_id         = $_POST['settings_id']         ?? null;
    $settings_key        = $_POST['settings_key']        ?? null; // Can update by ID or key
    $new_settings_key    = $_POST['new_settings_key']    ?? null; // New key if changing the key itself
    $settings_value      = $_POST['settings_value']      ?? null;
    $settings_description = $_POST['settings_description'] ?? null;
    $settings_type       = $_POST['settings_type']       ?? null;

    // Handle empty strings for nullable fields
    if (array_key_exists('settings_value', $_POST) && $_POST['settings_value'] === "") {$settings_value = null;}
    if (array_key_exists('settings_description', $_POST) && $_POST['settings_description'] === "") {$settings_description = null;}

    if (empty($settings_id) && empty($settings_key)) {
        print_failure("Error: Either Setting ID or Setting Key is required for update.");
    }

    $update_fields = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($new_settings_key)) {
        $update_fields[] = "settings_key = ?";
        $bind_types .= "s";
        $bind_params[] = $new_settings_key;
    } else if (isset($_POST['new_settings_key']) && $_POST['new_settings_key'] === '') { // Allow clearing key if it was nullable
        print_failure("Error: New setting key cannot be empty.");
    }

    if (array_key_exists('settings_value', $_POST)) {
        $update_fields[] = "settings_value = ?";
        $bind_types .= "s";
        $bind_params[] = $settings_value;
    }

    if (array_key_exists('settings_description', $_POST)) {
        $update_fields[] = "settings_description = ?";
        $bind_types .= "s";
        $bind_params[] = $settings_description;
    }

    if (!empty($settings_type)) {
        // Validate setting type
        $valid_types = ['string', 'integer', 'decimal', 'boolean', 'datetime', 'json'];
        if (!in_array($settings_type, $valid_types)) {
            print_failure("Error: Invalid setting type. Valid types are: " . implode(', ', $valid_types));
        }
        $update_fields[] = "settings_type = ?";
        $bind_types .= "s";
        $bind_params[] = $settings_type;
    } else if (isset($_POST['settings_type']) && $_POST['settings_type'] === '') {
        print_failure("Error: Setting type cannot be empty.");
    }

    // Validate settings_value based on type if both are provided
    if (array_key_exists('settings_value', $_POST) && !empty($settings_type)) {
        $value_to_validate = $settings_value;
        
        switch ($settings_type) {
            case 'integer':
                if ($value_to_validate !== null && !is_numeric($value_to_validate)) {
                    print_failure("Error: Setting value must be a valid integer for type 'integer'.");
                }
                break;
            case 'decimal':
                if ($value_to_validate !== null && !is_numeric($value_to_validate)) {
                    print_failure("Error: Setting value must be a valid decimal number for type 'decimal'.");
                }
                break;
            case 'boolean':
                if ($value_to_validate !== null && !in_array(strtolower($value_to_validate), ['true', 'false', '1', '0'])) {
                    print_failure("Error: Setting value must be 'true', 'false', '1', or '0' for type 'boolean'.");
                }
                break;
            case 'datetime':
                if ($value_to_validate !== null && !strtotime($value_to_validate)) {
                    print_failure("Error: Setting value must be a valid datetime for type 'datetime'.");
                }
                break;
            case 'json':
                if ($value_to_validate !== null && json_decode($value_to_validate) === null && json_last_error() !== JSON_ERROR_NONE) {
                    print_failure("Error: Setting value must be valid JSON for type 'json'.");
                }
                break;
        }
    }

    if (empty($update_fields)) {
        print_failure("Error: No valid fields provided for update.");
    }

    $sql = "UPDATE settings SET " . implode(", ", $update_fields) . ", settings_updated_at = NOW() WHERE ";
    $where_bind_type = "";
    $where_bind_param = null;

    if (!empty($settings_id) && is_numeric($settings_id) && $settings_id > 0) {
        $sql .= "settings_id = ?";
        $where_bind_type = "i";
        $where_bind_param = $settings_id;
    } else if (!empty($settings_key)) {
        $sql .= "settings_key = ?";
        $where_bind_type = "s";
        $where_bind_param = $settings_key;
    } else {
        print_failure("Error: Invalid Setting ID or Key provided.");
    }

    $bind_types .= $where_bind_type; 
    $bind_params[] = $where_bind_param;

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("Prepare failed for update: " . $conn->error);
    }

    $stmt->bind_param($bind_types, ...$bind_params);

    $conn->begin_transaction();

    try {
        if (!$stmt->execute()) {
            throw new Exception("Error updating setting: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Setting not found with provided ID or Key, or no changes were made.");
        }

        $conn->commit();
        print_success("Setting updated successfully.", ['settings_id' => $settings_id ?? $settings_key]);

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
