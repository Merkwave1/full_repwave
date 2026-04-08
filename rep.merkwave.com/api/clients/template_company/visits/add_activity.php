<?php
// File: /visits/add_activity.php
// Description: Logs a new activity for a specific visit, including photo uploads.

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // --- INPUT GATHERING ---
    $visit_id = $_POST['visit_id'] ?? null;
    $users_uuid = $_POST['users_uuid'] ?? null;
    $activity_type = $_POST['activity_type'] ?? null;
    $reference_id = $_POST['reference_id'] ?? null;
    $description = $_POST['description'] ?? null;

    // --- VALIDATION ---
    if (empty($visit_id) || !is_numeric($visit_id)) print_failure("Error: Valid Visit ID is required.");
    if (empty($users_uuid)) print_failure("Error: User UUID is required.");
    if (empty($activity_type)) print_failure("Error: Activity Type is required.");
    
    // Get user ID from UUID
    $user_id = get_user_id_from_uuid_local($users_uuid);
    if (!$user_id) {
        print_failure("Error: Invalid user UUID.");
    }
    
    $allowed_types = ['SalesOrder_Created', 'SalesInvoice_Created', 'Payment_Collected', 'Return_Initiated', 'Document_Uploaded', 'Photo_Before', 'Photo_After', 'Client_Note_Added', 'Customer_Support'];
    if (!in_array($activity_type, $allowed_types)) {
        print_failure("Error: Invalid Activity Type provided.");
    }
    
    // --- SPECIAL HANDLING FOR PHOTO UPLOADS ---
    if ($activity_type === 'Photo_Before' || $activity_type === 'Photo_After') {
        if (isset($_FILES['photo_file']) && $_FILES['photo_file']['error'] === UPLOAD_ERR_OK) {
            // Use the handle_file_upload function from your functions.php
            // The subdirectory 'visits/' will be created inside your main 'uploads/' directory.
            $uploaded_file_url = handle_file_upload($_FILES['photo_file'], 'visits/');
            if ($uploaded_file_url) {
                // For photos, we store the URL in the description field.
                $description = $uploaded_file_url;
                // reference_id is not needed for this specific activity type.
                $reference_id = null;
            } else {
                print_failure("Error: Photo file upload failed.");
            }
        } else {
            print_failure("Error: A photo file is required for this activity type.");
        }
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare(
            "INSERT INTO visit_activities (activity_visit_id, activity_user_id, activity_type, activity_reference_id, activity_description, activity_timestamp) VALUES (?, ?, ?, ?, ?, NOW())"
        );
        $stmt->bind_param("iisis", $visit_id, $user_id, $activity_type, $reference_id, $description);
        $stmt->execute();
        $new_activity_id = $stmt->insert_id;
        $stmt->close();

        $conn->commit();
        print_success("Visit activity logged successfully.", ['activity_id' => $new_activity_id]);

    } catch (Exception | TypeError $e) {
        $conn->rollback();
        print_failure($e->getMessage());
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
