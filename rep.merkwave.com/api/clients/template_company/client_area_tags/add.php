<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $client_area_tag_name = $_POST['client_area_tag_name'] ?? null;
    $client_area_tag_sort_order = $_POST['client_area_tag_sort_order'] ?? 0;

    if (empty($client_area_tag_name)) {
        print_failure("Error: Area tag name is required.");
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
        $stmt = $conn->prepare("
            INSERT INTO client_area_tags (client_area_tag_name, client_area_tag_sort_order)
            VALUES (?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("si", $client_area_tag_name, $client_area_tag_sort_order);

        if (!$stmt->execute()) {
            throw new Exception("Error inserting client area tag: " . $stmt->error);
        }

        $new_id = $stmt->insert_id;

        $conn->commit();
        print_success("Client area tag added successfully.", [
            'client_area_tag_id' => $new_id,
            'client_area_tag_name' => $client_area_tag_name,
            'sort_order' => $client_area_tag_sort_order
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
