<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $user_data = $stmt_user->get_result()->fetch_assoc();
    $stmt_user->close();

    if (!$user_data) {
        print_failure("Error: Invalid user UUID.");
    }

    if (!in_array($user_data['users_role'], ['admin', 'manager'])) {
        print_failure("Error: Access denied. Only admins/managers can delete sales returns.");
    }

    $returns_id = $_GET['returns_id'] ?? $_POST['returns_id'] ?? null;
    if (empty($returns_id) || !is_numeric($returns_id)) {
        print_failure("Error: Valid returns_id is required.");
    }

    // Check return exists and get status
    $stmt = $conn->prepare("SELECT returns_id, returns_status FROM sales_returns WHERE returns_id = ?");
    $stmt->bind_param("i", $returns_id);
    $stmt->execute();
    $return_data = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$return_data) {
        print_failure("Error: Sales return not found.");
    }

    // Delete items first, then the return
    $conn->begin_transaction();

    $stmt_items = $conn->prepare("DELETE FROM sales_return_items WHERE return_items_return_id = ?");
    $stmt_items->bind_param("i", $returns_id);
    $stmt_items->execute();
    $stmt_items->close();

    $stmt_del = $conn->prepare("DELETE FROM sales_returns WHERE returns_id = ?");
    $stmt_del->bind_param("i", $returns_id);
    $stmt_del->execute();
    $stmt_del->close();

    $conn->commit();

    print_success("Sales return deleted successfully.");

} catch (Exception $e) {
    if (isset($conn)) $conn->rollback();
    print_failure($e->getMessage());
} finally {
    if (isset($conn)) $conn->close();
}
?>