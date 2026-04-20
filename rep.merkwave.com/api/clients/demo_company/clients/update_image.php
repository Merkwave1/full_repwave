<?php
// Enables strict error reporting
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Include your database connection and helper functions
require_once '../db_connect.php'; 

try {
    // Check for authorization
    

    // --- Collect and Sanitize POST Data ---
    // The client ID is required
    $clients_id = $_POST['clients_id'] ?? null;

    // --- Validation for Required Fields ---
    if (empty($clients_id) || !is_numeric($clients_id) || $clients_id <= 0) {
        print_failure("Error: A valid Client ID is required.");
        exit;
    }

    // Verify the client exists
    $stmt_chk = $conn->prepare("SELECT clients_id FROM clients WHERE clients_id = ?");
    $stmt_chk->bind_param("i", $clients_id);
    $stmt_chk->execute();
    $res_chk = $stmt_chk->get_result();
    $row_chk = $res_chk->fetch_assoc();
    $stmt_chk->close();
    
    if (!$row_chk) {
        print_failure('Error: Client does not exist.');
        exit;
    }

    // --- Image Upload Handling ---
    if (!isset($_FILES['clients_image'])) {
        print_failure("Error: No image file provided.");
        exit;
    }

    // Handle the image upload
    $clients_image_db_path = handle_image_upload($_FILES['clients_image'], 'clients/');
    
    if (!$clients_image_db_path) {
        print_failure("Error: Failed to upload image.");
        exit;
    }

    // Construct the full URL for the image
    $clients_image = "https://your-domain.example/{$clients_image_db_path}";

    $conn->begin_transaction();

    try {
        // Update only the image field
        $sql = "UPDATE clients SET 
                    clients_image = ?,
                    clients_updated_at = NOW()
                WHERE clients_id = ?";
        
        $stmt = $conn->prepare($sql);

        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }

        $stmt->bind_param("si", $clients_image, $clients_id);

        if (!$stmt->execute()) {
            throw new Exception("Error updating client image: " . $stmt->error);
        }

        $conn->commit();
        
        // Return success with the image URL
        print_success("Client image updated successfully.", [
            'clients_id' => (int)$clients_id,
            'clients_image' => $clients_image
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
