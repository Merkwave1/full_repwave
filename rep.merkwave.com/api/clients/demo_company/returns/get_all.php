<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_all

    $client_id = $_GET['client_id'] ?? $_POST['client_id'] ?? null;
    $invoice_id = $_GET['invoice_id'] ?? $_POST['invoice_id'] ?? null;

    $sql = "
        SELECT 
            r.returns_id,
            r.returns_client_id,
            c.clients_company_name,
            r.returns_invoice_id,
            inv.invoices_date AS original_invoice_date, -- From invoices table
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
    ";

    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($client_id) && is_numeric($client_id)) {
        $where_clauses[] = "r.returns_client_id = ?";
        $bind_types .= "i";
        $bind_params[] = $client_id;
    } else if (!empty($client_id)) { 
        print_failure("Error: Invalid client ID provided.");
    }

    if (!empty($invoice_id) && is_numeric($invoice_id)) {
        $where_clauses[] = "r.returns_invoice_id = ?";
        $bind_types .= "i";
        $bind_params[] = $invoice_id;
    } else if (!empty($invoice_id)) { 
        print_failure("Error: Invalid invoice ID provided.");
    }

    if (!empty($where_clauses)) {
        $sql .= " WHERE " . implode(" AND ", $where_clauses);
    }

    $sql .= " ORDER BY r.returns_date DESC";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    if (!empty($bind_params)) {
        $stmt->bind_param($bind_types, ...$bind_params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();

    $returns = [];
    while ($row = $result->fetch_assoc()) {
        $returns[] = $row;
    }

    print_success("Returns retrieved successfully.", $returns);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
