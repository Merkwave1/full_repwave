<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
     // Assuming this function exists and works correctly



    $warehouse_id = $_POST['warehouse_id'] ?? null;

    if (empty($warehouse_id) || !is_numeric($warehouse_id) || $warehouse_id <= 0) {
        print_failure("Error: Valid Warehouse ID is required.");
        exit;
    }

    $stmt = $conn->prepare("
        DELETE FROM warehouse
        WHERE warehouse_id = ?
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for delete: " . $conn->error);
    }

    $stmt->bind_param("i", $warehouse_id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            print_success("Warehouse deleted successfully.");
        } else {
            print_failure("Error: Warehouse with ID " . $warehouse_id . " not found.");
        }
    } else {
        print_failure("Error deleting warehouse: " . $stmt->error);
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
