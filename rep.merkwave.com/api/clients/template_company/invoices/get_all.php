<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_all

    $client_id = $_GET['client_id'] ?? $_POST['client_id'] ?? null;
    $user_id   = $_GET['user_id']   ?? $_POST['user_id']   ?? null; // Representative user ID

    $sql = "
        SELECT 
            inv.invoices_id,
            inv.invoices_client_id,
            c.clients_company_name,
            c.clients_rep_user_id,
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
    ";

    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($client_id) && is_numeric($client_id)) {
        $where_clauses[] = "inv.invoices_client_id = ?";
        $bind_types .= "i";
        $bind_params[] = $client_id;
    } else if (!empty($client_id)) { // If not empty but invalid
        print_failure("Error: Invalid client ID provided.");
    }

    if (!empty($user_id) && is_numeric($user_id)) {
        $where_clauses[] = "c.clients_rep_user_id = ?";
        $bind_types .= "i";
        $bind_params[] = $user_id;
    } else if (!empty($user_id)) { // If not empty but invalid
        print_failure("Error: Invalid user ID provided.");
    }

    if (!empty($where_clauses)) {
        $sql .= " WHERE " . implode(" AND ", $where_clauses);
    }

    $sql .= " ORDER BY inv.invoices_date DESC";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    if (!empty($bind_params)) {
        $stmt->bind_param($bind_types, ...$bind_params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();

    $invoices = [];
    while ($row = $result->fetch_assoc()) {
        $invoices[] = $row;
    }

    print_success("Invoices retrieved successfully.", $invoices);

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
