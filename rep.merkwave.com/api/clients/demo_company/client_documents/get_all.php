<?php
// Enables strict error reporting
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Include your database connection and helper functions
require_once '../db_connect.php'; // Adjust path as necessary

try {
    

    // --- Collect and Sanitize GET Data ---
    $client_id = $_GET['client_id'] ?? null;
    $users_uuid = $_GET['users_uuid'] ?? null; // Assuming user UUID is passed for authorization/filtering

    // --- Validation ---
    if (empty($client_id) || !is_numeric($client_id) || $client_id <= 0) {
        print_failure("Error: Client ID is required."); exit;
    }
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required."); exit;
    }

    // You might want to verify the users_uuid against the logged-in user or a specific role
    // handles the primary authorization.

    // Fetch documents for the given client_id
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
            cd.client_document_updated_at
        FROM
            client_documents cd
        JOIN
            client_document_types cdt ON cd.client_document_type_id = cdt.document_type_id
        LEFT JOIN
            users u ON cd.client_document_uploaded_by_user_id = u.users_id
        WHERE
            cd.client_document_client_id = ?
        ORDER BY
            cd.client_document_created_at DESC
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("i", $client_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $documents = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    print_success("Client documents retrieved successfully.", ['documents' => $documents]);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
