<?php

require_once '../db_connect.php'; 

// Set error reporting to throw exceptions on SQL errors
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // 1. Check for admin authorization
    

    // 2. Get and validate all required POST data
    $packaging_types_id                      = $_POST['packaging_types_id'] ?? null;
    $packaging_types_name                    = $_POST['packaging_types_name'] ?? null;
    $packaging_types_description             = $_POST['packaging_types_description'] ?? null;
    $packaging_types_default_conversion_factor = $_POST['packaging_types_default_conversion_factor'] ?? null;
    $packaging_types_compatible_base_unit_id = $_POST['packaging_types_compatible_base_unit_id'] ?? null;

    // --- Input Validation ---
    if (empty($packaging_types_id) || !is_numeric($packaging_types_id) || $packaging_types_id <= 0) {
        print_failure("Error: A valid Packaging Type ID is required for update.");
    }
    if ($packaging_types_description === "") {
        $packaging_types_description = null;
    }
    if (empty($packaging_types_name)) {
        print_failure("Error: Packaging type name is required.");
    }
    if (empty($packaging_types_default_conversion_factor) || !is_numeric($packaging_types_default_conversion_factor) || $packaging_types_default_conversion_factor <= 0) {
        print_failure("Error: A valid, positive default conversion factor is required.");
    }
    if (empty($packaging_types_compatible_base_unit_id) || !is_numeric($packaging_types_compatible_base_unit_id) || $packaging_types_compatible_base_unit_id <= 0) {
        print_failure("Error: A valid compatible base unit ID is required.");
    }

    // 3. Start a database transaction
    $conn->begin_transaction();

    try {
        // 4. Check if the provided compatible_base_unit_id exists in the base_units table
        $stmt_check_base_unit = $conn->prepare("SELECT base_units_id FROM base_units WHERE base_units_id = ? LIMIT 1");
        if (!$stmt_check_base_unit) {
            throw new Exception("Prepare failed for base unit check: " . $conn->error);
        }
        $stmt_check_base_unit->bind_param("i", $packaging_types_compatible_base_unit_id);
        $stmt_check_base_unit->execute();
        if ($stmt_check_base_unit->get_result()->num_rows === 0) {
            // If the base unit doesn't exist, stop the process
            print_failure("Error: The selected Compatible Base Unit does not exist.");
        }
        $stmt_check_base_unit->close();


        // 5. Prepare the SQL UPDATE statement
        $stmt = $conn->prepare("
            UPDATE packaging_types SET
                packaging_types_name = ?,
                packaging_types_description = ?,
                packaging_types_default_conversion_factor = ?,
                packaging_types_compatible_base_unit_id = ?
            WHERE packaging_types_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare statement for update failed: " . $conn->error);
        }

        // Bind parameters
        $stmt->bind_param("ssdii", 
            $packaging_types_name, 
            $packaging_types_description, 
            $packaging_types_default_conversion_factor, 
            $packaging_types_compatible_base_unit_id,
            $packaging_types_id
        );

        // Execute the statement
        if (!$stmt->execute()) {
            throw new Exception("Error updating packaging type: " . $stmt->error);
        }

        // 6. Check if any row was actually updated
        if ($stmt->affected_rows > 0) {
            $conn->commit();
            print_success("Packaging type updated successfully.", ['packaging_types_id' => $packaging_types_id]);
        } else {
            // No rows affected could mean the record wasn't found, or the data was identical.
            // We'll treat it as a success since the record is in the state the user requested.
            $conn->commit();
            print_success("Packaging type data was already up to date.", ['packaging_types_id' => $packaging_types_id]);
        }

    } catch (Exception $e) {
        // If any error occurs, roll back the transaction
        $conn->rollback();
        // Check for a duplicate name error
        if ($conn->errno == 1062) {
             print_failure("Error: Another packaging type with this name already exists.");
        } else {
            print_failure("Database transaction failed: " . $e->getMessage());
        }
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Server Error: " . $e->getMessage());
} finally {
    // 7. Always close statement and connection
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
