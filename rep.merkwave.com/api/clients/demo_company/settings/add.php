<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
     // Only admin can add settings

    $settings_key        = $_POST['settings_key']        ?? null;
    $settings_value      = $_POST['settings_value']      ?? null;
    $settings_description = $_POST['settings_description'] ?? null;
    $settings_type       = $_POST['settings_type']       ?? 'string';

    // Handle empty strings for nullable fields
    if ($settings_value === "") {$settings_value = null;}
    if ($settings_description === "") {$settings_description = null;}

    // Basic Validation
    if (empty($settings_key)) {
        print_failure("Error: Setting key is required.");
    }
    
    // Validate setting type
    $valid_types = ['string', 'integer', 'decimal', 'boolean', 'datetime', 'json'];
    if (!in_array($settings_type, $valid_types)) {
        print_failure("Error: Invalid setting type. Valid types are: " . implode(', ', $valid_types));
    }
    
    // Validate settings_value based on type
    if ($settings_value !== null) {
        switch ($settings_type) {
            case 'integer':
                if (!is_numeric($settings_value) || floor($settings_value) != $settings_value) {
                    print_failure("Error: Setting value must be a valid integer for type 'integer'.");
                }
                break;
            case 'decimal':
                if (!is_numeric($settings_value)) {
                    print_failure("Error: Setting value must be a valid decimal number for type 'decimal'.");
                }
                break;
            case 'boolean':
                if (!in_array(strtolower($settings_value), ['true', 'false', '1', '0'])) {
                    print_failure("Error: Setting value must be 'true', 'false', '1', or '0' for type 'boolean'.");
                }
                break;
            case 'datetime':
                if (!strtotime($settings_value)) {
                    print_failure("Error: Setting value must be a valid datetime for type 'datetime'.");
                }
                break;
            case 'json':
                if (json_decode($settings_value) === null && json_last_error() !== JSON_ERROR_NONE) {
                    print_failure("Error: Setting value must be valid JSON for type 'json'.");
                }
                break;
        }
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            INSERT INTO settings (settings_key, settings_value, settings_description, settings_type)
            VALUES (?, ?, ?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("ssss", 
            $settings_key, 
            $settings_value, 
            $settings_description, 
            $settings_type
        );

        if (!$stmt->execute()) {
            throw new Exception("Error inserting setting: " . $stmt->error);
        }

        $new_id = $stmt->insert_id;
        $stmt->close();

        $conn->commit();
        print_success("Setting added successfully.", ['settings_id' => $new_id, 'settings_key' => $settings_key]);

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
