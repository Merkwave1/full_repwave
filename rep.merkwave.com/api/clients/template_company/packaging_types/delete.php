<?php

require_once '../db_connect.php'; 

// Set error reporting to throw exceptions on SQL errors
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // 1. Check for admin authorization
    

    // 2. Get and validate the packaging_types_id from the POST request
    $packaging_types_id = $_POST['packaging_types_id'] ?? null;

    if (empty($packaging_types_id) || !is_numeric($packaging_types_id) || $packaging_types_id <= 0) {
        // If the ID is missing or invalid, return an error
        print_failure("Error: A valid Packaging Type ID is required for deletion.");
    }

    // 3. Start a database transaction for data integrity
    $conn->begin_transaction();

    try {
        // Prepare the SQL statement to delete the packaging type
        $stmt = $conn->prepare("DELETE FROM packaging_types WHERE packaging_types_id = ?");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }

        // Bind the ID to the prepared statement
        $stmt->bind_param("i", $packaging_types_id);

        // Execute the statement
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }

        // 4. Check if any rows were affected to confirm deletion
        if ($stmt->affected_rows > 0) {
            // If deletion was successful, commit the transaction
            $conn->commit();
            print_success("Packaging type deleted successfully.");
        } else {
            // If no rows were affected, the ID was not found
            $conn->rollback();
            print_failure("Error: Packaging type not found or could not be deleted.");
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
