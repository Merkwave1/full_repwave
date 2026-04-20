<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $user_data = $stmt_user->get_result()->fetch_assoc();
    $stmt_user->close();

    if (!$user_data) {
        print_failure("Error: Invalid user UUID.");
    }

    $user_id   = (int) $user_data['users_id'];
    $user_role = $user_data['users_role'];

    $where  = [];
    $params = [];
    $types  = '';

    $safe_id   = $_GET['safe_id'] ?? null;
    $date_from = $_GET['date_from'] ?? null;
    $date_to   = $_GET['date_to'] ?? null;

    if ($user_role === 'rep') {
        $where[]  = "s.safes_rep_user_id = ?";
        $params[] = $user_id;
        $types   .= 'i';
    }
    if (!empty($safe_id)) {
        $where[]  = "st.safe_transactions_safe_id = ?";
        $params[] = (int) $safe_id;
        $types   .= 'i';
    }
    if (!empty($date_from)) {
        $where[]  = "st.safe_transactions_date >= ?";
        $params[] = $date_from;
        $types   .= 's';
    }
    if (!empty($date_to)) {
        $where[]  = "st.safe_transactions_date <= ?";
        $params[] = $date_to . ' 23:59:59';
        $types   .= 's';
    }

    $where_clause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "SELECT
                COALESCE(SUM(CASE WHEN st.safe_transactions_type IN ('deposit','transfer_in','client_payment') THEN st.safe_transactions_amount ELSE 0 END), 0) AS total_inflow,
                COALESCE(SUM(CASE WHEN st.safe_transactions_type IN ('withdrawal','transfer_out','expense') THEN st.safe_transactions_amount ELSE 0 END), 0) AS total_outflow,
                COUNT(*) AS total_transactions,
                COUNT(DISTINCT st.safe_transactions_safe_id) AS safes_involved
            FROM safe_transactions st
            LEFT JOIN safes s ON st.safe_transactions_safe_id = s.safes_id
            $where_clause";

    $stmt = $conn->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $summary = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Per-safe breakdown
    $sql_safes = "SELECT
                      s.safes_id, s.safes_name, s.safes_type, s.safes_balance,
                      COUNT(st.safe_transactions_id) AS transaction_count,
                      COALESCE(SUM(CASE WHEN st.safe_transactions_type IN ('deposit','transfer_in','client_payment') THEN st.safe_transactions_amount ELSE 0 END), 0) AS inflow,
                      COALESCE(SUM(CASE WHEN st.safe_transactions_type IN ('withdrawal','transfer_out','expense') THEN st.safe_transactions_amount ELSE 0 END), 0) AS outflow
                  FROM safes s
                  LEFT JOIN safe_transactions st ON st.safe_transactions_safe_id = s.safes_id
                  " . ($user_role === 'rep' ? "WHERE s.safes_rep_user_id = $user_id" : "") . "
                  GROUP BY s.safes_id
                  ORDER BY s.safes_id";

    $result_safes = $conn->query($sql_safes);
    $safes = [];
    while ($row = $result_safes->fetch_assoc()) {
        $safes[] = $row;
    }

    print_success("Transactions summary retrieved successfully.", [
        'summary' => $summary,
        'safes'   => $safes
    ]);

} catch (Exception $e) {
    print_failure($e->getMessage());
} finally {
    if (isset($conn)) $conn->close();
}
?>