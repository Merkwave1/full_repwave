<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $packaging_types_name                = $_POST['packaging_types_name']                ?? null;
    $packaging_types_description         = $_POST['packaging_types_description']         ?? null;
    $packaging_types_default_conversion_factor = $_POST['packaging_types_default_conversion_factor'] ?? null;
    $packaging_types_compatible_base_unit_id = $_POST['packaging_types_compatible_base_unit_id'] ?? null;

    if ($packaging_types_description === "") {$packaging_types_description = null;}

    if (empty($packaging_types_name)) {
        print_failure("Error: Packaging type name is required.");
    }
    if (empty($packaging_types_default_conversion_factor) || !is_numeric($packaging_types_default_conversion_factor) || $packaging_types_default_conversion_factor <= 0) {
        print_failure("Error: Valid default conversion factor is required and must be positive.");
    }
    if (empty($packaging_types_compatible_base_unit_id) || !is_numeric($packaging_types_compatible_base_unit_id) || $packaging_types_compatible_base_unit_id <= 0) {
        print_failure("Error: Valid compatible base unit ID is required.");
    }

    $conn->begin_transaction();

    try {
        // Check if compatible_base_unit_id exists in base_units table
        $stmt_check_base_unit = $conn->prepare("SELECT base_units_id FROM base_units WHERE base_units_id = ? LIMIT 1");
        if (!$stmt_check_base_unit) {
            throw new Exception("Prepare failed for base unit check: " . $conn->error);
        }
        $stmt_check_base_unit->bind_param("i", $packaging_types_compatible_base_unit_id);
        $stmt_check_base_unit->execute();
        if ($stmt_check_base_unit->get_result()->num_rows === 0) {
            print_failure("Error: Compatible Base Unit ID " . $packaging_types_compatible_base_unit_id . " does not exist.");
        }
        $stmt_check_base_unit->close();


        $stmt = $conn->prepare("
            INSERT INTO packaging_types (
                packaging_types_name, packaging_types_description, 
                packaging_types_default_conversion_factor, packaging_types_compatible_base_unit_id
            ) VALUES (?, ?, ?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("ssdi", 
            $packaging_types_name, 
            $packaging_types_description, 
            $packaging_types_default_conversion_factor, 
            $packaging_types_compatible_base_unit_id
        );

        if (!$stmt->execute()) {
            throw new Exception("Error inserting packaging type: " . $stmt->error);
        }

        $new_id = $stmt->insert_id;

        $conn->commit();
        print_success("Packaging type added successfully.", ['packaging_types_id' => $new_id, 'packaging_types_name' => $packaging_types_name]);

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
