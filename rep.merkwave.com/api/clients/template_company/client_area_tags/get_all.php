<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_all

    $stmt = $conn->prepare("
        SELECT 
            client_area_tag_id, 
            client_area_tag_name,
            client_area_tag_sort_order AS sort_order
        FROM client_area_tags
        ORDER BY client_area_tag_sort_order ASC, client_area_tag_name ASC
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $area_tags = [];
    while ($row = $result->fetch_assoc()) {
        $area_tags[] = [
            'client_area_tag_id' => (int) $row['client_area_tag_id'],
            'client_area_tag_name' => $row['client_area_tag_name'],
            'sort_order' => isset($row['sort_order']) ? (int) $row['sort_order'] : 0
        ];
    }

    print_success("Client area tags retrieved successfully.", $area_tags);

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
