<?php
// File: /visits/start.php
// Description: Initiates a new client visit and returns its ID.

require_once '../db_connect.php'; // Contains connection and all helper functions
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // --- INPUT GATHERING from $_POST ---
    $client_id = $_POST['client_id'] ?? null;
    $users_uuid = $_POST['users_uuid'] ?? null;
    $start_latitude = $_POST['latitude'] ?? null;
    $start_longitude = $_POST['longitude'] ?? null;
    $purpose = $_POST['purpose'] ?? null;

    // --- VALIDATION ---
    if (empty($client_id) || !is_numeric($client_id) || $client_id <= 0) {
        print_failure("Error: Valid Client ID is required.");
    }
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }
    if (!isset($start_latitude) || !is_numeric($start_latitude)) {
        print_failure("Error: Valid starting latitude is required.");
    }
    if (!isset($start_longitude) || !is_numeric($start_longitude)) {
        print_failure("Error: Valid starting longitude is required.");
    }
    if (empty($purpose)) {
        print_failure("Error: A purpose for the visit is required.");
    }

    // Get user ID from UUID
    $rep_user_id = get_user_id_from_uuid_local($users_uuid);
    if (!$rep_user_id) {
        print_failure("Error: Invalid user UUID.");
    }

    $conn->begin_transaction();

    try {
        // --- LOGIC CHECK: Prevent multiple active visits for the same representative ---
        $check_stmt = $conn->prepare("SELECT visits_id FROM visits WHERE visits_rep_user_id = ? AND visits_status = 'Started' LIMIT 1");
        $check_stmt->bind_param("i", $rep_user_id);
        $check_stmt->execute();
        if ($check_stmt->get_result()->num_rows > 0) {
            throw new Exception("This representative already has an active visit in progress. Please end the previous visit first.");
        }
        $check_stmt->close();

        // --- GET REPRESENTATIVE SETTINGS ---
        $settings_stmt = $conn->prepare(
            "SELECT allow_start_visit_from_anywhere, allow_out_of_plan_visits FROM representative_settings WHERE user_id = ?"
        );
        $settings_stmt->bind_param("i", $rep_user_id);
        $settings_stmt->execute();
        $settings_result = $settings_stmt->get_result();
        
        $allow_start_anywhere = 1; // Default: allow start from anywhere
        $allow_out_of_plan_visits = 1; // Default: allow visits outside plan
        if ($settings_result->num_rows > 0) {
            $settings = $settings_result->fetch_assoc();
            $allow_start_anywhere = $settings['allow_start_visit_from_anywhere'];
            if (isset($settings['allow_out_of_plan_visits'])) {
                $allow_out_of_plan_visits = (int)$settings['allow_out_of_plan_visits'];
            }
        }
        $settings_stmt->close();

        // --- LOCATION VALIDATION: Check if visit must start at client location ---
        if ($allow_start_anywhere == 0) {
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
                throw new Exception("Client location not set. Cannot validate visit start location.");
            }
            
            // Calculate distance using Haversine formula (in meters)
            $earth_radius = 6371000; // meters
            $lat1 = deg2rad($start_latitude);
            $lat2 = deg2rad($client_lat);
            $delta_lat = deg2rad($client_lat - $start_latitude);
            $delta_lng = deg2rad($client_lng - $start_longitude);
            
            $a = sin($delta_lat/2) * sin($delta_lat/2) +
                 cos($lat1) * cos($lat2) *
                 sin($delta_lng/2) * sin($delta_lng/2);
            $c = 2 * atan2(sqrt($a), sqrt(1-$a));
            $distance = $earth_radius * $c;
            
            // Allow 100 meters tolerance
            $max_distance = 100;
            if ($distance > $max_distance) {
                throw new Exception("You must be at the client location to start this visit. Current distance: " . round($distance) . " meters.");
            }
        }

        // --- VISIT PLAN VALIDATION: Ensure client is part of today's plan when out-of-plan visits are disabled ---
        if ($allow_out_of_plan_visits === 0) {
            $today = new DateTimeImmutable('today');
            $todayFormatted = $today->format('Y-m-d');

            $plan_stmt = $conn->prepare(
                "SELECT 
                    vp.visit_plan_id,
                    vp.visit_plan_name,
                    vp.visit_plan_recurrence_type,
                    vp.visit_plan_selected_days,
                    vp.visit_plan_repeat_every,
                    vp.visit_plan_start_date,
                    vp.visit_plan_end_date
                FROM visit_plans vp
                INNER JOIN visit_plan_clients vpc ON vpc.visit_plan_id = vp.visit_plan_id
                WHERE vp.user_id = ?
                  AND vp.visit_plan_status = 'Active'
                  AND (vp.visit_plan_start_date IS NULL OR vp.visit_plan_start_date <= ?)
                  AND (vp.visit_plan_end_date IS NULL OR vp.visit_plan_end_date >= ?)
                  AND vpc.client_id = ?"
            );

            if (!$plan_stmt) {
                throw new Exception("Unable to validate visit plan assignment." );
            }

            $plan_stmt->bind_param("issi", $rep_user_id, $todayFormatted, $todayFormatted, $client_id);
            $plan_stmt->execute();
            $plan_result = $plan_stmt->get_result();

            $planAllowsVisit = false;
            $currentDay = ((int)$today->format('w') + 1) % 7 + 1; // Map Sunday..Saturday to 2..1

            while ($plan_row = $plan_result->fetch_assoc()) {
                $startDate = !empty($plan_row['visit_plan_start_date']) ? new DateTimeImmutable($plan_row['visit_plan_start_date']) : null;
                if ($startDate && $today < $startDate) {
                    continue;
                }

                if (!empty($plan_row['visit_plan_end_date'])) {
                    $endDate = new DateTimeImmutable($plan_row['visit_plan_end_date']);
                    if ($today > $endDate) {
                        continue;
                    }
                }

                $recurrence = strtolower($plan_row['visit_plan_recurrence_type'] ?? '');
                $repeatEvery = isset($plan_row['visit_plan_repeat_every']) ? max(1, (int)$plan_row['visit_plan_repeat_every']) : 1;
                $allowsToday = false;

                switch ($recurrence) {
                    case 'daily':
                        if ($startDate) {
                            $daysDiff = $startDate->diff($today)->days;
                            $allowsToday = $daysDiff % $repeatEvery === 0;
                        } else {
                            $allowsToday = true;
                        }
                        break;
                    case 'monthly':
                        if ($startDate) {
                            $monthsDiff = ((int)$today->format('Y') - (int)$startDate->format('Y')) * 12 + ((int)$today->format('n') - (int)$startDate->format('n'));
                            if ($monthsDiff >= 0 && $monthsDiff % $repeatEvery === 0) {
                                $allowsToday = $today->format('d') === $startDate->format('d');
                            }
                        }
                        break;
                    case 'once':
                        if ($startDate) {
                            $allowsToday = $startDate->format('Y-m-d') === $today->format('Y-m-d');
                        }
                        break;
                    case 'weekly':
                    case 'parts_of_week':
                    default:
                        $rawDays = $plan_row['visit_plan_selected_days'] ?? null;
                        $selectedDays = [];

                        if ($rawDays !== null && $rawDays !== '') {
                            $decoded = json_decode($rawDays, true);
                            if (is_array($decoded)) {
                                foreach ($decoded as $dayVal) {
                                    $selectedDays[] = (int)$dayVal;
                                }
                            } else {
                                $trimmed = trim($rawDays, "[] \"\t\n\r\0\x0B");
                                if ($trimmed !== '') {
                                    $parts = preg_split('/\s*,\s*/', $trimmed);
                                    foreach ($parts as $part) {
                                        if ($part === '') {
                                            continue;
                                        }
                                        $selectedDays[] = (int)$part;
                                    }
                                }
                            }
                        }

                        $selectedDays = array_values(array_unique(array_filter($selectedDays, 'is_int')));

                        if (!empty($selectedDays) && in_array($currentDay, $selectedDays, true)) {
                            if ($startDate) {
                                $daysDiff = $startDate->diff($today)->days;
                                $weeksDiff = (int)floor($daysDiff / 7);
                                $allowsToday = $weeksDiff % $repeatEvery === 0;
                            } else {
                                $allowsToday = true;
                            }
                        }
                        break;
                }

                if ($allowsToday) {
                    $planAllowsVisit = true;
                    break;
                }
            }

            $plan_stmt->close();

            if (!$planAllowsVisit) {
                throw new Exception("This client is not scheduled in your visit plan for today.");
            }
        }

        // --- DATABASE INSERT ---
        $stmt = $conn->prepare(
            "INSERT INTO visits (visits_client_id, visits_rep_user_id, visits_start_time, visits_start_latitude, visits_start_longitude, visits_purpose, visits_status) VALUES (?, ?, NOW(), ?, ?, ?, 'Started')"
        );
        $stmt->bind_param("iidds", $client_id, $rep_user_id, $start_latitude, $start_longitude, $purpose);
        $stmt->execute();
        $new_visit_id = $stmt->insert_id;
        $stmt->close();
        
        // --- Log the start of the visit as the first activity ---
        $activity_stmt = $conn->prepare(
            "INSERT INTO visit_activities (activity_visit_id, activity_user_id, activity_type, activity_description) VALUES (?, ?, 'Client_Note_Added', ?)"
        );
        $initial_description = "Visit started with purpose: " . $purpose;
        $activity_stmt->bind_param("iis", $new_visit_id, $rep_user_id, $initial_description);
        $activity_stmt->execute();
        $activity_stmt->close();

        $conn->commit();
        print_success("Visit started successfully.", ['visit_id' => $new_visit_id]);

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
