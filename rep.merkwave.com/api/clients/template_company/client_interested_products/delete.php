<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $client_id   = $_POST['client_id']   ?? null;
    $products_id = $_POST['products_id'] ?? null; // Expecting a single product ID to unlink

    if (empty($client_id) || !is_numeric($client_id) || $client_id <= 0) {
        print_failure("Error: Valid Client ID is required.");
    }

    if (empty($products_id) || !is_numeric($products_id) || $products_id <= 0) {
        print_failure("Error: A valid Product ID is required to unlink.");
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            DELETE FROM client_interested_products
            WHERE client_id = ? AND products_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for delete: " . $conn->error);
        }

        $stmt->bind_param("ii", $client_id, $products_id);

        if (!$stmt->execute()) {
            throw new Exception("Error unlinking product: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Product ID " . $products_id . " was not linked to client ID " . $client_id . ".");
        }

        $conn->commit();
        print_success("Product ID " . $products_id . " unlinked from client ID " . $client_id . " successfully.");

    } catch (Exception | TypeError $e) {
        $conn->rollback();
        throw $e;
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
