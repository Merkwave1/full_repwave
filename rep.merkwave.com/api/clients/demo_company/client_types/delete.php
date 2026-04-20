<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $client_type_id = $_POST['client_type_id'] ?? null;

    if (empty($client_type_id) || !is_numeric($client_type_id) || $client_type_id <= 0) {
        print_failure("Error: Valid Client Type ID is required.");
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            DELETE FROM client_types
            WHERE client_type_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for delete: " . $conn->error);
        }

        $stmt->bind_param("i", $client_type_id);

        if (!$stmt->execute()) {
            throw new Exception("Error deleting client type: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Client type with ID " . $client_type_id . " not found.");
        }

        $conn->commit();
        print_success("Client type deleted successfully.");

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
