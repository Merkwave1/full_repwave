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

    // Pagination
    $page  = max(1, (int) ($_GET['page'] ?? 1));
    $limit = max(1, min(100, (int) ($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    // Filters
    $search           = $_GET['search'] ?? null;
    $transaction_type = $_GET['transaction_type'] ?? null;
    $payment_method_id = $_GET['payment_method_id'] ?? null;
    $safe_id          = $_GET['safe_id'] ?? null;
    $date_from        = $_GET['date_from'] ?? null;
    $date_to          = $_GET['date_to'] ?? null;

    $where  = [];
    $params = [];
    $types  = '';

    // Rep users only see their own safe transactions
    if ($user_role === 'rep') {
        $where[]  = "s.safes_rep_user_id = ?";
        $params[] = $user_id;
        $types   .= 'i';
    }

    if (!empty($transaction_type)) {
        $where[]  = "st.safe_transactions_type = ?";
        $params[] = $transaction_type;
        $types   .= 's';
    }
    if (!empty($safe_id)) {
        $where[]  = "st.safe_transactions_safe_id = ?";
        $params[] = (int) $safe_id;
        $types   .= 'i';
    }
    if (!empty($payment_method_id)) {
        $where[]  = "s.safes_payment_method_id = ?";
        $params[] = (int) $payment_method_id;
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
    if (!empty($search)) {
        $where[]  = "(st.safe_transactions_description LIKE ? OR st.safe_transactions_reference LIKE ? OR s.safes_name LIKE ?)";
        $like     = '%' . $search . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $types   .= 'sss';
    }

    $where_clause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // Count
    $count_sql = "SELECT COUNT(*) AS total FROM safe_transactions st
                  LEFT JOIN safes s ON st.safe_transactions_safe_id = s.safes_id
                  $where_clause";
    $stmt_count = $conn->prepare($count_sql);
    if ($types) $stmt_count->bind_param($types, ...$params);
    $stmt_count->execute();
    $total = (int) $stmt_count->get_result()->fetch_assoc()['total'];
    $stmt_count->close();

    // Data
    $sql = "SELECT
                st.safe_transactions_id,
                st.safe_transactions_safe_id,
                st.safe_transactions_type,
                st.safe_transactions_amount,
                st.safe_transactions_balance_before,
                st.safe_transactions_balance_after,
                st.safe_transactions_description,
                st.safe_transactions_reference,
                st.safe_transactions_date,
                st.safe_transactions_status,
                st.safe_transactions_related_table,
                st.safe_transactions_related_id,
                st.safe_transactions_created_at,
                s.safes_name,
                s.safes_type,
                u.users_name AS created_by_name
            FROM safe_transactions st
            LEFT JOIN safes s ON st.safe_transactions_safe_id = s.safes_id
            LEFT JOIN users u ON st.safe_transactions_created_by = u.users_id
            $where_clause
            ORDER BY st.safe_transactions_date DESC
            LIMIT ? OFFSET ?";

    $params[] = $limit;
    $params[] = $offset;
    $types   .= 'ii';

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $transactions[] = $row;
    }
    $stmt->close();

    print_success("Financial transactions retrieved successfully.", [
        'transactions' => $transactions,
        'pagination' => [
            'current_page' => $page,
            'limit'        => $limit,
            'total_items'  => $total,
            'total_pages'  => (int) ceil($total / $limit)
        ]
    ]);

} catch (Exception $e) {
    print_failure($e->getMessage());
} finally {
    if (isset($conn)) $conn->close();
}
?>