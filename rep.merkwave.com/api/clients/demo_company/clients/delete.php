<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $clients_id = $_POST['clients_id'] ?? null;

    if (empty($clients_id) || !is_numeric($clients_id) || $clients_id <= 0) {
        print_failure("Error: Valid Client ID is required.");
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            DELETE FROM clients
            WHERE clients_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for delete: " . $conn->error);
        }

        $stmt->bind_param("i", $clients_id);

        if (!$stmt->execute()) {
            throw new Exception("Error deleting client: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Client with ID " . $clients_id . " not found.");
        }

        // Due to ON DELETE CASCADE on fk_client_interested_products_client,
        // related entries in client_interested_products will be automatically deleted.
    $conn->commit();
        print_success("Client deleted successfully.");
        exit;

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
