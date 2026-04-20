<?php

require_once '../db_connect.php'; 
require_once '../functions.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Check authorization using UUID
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? '';
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required for authentication.");
    }

    // Get user information from UUID
    $stmt_user = $conn->prepare("SELECT users_id FROM users WHERE users_uuid = ? LIMIT 1");
    if (!$stmt_user) {
        print_failure("Error: Failed to prepare user lookup statement: " . $conn->error);
    }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $user_result = $stmt_user->get_result();
    $user_data = $user_result->fetch_assoc();
    $stmt_user->close();

    if (!$user_data) {
        print_failure("Error: Invalid user UUID or user not found.");
    }

    $user_id = $user_data['users_id'];

    // Check if user is authorized
    

    $stmt = $conn->prepare("
        SELECT 
            supplier_id, 
            supplier_name, 
            supplier_contact_person, 
            supplier_phone, 
            supplier_email, 
            supplier_address, 
            supplier_notes,
            supplier_balance,
            supplier_created_at,
            supplier_odoo_partner_id
            
        FROM suppliers
        ORDER BY supplier_name ASC
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $suppliers = [];
    while ($row = $result->fetch_assoc()) {
        $suppliers[] = $row;
    }

    print_success("Suppliers retrieved successfully.", $suppliers);

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
