<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_all

    $stmt = $conn->prepare("
        SELECT 
            payment_methods_id, 
            payment_methods_name, 
            payment_methods_description,
            payment_methods_created_at,
            payment_methods_updated_at
        FROM payment_methods
        ORDER BY payment_methods_name ASC
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $payment_methods = [];
    while ($row = $result->fetch_assoc()) {
        $payment_methods[] = $row;
    }

    print_success("Payment methods retrieved successfully.", $payment_methods);

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
