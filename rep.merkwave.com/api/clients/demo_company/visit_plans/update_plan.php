<?php
// Enables strict error reporting
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Include your database connection and helper functions
require_once '../db_connect.php'; 

// --- Support JSON POST (for fetch/ajax requests) ---
if (
    isset($_SERVER['CONTENT_TYPE']) &&
    (stripos($_SERVER['CONTENT_TYPE'], 'application/json') !== false)
) {
    $json = file_get_contents('php://input');
    $_POST = json_decode($json, true) ?? [];
}

try {
    // Check for authorization
    

    // Handle users_uuid parameter from frontend
    $users_uuid = $_POST['users_uuid'] ?? null;
    $requesting_user_id = null;
    
    if ($users_uuid) {
        // Get user_id from users_uuid
        $uuid_stmt = $conn->prepare("SELECT users_id FROM users WHERE users_uuid = ?");
        if (!$uuid_stmt) {
            print_failure("Error: Database preparation failed for UUID lookup."); 
            exit;
        }
        $uuid_stmt->bind_param("s", $users_uuid);
        $uuid_stmt->execute();
        $uuid_result = $uuid_stmt->get_result();
        if ($uuid_result->num_rows > 0) {
            $uuid_row = $uuid_result->fetch_assoc();
            $requesting_user_id = $uuid_row['users_id'];
        }
        $uuid_stmt->close();
        
        if (!$requesting_user_id) {
            print_failure("Error: Invalid users_uuid provided."); 
            exit;
        }
    }

    // --- Collect and Sanitize POST Data ---
    // The visit plan ID is required for an update
    $visit_plan_id               = $_POST['visit_plan_id']               ?? null;
    $visit_plan_name             = $_POST['visit_plan_name']             ?? null;
    $visit_plan_description      = $_POST['visit_plan_description']      ?? null;
    $user_id                     = $_POST['user_id']                     ?? get_user_id_from_uuid_local($uuid);
    $visit_plan_status           = $_POST['visit_plan_status']           ?? 'Active';
    $visit_plan_start_date       = $_POST['visit_plan_start_date']       ?? null;
    $visit_plan_end_date         = $_POST['visit_plan_end_date']         ?? null;
    $visit_plan_recurrence_type  = $_POST['visit_plan_recurrence_type']  ?? 'Weekly';
    $visit_plan_selected_days    = $_POST['visit_plan_selected_days']    ?? null;
    $visit_plan_repeat_every     = $_POST['visit_plan_repeat_every']     ?? 1;

    // Handle empty strings for nullable fields (set to NULL if empty)
    foreach (['visit_plan_description', 'visit_plan_start_date', 'visit_plan_end_date', 'visit_plan_selected_days'] as $field) {
        if (isset($_POST[$field]) && $_POST[$field] === "") {
            $$field = null; 
        }
    }

    // Specific handling for numeric nullable fields if they come as empty string
    if (isset($_POST['user_id']) && $_POST['user_id'] === "") {$user_id = null;}
    if (isset($_POST['visit_plan_repeat_every']) && $_POST['visit_plan_repeat_every'] === "") {$visit_plan_repeat_every = 1;}

    // --- Separated Validation for Required Fields ---
    if (empty($visit_plan_id) || !is_numeric($visit_plan_id) || $visit_plan_id <= 0) {
        print_failure("Error: Valid Visit Plan ID is required."); 
        exit;
    }
    if (empty($visit_plan_name)) { 
        print_failure("Error: Visit plan name is required."); 
        exit; 
    }
    if (empty($user_id) || !is_numeric($user_id) || $user_id <= 0) {
        print_failure("Error: Valid User ID is required."); 
        exit;
    }
    if (!in_array($visit_plan_status, ['Active', 'Paused'])) {
        print_failure("Error: Invalid visit plan status."); 
        exit;
    }
    if (!in_array($visit_plan_recurrence_type, ['Weekly', 'Parts_of_week'])) {
        print_failure("Error: Invalid recurrence type."); 
        exit;
    }
    if (!is_numeric($visit_plan_repeat_every) || $visit_plan_repeat_every <= 0) {
        print_failure("Error: Valid repeat every value is required."); 
        exit;
    }

    // Validate dates if provided
    if ($visit_plan_start_date !== null && !DateTime::createFromFormat('Y-m-d', $visit_plan_start_date)) {
        print_failure("Error: Invalid start date format. Use YYYY-MM-DD."); 
        exit;
    }
    if ($visit_plan_end_date !== null && !DateTime::createFromFormat('Y-m-d', $visit_plan_end_date)) {
        print_failure("Error: Invalid end date format. Use YYYY-MM-DD."); 
        exit;
    }
    if ($visit_plan_start_date !== null && $visit_plan_end_date !== null && $visit_plan_start_date > $visit_plan_end_date) {
        print_failure("Error: End date must be after start date."); 
        exit;
    }

    // Validate selected days JSON if provided
    if ($visit_plan_selected_days !== null) {
        $decoded_days = json_decode($visit_plan_selected_days, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            print_failure("Error: Invalid JSON format for selected days."); 
            exit;
        }
        if (!is_array($decoded_days)) {
            print_failure("Error: Selected days must be an array."); 
            exit;
        }
        foreach ($decoded_days as $day) {
            if (!is_numeric($day) || $day < 1 || $day > 7) {
                print_failure("Error: Selected days must be numbers between 1-7 (1=Saturday, 7=Friday)."); 
                exit;
            }
        }
    }

    $conn->begin_transaction();

    try {
        // Check if visit plan exists
        $check_stmt = $conn->prepare("SELECT visit_plan_id FROM visit_plans WHERE visit_plan_id = ?");
        if (!$check_stmt) {
            throw new Exception("Prepare failed for existence check: " . $conn->error);
        }
        $check_stmt->bind_param("i", $visit_plan_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        if ($check_result->num_rows === 0) {
            print_failure("Error: Visit plan with ID " . $visit_plan_id . " not found.");
            exit;
        }
        $check_stmt->close();

        // Update visit plan
        $stmt = $conn->prepare("
            UPDATE visit_plans SET 
                visit_plan_name = ?, 
                visit_plan_description = ?, 
                user_id = ?, 
                visit_plan_status = ?, 
                visit_plan_start_date = ?, 
                visit_plan_end_date = ?, 
                visit_plan_recurrence_type = ?, 
                visit_plan_selected_days = ?, 
                visit_plan_repeat_every = ?, 
                visit_plan_updated_at = NOW()
            WHERE visit_plan_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }

        $stmt->bind_param("ssisssssii", 
            $visit_plan_name, $visit_plan_description, $user_id, $visit_plan_status, 
            $visit_plan_start_date, $visit_plan_end_date, $visit_plan_recurrence_type, 
            $visit_plan_selected_days, $visit_plan_repeat_every, $visit_plan_id
        );

        if (!$stmt->execute()) {
            throw new Exception("Error updating visit plan: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            print_failure("Error: No changes were made to the visit plan.");
            exit;
        }

        $conn->commit();
        print_success("Visit plan updated successfully.", [
            'visit_plan_id' => $visit_plan_id, 
            'visit_plan_name' => $visit_plan_name
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) { $stmt->close(); }
    if (isset($check_stmt) && $check_stmt !== false) { $check_stmt->close(); }
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
