<?php

require_once '../db_connect.php'; 

// Set error reporting to throw exceptions on SQL errors
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // 1. Check for admin authorization
    

    // 2. Get and validate the input from the POST request
    $base_units_id          = $_POST['base_units_id'] ?? null;
    $base_units_name        = $_POST['base_units_name'] ?? null;
    $base_units_description = $_POST['base_units_description'] ?? null;

    if (empty($base_units_id) || !is_numeric($base_units_id) || $base_units_id <= 0) {
        print_failure("Error: A valid Base Unit ID is required for update.");
    }
    if (empty($base_units_name)) {
        print_failure("Error: Base unit name cannot be empty.");
    }
    if ($base_units_description === "") {
        $base_units_description = null;
    }

    // 3. Start a database transaction
    $conn->begin_transaction();

    try {
        // Prepare the SQL statement to update the base unit
        $stmt = $conn->prepare("
            UPDATE base_units 
            SET base_units_name = ?, base_units_description = ? 
            WHERE base_units_id = ?
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }

        // Bind the parameters to the prepared statement
        $stmt->bind_param("ssi", 
            $base_units_name, 
            $base_units_description, 
            $base_units_id
        );

        // Execute the statement
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }

        // 4. Check if any rows were affected.
        // Note: affected_rows can be 0 if the submitted data is the same as the existing data.
        // We consider this a success, as the record is in the desired state.
        if ($stmt->affected_rows >= 0) {
            $conn->commit();
            print_success("Base unit updated successfully.", ['base_units_id' => $base_units_id]);
        } else {
            // This case is less likely with our logic but included for completeness
            $conn->rollback();
            print_failure("Error: Base unit could not be updated.");
        }

    } catch (Exception $e) {
        // If any error occurs during the transaction, roll it back
        $conn->rollback();
        // Check for duplicate entry error
        if ($conn->errno == 1062) {
            print_failure("Error: A base unit with this name already exists.");
        } else {
            print_failure("Database transaction failed: " . $e->getMessage());
        }
    }

} catch (Exception | TypeError $e) {
    // Catch any other errors
    print_failure("Internal Server Error: " . $e->getMessage());
} finally {
    // 5. Always close the statement and connection
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
