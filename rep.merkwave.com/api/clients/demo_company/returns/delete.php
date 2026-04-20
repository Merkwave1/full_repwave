<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $returns_id = $_POST['returns_id'] ?? null;

    if (empty($returns_id) || !is_numeric($returns_id) || $returns_id <= 0) {
        print_failure("Error: Valid Return ID is required.");
    }

    $conn->begin_transaction();

    try {
        // 1. Retrieve return details before deletion for balance adjustment
        $stmt_get_return = $conn->prepare("
            SELECT returns_client_id, returns_total_amount, returns_status
            FROM returns
            WHERE returns_id = ?
        ");
        if (!$stmt_get_return) {
            throw new Exception("Prepare failed to get return for deletion: " . $conn->error);
        }
        $stmt_get_return->bind_param("i", $returns_id);
        $stmt_get_return->execute();
        $result_get_return = $stmt_get_return->get_result();
        $return_data = $result_get_return->fetch_assoc();
        $stmt_get_return->close();

        if (!$return_data) {
            $conn->rollback();
            print_failure("Error: Return with ID " . $returns_id . " not found.");
        }

        // 2. Delete return record (return_items will cascade delete due to FK)
        $stmt_delete_return = $conn->prepare("
            DELETE FROM returns
            WHERE returns_id = ?
        ");

        if (!$stmt_delete_return) {
            throw new Exception("Prepare failed for return delete: " . $conn->error);
        }

        $stmt_delete_return->bind_param("i", $returns_id);

        if (!$stmt_delete_return->execute()) {
            throw new Exception("Error deleting return: " . $stmt_delete_return->error);
        }

        if ($stmt_delete_return->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Return with ID " . $returns_id . " not found.");
        }
        $stmt_delete_return->close();

        // 3. Adjust client's credit_balance back if it was 'Refunded'
        if ($return_data['returns_status'] === 'Refunded') {
            $stmt_update_client_balance = $conn->prepare("
                UPDATE clients
                SET clients_credit_balance = clients_credit_balance - ?
                WHERE clients_id = ?
            ");
            if (!$stmt_update_client_balance) {
                throw new Exception("Prepare failed for client balance adjustment: " . $conn->error);
            }
            $stmt_update_client_balance->bind_param("di", $return_data['returns_total_amount'], $return_data['returns_client_id']);
            if (!$stmt_update_client_balance->execute()) {
                throw new Exception("Error adjusting client credit balance: " . $stmt_update_client_balance->error);
            }
            $stmt_update_client_balance->close();
        }

        $conn->commit();
        print_success("Return deleted successfully and client balance adjusted if applicable.");

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
