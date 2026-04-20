<?php

require_once '../db_connect.php';

/**
 * Persist representative telemetry (location, battery, phone info) when provided by the mobile app.
 */
function log_rep_location_if_present(): void
{


    $rawLatitude = $_GET['latitude'] ?? $_POST['latitude'] ?? null;
    $rawLongitude = $_GET['longitude'] ?? $_POST['longitude'] ?? null;


    if ($rawLatitude == null && $rawLongitude == null) {
        return; // No telemetry provided
    }


    global $conn;



    if ($rawLatitude === null || $rawLongitude === null) {
        return; // Telemetry not provided
    }

    $latitude = filter_var($rawLatitude, FILTER_VALIDATE_FLOAT);
    $longitude = filter_var($rawLongitude, FILTER_VALIDATE_FLOAT);

    if ($latitude === false || $longitude === false) {
        error_log('rep_location_tracking: Invalid latitude/longitude provided.');
        return;
    }

    if ($latitude < -90.0 || $latitude > 90.0 || $longitude < -180.0 || $longitude > 180.0) {
        error_log('rep_location_tracking: Latitude/longitude out of range.');
        return;
    }

    $userId = $GLOBALS['current_user_id'] ?? null;
    if (!$userId) {
        $userUuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
        if (!empty($userUuid)) {
            $userId = get_user_id_from_uuid_local($userUuid);
        }
    }

    if (empty($userId)) {
        error_log('rep_location_tracking: Unable to resolve user ID for telemetry insert.');
        return;
    }

    $batteryInput = $_GET['battery_level'] ?? $_POST['battery_level'] ?? null;
    $batteryLevel = null;
    if ($batteryInput !== null && $batteryInput !== '') {
        $batteryLevel = filter_var(
            $batteryInput,
            FILTER_VALIDATE_INT,
            [
                'options' => [
                    'min_range' => 0,
                    'max_range' => 100,
                ],
            ]
        );
        if ($batteryLevel === false) {
            $batteryLevel = null; // Ignore invalid values
        }
    }

    $phoneInfo = $_GET['phone_type'] ?? $_POST['phone_type'] ?? null;
    if ($phoneInfo !== null) {
        $phoneInfo = trim((string) $phoneInfo);
        $phoneInfo = preg_replace('/[\x00-\x1F\x7F]/u', '', $phoneInfo); // Strip control chars
        if ($phoneInfo === '') {
            $phoneInfo = null;
        } else {
            $phoneInfo = mb_substr($phoneInfo, 0, 255);
        }
    }

    $columns = ['user_id', 'latitude', 'longitude'];
    $params = [
        (int) $userId,
        (float) $latitude,
        (float) $longitude,
    ];
    $types = 'idd';

    if ($batteryLevel !== null) {
        $columns[] = 'battery_level';
        $params[] = (int) $batteryLevel;
        $types .= 'i';
    }

    if ($phoneInfo !== null) {
        $columns[] = 'phone_info';
        $params[] = $phoneInfo;
        $types .= 's';
    }

    $placeholders = implode(', ', array_fill(0, count($params), '?'));
    $columnList = implode(', ', array_map(function ($col) {
        return "`$col`";
    }, $columns));

    $sql = "INSERT INTO rep_location_tracking ($columnList) VALUES ($placeholders)";
    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        error_log('rep_location_tracking: Prepare failed - ' . $conn->error);
        return;
    }

    $stmt->bind_param($types, ...$params);

    if (!$stmt->execute()) {
        error_log('rep_location_tracking: Execute failed - ' . $stmt->error);
    }

    $stmt->close();
}

try {
    // Authenticate request and capture telemetry before returning versions list
    validate_user_session();
    log_rep_location_if_present();

    get_data('versions');
} catch (Exception | TypeError $e) {
    print_failure('Internal Error: ' . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}

?>
