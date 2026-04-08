<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_detail

    $returns_id = $_GET['returns_id'] ?? $_POST['returns_id'] ?? null;

    if (empty($returns_id) || !is_numeric($returns_id) || $returns_id <= 0) {
        print_failure("Error: Return ID is required.");
    }

    // Fetch main return details
    $stmt_return = $conn->prepare("
        SELECT 
            r.returns_id,
            r.returns_client_id,
            c.clients_company_name,
            r.returns_invoice_id,
            inv.invoices_date AS original_invoice_date,
            r.returns_date,
            r.returns_reason,
            r.returns_total_amount,
            r.returns_status,
            r.returns_notes,
            r.returns_created_at,
            r.returns_updated_at
        FROM returns r
        JOIN clients c ON r.returns_client_id = c.clients_id
        LEFT JOIN invoices inv ON r.returns_invoice_id = inv.invoices_id
        WHERE r.returns_id = ?
    ");

    if (!$stmt_return) {
        throw new Exception("Prepare failed for return select: " . $conn->error);
    }

    $stmt_return->bind_param("i", $returns_id);
    $stmt_return->execute();
    $result_return = $stmt_return->get_result();

    if ($result_return->num_rows === 0) {
        print_failure("Error: Return not found.");
    }

    $return_data = $result_return->fetch_assoc();
    $stmt_return->close();

    // Fetch return items
    $stmt_items = $conn->prepare("
        SELECT 
            ri.return_items_id,
            ri.return_items_products_id,
            p.products_name,
            p.products_sku,
            ri.return_items_quantity,
            ri.return_items_unit_price,
            ri.return_items_total_price,
            ri.return_items_notes
        FROM return_items ri
        JOIN products p ON ri.return_items_products_id = p.products_id
        WHERE ri.return_items_return_id = ?
        ORDER BY p.products_name ASC
    ");

    if (!$stmt_items) {
        throw new Exception("Prepare failed for return items select: " . $conn->error);
    }

    $stmt_items->bind_param("i", $returns_id);
    $stmt_items->execute();
    $result_items = $stmt_items->get_result();

    $return_data['items'] = [];
    while ($item_row = $result_items->fetch_assoc()) {
        $return_data['items'][] = $item_row;
    }
    $stmt_items->close();

    print_success("Return details retrieved successfully.", $return_data);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt_return) && $stmt_return !== false) {
        $stmt_return->close();
    }
    if (isset($stmt_items) && $stmt_items !== false) {
        $stmt_items->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
