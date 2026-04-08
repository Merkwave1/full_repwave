<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $client_industries_name = $_POST['client_industries_name'] ?? null;
    $client_industries_sort_order = $_POST['client_industries_sort_order'] ?? 0;

    if (empty($client_industries_name)) {
        print_failure("Error: Industry name is required.");
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
        $stmt = $conn->prepare("
            INSERT INTO client_industries (client_industries_name, client_industries_sort_order)
            VALUES (?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("si", $client_industries_name, $client_industries_sort_order);

        if (!$stmt->execute()) {
            throw new Exception("Error inserting client industry: " . $stmt->error);
        }

        $new_id = $stmt->insert_id;

        $conn->commit();
        print_success("Client industry added successfully.", [
            'client_industries_id' => $new_id,
            'client_industries_name' => $client_industries_name,
            'sort_order' => $client_industries_sort_order
        ]);

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
