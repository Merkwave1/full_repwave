<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_detail

    $payment_methods_id = $_GET['payment_methods_id'] ?? $_POST['payment_methods_id'] ?? null;

    if (empty($payment_methods_id) || !is_numeric($payment_methods_id) || $payment_methods_id <= 0) {
        print_failure("Error: Payment Method ID is required.");
    }

    $stmt = $conn->prepare("
        SELECT 
            payment_methods_id, 
            payment_methods_name, 
            payment_methods_description,
            payment_methods_created_at,
            payment_methods_updated_at
        FROM payment_methods
        WHERE payment_methods_id = ?
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->bind_param("i", $payment_methods_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        print_failure("Error: Payment method not found.");
    }

    $payment_method_data = $result->fetch_assoc();
    print_success("Payment method details retrieved successfully.", $payment_method_data);

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
