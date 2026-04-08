<?php
require_once '../db_connect.php';
header('Content-Type: application/json');

try {
     // Or appropriate authorization

    // --- Collect and Sanitize POST Data ---
    $document_type_name = $_POST['document_type_name'] ?? null;
    $document_type_description = $_POST['document_type_description'] ?? null;

    // Handle empty strings for nullable fields (set to NULL if empty)
    if (isset($_POST['document_type_description']) && $_POST['document_type_description'] === "") {
        $document_type_description = null;
    }

    // --- Validation for Required Fields ---
    if (empty($document_type_name)) {
        print_failure("Error: Document type name is required."); exit;
    }

    $stmt = $conn->prepare("INSERT INTO client_document_types (document_type_name, document_type_description) VALUES (?, ?)");
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("ss", $document_type_name, $document_type_description);
    
    if (!$stmt->execute()) {
        throw new Exception("Error inserting document type: " . $stmt->error);
    }

    $new_type_id = $stmt->insert_id;
    $stmt->close();

    print_success("Document type added successfully.", [
        'document_type_id' => $new_type_id,
        'document_type_name' => $document_type_name,
        'document_type_description' => $document_type_description
    ]);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
