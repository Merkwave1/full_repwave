<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $payment_methods_id          = $_POST['payment_methods_id']          ?? null;
    $payment_methods_name        = $_POST['payment_methods_name']        ?? null;
    $payment_methods_description = $_POST['payment_methods_description'] ?? null;

    // Handle empty strings for nullable fields
    if (array_key_exists('payment_methods_description', $_POST) && $_POST['payment_methods_description'] === "") {$payment_methods_description = null;}

    if (empty($payment_methods_id) || !is_numeric($payment_methods_id) || $payment_methods_id <= 0) {
        print_failure("Error: Valid Payment Method ID is required for update.");
    }

    $update_fields = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($payment_methods_name)) {
        $update_fields[] = "payment_methods_name = ?";
        $bind_types .= "s";
        $bind_params[] = $payment_methods_name;
    }

    if (array_key_exists('payment_methods_description', $_POST)) {
        $update_fields[] = "payment_methods_description = ?";
        $bind_types .= "s";
        $bind_params[] = $payment_methods_description;
    }

    if (empty($update_fields)) {
        print_failure("Error: No valid fields provided for update.");
    }

    $sql = "UPDATE payment_methods SET " . implode(", ", $update_fields) . ", payment_methods_updated_at = NOW() WHERE payment_methods_id = ?";
    $bind_types .= "i"; 
    $bind_params[] = $payment_methods_id;

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("Prepare failed for update: " . $conn->error);
    }

    $stmt->bind_param($bind_types, ...$bind_params);

    $conn->begin_transaction();

    try {
        if (!$stmt->execute()) {
            throw new Exception("Error updating payment method: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            $conn->rollback();
            print_failure("Error: Payment method with ID " . $payment_methods_id . " not found or no changes were made.");
        }

        $conn->commit();
        print_success("Payment method updated successfully.", ['payment_methods_id' => $payment_methods_id]);

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
