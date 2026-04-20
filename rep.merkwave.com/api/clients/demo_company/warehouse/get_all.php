<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_all

    $stmt = $conn->prepare("
        SELECT 
            warehouse_id, 
            warehouse_name, 
            warehouse_type, 
            warehouse_code, 
            warehouse_address, 
            warehouse_contact_person, 
            warehouse_phone, 
            warehouse_status,
            warehouse_representative_user_id
            
        FROM warehouse
        ORDER BY warehouse_name ASC
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $warehouses = [];
    while ($row = $result->fetch_assoc()) {
        $warehouses[] = $row;
    }

    print_success("Warehouses retrieved successfully.", $warehouses);

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
