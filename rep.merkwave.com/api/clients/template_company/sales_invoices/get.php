<?php
// File: /

// Description: Retrieves sales invoices. Handles fetching a list with advanced filters OR a single invoice with full details.

require_once '../db_connect.php'; // Contains connection and all helper functions

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // --- Authorization ---
    $auth_user_id = get_user_id_from_uuid_local();
    $auth_user_role = 'rep'; // MOCK: adjust as needed

    if (!$auth_user_id) {
        print_failure("Authorization failed: Could not identify user.");
    }

    // --- Check if fetching a single detailed invoice ---
    $invoice_id_to_fetch = $_GET['id'] ?? null;

    if (!empty($invoice_id_to_fetch) && is_numeric($invoice_id_to_fetch)) {
        // --- LOGIC TO FETCH A SINGLE DETAILED INVOICE ---
        $stmt_invoice = $conn->prepare("
            SELECT si.*,
                   c.clients_company_name,
                   so.sales_orders_id AS sales_order_link_id,
                   so.sales_orders_total_amount AS sales_order_total_amount
            FROM sales_invoices si
            LEFT JOIN clients c ON si.sales_invoice_client_id = c.clients_id
            LEFT JOIN sales_orders so ON si.sales_invoice_sales_order_id = so.sales_orders_id
            WHERE si.sales_invoice_id = ?
        ");
        $stmt_invoice->bind_param("i", $invoice_id_to_fetch);
        $stmt_invoice->execute();
        $invoice = $stmt_invoice->get_result()->fetch_assoc();
        $stmt_invoice->close();

        if (!$invoice) {
            print_failure("Sales Invoice not found.");
        }

        // Security Check: Reps can only view invoices for their clients/orders.
        // This is a simplified check; you might need more complex logic.
        // For now, assuming if they can view the sales order, they can view the invoice.
        // Or, if the client is associated with the rep.
        // For this example, we'll allow reps to view any invoice for now.
        // if ($auth_user_role === 'rep' && !check_rep_access_to_client($auth_user_id, $invoice['sales_invoice_client_id'])) {
        //     print_failure("You are not authorized to view this invoice.", 403);
        // }

        // Fetch associated items for the invoice
        $stmt_items = $conn->prepare("
            SELECT sii.*,
                   pv.variant_name, -- Assuming you want product variant name
                   pt.packaging_types_name -- Assuming you want packaging type name
            FROM sales_invoice_items sii
            LEFT JOIN sales_order_items soi ON sii.sales_invoice_item_so_item_id = soi.sales_order_items_id
            LEFT JOIN product_variants pv ON soi.sales_order_items_variant_id = pv.variant_id
            LEFT JOIN packaging_types pt ON soi.sales_order_items_packaging_type_id = pt.packaging_types_id
            WHERE sii.sales_invoice_item_invoice_id = ?
        ");
        $stmt_items->bind_param("i", $invoice_id_to_fetch);
        $stmt_items->execute();
        $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt_items->close();

        $invoice['items'] = $items;

        print_success("Sales Invoice details retrieved.", $invoice);
        exit();
    }

    // --- LOGIC TO FETCH A LIST OF INVOICES ---
    $page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    $client_id_filter = $_GET['client_id'] ?? null;
    $status_filter = $_GET['status'] ?? null;
    $date_from_filter = $_GET['date_from'] ?? null;
    $date_to_filter = $_GET['date_to'] ?? null;
    $search_query = $_GET['search'] ?? null; // For invoice number or client company name

    $base_query = "FROM sales_invoices si LEFT JOIN clients c ON si.sales_invoice_client_id = c.clients_id";
    $where_clauses = [];
    $params = [];
    $types = "";

    // Security: Reps can only see invoices for clients they are authorized for.
    // This requires a function to get clients associated with a rep.
    // If you need to filter by rep, you'd add a join to users and a where clause.

    if (!empty($client_id_filter) && is_numeric($client_id_filter)) {
        $where_clauses[] = "si.sales_invoice_client_id = ?";
        $params[] = $client_id_filter;
        $types .= "i";
    }
    if (!empty($status_filter)) {
        $where_clauses[] = "si.sales_invoice_status = ?";
        $params[] = $status_filter;
        $types .= "s";
    }
    if (!empty($date_from_filter)) {
        $where_clauses[] = "si.sales_invoice_issue_date >= ?";
        $params[] = $date_from_filter;
        $types .= "s";
    }
    if (!empty($date_to_filter)) {
        $where_clauses[] = "si.sales_invoice_issue_date <= ?";
        $params[] = $date_to_filter;
        $types .= "s";
    }
    if (!empty($search_query)) {
        $where_clauses[] = "(si.sales_invoice_number LIKE ? OR c.clients_company_name LIKE ?)";
        $search_term = "%" . $search_query . "%";
        $params[] = $search_term;
        $params[] = $search_term;
        $types .= "ss";
    }

    $where_sql = !empty($where_clauses) ? " WHERE " . implode(" AND ", $where_clauses) : "";

    // --- GET TOTAL COUNT FOR PAGINATION ---
    $count_query = "SELECT COUNT(si.sales_invoice_id) as total " . $base_query . $where_sql;
    $stmt_count = $conn->prepare($count_query);
    if (!empty($params)) {
        $stmt_count->bind_param($types, ...$params);
    }
    $stmt_count->execute();
    $total_count = $stmt_count->get_result()->fetch_assoc()['total'];
    $total_pages = ceil($total_count / $limit);
    $stmt_count->close();

    // --- GET PAGINATED DATA ---
    // IMPORTANT: Added all required fields for SalesInvoice model in the SELECT statement
    $data_query = "SELECT 
                        si.sales_invoice_id, 
                        si.sales_invoice_number, 
                        si.sales_invoice_issue_date, 
                        si.sales_invoice_due_date, 
                        si.sales_invoice_subtotal, 
                        si.sales_invoice_discount_amount, 
                        si.sales_invoice_tax_amount, 
                        si.sales_invoice_total_amount, 
                        si.sales_invoice_amount_paid, 
                        si.sales_invoice_status, 
                        si.sales_invoice_client_id, 
                        c.clients_company_name 
                    " . $base_query . $where_sql . " ORDER BY si.sales_invoice_issue_date DESC LIMIT ? OFFSET ?";
    
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";

    $stmt_data = $conn->prepare($data_query);
    if (!empty($params)) {
        $stmt_data->bind_param($types, ...$params);
    }
    $stmt_data->execute();
    $invoices = $stmt_data->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt_data->close();
    
    // --- PREPARE AND SEND RESPONSE ---
    $response = [
        'pagination' => [
            'current_page' => $page,
            'limit' => $limit,
            'total_items' => $total_count,
            'total_pages' => $total_pages
        ],
        'data' => $invoices
    ];

    print_success("Sales invoices retrieved successfully.", $response);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage() . " on line " . $e->getLine()); // Added line number for debugging
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
