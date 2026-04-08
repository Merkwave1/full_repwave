<?php
// Enables strict error reporting
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Include your database connection and helper functions
require_once '../db_connect.php'; // Adjust path as necessary

try {
    // Authorization check
    

    // --- Collect and Sanitize GET Data ---
    $document_id = $_GET['document_id'] ?? null;
    $users_uuid = $_GET['users_uuid'] ?? null; // Assuming user UUID is passed for authorization/filtering

    // --- Validation ---
    if (empty($document_id) || !is_numeric($document_id) || $document_id <= 0) {
        print_failure("Error: Document ID is required."); exit;
    }
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required."); exit;
    }

    // Fetch document details for the given document_id
    $stmt = $conn->prepare("
        SELECT
            cd.client_document_id,
            cd.client_document_client_id,
            cd.client_document_type_id,
            cdt.document_type_name, -- Join to get type name
            cd.client_document_title,
            cd.client_document_file_path,
            cd.client_document_file_mime_type,
            cd.client_document_file_size_kb,
            cd.client_document_uploaded_by_user_id,
            u.users_name AS uploaded_by_user_name, -- Join to get uploader name
            cd.client_document_notes,
            cd.client_document_created_at,
            cd.client_document_updated_at,
            cd.client_documents_visit_id, -- Include visit ID if available
            c.clients_company_name AS client_name, -- Use correct column name
            c.clients_company_name
        FROM
            client_documents cd
        JOIN
            client_document_types cdt ON cd.client_document_type_id = cdt.document_type_id
        LEFT JOIN
            users u ON cd.client_document_uploaded_by_user_id = u.users_id
        LEFT JOIN
            clients c ON cd.client_document_client_id = c.clients_id
        WHERE
            cd.client_document_id = ?
        LIMIT 1
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("i", $document_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $document = $result->fetch_assoc();
    $stmt->close();

    if (!$document) {
        print_failure("Document not found.");
        exit;
    }

    print_success("Document details retrieved successfully.", ['document' => $document]);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
