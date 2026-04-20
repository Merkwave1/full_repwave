<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $client_type_id   = $_POST['client_type_id']   ?? null;
    $client_type_name = $_POST['client_type_name'] ?? null;
    $client_type_sort_order = $_POST['client_type_sort_order'] ?? 0;

    if (empty($client_type_id) || !is_numeric($client_type_id) || $client_type_id <= 0) {
        print_failure("Error: Valid Client Type ID is required for update.");
    }
    if (empty($client_type_name)) {
        print_failure("Error: Client type name cannot be empty.");
    }

    if ($client_type_sort_order === '' || $client_type_sort_order === null) {
        $client_type_sort_order = 0;
    }

    if (!is_numeric($client_type_sort_order)) {
        print_failure("Error: Sort order must be a numeric value.");
    }

    $client_type_sort_order = (int) $client_type_sort_order;

    $conn->begin_transaction();

    try {
        $checkStmt = $conn->prepare("
            SELECT client_type_id
            FROM client_types
            WHERE client_type_id = ?
            FOR UPDATE
        ");

        if (!$checkStmt) {
            throw new Exception("Prepare failed for existence check: " . $conn->error);
        }

        $checkStmt->bind_param('i', $client_type_id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();

        if ($checkResult->num_rows === 0) {
            $checkStmt->close();
            $conn->rollback();
            print_failure("Error: Client type with ID " . $client_type_id . " not found.");
        }

        $stmt = $conn->prepare("
            UPDATE client_types
            SET client_type_name = ?,
                client_type_sort_order = ?
            WHERE client_type_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for update: " . $conn->error);
        }

        $stmt->bind_param("sii", $client_type_name, $client_type_sort_order, $client_type_id);

        if (!$stmt->execute()) {
            throw new Exception("Error updating client type: " . $stmt->error);
        }

        $getStmt = $conn->prepare("
            SELECT client_type_id, client_type_name, client_type_sort_order
            FROM client_types
            WHERE client_type_id = ?
        ");

        if (!$getStmt) {
            throw new Exception("Prepare failed for select updated client type: " . $conn->error);
        }

        $getStmt->bind_param('i', $client_type_id);
        $getStmt->execute();
        $updatedResult = $getStmt->get_result();
        $updatedType = $updatedResult->fetch_assoc();

        if (!$updatedType) {
            throw new Exception("Unable to retrieve updated client type record.");
        }

        $conn->commit();
        print_success("Client type updated successfully.", [
            'client_type_id' => (int) $updatedType['client_type_id'],
            'client_type_name' => $updatedType['client_type_name'],
            'sort_order' => isset($updatedType['client_type_sort_order']) ? (int) $updatedType['client_type_sort_order'] : 0
        ]);

    } catch (Exception | TypeError $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($checkStmt) && $checkStmt !== false) {
        $checkStmt->close();
    }
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($getStmt) && $getStmt !== false) {
        $getStmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
