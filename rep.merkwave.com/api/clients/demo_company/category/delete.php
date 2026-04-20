<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    


    $categories_id = $_POST['categories_id'] ?? null;

    if (empty($categories_id) || !is_numeric($categories_id)) {
        print_failure("Error: Valid Category ID is required.");
        exit;
    }

    $stmt = $conn->prepare("
        DELETE FROM categories
        WHERE categories_id = ?
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for delete: " . $conn->error);
    }

    $stmt->bind_param("i", $categories_id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            print_success("Category deleted successfully.");
        } else {
            print_failure("Error: Category with ID " . $categories_id . " not found.");
        }
    } else {
        print_failure("Error deleting category: " . $stmt->error);
    }
} catch (Exception $e) {
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
