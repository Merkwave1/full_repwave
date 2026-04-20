<?php

// path /versions/update_version.php

// Include the centralized database connection and helper functions
require_once '../db_connect.php'; 

// Make sure this is a GET request
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    print_failure("Invalid request method. Only GET is allowed.");
}

// Check if the entity name is provided, using $_GET instead of $_POST
if (!isset($_GET['entity']) || empty($_GET['entity'])) {
    print_failure("Entity name is required.");
}

$entity = $_GET['entity'];

// Check for the specific case where we should not update
if ($entity === 'donotupdate') {
    print_success("Version for '{$entity}' was not updated as requested.");
    exit; // Exit the script to prevent further execution
}

try {
    // Check if the entity exists in the versions table
    $stmt = $conn->prepare("SELECT COUNT(*) FROM `versions` WHERE `entity` = ?");
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    $stmt->bind_param("s", $entity);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_row();
    $entityExists = $row[0] > 0;
    $stmt->close();

    if ($entityExists) {
        // If the entity exists, increment its version
        $stmt = $conn->prepare("UPDATE `versions` SET `version` = `version` + 1, `updated_at` = NOW() WHERE `entity` = ?");
    } else {
        // If it doesn't exist, insert a new record with version 1
        $stmt = $conn->prepare("INSERT INTO `versions` (`entity`, `version`, `updated_at`) VALUES (?, 1, NOW())");
    }

    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("s", $entity);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        print_success("Version for '{$entity}' updated successfully.");
    } else {
        print_failure("Failed to update version for '{$entity}'. No rows were changed.");
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
