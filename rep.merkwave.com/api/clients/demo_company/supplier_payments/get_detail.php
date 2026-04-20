<?php

require_once '../db_connect.php';
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get user UUID and validate
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
        exit;
    }

    // Validate user UUID and get user information
    $sql_user = "SELECT users_id, users_role FROM users WHERE users_uuid = ?";
    $stmt_user = $conn->prepare($sql_user);
    if (!$stmt_user) {
        throw new Exception("Prepare failed for user query: " . $conn->error);
    }
    
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();
    
    if (!$user_data) {
        print_failure("Error: Invalid user UUID.");
        exit;
    }
    
    $users_id = $user_data['users_id'];
    $users_role = $user_data['users_role'];
    
        // Check permissions - only admin, manager, employee, and cash role can view supplier payment details
    if (!in_array($users_role, ['admin', 'manager', 'employee', 'cash'])) {
        print_failure("Error: Insufficient permissions.");
        exit;
    }

    // Get supplier payment ID
    $payment_id = $_GET['id'] ?? $_POST['id'] ?? null;

    if (empty($payment_id) || !is_numeric($payment_id)) {
        print_failure("Error: Valid supplier payment ID is required.");
        exit;
    }

    // Get supplier payment details
    $sql = "
        SELECT 
            sp.supplier_payments_id,
            sp.supplier_payments_supplier_id,
            sp.supplier_payments_method_id,
            sp.supplier_payments_amount,
            sp.supplier_payments_date,
            sp.supplier_payments_transaction_id,
            sp.supplier_payments_notes,
            sp.supplier_payments_rep_user_id,
            sp.supplier_payments_safe_id,
            sp.supplier_payments_safe_transaction_id,
            sp.supplier_payments_purchase_order_id,
            sp.supplier_payments_type,
            sp.supplier_payments_status,
            sp.supplier_payments_created_at,
            sp.supplier_payments_updated_at,
            -- Supplier information
            s.supplier_name,
            s.supplier_contact_person,
            s.supplier_phone,
            s.supplier_email,
            s.supplier_address,
            s.supplier_balance,
            s.supplier_notes as supplier_notes,
            -- Payment method information
            pm.payment_methods_name as payment_method_name,
            pm.payment_methods_description as payment_method_description,
            -- User information
            u.users_name as rep_user_name,
            u.users_email as rep_user_email,
            u.users_phone as rep_user_phone,
            -- Safe information
            sf.safes_name as safe_name,
            sf.safes_description as safe_description,
            NULL as safe_location,
            -- Safe transaction information
            st.safe_transactions_type as safe_transaction_type,
            st.safe_transactions_amount as safe_transaction_amount,
            st.safe_transactions_description as safe_transaction_description,
            st.safe_transactions_date as safe_transaction_date,
            -- Purchase order information (if linked)
            po.purchase_orders_id as purchase_order_id,
            po.purchase_orders_total_amount as purchase_order_total,
            po.purchase_orders_status as purchase_order_status,
            po.purchase_orders_order_date as purchase_order_date,
            po.purchase_orders_expected_delivery_date as purchase_order_expected_delivery,
            po.purchase_orders_actual_delivery_date as purchase_order_actual_delivery,
            po.purchase_orders_notes as purchase_order_notes
        FROM supplier_payments sp
        LEFT JOIN suppliers s ON sp.supplier_payments_supplier_id = s.supplier_id
        LEFT JOIN payment_methods pm ON sp.supplier_payments_method_id = pm.payment_methods_id
        LEFT JOIN users u ON sp.supplier_payments_rep_user_id = u.users_id
        LEFT JOIN safes sf ON sp.supplier_payments_safe_id = sf.safes_id
        LEFT JOIN safe_transactions st ON sp.supplier_payments_safe_transaction_id = st.safe_transactions_id
        LEFT JOIN purchase_orders po ON sp.supplier_payments_purchase_order_id = po.purchase_orders_id
        WHERE sp.supplier_payments_id = ?
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("i", $payment_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        print_failure("Error: Supplier payment not found.");
        exit;
    }

    $payment_data = $result->fetch_assoc();
    $stmt->close();

    // Get related payments for this supplier (recent ones)
    $sql_related = "
        SELECT 
            sp.supplier_payments_id,
            sp.supplier_payments_amount,
            sp.supplier_payments_date,
            sp.supplier_payments_type,
            sp.supplier_payments_status,
            pm.payment_methods_name as payment_method_name
        FROM supplier_payments sp
        LEFT JOIN payment_methods pm ON sp.supplier_payments_method_id = pm.payment_methods_id
        WHERE sp.supplier_payments_supplier_id = ? 
        AND sp.supplier_payments_id != ?
        ORDER BY sp.supplier_payments_date DESC
        LIMIT 10
    ";

    $stmt_related = $conn->prepare($sql_related);
    $stmt_related->bind_param("ii", $payment_data['supplier_payments_supplier_id'], $payment_id);
    $stmt_related->execute();
    $related_result = $stmt_related->get_result();

    $related_payments = [];
    while ($row = $related_result->fetch_assoc()) {
        $related_payments[] = $row;
    }
    $stmt_related->close();

    // Get supplier's payment summary
    $sql_summary = "
        SELECT 
            COUNT(*) as total_payments,
            SUM(supplier_payments_amount) as total_amount_paid,
            MAX(supplier_payments_date) as last_payment_date,
            MIN(supplier_payments_date) as first_payment_date
        FROM supplier_payments
        WHERE supplier_payments_supplier_id = ?
        AND supplier_payments_status = 'approved'
    ";

    $stmt_summary = $conn->prepare($sql_summary);
    $stmt_summary->bind_param("i", $payment_data['supplier_payments_supplier_id']);
    $stmt_summary->execute();
    $summary_result = $stmt_summary->get_result();
    $payment_summary = $summary_result->fetch_assoc();
    $stmt_summary->close();

    $response_data = [
        'payment_details' => $payment_data,
        'related_payments' => $related_payments,
        'payment_summary' => $payment_summary
    ];

    print_success("Supplier payment details retrieved successfully.", $response_data);

} catch (Exception $e) {
    print_failure( $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}

?>
