<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $client_area_tag_id = $_POST['client_area_tag_id'] ?? null;

    if (empty($client_area_tag_id) || !is_numeric($client_area_tag_id) || $client_area_tag_id <= 0) {
        print_failure("Error: Valid Area Tag ID is required.");
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            DELETE FROM client_area_tags
            WHERE client_area_tag_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for delete: " . $conn->error);
        }

        $stmt->bind_param("i", $client_area_tag_id);

        if (!$stmt->execute()) {
            throw new Exception("Error deleting client area tag: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Client area tag with ID " . $client_area_tag_id . " not found.");
        }

        $conn->commit();
        print_success("Client area tag deleted successfully.");

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
