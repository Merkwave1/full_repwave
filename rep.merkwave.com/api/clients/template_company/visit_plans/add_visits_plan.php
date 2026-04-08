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
    // Check for authorization (e.g., admin IP)
    

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
    $visit_plan_name              = $_POST['visit_plan_name']              ?? null;
    $visit_plan_description       = $_POST['visit_plan_description']       ?? null;
    $user_id                      = $_POST['user_id']                      ?? $requesting_user_id ?? get_user_id_from_uuid_local();
    $visit_plan_status            = $_POST['visit_plan_status']            ?? 'Active';
    $visit_plan_start_date        = $_POST['visit_plan_start_date']        ?? null;
    $visit_plan_end_date          = $_POST['visit_plan_end_date']          ?? null;
    $visit_plan_recurrence_type   = $_POST['visit_plan_recurrence_type']   ?? 'Weekly';
    $visit_plan_selected_days     = $_POST['visit_plan_selected_days']     ?? null;
    $visit_plan_repeat_every      = $_POST['visit_plan_repeat_every']      ?? 1;
    $client_ids                   = $_POST['client_ids']                   ?? null; // Array of client IDs

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
    if (!in_array($visit_plan_recurrence_type, ['Weekly'])) {
        print_failure("Error: Invalid recurrence type. Only 'Weekly' is supported."); 
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
        if (empty($decoded_days)) {
            print_failure("Error: At least one day must be selected when specifying selected days."); 
            exit;
        }
        foreach ($decoded_days as $day) {
            if (!is_numeric($day) || $day < 1 || $day > 7) {
                print_failure("Error: Selected days must be numbers between 1-7 (1=Saturday, 7=Friday)."); 
                exit;
            }
        }
    }

    // Validate user exists
    $user_check_stmt = $conn->prepare("SELECT users_id FROM users WHERE users_id = ?");
    if (!$user_check_stmt) {
        print_failure("Error: Database preparation failed for user validation."); 
        exit;
    }
    $user_check_stmt->bind_param("i", $user_id);
    $user_check_stmt->execute();
    $user_result = $user_check_stmt->get_result();
    if ($user_result->num_rows === 0) {
        $user_check_stmt->close();
        print_failure("Error: User ID does not exist."); 
        exit;
    }
    $user_check_stmt->close();

    // Validate client IDs if provided
    $client_ids_array = [];
    if ($client_ids !== null) {
        if (is_string($client_ids)) {
            // If it's a JSON string, decode it
            $client_ids_array = json_decode($client_ids, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                print_failure("Error: Invalid JSON format for client IDs."); 
                exit;
            }
        } elseif (is_array($client_ids)) {
            $client_ids_array = $client_ids;
        } else {
            print_failure("Error: Client IDs must be an array or JSON string."); 
            exit;
        }

        // Validate each client ID exists in database
        if (!empty($client_ids_array)) {
            $placeholders = str_repeat('?,', count($client_ids_array) - 1) . '?';
            $client_check_stmt = $conn->prepare("SELECT clients_id FROM clients WHERE clients_id IN ($placeholders)");
            if (!$client_check_stmt) {
                print_failure("Error: Database preparation failed for client validation."); 
                exit;
            }
            
            $types = str_repeat('i', count($client_ids_array));
            $client_check_stmt->bind_param($types, ...$client_ids_array);
            $client_check_stmt->execute();
            $client_result = $client_check_stmt->get_result();
            
            $existing_clients = [];
            while ($row = $client_result->fetch_assoc()) {
                $existing_clients[] = $row['clients_id'];
            }
            $client_check_stmt->close();
            
            $missing_clients = array_diff($client_ids_array, $existing_clients);
            if (!empty($missing_clients)) {
                print_failure("Error: The following client IDs do not exist: " . implode(', ', $missing_clients)); 
                exit;
            }
        }
    }

    // Check for duplicate visit plan name for the same user
    $duplicate_check_stmt = $conn->prepare("SELECT visit_plan_id FROM visit_plans WHERE visit_plan_name = ? AND user_id = ?");
    if (!$duplicate_check_stmt) {
        print_failure("Error: Database preparation failed for duplicate check."); 
        exit;
    }
    $duplicate_check_stmt->bind_param("si", $visit_plan_name, $user_id);
    $duplicate_check_stmt->execute();
    $duplicate_result = $duplicate_check_stmt->get_result();
    if ($duplicate_result->num_rows > 0) {
        $duplicate_check_stmt->close();
        print_failure("Error: A visit plan with this name already exists for this user."); 
        exit;
    }
    $duplicate_check_stmt->close();

    $conn->begin_transaction();

    try {
        // Insert visit plan
        $stmt = $conn->prepare("
            INSERT INTO visit_plans (
                visit_plan_name, visit_plan_description, user_id, visit_plan_status, 
                visit_plan_start_date, visit_plan_end_date, visit_plan_recurrence_type, 
                visit_plan_selected_days, visit_plan_repeat_every, visit_plan_created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }

        $stmt->bind_param("ssisssssi", 
            $visit_plan_name, $visit_plan_description, $user_id, $visit_plan_status, 
            $visit_plan_start_date, $visit_plan_end_date, $visit_plan_recurrence_type, 
            $visit_plan_selected_days, $visit_plan_repeat_every
        );

        if (!$stmt->execute()) {
            $error_message = $stmt->error;
            if (strpos($error_message, 'Duplicate entry') !== false) {
                throw new Exception("A visit plan with this name already exists for this user.");
            } elseif (strpos($error_message, 'foreign key constraint') !== false) {
                throw new Exception("Invalid user ID provided.");
            } else {
                throw new Exception("Error inserting visit plan: " . $error_message);
            }
        }

        $new_visit_plan_id = $stmt->insert_id;
        $stmt->close();

        // Insert client associations if provided
        if (!empty($client_ids_array)) {
            $client_stmt = $conn->prepare("
                INSERT INTO visit_plan_clients (visit_plan_id, client_id, visit_plan_client_added_at) 
                VALUES (?, ?, NOW())
            ");

            if (!$client_stmt) {
                throw new Exception("Prepare failed for client associations: " . $conn->error);
            }

            foreach ($client_ids_array as $client_id) {
                $client_stmt->bind_param("ii", $new_visit_plan_id, $client_id);
                if (!$client_stmt->execute()) {
                    $error_message = $client_stmt->error;
                    if (strpos($error_message, 'Duplicate entry') !== false) {
                        throw new Exception("Client ID $client_id is already associated with this visit plan.");
                    } elseif (strpos($error_message, 'foreign key constraint') !== false) {
                        throw new Exception("Invalid client ID: $client_id does not exist.");
                    } else {
                        throw new Exception("Error inserting client association for client ID $client_id: " . $error_message);
                    }
                }
            }
            $client_stmt->close();
        }

        $conn->commit();
        print_success("Visit plan created successfully.", [
            'visit_plan_id' => $new_visit_plan_id, 
            'visit_plan_name' => $visit_plan_name,
            'clients_added' => count($client_ids_array)
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) { $stmt->close(); }
    if (isset($client_stmt) && $client_stmt !== false) { $client_stmt->close(); }
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
