<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_detail

    $warehouse_id = $_GET['warehouse_id'] ?? $_POST['warehouse_id'] ?? null;

    if (empty($warehouse_id) || !is_numeric($warehouse_id) || $warehouse_id <= 0) {
        print_failure("Error: Warehouse ID is required.");
        exit;
    }

    $stmt = $conn->prepare("
        SELECT 
            warehouse_id, 
            warehouse_name, 
            warehouse_type, 
            warehouse_code, 
            warehouse_address, 
            warehouse_contact_person, 
            warehouse_phone, 
            warehouse_status
            
        FROM warehouse
        WHERE warehouse_id = ?
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->bind_param("i", $warehouse_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        print_failure("Error: Warehouse not found.");
        exit;
    }

    $warehouse_data = $result->fetch_assoc();
    print_success("Warehouse details retrieved successfully.", $warehouse_data);

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
