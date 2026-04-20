<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get user_id from query parameter
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    
    if ($user_id <= 0) {
        throw new Exception("معرف المستخدم غير صالح");
    }
    
    // Query to get all warehouses assigned to this user
    $query = "SELECT 
                uw.user_warehouse_id,
                uw.user_id,
                uw.warehouse_id,
                w.warehouse_name,
                w.warehouse_type,
                w.warehouse_code,
                w.warehouse_address,
                w.warehouse_status,
                uw.created_at,
                uw.updated_at
              FROM user_warehouses uw
              INNER JOIN warehouse w ON uw.warehouse_id = w.warehouse_id
              WHERE uw.user_id = ?
              ORDER BY w.warehouse_name ASC";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $warehouses = [];
    while ($row = $result->fetch_assoc()) {
        $warehouses[] = $row;
    }
    
    print_success("User warehouses retrieved successfully.", $warehouses);
    
} catch (Exception $e) {
    print_failure($e->getMessage());
}

// $conn->close();
?>
