<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) { print_failure("Error: User UUID is required."); }

    // Validate user
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    if (!$stmt_user) { throw new Exception("Prepare failed for user query: " . $conn->error); }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $user_res = $stmt_user->get_result();
    $user = $user_res->fetch_assoc();
    $stmt_user->close();
    if (!$user) { print_failure("Error: Invalid user UUID."); }

    // Filters
    $type = $_GET['type'] ?? $_POST['type'] ?? 'all';
    $type = is_string($type) ? strtolower(trim($type)) : 'all';
    if (!in_array($type, ['all', 'payment', 'refund'], true)) {
        $type = 'all';
    }

    $client_id = $_GET['client_id'] ?? $_POST['client_id'] ?? null;
    $payment_method_id = $_GET['payment_method_id'] ?? $_POST['payment_method_id'] ?? null;
    $safe_id = $_GET['safe_id'] ?? $_POST['safe_id'] ?? null;
    $date_from = $_GET['from_date'] ?? $_POST['from_date'] ?? ($_GET['date_from'] ?? $_POST['date_from'] ?? null);
    $date_to = $_GET['to_date'] ?? $_POST['to_date'] ?? ($_GET['date_to'] ?? $_POST['date_to'] ?? null);
    $search = $_GET['search'] ?? $_POST['search'] ?? null;
    $page = $_GET['page'] ?? $_POST['page'] ?? null;
    $per_page = $_GET['per_page'] ?? $_POST['per_page'] ?? null;
    $limit_input = $_GET['limit'] ?? $_POST['limit'] ?? null;
    $offset_input = $_GET['offset'] ?? $_POST['offset'] ?? null;

    $limit = 10;
    if ($per_page !== null && is_numeric($per_page)) {
        $limit = max(1, (int)$per_page);
    } elseif ($limit_input !== null && is_numeric($limit_input)) {
        $limit = max(1, (int)$limit_input);
    }

    $page_number = 1;
    if ($page !== null && is_numeric($page)) {
        $page_number = max(1, (int)$page);
    }

    $offset = ($page_number - 1) * $limit;
    if ($offset_input !== null && is_numeric($offset_input)) {
        $offset = max(0, (int)$offset_input);
        $page_number = intdiv($offset, $limit) + 1;
    }

    $search = is_string($search) ? trim($search) : '';
    $searchIsNumeric = ($search !== '' && ctype_digit($search));

    $includePayments = ($type === 'all' || $type === 'payment');
    $includeRefunds = ($type === 'all' || $type === 'refund');

    // Build filter clauses for payments
    $paymentConditions = [];
    $paymentTypes = '';
    $paymentParams = [];

    if ($includePayments) {
        if (!empty($client_id) && is_numeric($client_id)) { $paymentConditions[] = "p.payments_client_id = ?"; $paymentTypes .= 'i'; $paymentParams[] = (int)$client_id; }
        if (!empty($payment_method_id) && is_numeric($payment_method_id)) { $paymentConditions[] = "p.payments_method_id = ?"; $paymentTypes .= 'i'; $paymentParams[] = (int)$payment_method_id; }
        if (!empty($safe_id) && is_numeric($safe_id)) { $paymentConditions[] = "p.payments_safe_id = ?"; $paymentTypes .= 'i'; $paymentParams[] = (int)$safe_id; }
        if (!empty($date_from) && DateTime::createFromFormat('Y-m-d', $date_from) !== false) { $paymentConditions[] = "DATE(p.payments_date) >= ?"; $paymentTypes .= 's'; $paymentParams[] = $date_from; }
        if (!empty($date_to) && DateTime::createFromFormat('Y-m-d', $date_to) !== false) { $paymentConditions[] = "DATE(p.payments_date) <= ?"; $paymentTypes .= 's'; $paymentParams[] = $date_to; }
        if ($search !== '') {
            $like = "%" . $search . "%";
            $searchClauses = [
                "c.clients_company_name LIKE ?",
                "pm.payment_methods_name LIKE ?",
                "s.safes_name LIKE ?",
                "p.payments_notes LIKE ?",
                "CAST(p.payments_id AS CHAR) LIKE ?",
                "p.payments_transaction_id LIKE ?"
            ];
            $paymentTypes .= 'ssssss';
            $paymentParams[] = $like; $paymentParams[] = $like; $paymentParams[] = $like; $paymentParams[] = $like; $paymentParams[] = $like; $paymentParams[] = $like;
            if ($searchIsNumeric) {
                $searchClauses[] = "p.payments_id = ?";
                $paymentTypes .= 'i';
                $paymentParams[] = (int)$search;
            }
            $paymentConditions[] = '(' . implode(' OR ', $searchClauses) . ')';
        }
    }

    $paymentWhere = $paymentConditions ? ('WHERE ' . implode(' AND ', $paymentConditions)) : '';

    // Build filter clauses for refunds
    $refundConditions = [];
    $refundTypes = '';
    $refundParams = [];

    if ($includeRefunds) {
        if (!empty($client_id) && is_numeric($client_id)) { $refundConditions[] = "r.refunds_client_id = ?"; $refundTypes .= 'i'; $refundParams[] = (int)$client_id; }
        if (!empty($payment_method_id) && is_numeric($payment_method_id)) { $refundConditions[] = "r.refunds_method_id = ?"; $refundTypes .= 'i'; $refundParams[] = (int)$payment_method_id; }
        if (!empty($safe_id) && is_numeric($safe_id)) { $refundConditions[] = "r.refunds_safe_id = ?"; $refundTypes .= 'i'; $refundParams[] = (int)$safe_id; }
        if (!empty($date_from) && DateTime::createFromFormat('Y-m-d', $date_from) !== false) { $refundConditions[] = "DATE(r.refunds_date) >= ?"; $refundTypes .= 's'; $refundParams[] = $date_from; }
        if (!empty($date_to) && DateTime::createFromFormat('Y-m-d', $date_to) !== false) { $refundConditions[] = "DATE(r.refunds_date) <= ?"; $refundTypes .= 's'; $refundParams[] = $date_to; }
        if ($search !== '') {
            $like = "%" . $search . "%";
            $searchClauses = [
                "c.clients_company_name LIKE ?",
                "pm.payment_methods_name LIKE ?",
                "s.safes_name LIKE ?",
                "r.refunds_notes LIKE ?",
                "CAST(r.refunds_id AS CHAR) LIKE ?",
                "r.refunds_transaction_id LIKE ?"
            ];
            $refundTypes .= 'ssssss';
            $refundParams[] = $like; $refundParams[] = $like; $refundParams[] = $like; $refundParams[] = $like; $refundParams[] = $like; $refundParams[] = $like;
            if ($searchIsNumeric) {
                $searchClauses[] = "r.refunds_id = ?";
                $refundTypes .= 'i';
                $refundParams[] = (int)$search;
            }
            $refundConditions[] = '(' . implode(' OR ', $searchClauses) . ')';
        }
    }

    $refundWhere = $refundConditions ? ('WHERE ' . implode(' AND ', $refundConditions)) : '';

    // Counts for pagination and amount totals
    $payments_total = 0;
    $payments_amount_total = 0;
    if ($includePayments) {
        $count_sql = "
            SELECT COUNT(*) AS total_count, COALESCE(SUM(p.payments_amount), 0) AS amount_total
            FROM payments p
            LEFT JOIN clients c ON p.payments_client_id = c.clients_id
            LEFT JOIN payment_methods pm ON p.payments_method_id = pm.payment_methods_id
            LEFT JOIN safes s ON p.payments_safe_id = s.safes_id
            $paymentWhere
        ";
        $count_stmt = $conn->prepare($count_sql);
        if (!$count_stmt) { throw new Exception("Prepare failed: " . $conn->error); }
        if (!empty($paymentParams)) { $count_stmt->bind_param($paymentTypes, ...$paymentParams); }
        $count_stmt->execute();
        $count_res = $count_stmt->get_result();
        $count_row = $count_res->fetch_assoc();
        $payments_total = (int)($count_row['total_count'] ?? 0);
        $payments_amount_total = (float)($count_row['amount_total'] ?? 0);
        $count_stmt->close();
    }

    $refunds_total = 0;
    $refunds_amount_total = 0;
    if ($includeRefunds) {
        $count_sql = "
            SELECT COUNT(*) AS total_count, COALESCE(SUM(r.refunds_amount), 0) AS amount_total
            FROM refunds r
            LEFT JOIN clients c ON r.refunds_client_id = c.clients_id
            LEFT JOIN payment_methods pm ON r.refunds_method_id = pm.payment_methods_id
            LEFT JOIN safes s ON r.refunds_safe_id = s.safes_id
            $refundWhere
        ";
        $count_stmt = $conn->prepare($count_sql);
        if (!$count_stmt) { throw new Exception("Prepare failed: " . $conn->error); }
        if (!empty($refundParams)) { $count_stmt->bind_param($refundTypes, ...$refundParams); }
        $count_stmt->execute();
        $count_res = $count_stmt->get_result();
        $count_row = $count_res->fetch_assoc();
        $refunds_total = (int)($count_row['total_count'] ?? 0);
        $refunds_amount_total = (float)($count_row['amount_total'] ?? 0);
        $count_stmt->close();
    }

    $overall_total = ($includePayments ? $payments_total : 0) + ($includeRefunds ? $refunds_total : 0);
    $total_pages = $limit > 0 ? (int)ceil($overall_total / $limit) : 1;
    if ($total_pages < 1) { $total_pages = 1; }
    if ($page_number > $total_pages) {
        $page_number = $total_pages;
        $offset = ($page_number - 1) * $limit;
    }

    $unionParts = [];
    $unionTypes = '';
    $unionParams = [];

    if ($includePayments) {
        $paymentSelect = "
            SELECT
                'payment' AS movement_type,
                p.payments_id AS movement_id,
                p.payments_client_id AS client_id,
                c.clients_company_name AS client_name,
                p.payments_method_id AS method_id,
                pm.payment_methods_name AS method_name,
                p.payments_safe_id AS safe_id,
                s.safes_name AS safe_name,
                p.payments_amount AS movement_amount,
                p.payments_date AS movement_date,
                DATE_FORMAT(COALESCE(p.payments_created_at, CONCAT(p.payments_date, ' 00:00:00')), '%Y-%m-%d %H:%i:%s') AS sort_datetime,
                p.payments_notes AS movement_notes,
                p.payments_transaction_id AS reference,
                p.payments_rep_user_id AS rep_user_id,
                u.users_name AS rep_user_name,
                p.payments_safe_transaction_id AS safe_transaction_id,
                p.payments_odoo_payment_id AS odoo_id,
                p.payments_id AS client_payments_id,
                p.payments_client_id AS client_payments_client_id,
                p.payments_method_id AS client_payments_method_id,
                p.payments_safe_id AS client_payments_safe_id,
                p.payments_amount AS client_payments_amount,
                p.payments_date AS client_payments_date,
                p.payments_notes AS client_payments_notes,
                p.payments_transaction_id AS client_payments_transaction_id,
                NULL AS client_refunds_id,
                NULL AS client_refunds_client_id,
                NULL AS client_refunds_method_id,
                NULL AS client_refunds_safe_id,
                NULL AS client_refunds_amount,
                NULL AS client_refunds_date,
                NULL AS client_refunds_notes,
                NULL AS client_refunds_transaction_id,
                p.payments_created_at AS created_at,
                p.payments_updated_at AS updated_at
            FROM payments p
            LEFT JOIN clients c ON p.payments_client_id = c.clients_id
            LEFT JOIN payment_methods pm ON p.payments_method_id = pm.payment_methods_id
            LEFT JOIN safes s ON p.payments_safe_id = s.safes_id
            LEFT JOIN users u ON p.payments_rep_user_id = u.users_id
            $paymentWhere
        ";
        $unionParts[] = $paymentSelect;
        $unionTypes .= $paymentTypes;
        if (!empty($paymentParams)) { $unionParams = array_merge($unionParams, $paymentParams); }
    }

    if ($includeRefunds) {
        $refundSelect = "
            SELECT
                'refund' AS movement_type,
                r.refunds_id AS movement_id,
                r.refunds_client_id AS client_id,
                c.clients_company_name AS client_name,
                r.refunds_method_id AS method_id,
                pm.payment_methods_name AS method_name,
                r.refunds_safe_id AS safe_id,
                s.safes_name AS safe_name,
                r.refunds_amount AS movement_amount,
                r.refunds_date AS movement_date,
                DATE_FORMAT(COALESCE(r.refunds_created_at, CONCAT(r.refunds_date, ' 00:00:00')), '%Y-%m-%d %H:%i:%s') AS sort_datetime,
                r.refunds_notes AS movement_notes,
                r.refunds_transaction_id AS reference,
                r.refunds_rep_user_id AS rep_user_id,
                u.users_name AS rep_user_name,
                r.refunds_safe_transaction_id AS safe_transaction_id,
                r.refunds_odoo_payment_id AS odoo_id,
                NULL AS client_payments_id,
                NULL AS client_payments_client_id,
                NULL AS client_payments_method_id,
                NULL AS client_payments_safe_id,
                NULL AS client_payments_amount,
                NULL AS client_payments_date,
                NULL AS client_payments_notes,
                NULL AS client_payments_transaction_id,
                r.refunds_id AS client_refunds_id,
                r.refunds_client_id AS client_refunds_client_id,
                r.refunds_method_id AS client_refunds_method_id,
                r.refunds_safe_id AS client_refunds_safe_id,
                r.refunds_amount AS client_refunds_amount,
                r.refunds_date AS client_refunds_date,
                r.refunds_notes AS client_refunds_notes,
                r.refunds_transaction_id AS client_refunds_transaction_id,
                r.refunds_created_at AS created_at,
                r.refunds_updated_at AS updated_at
            FROM refunds r
            LEFT JOIN clients c ON r.refunds_client_id = c.clients_id
            LEFT JOIN payment_methods pm ON r.refunds_method_id = pm.payment_methods_id
            LEFT JOIN safes s ON r.refunds_safe_id = s.safes_id
            LEFT JOIN users u ON r.refunds_rep_user_id = u.users_id
            $refundWhere
        ";
        $unionParts[] = $refundSelect;
        $unionTypes .= $refundTypes;
        if (!empty($refundParams)) { $unionParams = array_merge($unionParams, $refundParams); }
    }

    $rows = [];
    if (!empty($unionParts)) {
        $data_sql = implode("\nUNION ALL\n", $unionParts) . "\nORDER BY sort_datetime DESC, movement_id DESC\n";
        if ($limit > 0) {
            $data_sql .= "LIMIT ? OFFSET ?";
            $unionTypes .= 'ii';
            $unionParams[] = (int)$limit;
            $unionParams[] = (int)$offset;
        }

        $stmt = $conn->prepare($data_sql);
        if (!$stmt) { throw new Exception("Prepare failed: " . $conn->error); }
        if (!empty($unionParams)) { $stmt->bind_param($unionTypes, ...$unionParams); }
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) { $rows[] = $row; }
        $stmt->close();
    }

    $response = [
        'movements' => $rows,
        'totals' => [
            'payments_total' => $payments_total,
            'refunds_total' => $refunds_total,
            'overall_total' => $overall_total,
            'payments_amount_total' => $payments_amount_total,
            'refunds_amount_total' => $refunds_amount_total
        ],
        'pagination' => [
            'page' => $page_number,
            'per_page' => $limit,
            'total_pages' => $total_pages,
            'total_count' => $overall_total
        ]
    ];

    print_success('Client cash movements retrieved successfully.', $response);

} catch (Exception $e) {
    print_failure('Database error: ' . $e->getMessage());
} finally {
    if (isset($conn)) { $conn->close(); }
}

?>
