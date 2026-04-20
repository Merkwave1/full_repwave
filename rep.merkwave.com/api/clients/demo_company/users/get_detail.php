<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_detail

    $users_id = $_GET['users_id'] ?? $_POST['users_id'] ?? null;

    if (empty($users_id) || !is_numeric($users_id) || $users_id <= 0) {
        print_failure("Error: User ID is required.");
    }

    $stmt = $conn->prepare("
        SELECT 
            users_id, 
            users_name, 
            users_role
        FROM users
        WHERE users_id = ?
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->bind_param("i", $users_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        print_failure("Error: User not found.");
    }

    $user_data = $result->fetch_assoc();
    print_success("User details retrieved successfully.", $user_data);

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
