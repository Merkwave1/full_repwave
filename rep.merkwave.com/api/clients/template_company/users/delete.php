<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
     // Only admin can delete users

    $users_id = $_POST['users_id'] ?? null;

    if (empty($users_id) || !is_numeric($users_id) || $users_id <= 0) {
        print_failure("Error: Valid User ID is required.");
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            DELETE FROM users
            WHERE users_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for delete: " . $conn->error);
        }

        $stmt->bind_param("i", $users_id);

        if (!$stmt->execute()) {
            throw new Exception("Error deleting user: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: User with ID " . $users_id . " not found.");
        }

    $conn->commit();
        print_success("User deleted successfully.");

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
