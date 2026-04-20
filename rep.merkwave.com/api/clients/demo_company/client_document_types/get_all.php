<?php
require_once '../db_connect.php';
header('Content-Type: application/json');

try {
     // Or appropriate authorization

    $stmt = $conn->prepare("SELECT document_type_id, document_type_name FROM client_document_types ORDER BY document_type_name ASC");
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $types = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    print_success("Document types retrieved successfully.", $types);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>