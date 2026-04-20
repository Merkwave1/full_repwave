<?php
require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get users_uuid from POST request
    $input = json_decode(file_get_contents('php://input'), true);
    $users_uuid = $input['users_uuid'] ?? $_GET['users_uuid'] ?? null;

    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    // Get user_id and role from users table
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();

    if (!$user_data) {
        print_failure("Error: Invalid User UUID provided.");
    }

    $current_user_id = $user_data['users_id'];
    $current_user_role = $user_data['users_role'];

    // Get all documents with client and type information
    $sql = "
        SELECT 
            cd.client_document_id,
            cd.client_document_client_id as client_id,
            cd.client_document_type_id as document_type_id,
            cd.client_document_title,
            cd.client_document_file_path,
            cd.client_document_file_mime_type,
            cd.client_document_file_size_kb,
            cd.client_document_notes,
            cd.client_document_created_at as created_at,
            cd.client_document_updated_at as updated_at,
            c.clients_company_name as client_name,
            cdt.document_type_name,
            u.users_name as uploaded_by_user_name
        FROM client_documents cd
        JOIN clients c ON cd.client_document_client_id = c.clients_id
        LEFT JOIN client_document_types cdt ON cd.client_document_type_id = cdt.document_type_id
        LEFT JOIN users u ON cd.client_document_uploaded_by_user_id = u.users_id
    ";

    $params = [];
    $types = "";

    // Apply role-based filtering
    if ($current_user_role !== 'admin') {
        $sql .= " WHERE c.clients_rep_user_id = ?";
        $params[] = $current_user_id;
        $types .= "i";
    }
    
    $sql .= " ORDER BY cd.client_document_created_at DESC";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed for documents: " . $conn->error);
    }

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $documents = [];
    while ($row = $result->fetch_assoc()) {
        $documents[] = $row;
    }

    // Get document types for analysis
    $types_stmt = $conn->prepare("SELECT document_type_id, document_type_name FROM client_document_types ORDER BY document_type_name");
    $types_stmt->execute();
    $types_result = $types_stmt->get_result();
    
    $document_types = [];
    while ($type_row = $types_result->fetch_assoc()) {
        $document_types[] = $type_row;
    }
    $types_stmt->close();

    // Analyze documents by type
    $documents_by_type = [];
    foreach ($document_types as $type) {
        $type_documents = array_filter($documents, fn($doc) => $doc['document_type_id'] == $type['document_type_id']);
        $documents_by_type[] = [
            'type_id' => $type['document_type_id'],
            'type_name' => $type['document_type_name'],
            'count' => count($type_documents),
            'documents' => array_values($type_documents)
        ];
    }

    // Sort by count descending
    usort($documents_by_type, fn($a, $b) => $b['count'] - $a['count']);

    // Get clients for missing documents analysis
    $clients_sql = "
        SELECT 
            clients_id as client_id,
            clients_company_name as client_name,
            clients_status as status,
            clients_type as client_type
        FROM clients
    ";

    if ($current_user_role !== 'admin') {
        $clients_sql .= " WHERE clients_rep_user_id = ?";
    }

    $clients_stmt = $conn->prepare($clients_sql);
    if (!empty($params)) {
        $clients_stmt->bind_param($types, ...$params);
    }
    $clients_stmt->execute();
    $clients_result = $clients_stmt->get_result();

    $all_clients = [];
    while ($client_row = $clients_result->fetch_assoc()) {
        $all_clients[] = $client_row;
    }
    $clients_stmt->close();

    // Find clients with missing documents
    $clients_with_missing_docs = [];
    foreach ($all_clients as $client) {
        $client_docs = array_filter($documents, fn($doc) => $doc['client_id'] == $client['client_id']);
        $client_doc_types = array_unique(array_column($client_docs, 'document_type_id'));
        $missing_types = array_filter($document_types, fn($type) => !in_array($type['document_type_id'], $client_doc_types));
        
        if (!empty($missing_types)) {
            $clients_with_missing_docs[] = [
                'client_id' => $client['client_id'],
                'client_name' => $client['client_name'],
                'status' => $client['status'],
                'client_type' => $client['client_type'],
                'missing_documents' => array_values($missing_types),
                'missing_count' => count($missing_types),
                'total_required' => count($document_types),
                'completion_rate' => count($document_types) > 0 ? round((count($client_doc_types) / count($document_types)) * 100, 1) : 0
            ];
        }
    }

    // Sort by missing count descending
    usort($clients_with_missing_docs, fn($a, $b) => $b['missing_count'] - $a['missing_count']);

    print_success("Documents reports retrieved successfully.", [
        'all_documents' => $documents,
        'documents_by_type' => $documents_by_type,
        'missing_documents_report' => $clients_with_missing_docs,
        'document_types' => $document_types
    ]);

} catch (Exception $e) {
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
