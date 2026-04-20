<?php
/**
 * visits/get_client_visits.php
 * API endpoint to retrieve all visits for a specific client.
 *
 * This script fetches a list of all visits associated with a given client ID.
 * It includes denormalized client and representative names for easier display
 * in the mobile application. Results are ordered by start time in descending order.
 * Authorization ensures only visits relevant to the authenticated representative are returned.
 *
 * --- EXPECTED GET DATA ---
 * client_id: [int] The ID of the client whose visits are to be retrieved.
 * users_uuid: [string] The UUID of the authenticated user (representative) for authorization.
 * --------------------------
 */

// Enables strict error reporting
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Include your database connection and helper functions
require_once '../db_connect.php'; // Adjust path as necessary

try {
    // Authorization check
    

    // --- Collect and Sanitize GET Data ---
    $client_id = $_GET['client_id'] ?? null;
    $users_uuid = $_GET['users_uuid'] ?? null; // Assuming user UUID is passed for authorization/filtering

    // --- Validation ---
    if (empty($client_id) || !is_numeric($client_id) || $client_id <= 0) {
        print_failure("Error: Client ID is required."); exit;
    }
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required."); exit;
    }

    // Fetch visits for the given client_id, optionally filtered by representative
    // Joining with clients and users to get denormalized names for the Flutter app
    $stmt = $conn->prepare("
        SELECT
            v.visits_id,
            v.visits_client_id,
            c.clients_company_name AS client_name, -- Denormalized client name
            v.visits_rep_user_id,
            u.users_name AS rep_user_name, -- Denormalized representative name
            v.visits_start_time,
            v.visits_end_time,
            v.visits_start_latitude,
            v.visits_start_longitude,
            v.visits_end_latitude,
            v.visits_end_longitude,
            v.visits_status,
            v.visits_notes,
            v.visits_created_at,
            v.visits_updated_at
        FROM
            visits v
        JOIN
            clients c ON v.visits_client_id = c.clients_id
        JOIN
            users u ON v.visits_rep_user_id = u.users_id
        WHERE
            v.visits_client_id = ?
            AND u.users_uuid = ? -- Ensure only visits for the authorized rep are fetched, or remove if not needed
        ORDER BY
            v.visits_start_time DESC
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("is", $client_id, $users_uuid);
    $stmt->execute();
    $result = $stmt->get_result();
    $visits = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    print_success("Client visits retrieved successfully.", ['data' => $visits]); // Wrap in 'data' key as expected by Flutter
} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
