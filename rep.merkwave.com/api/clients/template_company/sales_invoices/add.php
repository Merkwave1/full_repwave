<?php
// File: /sales_invoices/add.php
// Description: Creates a new sales invoice and its associated items.

require_once '../db_connect.php'; // Contains connection, print_success, print_failure, and authorization functions

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // --- Authorization ---
     // Assuming rep authorization is sufficient

    // --- INPUT GATHERING from $_POST ---
    $sales_order_id = $_POST['sales_invoice_sales_order_id'] ?? null;
    $client_id = $_POST['sales_invoice_client_id'] ?? null;
    $invoice_number = $_POST['sales_invoice_number'] ?? null;
    $issue_date = $_POST['sales_invoice_issue_date'] ?? date('Y-m-d');
    $due_date = $_POST['sales_invoice_due_date'] ?? null;
    $subtotal = $_POST['sales_invoice_subtotal'] ?? 0;
    $discount_amount = $_POST['sales_invoice_discount_amount'] ?? 0;
    $tax_amount = $_POST['sales_invoice_tax_amount'] ?? 0;
    $total_amount = $_POST['sales_invoice_total_amount'] ?? 0;
    $amount_paid = $_POST['sales_invoice_amount_paid'] ?? 0;
    $status = $_POST['sales_invoice_status'] ?? 'Draft';
    $notes = $_POST['sales_invoice_notes'] ?? null;
    $items_json = $_POST['items'] ?? '[]';
    $items = json_decode($items_json, true);

    // Handle empty strings for nullable fields
    if ($sales_order_id === "" || $sales_order_id === "0") $sales_order_id = null;
    if ($notes === "") $notes = null;
    if ($due_date === "") $due_date = null;

    // --- VALIDATION ---
    if (empty($client_id) || !is_numeric($client_id)) print_failure("Error: Valid Client ID is required.");
    if (empty($invoice_number)) print_failure("Error: Invoice Number is required.");
    if (empty($issue_date)) print_failure("Error: Issue Date is required.");
    if (empty($due_date)) print_failure("Error: Due Date is required.");
    if (!is_array($items) || count($items) == 0) print_failure("Error: At least one invoice item is required.");

    // Start a transaction
    $conn->begin_transaction();

    // --- INSERT SALES INVOICE ---
    $columns = [
        'sales_invoice_client_id',
        'sales_invoice_number',
        'sales_invoice_issue_date',
        'sales_invoice_due_date',
        'sales_invoice_subtotal',
        'sales_invoice_discount_amount',
        'sales_invoice_tax_amount',
        'sales_invoice_total_amount',
        'sales_invoice_amount_paid',
        'sales_invoice_status',
        'sales_invoice_notes'
    ];
    $placeholders = array_fill(0, count($columns), '?');
    $bind_types = "isssddddds"; // client_id, number, issue_date, due_date, subtotal, discount, tax, total, paid, status, notes
    $bind_values = [
        $client_id,
        $invoice_number,
        $issue_date,
        $due_date,
        $subtotal,
        $discount_amount,
        $tax_amount,
        $total_amount,
        $amount_paid,
        $status,
        $notes
    ];

    // Conditionally add sales_invoice_sales_order_id
    if ($sales_order_id !== null) {
        array_splice($columns, 1, 0, 'sales_invoice_sales_order_id'); // Insert after client_id
        array_splice($placeholders, 1, 0, '?');
        $bind_types = substr_replace($bind_types, 'i', 1, 0); // Insert 'i' for integer type
        array_splice($bind_values, 1, 0, $sales_order_id);
    }

    $sql_columns = implode(', ', $columns);
    $sql_placeholders = implode(', ', $placeholders);

    $stmt = $conn->prepare(
        "INSERT INTO sales_invoices 
        ($sql_columns)
        VALUES ($sql_placeholders)"
    );
    $stmt->bind_param($bind_types, ...$bind_values);
    $stmt->execute();
    $sales_invoice_id = $stmt->insert_id;
    $stmt->close();

    // --- INSERT SALES INVOICE ITEMS ---
    $item_stmt = $conn->prepare(
        "INSERT INTO sales_invoice_items 
        (sales_invoice_item_invoice_id, sales_invoice_item_so_item_id, sales_invoice_item_description, sales_invoice_item_quantity, sales_invoice_item_unit_price, sales_invoice_item_total_price)
        VALUES (?, ?, ?, ?, ?, ?)"
    );

    foreach ($items as $item) {
        $so_item_id = $item['sales_invoice_item_so_item_id'] ?? null;
        $description = $item['sales_invoice_item_description'] ?? null;
        $quantity = $item['sales_invoice_item_quantity'] ?? 0;
        $unit_price = $item['sales_invoice_item_unit_price'] ?? 0;
        $total_price = $item['sales_invoice_item_total_price'] ?? 0;

        if (empty($so_item_id) || !is_numeric($so_item_id)) {
            $conn->rollback();
            print_failure("Error: Valid Sales Order Item ID is required for each invoice item.");
        }
        if (empty($description)) {
            $conn->rollback();
            print_failure("Error: Description is required for each invoice item.");
        }

        $item_stmt->bind_param(
            "iisddd",
            $sales_invoice_id,
            $so_item_id,
            $description,
            $quantity,
            $unit_price,
            $total_price
        );
        $item_stmt->execute();
    }
    $item_stmt->close();

    // Commit transaction
    $conn->commit();

    // --- FETCH THE NEWLY CREATED SALES INVOICE FOR RESPONSE ---
    $fetch_stmt = $conn->prepare("
        SELECT
            si.*,
            c.clients_company_name
        FROM sales_invoices si
        LEFT JOIN clients c ON si.sales_invoice_client_id = c.clients_id
        WHERE si.sales_invoice_id = ?
    ");
    $fetch_stmt->bind_param("i", $sales_invoice_id);
    $fetch_stmt->execute();
    $result = $fetch_stmt->get_result();
    $new_sales_invoice_data = $result->fetch_assoc();
    $fetch_stmt->close();

    // Fetch sales invoice items for the newly created invoice
    $items_fetch_stmt = $conn->prepare("
        SELECT
            sii.*
        FROM sales_invoice_items sii
        WHERE sii.sales_invoice_item_invoice_id = ?
    ");
    $items_fetch_stmt->bind_param("i", $sales_invoice_id);
    $items_fetch_stmt->execute();
    $items_result = $items_fetch_stmt->get_result();
    $new_sales_invoice_data['items'] = [];
    while ($item_row = $items_result->fetch_assoc()) {
        $new_sales_invoice_data['items'][] = $item_row;
    }
    $items_fetch_stmt->close();

    print_success("Sales invoice created successfully.", $new_sales_invoice_data);

} catch (Exception | TypeError $e) {
    $conn->rollback(); // Rollback on any exception
    print_failure("Internal Error: " . $e->getMessage());
}
?>
