<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_detail

    $invoices_id = $_GET['invoices_id'] ?? $_POST['invoices_id'] ?? null;

    if (empty($invoices_id) || !is_numeric($invoices_id) || $invoices_id <= 0) {
        print_failure("Error: Invoice ID is required.");
    }

    // Fetch main invoice details
    $stmt_invoice = $conn->prepare("
        SELECT 
            inv.invoices_id,
            inv.invoices_client_id,
            c.clients_company_name,
            c.clients_rep_user_id,
            c.clients_email,
           
            inv.invoices_date,
            inv.invoices_due_date,
            inv.invoices_expiration_date,
            inv.invoices_total_amount,
            inv.invoices_status,
            inv.invoices_notes,
            inv.invoices_created_at,
            inv.invoices_updated_at
        FROM invoices inv
        JOIN clients c ON inv.invoices_client_id = c.clients_id
        WHERE inv.invoices_id = ?
    ");

    if (!$stmt_invoice) {
        throw new Exception("Prepare failed for invoice select: " . $conn->error);
    }

    $stmt_invoice->bind_param("i", $invoices_id);
    $stmt_invoice->execute();
    $result_invoice = $stmt_invoice->get_result();

    if ($result_invoice->num_rows === 0) {
        print_failure("Error: Invoice not found.");
    }

    $invoice_data = $result_invoice->fetch_assoc();
    $stmt_invoice->close();

    // Fetch invoice items
    $stmt_items = $conn->prepare("
        SELECT 
            ii.invoice_items_id,
            ii.invoice_items_products_id,
            p.products_name,
            p.products_sku,
            ii.invoice_items_quantity,
            ii.invoice_items_unit_price,
            ii.invoice_items_total_price
        FROM invoice_items ii
        JOIN products p ON ii.invoice_items_products_id = p.products_id
        WHERE ii.invoice_items_invoice_id = ?
        ORDER BY p.products_name ASC
    ");

    if (!$stmt_items) {
        throw new Exception("Prepare failed for invoice items select: " . $conn->error);
    }

    $stmt_items->bind_param("i", $invoices_id);
    $stmt_items->execute();
    $result_items = $stmt_items->get_result();

    $invoice_data['items'] = [];
    while ($item_row = $result_items->fetch_assoc()) {
        $invoice_data['items'][] = $item_row;
    }
    $stmt_items->close();

    print_success("Invoice details retrieved successfully.", $invoice_data);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt_invoice) && $stmt_invoice !== false) {
        $stmt_invoice->close();
    }
    if (isset($stmt_items) && $stmt_items !== false) {
        $stmt_items->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
