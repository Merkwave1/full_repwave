<?php

require_once '../db_connect.php'; 

// Set error reporting to throw exceptions on SQL errors
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // 1. Check for admin authorization
    

    // 2. Get and validate the base_units_id from the POST request
    $base_units_id = $_POST['base_units_id'] ?? null;

    if (empty($base_units_id) || !is_numeric($base_units_id) || $base_units_id <= 0) {
        // If the ID is missing or invalid, return an error
        print_failure("Error: A valid Base Unit ID is required for deletion.");
    }

    // 3. Start a database transaction for data integrity
    $conn->begin_transaction();

    try {
        // Prepare the SQL statement to delete the base unit
        $stmt = $conn->prepare("DELETE FROM base_units WHERE base_units_id = ?");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }

        // Bind the ID to the prepared statement
        $stmt->bind_param("i", $base_units_id);

        // Execute the statement
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }

        // 4. Check if any rows were affected to confirm deletion
        if ($stmt->affected_rows > 0) {
            // If deletion was successful, commit the transaction
            $conn->commit();
            print_success("Base unit deleted successfully.");
        } else {
            // If no rows were affected, the ID was not found
            $conn->rollback();
            print_failure("Error: Base unit not found or could not be deleted.");
        }

    } catch (Exception $e) {
        // If any error occurs during the transaction, roll it back
        $conn->rollback();
        print_failure("Database transaction failed: " . $e->getMessage());
    }

} catch (Exception | TypeError $e) {
    // Catch any other errors (e.g., from authorization)
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
