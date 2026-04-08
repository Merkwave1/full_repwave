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
    

    $supplier_id          = $_POST['supplier_id']          ?? null;
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
    if (empty($supplier_id)) {
        print_failure("Error: Supplier ID is required.");
    }
    if (empty($supplier_name)) {
        print_failure("Error: Supplier name is required.");
    }
    if ($supplier_email !== null && !filter_var($supplier_email, FILTER_VALIDATE_EMAIL)) {
        print_failure("Error: Invalid supplier email format.");
    }

    // Check if supplier exists
    $check_stmt = $conn->prepare("SELECT supplier_id FROM suppliers WHERE supplier_id = ?");
    if (!$check_stmt) {
        print_failure("Error: Failed to prepare check statement: " . $conn->error);
    }
    $check_stmt->bind_param("i", $supplier_id);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    if ($check_result->num_rows === 0) {
        print_failure("Error: Supplier not found.");
    }
    $check_stmt->close();

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            UPDATE suppliers 
            SET 
                supplier_name = ?, 
                supplier_contact_person = ?, 
                supplier_phone = ?, 
                supplier_email = ?, 
                supplier_address = ?, 
                supplier_notes = ?,
                supplier_updated_at = NOW()
            WHERE supplier_id = ?
        ");

        if (!$stmt) {
            throw new Exception("Prepare failed for update: " . $conn->error);
        }

        $stmt->bind_param("ssssssi", 
            $supplier_name, 
            $supplier_contact_person, 
            $supplier_phone, 
            $supplier_email, 
            $supplier_address, 
            $supplier_notes,
            $supplier_id
        );

        if (!$stmt->execute()) {
            throw new Exception("Error updating supplier: " . $stmt->error);
        }

        $conn->commit();
        print_success("تم تحديث المورد بنجاح.", ['supplier_id' => $supplier_id, 'supplier_name' => $supplier_name]);

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
