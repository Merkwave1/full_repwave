<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $payment_methods_id = $_POST['payment_methods_id'] ?? null;

    if (empty($payment_methods_id) || !is_numeric($payment_methods_id) || $payment_methods_id <= 0) {
        print_failure("Error: Valid Payment Method ID is required.");
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            DELETE FROM payment_methods
            WHERE payment_methods_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for delete: " . $conn->error);
        }

        $stmt->bind_param("i", $payment_methods_id);

        if (!$stmt->execute()) {
            throw new Exception("Error deleting payment method: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Payment method with ID " . $payment_methods_id . " not found.");
        }

        $conn->commit();
        print_success("Payment method deleted successfully.");

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
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
