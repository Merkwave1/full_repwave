<?php
// Unified Client Account Statement API
// Aggregates: Invoiced Sales Orders (debit), Processed Sales Returns (credit), Client Payments (credit), Client Refunds (credit)
// Excludes: Draft/Pending orders; Pending returns

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Auth via users_uuid
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) { print_failure("Error: User UUID is required."); }

    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    if (!$stmt_user) { throw new Exception("Prepare failed for user query: " . $conn->error); }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $res_user = $stmt_user->get_result();
    $user = $res_user->fetch_assoc();
    $stmt_user->close();
    if (!$user) { print_failure("Error: Invalid user UUID."); }

    $users_id = (int)$user['users_id'];
    $users_role = $user['users_role'];

    // Required client_id
    $client_id = $_GET['client_id'] ?? $_POST['client_id'] ?? null;
    if (empty($client_id) || !is_numeric($client_id)) { print_failure("Error: client_id is required and must be numeric."); }
    $client_id = (int)$client_id;

    // Optional date filters (YYYY-MM-DD)
    $date_from = $_GET['date_from'] ?? $_POST['date_from'] ?? null;
    $date_to = $_GET['date_to'] ?? $_POST['date_to'] ?? null;
    $date_from_valid = !empty($date_from) && DateTime::createFromFormat('Y-m-d', $date_from) !== false;
    $date_to_valid   = !empty($date_to)   && DateTime::createFromFormat('Y-m-d', $date_to) !== false;

    // Security: if rep, ensure this client belongs to them
    if ($users_role === 'rep') {
        $stmt_client_check = $conn->prepare("SELECT clients_company_name, clients_rep_user_id FROM clients WHERE clients_id = ?");
        $stmt_client_check->bind_param("i", $client_id);
        $stmt_client_check->execute();
        $client_row = $stmt_client_check->get_result()->fetch_assoc();
        $stmt_client_check->close();
        if (!$client_row) { print_failure("Client not found."); }
        if ((int)$client_row['clients_rep_user_id'] !== $users_id) {
            print_failure("You are not authorized to view this client's statement.");
        }
        $client_name = $client_row['clients_company_name'];
    } else {
        // Admin/others: fetch client name for response convenience
        $stmt_client_name = $conn->prepare("SELECT clients_company_name FROM clients WHERE clients_id = ?");
        $stmt_client_name->bind_param("i", $client_id);
        $stmt_client_name->execute();
        $client_name_res = $stmt_client_name->get_result()->fetch_assoc();
        $stmt_client_name->close();
        $client_name = $client_name_res['clients_company_name'] ?? null;
    }

    $entries = [];
    $total_debit = 0.0;  // Orders
    $total_credit = 0.0; // Payments, Refunds, Returns

    // Fetch Invoiced Sales Orders (debit)
    $sql_so = "SELECT so.sales_orders_id, so.sales_orders_total_amount, so.sales_orders_order_date, so.sales_orders_status
               FROM sales_orders so
               WHERE so.sales_orders_client_id = ? AND so.sales_orders_status = 'Invoiced'";
    $types_so = 'i';
    $params_so = [$client_id];
    if ($date_from_valid) { $sql_so .= " AND DATE(so.sales_orders_order_date) >= ?"; $types_so .= 's'; $params_so[] = $date_from; }
    if ($date_to_valid)   { $sql_so .= " AND DATE(so.sales_orders_order_date) <= ?"; $types_so .= 's'; $params_so[] = $date_to; }
    $stmt_so = $conn->prepare($sql_so);
    if (!empty($params_so)) { $stmt_so->bind_param($types_so, ...$params_so); }
    $stmt_so->execute();
    $res_so = $stmt_so->get_result();
    while ($row = $res_so->fetch_assoc()) {
        $amount = (float)$row['sales_orders_total_amount'];
        $entries[] = [
            'type' => 'order',
            'id' => (int)$row['sales_orders_id'],
            'client_id' => $client_id,
            'client_name' => $client_name,
            'date' => $row['sales_orders_order_date'],
            'status' => $row['sales_orders_status'],
            'reference' => (string)$row['sales_orders_id'],
            'debit' => $amount,
            'credit' => 0.0,
            'amount_signed' => $amount
        ];
        $total_debit += $amount;
    }
    $stmt_so->close();

    // Fetch Processed Sales Returns (credit)
    $sql_sr = "SELECT sr.returns_id, sr.returns_total_amount, sr.returns_date, sr.returns_status
               FROM sales_returns sr
               WHERE sr.returns_client_id = ? AND sr.returns_status = 'Processed'";
    $types_sr = 'i';
    $params_sr = [$client_id];
    if ($date_from_valid) { $sql_sr .= " AND DATE(sr.returns_date) >= ?"; $types_sr .= 's'; $params_sr[] = $date_from; }
    if ($date_to_valid)   { $sql_sr .= " AND DATE(sr.returns_date) <= ?"; $types_sr .= 's'; $params_sr[] = $date_to; }
    $stmt_sr = $conn->prepare($sql_sr);
    if (!empty($params_sr)) { $stmt_sr->bind_param($types_sr, ...$params_sr); }
    $stmt_sr->execute();
    $res_sr = $stmt_sr->get_result();
    while ($row = $res_sr->fetch_assoc()) {
        $amount = (float)$row['returns_total_amount'];
        $entries[] = [
            'type' => 'return',
            'id' => (int)$row['returns_id'],
            'client_id' => $client_id,
            'client_name' => $client_name,
            'date' => $row['returns_date'],
            'status' => $row['returns_status'],
            'reference' => (string)$row['returns_id'],
            'debit' => 0.0,
            'credit' => $amount,
            'amount_signed' => -$amount
        ];
        $total_credit += $amount;
    }
    $stmt_sr->close();

    // Fetch Client Payments (credit)
    $sql_p = "SELECT p.payments_id, p.payments_amount, p.payments_date, pm.payment_methods_name
              FROM payments p
              LEFT JOIN payment_methods pm ON p.payments_method_id = pm.payment_methods_id
              WHERE p.payments_client_id = ?";
    $types_p = 'i';
    $params_p = [$client_id];
    if ($date_from_valid) { $sql_p .= " AND DATE(p.payments_date) >= ?"; $types_p .= 's'; $params_p[] = $date_from; }
    if ($date_to_valid)   { $sql_p .= " AND DATE(p.payments_date) <= ?"; $types_p .= 's'; $params_p[] = $date_to; }
    $stmt_p = $conn->prepare($sql_p);
    if (!empty($params_p)) { $stmt_p->bind_param($types_p, ...$params_p); }
    $stmt_p->execute();
    $res_p = $stmt_p->get_result();
    while ($row = $res_p->fetch_assoc()) {
        $amount = (float)$row['payments_amount'];
        $entries[] = [
            'type' => 'payment',
            'id' => (int)$row['payments_id'],
            'client_id' => $client_id,
            'client_name' => $client_name,
            'date' => $row['payments_date'],
            'status' => null,
            'reference' => (string)$row['payments_id'],
            'method' => $row['payment_methods_name'] ?? null,
            'debit' => 0.0,
            'credit' => $amount,
            'amount_signed' => $amount
        ];
        $total_credit += $amount;
    }
    $stmt_p->close();

    // Fetch Client Refunds (credit)
    $sql_r = "SELECT r.refunds_id, r.refunds_amount, r.refunds_date, pm.payment_methods_name
              FROM refunds r
              LEFT JOIN payment_methods pm ON r.refunds_method_id = pm.payment_methods_id
              WHERE r.refunds_client_id = ?";
    $types_r = 'i';
    $params_r = [$client_id];
    if ($date_from_valid) { $sql_r .= " AND DATE(r.refunds_date) >= ?"; $types_r .= 's'; $params_r[] = $date_from; }
    if ($date_to_valid)   { $sql_r .= " AND DATE(r.refunds_date) <= ?"; $types_r .= 's'; $params_r[] = $date_to; }
    $stmt_r = $conn->prepare($sql_r);
    if (!empty($params_r)) { $stmt_r->bind_param($types_r, ...$params_r); }
    $stmt_r->execute();
    $res_r = $stmt_r->get_result();
    while ($row = $res_r->fetch_assoc()) {
        $amount = (float)$row['refunds_amount'];
        $entries[] = [
            'type' => 'refund',
            'id' => (int)$row['refunds_id'],
            'client_id' => $client_id,
            'client_name' => $client_name,
            'date' => $row['refunds_date'],
            'status' => null,
            'reference' => (string)$row['refunds_id'],
            'method' => $row['payment_methods_name'] ?? null,
            'debit' => $amount,
            'credit' => 0.0,
            'amount_signed' => -$amount
        ];
        $total_credit += $amount;
    }
    $stmt_r->close();

    // Sort entries by date desc, then by type/id desc for stability
    usort($entries, function($a, $b) {
        $dateA = strtotime($a['date'] ?? '1970-01-01 00:00:00');
        $dateB = strtotime($b['date'] ?? '1970-01-01 00:00:00');
        if ($dateA === $dateB) {
            // Secondary sort by type then id
            $typeCmp = strcmp((string)$b['type'], (string)$a['type']); // reverse for desc
            if ($typeCmp !== 0) return $typeCmp;
            return ($b['id'] <=> $a['id']);
        }
        return $dateB <=> $dateA; // newest first
    });

    $response = [
        'client_id' => $client_id,
        'client_name' => $client_name,
        'totals' => [
            'debit_total' => round($total_debit, 2),
            'credit_total' => round($total_credit, 2),
            'net_total' => round($total_debit - $total_credit, 2)
        ],
        'entries' => $entries,
        'filters' => [
            'date_from' => $date_from_valid ? $date_from : null,
            'date_to' => $date_to_valid ? $date_to : null
        ]
    ];

    print_success('Client account statement generated successfully.', $response);

} catch (Exception $e) {
    print_failure('Internal Error: ' . $e->getMessage());
} finally {
    if (isset($conn)) { $conn->close(); }
}

?>
