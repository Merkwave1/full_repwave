<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_detail

    $settings_id = $_GET['settings_id'] ?? $_POST['settings_id'] ?? null;
    $settings_key = $_GET['settings_key'] ?? $_POST['settings_key'] ?? null;

    if (empty($settings_id) && empty($settings_key)) {
        print_failure("Error: Either Setting ID or Setting Key is required.");
    }

    $sql = "
        SELECT 
            settings_id, 
            settings_key, 
            settings_value, 
            settings_description, 
            settings_type,
            settings_created_at,
            settings_updated_at
        FROM settings
        WHERE ";
    $bind_type = "";
    $bind_param = null;

    if (!empty($settings_id) && is_numeric($settings_id) && $settings_id > 0) {
        $sql .= "settings_id = ?";
        $bind_type = "i";
        $bind_param = $settings_id;
    } else if (!empty($settings_key)) {
        $sql .= "settings_key = ?";
        $bind_type = "s";
        $bind_param = $settings_key;
    } else {
        print_failure("Error: Invalid Setting ID or Key provided.");
    }

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->bind_param($bind_type, $bind_param);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        print_failure("Error: Setting not found.");
    }

    $setting_data = $result->fetch_assoc();
    print_success("Setting details retrieved successfully.", $setting_data);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
