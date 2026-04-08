<?php

require_once '../db_connect.php'; 

// Set error reporting to throw exceptions on SQL errors
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // 1. Check for admin authorization (you should have this function defined)
    

    // 2. Get and validate the attribute ID from the POST request
    $attribute_id = $_POST['attribute_id'] ?? null;

    if (empty($attribute_id) || !is_numeric($attribute_id) || $attribute_id <= 0) {
        // If the ID is missing or invalid, return an error
        print_failure("Error: A valid Attribute ID is required for deletion.");
    }

    // 3. Start a database transaction for data integrity
    $conn->begin_transaction();

    try {
        // Prepare the SQL statement to delete the attribute
        // Note: This assumes your `product_attribute_values` table has an
        // `ON DELETE CASCADE` foreign key constraint. If not, you would need
        // to delete values from that table first.
        $stmt = $conn->prepare("DELETE FROM product_attributes WHERE attribute_id = ?");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }

        // Bind the attribute ID to the prepared statement
        $stmt->bind_param("i", $attribute_id);

        // Execute the statement
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }

        // 4. Check if any rows were affected to confirm deletion
        if ($stmt->affected_rows > 0) {
            // If deletion was successful, commit the transaction
            $conn->commit();
            print_success("Product attribute deleted successfully.");
        } else {
            // If no rows were affected, the attribute ID was not found
            $conn->rollback();
            print_failure("Error: Attribute not found or could not be deleted.");
        }

        $stmt->close();

    } catch (Exception $e) {
        // If any error occurs during the transaction, roll it back
        $conn->rollback();
        print_failure("Database transaction failed: " . $e->getMessage());
    }

} catch (Exception | TypeError $e) {
    // Catch any other errors (e.g., from authorization)
    print_failure("Internal Server Error: " . $e->getMessage());
} finally {
    // 5. Always close the database connection
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
