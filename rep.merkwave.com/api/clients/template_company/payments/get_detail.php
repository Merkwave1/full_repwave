<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_detail

    $payments_id = $_GET['payments_id'] ?? $_POST['payments_id'] ?? null;

    if (empty($payments_id) || !is_numeric($payments_id) || $payments_id <= 0) {
        print_failure("Error: Payment ID is required.");
    }

    $stmt = $conn->prepare("
        SELECT 
            p.payments_id,
            p.payments_client_id,
            c.clients_company_name,
            p.payments_method_id,
            pm.payment_methods_name,
            p.payments_amount,
            p.payments_date,
            p.payments_transaction_id,
            p.payments_notes,
            p.payments_rep_user_id,
            p.payments_safe_id,
            p.payments_safe_transaction_id,
            p.payments_created_at,
            p.payments_updated_at
        FROM payments p
        JOIN clients c ON p.payments_client_id = c.clients_id
        JOIN payment_methods pm ON p.payments_method_id = pm.payment_methods_id
        WHERE p.payments_id = ?
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->bind_param("i", $payments_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        print_failure("Error: Payment not found.");
    }

    $payment_data = $result->fetch_assoc();
    print_success("Payment details retrieved successfully.", $payment_data);

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
