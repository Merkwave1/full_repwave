<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
     // Assuming this function exists and works correctly



    $warehouse_id             = $_POST['warehouse_id']             ?? null;
    $warehouse_name           = $_POST['warehouse_name']           ?? null;
    $warehouse_type           = $_POST['warehouse_type']           ?? null;
    $warehouse_code           = $_POST['warehouse_code']           ?? null;
    $warehouse_address        = $_POST['warehouse_address']        ?? null;
    $warehouse_contact_person = $_POST['warehouse_contact_person'] ?? null;
    $warehouse_phone          = $_POST['warehouse_phone']          ?? null;
    $warehouse_status         = $_POST['warehouse_status']         ?? null;
    $warehouse_representative_user_id = $_POST['warehouse_representative_user_id'] ?? null;

    if (empty($warehouse_id) || !is_numeric($warehouse_id) || $warehouse_id <= 0) {
        print_failure("Error: Valid Warehouse ID is required for update.");
        exit;
    }

    // Handle empty strings for nullable fields to set them to NULL in DB
    if (array_key_exists('warehouse_address', $_POST) && $_POST['warehouse_address'] === "") {$warehouse_address = null;}
    if (array_key_exists('warehouse_contact_person', $_POST) && $_POST['warehouse_contact_person'] === "") {$warehouse_contact_person = null;}
    if (array_key_exists('warehouse_phone', $_POST) && $_POST['warehouse_phone'] === "") {$warehouse_phone = null;}
    if (array_key_exists('warehouse_representative_user_id', $_POST) && ($_POST['warehouse_representative_user_id'] === "" || $_POST['warehouse_representative_user_id'] === "0")) {$warehouse_representative_user_id = null;}


    $update_fields = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($warehouse_name)) {
        $update_fields[] = "warehouse_name = ?";
        $bind_types .= "s";
        $bind_params[] = $warehouse_name;
    }
    if (!empty($warehouse_type)) {
        if (!in_array($warehouse_type, ['Main', 'Van'])) {
            print_failure("Error: Invalid warehouse type. Must be 'Main' or 'Van'.");
            exit;
        }
        $update_fields[] = "warehouse_type = ?";
        $bind_types .= "s";
        $bind_params[] = $warehouse_type;
    }
    if (!empty($warehouse_code)) {
        $update_fields[] = "warehouse_code = ?";
        $bind_types .= "s";
        $bind_params[] = $warehouse_code;
    }
    if (array_key_exists('warehouse_address', $_POST)) {
        $update_fields[] = "warehouse_address = ?";
        $bind_types .= "s";
        $bind_params[] = $warehouse_address;
    }
    if (array_key_exists('warehouse_contact_person', $_POST)) {
        $update_fields[] = "warehouse_contact_person = ?";
        $bind_types .= "s";
        $bind_params[] = $warehouse_contact_person;
    }
    if (array_key_exists('warehouse_phone', $_POST)) {
        $update_fields[] = "warehouse_phone = ?";
        $bind_types .= "s";
        $bind_params[] = $warehouse_phone;
    }
    if (!empty($warehouse_status)) {
        if (!in_array($warehouse_status, ['Active', 'Inactive', 'Under Maintenance'])) {
            print_failure("Error: Invalid warehouse status. Must be 'Active', 'Inactive', or 'Under Maintenance'.");
            exit;
        }
        $update_fields[] = "warehouse_status = ?";
        $bind_types .= "s";
        $bind_params[] = $warehouse_status;
    }
    if (array_key_exists('warehouse_representative_user_id', $_POST)) {
        $update_fields[] = "warehouse_representative_user_id = ?";
        $bind_types .= "i";
        $bind_params[] = $warehouse_representative_user_id;
    }

    // Validate Van type constraints
    if (!empty($warehouse_type) && $warehouse_type === 'Van' && $warehouse_representative_user_id === null) {
        print_failure("Error: Van type warehouses must have a representative user assigned.");
        exit;
    }

    if (empty($update_fields)) {
        print_failure("Error: No valid fields provided for update.");
        exit;
    }

    $sql = "UPDATE warehouse SET " . implode(", ", $update_fields) . " WHERE warehouse_id = ?";
    $bind_types .= "i"; 
    $bind_params[] = $warehouse_id;

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("Prepare failed for update: " . $conn->error);
    }

    $stmt->bind_param($bind_types, ...$bind_params);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            print_success("Warehouse updated successfully.", ['warehouse_id' => $warehouse_id]);
        } else {
            print_failure("Error: Warehouse with ID " . $warehouse_id . " not found or no changes were made.");
        }
    } else {
        print_failure("Error updating warehouse: " . $stmt->error);
    }
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
