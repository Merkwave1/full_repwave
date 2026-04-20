<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_all

    $stmt = $conn->prepare("
        SELECT 
            client_type_id, 
            client_type_name,
            client_type_sort_order AS sort_order
        FROM client_types
        ORDER BY client_type_sort_order ASC, client_type_name ASC
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $types = [];
    while ($row = $result->fetch_assoc()) {
        $types[] = [
            'client_type_id' => (int) $row['client_type_id'],
            'client_type_name' => $row['client_type_name'],
            'sort_order' => isset($row['sort_order']) ? (int) $row['sort_order'] : 0
        ];
    }

    print_success("Client types retrieved successfully.", $types);

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
