<?php
// File: /visits/end.php
// Description: Concludes an active visit.

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // --- INPUT GATHERING ---
    $visit_id = $_POST['visit_id'] ?? null;
    $users_uuid = $_POST['users_uuid'] ?? null;
    $end_latitude = $_POST['latitude'] ?? null;
    $end_longitude = $_POST['longitude'] ?? null;
    $outcome = $_POST['outcome'] ?? null;
    $notes = $_POST['notes'] ?? null;

    // --- VALIDATION ---
    if (empty($visit_id) || !is_numeric($visit_id) || $visit_id <= 0) {
        print_failure("Error: A valid Visit ID is required.");
    }
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }
    if (empty($outcome)) {
        print_failure("Error: An outcome for the visit is required.");
    }

    // Get user ID from UUID
    $rep_user_id = get_user_id_from_uuid_local($users_uuid);
    if (!$rep_user_id) {
        print_failure("Error: Invalid user UUID.");
    }

    $conn->begin_transaction();

    try {
        // --- Find the active visit to ensure it can be ended ---
        $stmt = $conn->prepare("SELECT visits_id, visits_client_id FROM visits WHERE visits_id = ? AND visits_rep_user_id = ? AND visits_status = 'Started' FOR UPDATE");
        $stmt->bind_param("ii", $visit_id, $rep_user_id);
        $stmt->execute();
        $visit_result = $stmt->get_result();
        if ($visit_result->num_rows === 0) {
            throw new Exception("No active visit found for this ID and representative, or it has already been completed.");
        }
        $visit_data = $visit_result->fetch_assoc();
        $client_id = $visit_data['visits_client_id'];
        $stmt->close();

        // --- GET REPRESENTATIVE SETTINGS ---
        $settings_stmt = $conn->prepare(
            "SELECT allow_end_visit_from_anywhere FROM representative_settings WHERE user_id = ?"
        );
        $settings_stmt->bind_param("i", $rep_user_id);
        $settings_stmt->execute();
        $settings_result = $settings_stmt->get_result();
        
        $allow_end_anywhere = 1; // Default: allow end from anywhere
        if ($settings_result->num_rows > 0) {
            $settings = $settings_result->fetch_assoc();
            $allow_end_anywhere = $settings['allow_end_visit_from_anywhere'];
        }
        $settings_stmt->close();

        // --- LOCATION VALIDATION: Check if visit must end at client location ---
        if ($allow_end_anywhere == 0 && isset($end_latitude) && isset($end_longitude)) {
            // Get client location
            $client_stmt = $conn->prepare("SELECT clients_latitude, clients_longitude FROM clients WHERE clients_id = ?");
            $client_stmt->bind_param("i", $client_id);
            $client_stmt->execute();
            $client_result = $client_stmt->get_result();
            
            if ($client_result->num_rows === 0) {
                throw new Exception("Client not found.");
            }
            
            $client_data = $client_result->fetch_assoc();
            $client_lat = $client_data['clients_latitude'];
            $client_lng = $client_data['clients_longitude'];
            $client_stmt->close();
            
            if ($client_lat === null || $client_lng === null) {
                throw new Exception("Client location not set. Cannot validate visit end location.");
            }
            
            // Calculate distance using Haversine formula (in meters)
            $earth_radius = 6371000; // meters
            $lat1 = deg2rad($end_latitude);
            $lat2 = deg2rad($client_lat);
            $delta_lat = deg2rad($client_lat - $end_latitude);
            $delta_lng = deg2rad($client_lng - $end_longitude);
            
            $a = sin($delta_lat/2) * sin($delta_lat/2) +
                 cos($lat1) * cos($lat2) *
                 sin($delta_lng/2) * sin($delta_lng/2);
            $c = 2 * atan2(sqrt($a), sqrt(1-$a));
            $distance = $earth_radius * $c;
            
            // Allow 100 meters tolerance
            $max_distance = 100;
            if ($distance > $max_distance) {
                throw new Exception("You must be at the client location to end this visit. Current distance: " . round($distance) . " meters.");
            }
        }

        // --- DATABASE UPDATE ---
        $update_stmt = $conn->prepare(
            "UPDATE visits SET visits_end_time = NOW(), visits_end_latitude = ?, visits_end_longitude = ?, visits_outcome = ?, visits_notes = ?, visits_status = 'Completed' WHERE visits_id = ?"
        );
        $update_stmt->bind_param("ddssi", $end_latitude, $end_longitude, $outcome, $notes, $visit_id);
        $update_stmt->execute();
        $update_stmt->close();
        
        // --- Log the end of the visit as the final activity ---
        $activity_stmt = $conn->prepare(
            "INSERT INTO visit_activities (activity_visit_id, activity_user_id, activity_type, activity_description) VALUES (?, ?, 'Client_Note_Added', ?)"
        );
        $final_description = "Visit ended with outcome: " . $outcome;
        $activity_stmt->bind_param("iis", $visit_id, $rep_user_id, $final_description);
        $activity_stmt->execute();
        $activity_stmt->close();

        $conn->commit();
        print_success("Visit ended successfully.");

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
