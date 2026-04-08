<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $payment_methods_name        = $_POST['payment_methods_name']        ?? null;
    $payment_methods_description = $_POST['payment_methods_description'] ?? null;

    // Handle empty strings for nullable fields
    if ($payment_methods_description === "") {$payment_methods_description = null;}

    if (empty($payment_methods_name)) {
        print_failure("Error: Payment method name is required.");
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            INSERT INTO payment_methods (payment_methods_name, payment_methods_description)
            VALUES (?, ?)
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("ss", 
            $payment_methods_name, 
            $payment_methods_description
        );

        if (!$stmt->execute()) {
            throw new Exception("Error inserting payment method: " . $stmt->error);
        }

        $new_id = $stmt->insert_id;

        $conn->commit();
        print_success("Payment method added successfully.", ['payment_methods_id' => $new_id, 'payment_methods_name' => $payment_methods_name]);

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
