<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) { print_failure("Error: User UUID is required."); }

    $refunds_id = $_GET['client_refunds_id'] ?? $_POST['client_refunds_id'] ?? null;
    if (empty($refunds_id) || !is_numeric($refunds_id) || $refunds_id <= 0) { print_failure('Error: Valid refund ID is required.'); }

    $sql = "
        SELECT 
            r.refunds_id AS client_refunds_id,
            r.refunds_client_id AS client_refunds_client_id,
            c.clients_company_name AS client_name,
            r.refunds_method_id AS client_refunds_method_id,
            pm.payment_methods_name AS payment_method_name,
            r.refunds_amount AS client_refunds_amount,
            r.refunds_date AS client_refunds_date,
            r.refunds_transaction_id,
            r.refunds_notes AS client_refunds_notes,
            r.refunds_rep_user_id,
            u.users_name AS rep_user_name,
            r.refunds_safe_id AS client_refunds_safe_id,
            s.safes_name AS safe_name,
            r.refunds_safe_transaction_id,
            r.refunds_created_at,
            r.refunds_updated_at
        FROM refunds r
        LEFT JOIN clients c ON r.refunds_client_id = c.clients_id
        LEFT JOIN payment_methods pm ON r.refunds_method_id = pm.payment_methods_id
        LEFT JOIN users u ON r.refunds_rep_user_id = u.users_id
        LEFT JOIN safes s ON r.refunds_safe_id = s.safes_id
        WHERE r.refunds_id = ?
        LIMIT 1
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) { throw new Exception('Prepare failed: ' . $conn->error); }
    $stmt->bind_param('i', $refunds_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();

    if (!$row) { print_failure('Refund not found.'); }

    print_success('Client refund details retrieved successfully.', $row);

} catch (Exception $e) {
    print_failure('Database error: ' . $e->getMessage());
} finally {
    if (isset($conn)) { $conn->close(); }
}

?>
