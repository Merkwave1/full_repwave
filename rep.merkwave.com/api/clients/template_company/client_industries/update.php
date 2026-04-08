<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $client_industries_id   = $_POST['client_industries_id']   ?? null;
    $client_industries_name = $_POST['client_industries_name'] ?? null;
    $client_industries_sort_order = $_POST['client_industries_sort_order'] ?? 0;

    if (empty($client_industries_id) || !is_numeric($client_industries_id) || $client_industries_id <= 0) {
        print_failure("Error: Valid Industry ID is required for update.");
    }
    if (empty($client_industries_name)) {
        print_failure("Error: Industry name cannot be empty.");
    }

    if ($client_industries_sort_order === '' || $client_industries_sort_order === null) {
        $client_industries_sort_order = 0;
    }

    if (!is_numeric($client_industries_sort_order)) {
        print_failure("Error: Sort order must be a numeric value.");
    }

    $client_industries_sort_order = (int) $client_industries_sort_order;

    $conn->begin_transaction();

    try {
        $checkStmt = $conn->prepare("
            SELECT client_industries_id
            FROM client_industries
            WHERE client_industries_id = ?
            FOR UPDATE
        ");

        if (!$checkStmt) {
            throw new Exception("Prepare failed for existence check: " . $conn->error);
        }

        $checkStmt->bind_param('i', $client_industries_id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();

        if ($checkResult->num_rows === 0) {
            $checkStmt->close();
            $conn->rollback();
            print_failure("Error: Client industry with ID " . $client_industries_id . " not found.");
        }

        $stmt = $conn->prepare("
            UPDATE client_industries
            SET client_industries_name = ?,
                client_industries_sort_order = ?
            WHERE client_industries_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for update: " . $conn->error);
        }

        $stmt->bind_param("sii", $client_industries_name, $client_industries_sort_order, $client_industries_id);

        if (!$stmt->execute()) {
            throw new Exception("Error updating client industry: " . $stmt->error);
        }

        $getStmt = $conn->prepare("
            SELECT client_industries_id, client_industries_name, client_industries_sort_order
            FROM client_industries
            WHERE client_industries_id = ?
        ");

        if (!$getStmt) {
            throw new Exception("Prepare failed for select updated industry: " . $conn->error);
        }

        $getStmt->bind_param('i', $client_industries_id);
        $getStmt->execute();
        $updatedResult = $getStmt->get_result();
        $updatedIndustry = $updatedResult->fetch_assoc();

        if (!$updatedIndustry) {
            throw new Exception("Unable to retrieve updated client industry record.");
        }

        $conn->commit();
        print_success("Client industry updated successfully.", [
            'client_industries_id' => (int) $updatedIndustry['client_industries_id'],
            'client_industries_name' => $updatedIndustry['client_industries_name'],
            'sort_order' => isset($updatedIndustry['client_industries_sort_order']) ? (int) $updatedIndustry['client_industries_sort_order'] : 0
        ]);

    } catch (Exception $e) {
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
