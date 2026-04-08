<?php
/**
 * visits/get_details.php
 * API endpoint to retrieve details of a single visit.
 *
 * This script fetches comprehensive details for a specific visit ID.
 * It includes denormalized client and representative names for easier display
 * in the mobile application. Authorization ensures only visits relevant to
 * the authenticated representative are returned.
 *
 * --- EXPECTED GET DATA ---
 * visit_id: [int] The ID of the specific visit to retrieve.
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
    $visit_id = $_GET['visit_id'] ?? null;
    $users_uuid = $_GET['users_uuid'] ?? null; // Assuming user UUID is passed for authorization/filtering

    // --- Validation ---
    if (empty($visit_id) || !is_numeric($visit_id) || $visit_id <= 0) {
        print_failure("Error: Visit ID is required."); exit;
    }
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required."); exit;
    }

    // Fetch details for a specific visit
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
            v.visits_id = ?
            AND u.users_uuid = ? -- Ensure only visits for the authorized rep are fetched
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("is", $visit_id, $users_uuid);
    $stmt->execute();
    $result = $stmt->get_result();
    $visit_data = $result->fetch_assoc();
    $stmt->close();

    if ($visit_data) {
        print_success("Visit details retrieved successfully.", $visit_data);
    } else {
        print_failure("Error: Visit not found or you do not have permission to view it.");
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
