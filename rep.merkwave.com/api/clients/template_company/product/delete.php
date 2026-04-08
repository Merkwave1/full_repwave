<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
  

    $products_id = $_POST['products_id'] ?? null;

    if (empty($products_id) || !is_numeric($products_id) || $products_id <= 0) {
        print_failure("Error: Valid Product ID is required.");
        exit;
    }

    $stmt = $conn->prepare("
        DELETE FROM products
        WHERE products_id = ?
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for delete: " . $conn->error);
    }

    $stmt->bind_param("i", $products_id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            print_success("Product deleted successfully.");
        } else {
            print_failure("Error: Product with ID " . $products_id . " not found.");
        }
    } else {
        print_failure("Error deleting product: " . $stmt->error);
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
