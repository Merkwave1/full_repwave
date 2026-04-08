<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) { print_failure('Error: User UUID is required.'); }

    $stmt_user = $conn->prepare('SELECT users_id FROM users WHERE users_uuid = ?');
    $stmt_user->bind_param('s', $users_uuid);
    $stmt_user->execute();
    $res_user = $stmt_user->get_result();
    $user = $res_user->fetch_assoc();
    $stmt_user->close();
    if (!$user) { print_failure('Error: Invalid user UUID.'); }

    $payments_id = $_GET['client_payments_id'] ?? $_POST['client_payments_id'] ?? null;
    if (empty($payments_id) || !is_numeric($payments_id) || $payments_id <= 0) { print_failure('Error: Valid Client Payment ID is required.'); }

    $sql = "
        SELECT 
            p.payments_id AS client_payments_id,
            p.payments_client_id AS client_payments_client_id,
            c.clients_company_name AS client_name,
            p.payments_method_id AS client_payments_method_id,
            pm.payment_methods_name AS payment_method_name,
            p.payments_amount AS client_payments_amount,
            p.payments_date AS client_payments_date,
            p.payments_transaction_id,
            p.payments_notes AS client_payments_notes,
            p.payments_rep_user_id,
            u.users_name AS rep_user_name,
            p.payments_safe_id AS client_payments_safe_id,
            s.safes_name AS safe_name,
            p.payments_safe_transaction_id,
            p.payments_created_at,
            p.payments_updated_at
        FROM payments p
        LEFT JOIN clients c ON p.payments_client_id = c.clients_id
        LEFT JOIN payment_methods pm ON p.payments_method_id = pm.payment_methods_id
        LEFT JOIN users u ON p.payments_rep_user_id = u.users_id
        LEFT JOIN safes s ON p.payments_safe_id = s.safes_id
        WHERE p.payments_id = ?
        LIMIT 1
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) { throw new Exception('Prepare failed: ' . $conn->error); }
    $stmt->bind_param('i', $payments_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    $stmt->close();

    if (!$row) { print_failure('Error: Client payment not found.'); }

    print_success('Client payment details retrieved successfully.', $row);

} catch (Exception $e) {
    print_failure('Database error: ' . $e->getMessage());
} finally {
    if (isset($conn)) { $conn->close(); }
}

?>
