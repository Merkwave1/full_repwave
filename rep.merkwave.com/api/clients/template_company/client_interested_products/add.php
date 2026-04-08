<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $client_id   = $_POST['client_id']   ?? null;
    $products_id = $_POST['products_id'] ?? null; // Expecting a single product ID

    if (empty($client_id) || !is_numeric($client_id) || $client_id <= 0) {
        print_failure("Error: Valid Client ID is required.");
    }

    if (empty($products_id) || !is_numeric($products_id) || $products_id <= 0) {
        print_failure("Error: A valid Product ID is required.");
    }

    $conn->begin_transaction();

    try {
        // Use INSERT IGNORE to prevent error if the unique key (client_id, products_id) already exists
        $stmt = $conn->prepare("
            INSERT IGNORE INTO client_interested_products (client_id, products_id)
            VALUES (?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("ii", $client_id, $products_id);

        if (!$stmt->execute()) {
            throw new Exception("Error linking product: " . $stmt->error);
        }

        $message = "Product ID " . $products_id . " linked to client ID " . $client_id . " successfully.";
        
        // If affected_rows is 0, it means the row already existed and IGNORE prevented insertion
        if ($stmt->affected_rows === 0) {
            $message = "Product ID " . $products_id . " is already linked to client ID " . $client_id . ".";
        }

        $conn->commit();
        print_success($message, ['client_id' => $client_id, 'products_id' => $products_id]);

    } catch (Exception $e) {
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
