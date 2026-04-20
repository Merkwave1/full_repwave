<?php

require_once '../db_connect.php';

// Set mysqli to throw exceptions on error
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // It's good practice to have a function that verifies the request source
     // Assuming this function exists and works correctly

    // --- Input Gathering ---
    $users_id          = $_POST['users_id']          ?? null;
    $users_name        = $_POST['users_name']        ?? null;
    $users_email       = $_POST['users_email']       ?? null;
    $users_password    = $_POST['users_password']    ?? null;
    $users_role        = $_POST['users_role']        ?? null;
    $users_phone       = $_POST['users_phone']       ?? null;
    $users_national_id = $_POST['users_national_id'] ?? null;
    $users_status      = $_POST['users_status']      ?? 1; // Default to active

    // Handle empty strings for nullable fields to ensure they are stored as NULL
    if ($users_phone === "") {
        $users_phone = null;
    }
    if ($users_national_id === "") {
        $users_national_id = null;
    }

    // --- Image Upload Handling ---
    $users_image_db_path = null;
    if (isset($_FILES['users_image']) && $_FILES['users_image']['error'] == UPLOAD_ERR_OK) {
        try {
            // Assuming handle_image_upload is a custom function you've defined elsewhere
            $users_image_db_path = handle_image_upload($_FILES['users_image'], '');
        } catch (Exception $e) {
            print_failure("Image Upload Error: " . $e->getMessage());
            exit; // Stop execution if image upload fails
        }
    }
    // Only build the full URL if an image was successfully uploaded
    $users_image = $users_image_db_path ? "https://your-domain.example/" . $users_image_db_path : null;

    // --- Basic Validation ---
    if (!empty($users_id) && (!is_numeric($users_id) || $users_id <= 0)) {
        print_failure("Error: User ID must be a positive number if provided.");
        exit;
    }
    if (empty($users_name)) {
        print_failure("Error: User name is required.");
        exit;
    }
    if (empty($users_email) || !filter_var($users_email, FILTER_VALIDATE_EMAIL)) {
        print_failure("Error: Valid user email is required.");
        exit;
    }
    if (empty($users_password)) {
        print_failure("Error: Password is required.");
        exit;
    }
    if (empty($users_role)) {
        print_failure("Error: User role is required.");
        exit;
    }
    if ($users_status !== null && !in_array((int)$users_status, [0, 1])) {
        print_failure("Error: Invalid user status. Must be 0 (inactive) or 1 (active).");
        exit;
    }

    // --- User Limit Check ---
    // Prepare statement to get the user limit from settings
    $stmt_limit = $conn->prepare("
        SELECT settings_value
        FROM settings
        WHERE settings_key = 'users_limits' -- CORRECTED: Was 'users_limit'
        LIMIT 1
    ");
    if (!$stmt_limit) {
        throw new Exception("Prepare failed for user limit check: " . $conn->error);
    }
    $stmt_limit->execute();
    $result_limit = $stmt_limit->get_result();

    // Default to a very high limit if the setting is not found, to prevent locking out user creation by mistake.
    $user_limit = PHP_INT_MAX;
    if ($result_limit->num_rows > 0) {
        $row_limit = $result_limit->fetch_assoc();
        $user_limit = (int)$row_limit['settings_value'];
    }
    $stmt_limit->close();

    // Count current users in the database
    $stmt_count = $conn->prepare("SELECT COUNT(*) AS user_count FROM users");
    if (!$stmt_count) {
        throw new Exception("Prepare failed for user count query: " . $conn->error);
    }
    $stmt_count->execute();
    $result_count = $stmt_count->get_result();
    $row_count = $result_count->fetch_assoc();
    $current_users = (int)$row_count['user_count'];
    $stmt_count->close();

    // Compare current user count against the limit
    if ($current_users >= $user_limit) {
        print_failure("Error: User limit has been reached (" . $user_limit . " users). Cannot add more users.");
        exit; // This is crucial. It stops the script from proceeding.
    }
    // --- End User Limit Check ---

    // Hash the password for security
    $hashed_password = password_hash($users_password, PASSWORD_DEFAULT);

    // Use a transaction for atomicity: either the user is created or nothing is.
    $conn->begin_transaction();

    try {
        // Dynamically build the INSERT query based on whether users_id is provided
        $sql = "INSERT INTO users (users_name, users_email, users_password, users_role, users_phone, users_national_id, users_status, users_image";
        $values = "?, ?, ?, ?, ?, ?, ?, ?";
        $bind_types = "ssssssis";
        $bind_params = [
            $users_name, $users_email, $hashed_password, $users_role,
            $users_phone, $users_national_id, $users_status, $users_image
        ];

        if (!empty($users_id)) {
            $sql .= ", users_id";
            $values .= ", ?";
            $bind_types .= "i"; // Append 'i' for users_id
            $bind_params[] = $users_id; // Append users_id to params
        }

        $sql .= ") VALUES (" . $values . ")";

        $stmt = $conn->prepare($sql);

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        // Use the splat operator (...) for a cleaner way to pass array parameters to bind_param
        $stmt->bind_param($bind_types, ...$bind_params);

        if (!$stmt->execute()) {
            throw new Exception("Error inserting user: " . $stmt->error);
        }

        $new_user_id = !empty($users_id) ? $users_id : $stmt->insert_id;
        $conn->commit();
        print_success("User created successfully.", ['users_id' => $new_user_id, 'users_name' => $users_name]);

    } catch (Exception $e) {
        $conn->rollback(); // Roll back the transaction on failure
        // Check for duplicate entry error
        if ($conn->errno == 1062) { // 1062 is the MySQL error code for duplicate entry
            print_failure("Error: A user with this email or national ID already exists.");
        } else {
            print_failure($e->getMessage());
        }
    }

} catch (Exception | TypeError $e) {
    // Catch any other errors that might occur outside the main try block
    print_failure("Internal Script Error: " . $e->getMessage());
} finally {
    // Always close the connection
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}

// Helper functions (assuming they are defined elsewhere, like db_connect.php)
/*
function print_failure($message) {
    echo json_encode(['status' => 'failure', 'message' => $message]);
}

function print_success($message, $data = []) {
    echo json_encode(['status' => 'success', 'message' => $message, 'data' => $data]);
}
*/
?>
