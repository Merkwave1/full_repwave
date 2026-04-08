<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
     // Only admin can delete settings

    $settings_id = $_POST['settings_id'] ?? null;
    $settings_key = $_POST['settings_key'] ?? null; // Allow deletion by ID or key

    if (empty($settings_id) && empty($settings_key)) {
        print_failure("Error: Either Setting ID or Setting Key is required for deletion.");
    }

    $conn->begin_transaction();

    try {
        $sql = "DELETE FROM settings WHERE ";
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
            throw new Exception("Prepare failed for delete: " . $conn->error);
        }

        $stmt->bind_param($bind_type, $bind_param);

        if (!$stmt->execute()) {
            throw new Exception("Error deleting setting: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Setting not found with provided ID or Key.");
        }

        $conn->commit();
        print_success("Setting deleted successfully.");

    } catch (Exception $e) {
        $conn->rollback();
        print_failure("Internal Error: " . $e->getMessage());
    }

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
