<?php
// Enables strict error reporting
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once '../db_connect.php';

// Support JSON POST
if ($_SERVER['CONTENT_TYPE'] === 'application/json') {
    $input = file_get_contents('php://input');
    $jsonData = json_decode($input, true);
    if (is_array($jsonData)) {
        $_POST = array_merge($_POST, $jsonData);
    }
}

try {
    

    $visit_plan_id = $_POST['visit_plan_id'] ?? null;
    $client_ids = $_POST['client_ids'] ?? null; // Array or JSON string of client IDs

    if (empty($visit_plan_id) || !is_numeric($visit_plan_id) || $visit_plan_id <= 0) {
        print_failure("Error: Valid Visit Plan ID is required.");
        exit;
    }
    if (!isset($client_ids)) {
        print_failure("Error: Client IDs are required.");
        exit;
    }

    // Parse client IDs
    $client_ids_array = [];
    if (is_string($client_ids)) {
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

    // Validate each client ID
    foreach ($client_ids_array as $client_id) {
        if (!is_numeric($client_id) || $client_id <= 0) {
            print_failure("Error: All client IDs must be valid positive numbers.");
            exit;
        }
    }

    $conn->begin_transaction();
    try {
        // Check if visit plan exists
        $check_stmt = $conn->prepare("SELECT visit_plan_id FROM visit_plans WHERE visit_plan_id = ?");
        if (!$check_stmt) {
            throw new Exception("Prepare failed for visit plan check: " . $conn->error);
        }
        $check_stmt->bind_param("i", $visit_plan_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        if ($check_result->num_rows === 0) {
            print_failure("Error: Visit plan with ID " . $visit_plan_id . " not found.");
            exit;
        }
        $check_stmt->close();

        // Remove all current clients from this plan
        $remove_stmt = $conn->prepare("DELETE FROM visit_plan_clients WHERE visit_plan_id = ?");
        if (!$remove_stmt) {
            throw new Exception("Prepare failed for removing client associations: " . $conn->error);
        }
        $remove_stmt->bind_param("i", $visit_plan_id);
        $remove_stmt->execute();
        $remove_stmt->close();

        // Add new clients
        $added_count = 0;
        if (count($client_ids_array) > 0) {
            $client_stmt = $conn->prepare("INSERT IGNORE INTO visit_plan_clients (visit_plan_id, client_id, visit_plan_client_added_at) VALUES (?, ?, NOW())");
            if (!$client_stmt) {
                throw new Exception("Prepare failed for client associations: " . $conn->error);
            }
            foreach ($client_ids_array as $client_id) {
                $client_stmt->bind_param("ii", $visit_plan_id, $client_id);
                if ($client_stmt->execute() && $client_stmt->affected_rows > 0) {
                    $added_count++;
                }
            }
            $client_stmt->close();
        }
        $conn->commit();
        print_success("Assigned clients updated successfully.", [
            'visit_plan_id' => $visit_plan_id,
            'clients_assigned' => $added_count,
            'total_requested' => count($client_ids_array)
        ]);
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($check_stmt) && $check_stmt !== false) { $check_stmt->close(); }
    if (isset($remove_stmt) && $remove_stmt !== false) { $remove_stmt->close(); }
    if (isset($client_stmt) && $client_stmt !== false) { $client_stmt->close(); }
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
