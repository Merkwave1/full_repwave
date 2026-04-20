<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $client_area_tag_id   = $_POST['client_area_tag_id']   ?? null;
    $client_area_tag_name = $_POST['client_area_tag_name'] ?? null;
    $client_area_tag_sort_order = $_POST['client_area_tag_sort_order'] ?? 0;

    if (empty($client_area_tag_id) || !is_numeric($client_area_tag_id) || $client_area_tag_id <= 0) {
        print_failure("Error: Valid Area Tag ID is required for update.");
    }
    if (empty($client_area_tag_name)) {
        print_failure("Error: Area tag name cannot be empty.");
    }

    if ($client_area_tag_sort_order === '' || $client_area_tag_sort_order === null) {
        $client_area_tag_sort_order = 0;
    }

    if (!is_numeric($client_area_tag_sort_order)) {
        print_failure("Error: Sort order must be a numeric value.");
    }

    $client_area_tag_sort_order = (int) $client_area_tag_sort_order;

    $conn->begin_transaction();

    try {
        $checkStmt = $conn->prepare("
            SELECT client_area_tag_id
            FROM client_area_tags
            WHERE client_area_tag_id = ?
            FOR UPDATE
        ");

        if (!$checkStmt) {
            throw new Exception("Prepare failed for existence check: " . $conn->error);
        }

        $checkStmt->bind_param('i', $client_area_tag_id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();

        if ($checkResult->num_rows === 0) {
            $checkStmt->close();
            $conn->rollback();
            print_failure("Error: Client area tag with ID " . $client_area_tag_id . " not found.");
        }

        $stmt = $conn->prepare("
            UPDATE client_area_tags
            SET client_area_tag_name = ?,
                client_area_tag_sort_order = ?
            WHERE client_area_tag_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for update: " . $conn->error);
        }

        $stmt->bind_param("sii", $client_area_tag_name, $client_area_tag_sort_order, $client_area_tag_id);

        if (!$stmt->execute()) {
            throw new Exception("Error updating client area tag: " . $stmt->error);
        }

        $getStmt = $conn->prepare("
            SELECT client_area_tag_id, client_area_tag_name, client_area_tag_sort_order
            FROM client_area_tags
            WHERE client_area_tag_id = ?
        ");

        if (!$getStmt) {
            throw new Exception("Prepare failed for select updated area tag: " . $conn->error);
        }

        $getStmt->bind_param('i', $client_area_tag_id);
        $getStmt->execute();
        $updatedResult = $getStmt->get_result();
        $updatedTag = $updatedResult->fetch_assoc();

        if (!$updatedTag) {
            throw new Exception("Unable to retrieve updated client area tag record.");
        }

        $conn->commit();
        print_success("Client area tag updated successfully.", [
            'client_area_tag_id' => (int) $updatedTag['client_area_tag_id'],
            'client_area_tag_name' => $updatedTag['client_area_tag_name'],
            'sort_order' => isset($updatedTag['client_area_tag_sort_order']) ? (int) $updatedTag['client_area_tag_sort_order'] : 0
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
