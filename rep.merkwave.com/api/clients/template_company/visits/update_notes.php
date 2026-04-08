<?php
/**
 * visits/update_notes.php
 * API endpoint to update notes for an existing visit.
 *
 * This script allows a representative to add or modify notes associated with a specific visit.
 * It ensures that only the authorized representative can update notes for their visits.
 * All database operations are performed within a transaction to ensure data integrity.
 *
 * --- EXPECTED POST DATA ---
 * visit_id: [int] The ID of the visit to update.
 * notes: [string, optional] The new notes for the visit. Can be empty to clear notes.
 * users_uuid: [string] The UUID of the authenticated user (representative).
 * --------------------------
 */

// Enables strict error reporting
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Include your database connection and helper functions
require_once '../db_connect.php'; // Adjust path as necessary

try {
    // Authorization check
    

    // --- Collect and Sanitize POST Data ---
    $visit_id = $_POST['visit_id'] ?? null;
    $notes    = $_POST['notes']    ?? null;
    $users_uuid = $_POST['users_uuid'] ?? null; // Assuming user UUID is passed for authorization/filtering

    // Handle empty strings for nullable fields
    if ($notes === "") {$notes = null;}

    // --- Validation ---
    if (empty($visit_id) || !is_numeric($visit_id) || $visit_id <= 0) {
        print_failure("Error: Visit ID is required and must be a positive number."); exit;
    }
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required."); exit;
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            UPDATE visits v
            JOIN users u ON v.visits_rep_user_id = u.users_id
            SET
                v.visits_notes = ?,
                v.visits_updated_at = NOW()
            WHERE
                v.visits_id = ? AND u.users_uuid = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }

        // Use 'sis' for string (notes), integer (visit_id), string (users_uuid)
        $stmt->bind_param("sis",
            $notes,
            $visit_id,
            $users_uuid
        );

        if (!$stmt->execute()) {
            throw new Exception("Error updating visit notes: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: No visit found with ID $visit_id for the authorized user, or notes were not changed."); exit;
        }

        $conn->commit();
        print_success("Visit notes updated successfully.", ['visit_id' => $visit_id, 'notes' => $notes]);

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
