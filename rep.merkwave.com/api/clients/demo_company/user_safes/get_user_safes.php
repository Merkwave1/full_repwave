<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get user_id from query parameter
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    
    if ($user_id <= 0) {
        throw new Exception("معرف المستخدم غير صالح");
    }
    
    // Query to get all safes assigned to this user
    $query = "SELECT 
                us.user_safe_id,
                us.user_id,
                us.safe_id,
                s.safes_name,
                s.safes_type,
                s.safes_balance,
                s.safes_is_active,
                us.created_at,
                us.updated_at
              FROM user_safes us
              INNER JOIN safes s ON us.safe_id = s.safes_id
              WHERE us.user_id = ?
              ORDER BY s.safes_name ASC";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $safes = [];
    while ($row = $result->fetch_assoc()) {
        $safes[] = $row;
    }
    
    print_success("User safes retrieved successfully.", $safes);
    
} catch (Exception $e) {
    print_failure($e->getMessage());
}

if (isset($conn)) {
    $conn->close();
}
?>
