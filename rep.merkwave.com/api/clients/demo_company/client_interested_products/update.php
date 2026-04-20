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
        // Attempt to insert the link. If it already exists (due to UNIQUE constraint),
        // ON DUPLICATE KEY UPDATE will prevent an error and do nothing, effectively "updating" by ensuring presence.
        $stmt_insert = $conn->prepare("
            INSERT INTO client_interested_products (client_id, products_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE client_id = client_id -- Dummy update to do nothing if already exists
        ");

        if (!$stmt_insert) {
            throw new Exception("Prepare failed for insert/update: " . $conn->error);
        }

        $stmt_insert->bind_param("ii", $client_id, $products_id);
        
        if (!$stmt_insert->execute()) {
            throw new Exception("Error linking product: " . $stmt_insert->error);
        }

        $message = "Product ID " . $products_id . " linked to client ID " . $client_id . " successfully.";
        // If affected_rows is 1, it was inserted. If 2, it was updated (already existed).
        if ($stmt_insert->affected_rows === 0 || $stmt_insert->affected_rows === 2) {
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
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
