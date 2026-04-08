<?php
// Enables strict error reporting
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Include your database connection and helper functions
require_once '../db_connect.php'; // Adjusted path

try {
    

    // --- Collect and Sanitize POST Data ---

    
        
    $uuid = $_POST['uuid'] ?? null;
    $user_id = get_user_id_from_uuid_local($uuid) ?? null;


    $client_document_client_id          = $_POST['client_document_client_id']         ?? null;
    $client_document_type_id            = $_POST['client_document_type_id']           ?? null;
    $client_document_title              = $_POST['client_document_title']             ?? null;
    $client_document_notes              = $_POST['client_document_notes']             ?? null;
    $client_document_uploaded_by_user_id = $_POST['client_document_uploaded_by_user_id'] ?? get_user_id_from_uuid_local($uuid);
    $client_documents_visit_id          = $_POST['client_documents_visit_id']         ?? null; // NEW: Link to visit

    // Handle empty strings for nullable fields (set to NULL if empty)
    foreach (['client_document_notes', 'client_documents_visit_id'] as $field) {
        if (isset($_POST[$field]) && $_POST[$field] === "") {
            $$field = null;
        }
    }
    // Specific handling for numeric nullable fields if they come as empty string
    if (isset($_POST['client_document_type_id']) && $_POST['client_document_type_id'] === "") {$client_document_type_id = null;}
    if (isset($_POST['client_document_client_id']) && $_POST['client_document_client_id'] === "") {$client_document_client_id = null;}
    if (isset($_POST['client_document_uploaded_by_user_id']) && $_POST['client_document_uploaded_by_user_id'] === "") {$client_document_uploaded_by_user_id = null;}


    // --- Validation for Required Fields ---
    if (empty($client_document_client_id) || !is_numeric($client_document_client_id) || $client_document_client_id <= 0) {
        print_failure("Error: Client ID is required and must be a positive number."); exit;
    }
    if (empty($client_document_type_id) || !is_numeric($client_document_type_id) || $client_document_type_id <= 0) {
        print_failure("Error: Document Type is required and must be a positive number."); exit;
    }
    if (empty($client_document_title)) {
        print_failure("Error: Document title is required."); exit;
    }
    if (empty($client_document_uploaded_by_user_id) || !is_numeric($client_document_uploaded_by_user_id) || $client_document_uploaded_by_user_id <= 0) {
        print_failure("Error: Uploader User ID is required and must be a positive number."); exit;
    }

    // --- File Upload Handling ---
    $client_document_file_path = null;
    $client_document_file_mime_type = null;
    $client_document_file_size_kb = null;

    if (isset($_FILES['document_file']) && $_FILES['document_file']['error'] === UPLOAD_ERR_OK) {
        // Define allowed types (adjust as needed for your document types)
        $allowed_types = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain'
        ];
        // Define max size (e.g., 10MB for documents, adjust as needed)
        $max_size = 10 * 1024 * 1024; // 10MB

        // Call the new handle_file_upload function with 'documents/client/'
        $uploaded_file_url = handle_file_upload($_FILES['document_file'], 'documents/client/', $allowed_types, $max_size);
        
        if ($uploaded_file_url) {
            $client_document_file_path = $uploaded_file_url; // This is the full web-accessible URL
            $client_document_file_mime_type = mime_content_type($_FILES['document_file']['tmp_name']);
            $client_document_file_size_kb = round($_FILES['document_file']['size'] / 1024, 2);
        } else {
            print_failure("Error: Document file upload failed or no file provided."); exit;
        }
    } else {
        // If no file is provided, it might be an error or an optional field.
        // For documents, usually a file is required.
        print_failure("Error: Document file is required."); exit;
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            INSERT INTO client_documents (
                client_document_client_id, client_document_type_id, client_document_title, 
                client_document_file_path, client_document_file_mime_type, client_document_file_size_kb, 
                client_document_uploaded_by_user_id, client_document_notes, client_documents_visit_id, client_document_created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }

        $stmt->bind_param("iisssdisi",
            $client_document_client_id,
            $client_document_type_id,
            $client_document_title,
            $client_document_file_path,
            $client_document_file_mime_type,
            $client_document_file_size_kb,
            $client_document_uploaded_by_user_id,
            $client_document_notes,
            $client_documents_visit_id
        );

        if (!$stmt->execute()) {
            throw new Exception("Error inserting client document: " . $stmt->error);
        }

        $new_document_id = $stmt->insert_id;
        
        // If this document is linked to a visit, create a visit activity
        if ($client_documents_visit_id && is_numeric($client_documents_visit_id) && $client_documents_visit_id > 0) {
            // Determine the correct activity type based on document type
            $activity_type = 'Document_Uploaded'; // default
            
            // Map document types to activity types
            switch ($client_document_type_id) {
                case 1: // Photos - determine if Before or After based on title
                    if (stripos($client_document_title, 'before') !== false) {
                        $activity_type = 'Photo_Before';
                    } else if (stripos($client_document_title, 'after') !== false) {
                        $activity_type = 'Photo_After';
                    } else {
                        $activity_type = 'Document_Uploaded'; // fallback for other photos
                    }
                    break;
                case 2: // Documents
                case 3: // Contracts
                case 4: // Invoices
                case 5: // Visit Reports
                default:
                    $activity_type = 'Document_Uploaded';
                    break;
            }
            
            $activity_stmt = $conn->prepare("
                INSERT INTO visit_activities (
                    activity_visit_id, 
                    activity_user_id, 
                    activity_type, 
                    activity_reference_id, 
                    activity_description, 
                    activity_timestamp
                ) VALUES (?, ?, ?, ?, ?, NOW())
            ");
            
            if (!$activity_stmt) {
                throw new Exception("Prepare failed for visit activity: " . $conn->error);
            }
            
            $activity_description = "Uploaded document: " . $client_document_title;
            $activity_stmt->bind_param("iisis", 
                $client_documents_visit_id,
                $client_document_uploaded_by_user_id,
                $activity_type,
                $new_document_id,
                $activity_description
            );
            
            if (!$activity_stmt->execute()) {
                throw new Exception("Error inserting visit activity: " . $activity_stmt->error);
            }
            
            $activity_stmt->close();
        }
        
        $conn->commit();
        print_success("Client document added successfully.", [
            'client_document_id' => $new_document_id,
            'client_document_title' => $client_document_title,
            'client_document_file_path' => $client_document_file_path // Return the full URL
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) { $stmt->close(); }
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
