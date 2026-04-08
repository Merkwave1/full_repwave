<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
     // Only admin can update users

    $users_id           = $_POST['users_id']           ?? null;
    $users_name         = $_POST['users_name']         ?? null;
    $users_email        = $_POST['users_email']        ?? null;
    $users_password     = $_POST['users_password']     ?? null; // Optional: for password change
    $users_role         = $_POST['users_role']         ?? null;
    $users_phone        = $_POST['users_phone']        ?? null;
    $users_national_id  = $_POST['users_national_id']  ?? null;
    $users_status       = $_POST['users_status']       ?? null;

    // Handle empty strings for nullable fields
    if (array_key_exists('users_phone', $_POST) && $_POST['users_phone'] === "") {$users_phone = null;}
    if (array_key_exists('users_national_id', $_POST) && $_POST['users_national_id'] === "") {$users_national_id = null;}

    if (empty($users_id) || !is_numeric($users_id) || $users_id <= 0) {
        print_failure("Error: Valid User ID is required for update.");
    }

    $update_fields = [];
    $bind_types = "";
    $bind_params = [];

    // --- Image Upload Handling ---
    $users_image = null; // Initialize to null
    if (isset($_FILES['users_image'])) {
        try {
            $users_image_db_path = handle_image_upload($_FILES['users_image'], '');
            $users_image = "https://your-domain.example/" . $users_image_db_path; // Full URL
            $update_fields[] = "users_image = ?";
            $bind_types .= "s";
            $bind_params[] = &$users_image;
        } catch (Exception $e) {
            print_failure("Image Upload Error: " . $e->getMessage());
        }
    } else if (array_key_exists('users_image', $_POST) && $_POST['users_image'] === "") {
        // If users_image is explicitly sent as an empty string, it means clear the image
        $users_image = null;
        $update_fields[] = "users_image = ?";
        $bind_types .= "s";
        $bind_params[] = &$users_image;
    }


    if (!empty($users_name)) {
        $update_fields[] = "users_name = ?";
        $bind_types .= "s";
        $bind_params[] = $users_name;
    }

    if (!empty($users_email)) {
        if (!filter_var($users_email, FILTER_VALIDATE_EMAIL)) {
            print_failure("Error: Invalid email format.");
        }
        $update_fields[] = "users_email = ?";
        $bind_types .= "s";
        $bind_params[] = $users_email;
    } else if (isset($_POST['users_email']) && $_POST['users_email'] === '') {
        print_failure("Error: User email cannot be empty.");
    }

    if (!empty($users_password)) {
        $hashed_password = password_hash($users_password, PASSWORD_DEFAULT);
        $update_fields[] = "users_password = ?";
        $bind_types .= "s";
        $bind_params[] = $hashed_password;
    }

    if (!empty($users_role)) {
        $update_fields[] = "users_role = ?";
        $bind_types .= "s";
        $bind_params[] = $users_role;
    } else if (isset($_POST['users_role']) && $_POST['users_role'] === '') {
        print_failure("Error: User role cannot be empty.");
    }

    if (!empty($users_companies_name)) {
        $update_fields[] = "users_companies_name = ?";
        $bind_types .= "s";
        $bind_params[] = $users_companies_name;
    } else if (isset($_POST['users_companies_name']) && $_POST['users_companies_name'] === '') {
        print_failure("Error: Company name cannot be empty.");
    }

    if (array_key_exists('users_phone', $_POST)) {
        $update_fields[] = "users_phone = ?";
        $bind_types .= "s";
        $bind_params[] = $users_phone;
    }

    if (array_key_exists('users_national_id', $_POST)) {
        $update_fields[] = "users_national_id = ?";
        $bind_types .= "s";
        $bind_params[] = $users_national_id;
    }

    if (isset($users_status) && in_array((int)$users_status, [0, 1])) {
        $update_fields[] = "users_status = ?";
        $bind_types .= "i";
        $bind_params[] = (int)$users_status;
    } else if (isset($_POST['users_status']) && ($users_status === '' || !in_array((int)$users_status, [0, 1]))) {
        print_failure("Error: Invalid user status. Must be 0 or 1.");
    }

    if (empty($update_fields)) {
        print_failure("Error: No valid fields provided for update.");
    }

    $sql = "UPDATE users SET " . implode(", ", $update_fields) . ", users_updated_at = NOW() WHERE users_id = ?";
    $bind_types .= "i"; 
    $bind_params[] = $users_id;

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("Prepare failed for update: " . $conn->error);
    }

    $stmt->bind_param($bind_types, ...$bind_params);

    $conn->begin_transaction();

    try {
        if (!$stmt->execute()) {
            throw new Exception("Error updating user: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: User with ID " . $users_id . " not found or no changes were made.");
        }

    $conn->commit();
        print_success("User updated successfully.", ['users_id' => $users_id]);

    } catch (Exception $e) {
        $conn->rollback();
        print_failure("Internal Error: " . $e->getMessage());
    }

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
