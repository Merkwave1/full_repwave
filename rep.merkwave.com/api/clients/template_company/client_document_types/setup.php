<?php
// This is a one-time setup script to insert default document types
require_once '../db_connect.php';
header('Content-Type: application/json');

try {
    //  // Comment out for setup script

    // Insert default document types
    $documentTypes = [
        ['Photos', 'Client photos and images'],
        ['Documents', 'General documents and files'],
        ['Contracts', 'Contracts and agreements'],
        ['Invoices', 'Invoice documents'],
        ['Visit Reports', 'Visit-related documents']
    ];

    $insertedTypes = [];
    
    foreach ($documentTypes as $typeData) {
        list($name, $description) = $typeData;
        
        // Check if type already exists
        $checkStmt = $conn->prepare("SELECT document_type_id FROM client_document_types WHERE document_type_name = ?");
        $checkStmt->bind_param("s", $name);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        
        if ($result->num_rows == 0) {
            // Insert new type
            $insertStmt = $conn->prepare("INSERT INTO client_document_types (document_type_name, document_type_description) VALUES (?, ?)");
            $insertStmt->bind_param("ss", $name, $description);
            $insertStmt->execute();
            $typeId = $insertStmt->insert_id;
            $insertStmt->close();
            
            $insertedTypes[] = [
                'id' => $typeId,
                'name' => $name,
                'description' => $description
            ];
        } else {
            $row = $result->fetch_assoc();
            $insertedTypes[] = [
                'id' => $row['document_type_id'],
                'name' => $name,
                'description' => $description,
                'status' => 'already_exists'
            ];
        }
        
        $checkStmt->close();
    }

    print_success("Document types setup completed.", $insertedTypes);

} catch (Exception | TypeError $e) {
    print_failure("Setup Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
