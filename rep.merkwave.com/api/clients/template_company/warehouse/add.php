<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
     // Assuming this function exists and works correctly


    $warehouse_name           = $_POST['warehouse_name']           ?? null;
    $warehouse_type           = $_POST['warehouse_type']           ?? 'Main'; // Default to 'Main' as per table schema
    $warehouse_code           = $_POST['warehouse_code']           ?? null;
    $warehouse_address        = $_POST['warehouse_address']        ?? null;
    $warehouse_contact_person = $_POST['warehouse_contact_person'] ?? null;
    $warehouse_phone          = $_POST['warehouse_phone']          ?? null;
    $warehouse_status         = $_POST['warehouse_status']         ?? 'Active'; // Default to 'Active'
    $warehouse_representative_user_id = $_POST['warehouse_representative_user_id'] ?? null;

    // Handle empty strings for nullable fields
    if ($warehouse_address === "") {$warehouse_address = null;}
    if ($warehouse_contact_person === "") {$warehouse_contact_person = null;}
    if ($warehouse_phone === "") {$warehouse_phone = null;}
    if ($warehouse_representative_user_id === "" || $warehouse_representative_user_id === "0") {$warehouse_representative_user_id = null;}

    if (empty($warehouse_name)) {
        print_failure("Error: Warehouse name is required.");
        exit;
    }

    // Validate ENUM types if necessary, though database will reject invalid values
    if (!in_array($warehouse_type, ['Main', 'Van'])) {
        print_failure("Error: Invalid warehouse type. Must be 'Main' or 'Van'.");
        exit;
    }

    // Validate that Van type has a representative
    if ($warehouse_type === 'Van' && empty($warehouse_representative_user_id)) {
        print_failure("Error: Van type warehouses must have a representative user assigned.");
        exit;
    }


    $stmt = $conn->prepare("
        INSERT INTO warehouse (
            warehouse_name, 
            warehouse_type, 
            warehouse_code, 
            warehouse_address, 
            warehouse_contact_person, 
            warehouse_phone,
            warehouse_status,
            warehouse_representative_user_id
            
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
        // Use a transaction to insert and then set the final warehouse_code based on the generated id
        $conn->begin_transaction();

        // If no code provided, create a temporary unique placeholder to satisfy NOT NULL + UNIQUE constraint
        $temp_code = $warehouse_code;
        if (empty($temp_code)) {
            // uniqid ensures temporary uniqueness
            $temp_code = 'TMP_' . uniqid();
        }

        $stmt = $conn->prepare(
            "INSERT INTO warehouse (
                warehouse_name,
                warehouse_type,
                warehouse_code,
                warehouse_address,
                warehouse_contact_person,
                warehouse_phone,
                warehouse_status,
                warehouse_representative_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );

        if (!$stmt) {
            throw new Exception("Prepare failed for insert: " . $conn->error);
        }

        $stmt->bind_param("sssssssi",
            $warehouse_name,
            $warehouse_type,
            $temp_code,
            $warehouse_address,
            $warehouse_contact_person,
            $warehouse_phone,
            $warehouse_status,
            $warehouse_representative_user_id
        );

        if (!$stmt->execute()) {
            $conn->rollback();
            print_failure("Error inserting warehouse: " . $stmt->error);
            exit;
        }

        $new_warehouse_id = $stmt->insert_id;

        // If original warehouse_code was empty, compute final code using type + id
        $final_code = $temp_code;
        if (empty($warehouse_code)) {
            if ($warehouse_type === 'Van') {
                $final_code = 'Van-' . $new_warehouse_id;
            } else {
                // Use a hyphen to match the requested format Main-<id>
                $final_code = 'Main-' . $new_warehouse_id;
            }

            $updateStmt = $conn->prepare("UPDATE warehouse SET warehouse_code = ? WHERE warehouse_id = ?");
            if (!$updateStmt) {
                $conn->rollback();
                throw new Exception("Prepare failed for update: " . $conn->error);
            }
            $updateStmt->bind_param('si', $final_code, $new_warehouse_id);
            if (!$updateStmt->execute()) {
                $updateStmt->close();
                $conn->rollback();
                print_failure("Error updating warehouse code: " . $updateStmt->error);
                exit;
            }
            $updateStmt->close();
        }

        $conn->commit();

        print_success("Warehouse created successfully.", ['warehouse_id' => $new_warehouse_id, 'warehouse_name' => $warehouse_name, 'warehouse_code' => $final_code]);
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
