<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $client_type_name = $_POST['client_type_name'] ?? null;
    $client_type_sort_order = $_POST['client_type_sort_order'] ?? 0;

    if (empty($client_type_name)) {
        print_failure("Error: Client type name is required.");
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
        $stmt = $conn->prepare("
            INSERT INTO client_types (client_type_name, client_type_sort_order)
            VALUES (?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("si", $client_type_name, $client_type_sort_order);

        if (!$stmt->execute()) {
            throw new Exception("Error inserting client type: " . $stmt->error);
        }

        $new_id = $stmt->insert_id;

        $conn->commit();
        print_success("Client type added successfully.", [
            'client_type_id' => $new_id,
            'client_type_name' => $client_type_name,
            'sort_order' => $client_type_sort_order
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
