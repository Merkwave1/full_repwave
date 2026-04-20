<?php
// Add CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, User-UUID, x-user-uuid');
header('Content-Type: application/json');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Inputs
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    $safe_id = $_GET['safe_id'] ?? $_POST['safe_id'] ?? null;
    $search = $_GET['search'] ?? $_POST['search'] ?? '';
    $transaction_type = $_GET['transaction_type'] ?? $_POST['transaction_type'] ?? ''; // credit, debit, all
    $payment_method_id = $_GET['payment_method_id'] ?? $_POST['payment_method_id'] ?? '';
    $status = $_GET['status'] ?? $_POST['status'] ?? '';
    $page = isset($_GET['page']) && is_numeric($_GET['page']) && (int)$_GET['page'] > 0 ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) && (int)$_GET['limit'] > 0 ? min(100, (int)$_GET['limit']) : 20;
    $offset = ($page - 1) * $limit;

    if (empty($users_uuid)) {
        echo json_encode(['status' => 'error', 'message' => 'Error: User UUID is required.']);
        exit;
    }
    if (empty($safe_id) || !is_numeric($safe_id)) {
        echo json_encode(['status' => 'error', 'message' => 'Error: Safe ID is required.']);
        exit;
    }

    // Get user ID and role from UUID
    $user_stmt = $conn->prepare("SELECT users_id, users_role, users_name FROM users WHERE users_uuid = ?");
    if (!$user_stmt) {
        throw new Exception("Prepare failed for user lookup: " . $conn->error);
    }
    $user_stmt->bind_param("s", $users_uuid);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    if ($user_result->num_rows === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Error: Invalid user UUID.']);
        exit;
    }
    $user_row = $user_result->fetch_assoc();
    $user_id = (int)$user_row['users_id'];
    $user_role = $user_row['users_role'];
    $user_stmt->close();

    // Check if safe exists and user has permission to access it
    $safe_stmt = $conn->prepare("SELECT safes_id, safes_name, safes_type, safes_rep_user_id FROM safes WHERE safes_id = ?");
    $safe_stmt->bind_param("i", $safe_id);
    $safe_stmt->execute();
    $safe_result = $safe_stmt->get_result();
    if ($safe_result->num_rows === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Error: Safe not found.']);
        exit;
    }
    $safe_row = $safe_result->fetch_assoc();
    $safe_stmt->close();

    // Permissions
    if ($user_role === 'rep') {
        if ($safe_row['safes_type'] === 'rep' && (int)$safe_row['safes_rep_user_id'] !== $user_id) {
            echo json_encode(['status' => 'error', 'message' => 'Error: Access denied. You can only access your own safe.']);
            exit;
        }
        if ($safe_row['safes_type'] === 'company') {
            echo json_encode(['status' => 'error', 'message' => 'Error: Access denied. Reps cannot access company safes.']);
            exit;
        }
    }

    // Build WHERE clause for filters
    $where_conditions = ["st.safe_transactions_safe_id = ?"];
    $count_params = [$safe_id];
    $count_types = 'i';
    
    // Apply search filter (description, reference, amount, payment method, created by)
    if (!empty($search)) {
        $search_param = '%' . $search . '%';
        $where_conditions[] = "(st.safe_transactions_description LIKE ? OR st.safe_transactions_reference LIKE ? OR CAST(st.safe_transactions_amount AS CHAR) LIKE ? OR pm.payment_methods_name LIKE ? OR u.users_name LIKE ? OR CAST(st.safe_transactions_id AS CHAR) LIKE ?)";
        $count_types .= 'ssssss';
        $count_params[] = $search_param;
        $count_params[] = $search_param;
        $count_params[] = $search_param;
        $count_params[] = $search_param;
        $count_params[] = $search_param;
        $count_params[] = $search_param;
    }
    
    // Apply transaction type filter
    if (!empty($transaction_type) && $transaction_type !== 'all') {
        $where_conditions[] = "st.safe_transactions_type = ?";
        $count_types .= 's';
        $count_params[] = $transaction_type;
    }
    
    // Apply payment method filter
    if (!empty($payment_method_id) && is_numeric($payment_method_id)) {
        $where_conditions[] = "st.safe_transactions_payment_method_id = ?";
        $count_types .= 'i';
        $count_params[] = (int)$payment_method_id;
    }
    
    // Apply status filter
    if (!empty($status)) {
        $where_conditions[] = "st.safe_transactions_status = ?";
        $count_types .= 's';
        $count_params[] = $status;
    }
    
    $where_clause = implode(' AND ', $where_conditions);

    // Count total transactions for this safe with filters
    $sql_count = "SELECT COUNT(*) AS cnt FROM safe_transactions st
                  LEFT JOIN payment_methods pm ON st.safe_transactions_payment_method_id = pm.payment_methods_id
                  LEFT JOIN users u ON st.safe_transactions_created_by = u.users_id
                  WHERE " . $where_clause;
    $stmt_count = $conn->prepare($sql_count);
    if (!$stmt_count) {
        throw new Exception("Prepare failed for count query: " . $conn->error);
    }
    $stmt_count->bind_param($count_types, ...$count_params);
    $stmt_count->execute();
    $res_count = $stmt_count->get_result();
    $rowc = $res_count->fetch_assoc();
    $total_items = (int)($rowc['cnt'] ?? 0);
    $total_pages = $limit > 0 ? (int)ceil($total_items / $limit) : 0;
    $stmt_count->close();

    // Get safe transactions with payment method information (paged and filtered)
    $sql = "
        SELECT 
            st.safe_transactions_id,
            st.safe_transactions_safe_id,
            st.safe_transactions_type,
            st.safe_transactions_payment_method_id,
            st.safe_transactions_amount,
            st.safe_transactions_balance_before,
            st.safe_transactions_balance_after,
            st.safe_transactions_description,
            st.safe_transactions_reference,
            st.safe_transactions_date,
            st.safe_transactions_created_at,
            st.safe_transactions_created_by,
            st.safe_transactions_status,
            st.safe_transactions_receipt_image,
            pm.payment_methods_name,
            pm.payment_methods_description as payment_method_description,
            pm.payment_methods_type as payment_method_type,
            u.users_name as created_by_name,
            u.users_role as created_by_role
        FROM safe_transactions st
        LEFT JOIN payment_methods pm ON st.safe_transactions_payment_method_id = pm.payment_methods_id
        LEFT JOIN users u ON st.safe_transactions_created_by = u.users_id
        WHERE " . $where_clause . "
        ORDER BY st.safe_transactions_date DESC, st.safe_transactions_id DESC
        LIMIT ? OFFSET ?
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed for transactions select: " . $conn->error);
    }
    $data_types = $count_types . 'ii';
    $data_params = array_merge($count_params, [$limit, $offset]);
    $stmt->bind_param($data_types, ...$data_params);
    $stmt->execute();
    $result = $stmt->get_result();

    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $transactions[] = [
            'safe_transactions_id' => (int)$row['safe_transactions_id'],
            'safe_transactions_safe_id' => (int)$row['safe_transactions_safe_id'],
            'safe_transactions_type' => $row['safe_transactions_type'],
            'safe_transactions_payment_method_id' => $row['safe_transactions_payment_method_id'] ? (int)$row['safe_transactions_payment_method_id'] : null,
            'safe_transactions_amount' => $row['safe_transactions_amount'],
            'safe_transactions_balance_before' => $row['safe_transactions_balance_before'],
            'safe_transactions_balance_after' => $row['safe_transactions_balance_after'],
            'safe_transactions_description' => $row['safe_transactions_description'],
            'safe_transactions_reference' => $row['safe_transactions_reference'],
            'safe_transactions_date' => $row['safe_transactions_date'],
            'safe_transactions_created_at' => $row['safe_transactions_created_at'],
            'safe_transactions_created_by' => $row['safe_transactions_created_by'] ? (int)$row['safe_transactions_created_by'] : null,
            'safe_transactions_status' => $row['safe_transactions_status'] ?? 'approved',
            'safe_transactions_receipt_image' => $row['safe_transactions_receipt_image'],
            'payment_method_name' => $row['payment_methods_name'] ?? 'نقدي',
            'payment_method_description' => $row['payment_method_description'] ?? 'نقدي - دفع نقدي مباشر',
            'payment_method_type' => $row['payment_method_type'] ?? 'cash',
            'created_by_name' => $row['created_by_name'],
            'created_by_role' => $row['created_by_role']
        ];
    }
    $stmt->close();

    $has_more = $page < $total_pages;

    echo json_encode([
        'status' => 'success',
        'message' => 'Safe transactions retrieved successfully.',
        'data' => $transactions,
        'count' => count($transactions),
        'pagination' => [
            'current_page' => $page,
            'limit' => $limit,
            'total_items' => $total_items,
            'total_pages' => $total_pages,
            'has_more' => $has_more
        ],
        'filters_applied' => [
            'search' => !empty($search),
            'transaction_type' => !empty($transaction_type) && $transaction_type !== 'all',
            'payment_method_id' => !empty($payment_method_id),
            'status' => !empty($status)
        ]
    ]);

} catch (Exception | TypeError $e) {
    echo json_encode(['status' => 'error', 'message' => 'Internal Error: ' . $e->getMessage()]);
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
