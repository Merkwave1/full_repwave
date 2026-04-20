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
    

    $supplier_name        = $_POST['supplier_name']        ?? null;
    $supplier_contact_person = $_POST['supplier_contact_person'] ?? null;
    $supplier_phone       = $_POST['supplier_phone']       ?? null;
    $supplier_email       = $_POST['supplier_email']       ?? null;
    $supplier_address     = $_POST['supplier_address']     ?? null;
    $supplier_notes       = $_POST['supplier_notes']       ?? null;

    // Handle empty strings for nullable fields
    if ($supplier_contact_person === "") {$supplier_contact_person = null;}
    if ($supplier_phone === "") {$supplier_phone = null;}
    if ($supplier_email === "") {$supplier_email = null;}
    if ($supplier_address === "") {$supplier_address = null;}
    if ($supplier_notes === "") {$supplier_notes = null;}

    // Basic Validation
    if (empty($supplier_name)) {
        print_failure("Error: Supplier name is required.");
    }
    if ($supplier_email !== null && !filter_var($supplier_email, FILTER_VALIDATE_EMAIL)) {
        print_failure("Error: Invalid supplier email format.");
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            INSERT INTO suppliers (
                supplier_name, supplier_contact_person, supplier_phone, 
                supplier_email, supplier_address, supplier_notes,
                supplier_created_at, supplier_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("ssssss", 
            $supplier_name, 
            $supplier_contact_person, 
            $supplier_phone, 
            $supplier_email, 
            $supplier_address, 
            $supplier_notes
        );

        if (!$stmt->execute()) {
            throw new Exception("Error inserting supplier: " . $stmt->error);
        }

    $new_id = $stmt->insert_id;
    $conn->commit();
        print_success("Supplier added successfully.", ['supplier_id' => $new_id, 'supplier_name' => $supplier_name]);

    } catch (Exception $e) {
        $conn->rollback();
        print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
