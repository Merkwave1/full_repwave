<?php
// Get comprehensive visit summary with all related activities and transactions
require_once '../db_connect.php';

try {
    
    
    $visit_id = $_GET['visit_id'] ?? null;
    
    if (empty($visit_id) || !is_numeric($visit_id)) {
        print_failure("Error: Valid visit ID is required.");
        exit;
    }

    // Get visit basic information
    $stmt = $conn->prepare("
        SELECT v.*, c.clients_company_name, c.clients_contact_name,
               u.users_name as rep_name
        FROM visits v
        LEFT JOIN clients c ON v.visits_client_id = c.clients_id
        LEFT JOIN users u ON v.visits_rep_user_id = u.users_id
        WHERE v.visits_id = ?
    ");
    
    $stmt->bind_param("i", $visit_id);
    $stmt->execute();
    $visit_result = $stmt->get_result();
    
    if ($visit_result->num_rows === 0) {
        print_failure("Visit not found.");
        exit;
    }
    
    $visit_data = $visit_result->fetch_assoc();
    
    // Get all visit activities
    $activities_stmt = $conn->prepare("
        SELECT va.*, u.users_name as user_name
        FROM visit_activities va
        LEFT JOIN users u ON va.activity_user_id = u.users_id
        WHERE va.activity_visit_id = ?
        ORDER BY va.activity_timestamp DESC
    ");
    
    $activities_stmt->bind_param("i", $visit_id);
    $activities_stmt->execute();
    $activities_result = $activities_stmt->get_result();
    $activities = $activities_result->fetch_all(MYSQLI_ASSOC);
    
    // Get related sales orders - ONLY visit-specific ones
    // Only return orders directly linked to visit or created through activities during this visit
    $sales_orders_stmt = $conn->prepare("
        SELECT DISTINCT so.*, u.users_name as rep_name, 'direct' as link_type
        FROM sales_orders so
        LEFT JOIN users u ON so.sales_orders_representative_id = u.users_id
        WHERE so.sales_orders_visit_id = ?
        
        UNION ALL
        
        SELECT DISTINCT so.*, u.users_name as rep_name, 'activity' as link_type
        FROM sales_orders so
        LEFT JOIN users u ON so.sales_orders_representative_id = u.users_id
        INNER JOIN visit_activities va ON va.activity_reference_id = so.sales_orders_id
        WHERE va.activity_visit_id = ? AND va.activity_type = 'SalesOrder_Created'
        AND so.sales_orders_id NOT IN (
            SELECT sales_orders_id FROM sales_orders WHERE sales_orders_visit_id = ?
        )
        
        ORDER BY sales_orders_created_at DESC
    ");
    
    $sales_orders_stmt->bind_param("iii", $visit_id, $visit_id, $visit_id);
    $sales_orders_stmt->execute();
    $sales_orders_result = $sales_orders_stmt->get_result();
    $sales_orders = $sales_orders_result->fetch_all(MYSQLI_ASSOC);
    
    // Get payments collected during this visit - ONLY visit-specific ones
    $payments_stmt = $conn->prepare("
        SELECT p.*, pm.payment_methods_name, u.users_name as rep_name
        FROM payments p
        LEFT JOIN payment_methods pm ON p.payments_method_id = pm.payment_methods_id
        LEFT JOIN users u ON p.payments_rep_user_id = u.users_id
        WHERE p.payments_visit_id = ?
        ORDER BY p.payments_date DESC
    ");
    
    $payments_stmt->bind_param("i", $visit_id);
    $payments_stmt->execute();
    $payments_result = $payments_stmt->get_result();
    $payments = $payments_result->fetch_all(MYSQLI_ASSOC);
    
    // Get documents uploaded during this visit - ONLY visit-specific ones
    // Only return documents that were actually uploaded during this visit
    $documents_stmt = $conn->prepare("
        SELECT cd.*, cdt.document_type_name, u.users_name as uploaded_by_name
        FROM client_documents cd
        LEFT JOIN client_document_types cdt ON cd.client_document_type_id = cdt.document_type_id
        LEFT JOIN users u ON cd.client_document_uploaded_by_user_id = u.users_id
        WHERE cd.client_documents_visit_id = ? 
        AND DATE(cd.client_document_created_at) = DATE(?)
        ORDER BY cd.client_document_created_at DESC
    ");
    
    $documents_stmt->bind_param("is", $visit_id, $visit_data['visits_start_time']);
    $documents_stmt->execute();
    $documents_result = $documents_stmt->get_result();
    $documents = $documents_result->fetch_all(MYSQLI_ASSOC);
    
    // Get returns initiated during this visit - ONLY visit-specific ones
    $returns_stmt = $conn->prepare("
        SELECT sr.*, u.users_name as rep_name
        FROM sales_returns sr
        LEFT JOIN users u ON sr.returns_created_by_user_id = u.users_id
        WHERE sr.sales_returns_visit_id = ?
        OR (sr.returns_client_id = ? AND DATE(sr.returns_created_at) = DATE(?))
        ORDER BY sr.returns_created_at DESC
    ");
    
    $returns_stmt->bind_param("iis", $visit_id, $visit_data['visits_client_id'], $visit_data['visits_start_time']);
    $returns_stmt->execute();
    $returns_result = $returns_stmt->get_result();
    $returns = $returns_result->fetch_all(MYSQLI_ASSOC);
    
    // Prepare comprehensive response
    $summary = [
        'visit_info' => $visit_data,
        'activities' => $activities,
        'sales_orders' => $sales_orders,
        'payments' => $payments,
        'documents' => $documents,
        'returns' => $returns,
        'summary_stats' => [
            'total_activities' => count($activities),
            'total_sales_orders' => count($sales_orders),
            'total_payments' => count($payments),
            'total_documents' => count($documents),
            'total_returns' => count($returns),
            'total_sales_amount' => array_sum(array_column($sales_orders, 'sales_orders_total_amount')),
            'total_payments_amount' => array_sum(array_column($payments, 'payments_amount')),
        ]
    ];
    
    print_success("Visit summary retrieved successfully.", $summary);
    
} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) { $stmt->close(); }
    if (isset($activities_stmt) && $activities_stmt !== false) { $activities_stmt->close(); }
    if (isset($sales_orders_stmt) && $sales_orders_stmt !== false) { $sales_orders_stmt->close(); }
    if (isset($payments_stmt) && $payments_stmt !== false) { $payments_stmt->close(); }
    if (isset($documents_stmt) && $documents_stmt !== false) { $documents_stmt->close(); }
    if (isset($returns_stmt) && $returns_stmt !== false) { $returns_stmt->close(); }
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
