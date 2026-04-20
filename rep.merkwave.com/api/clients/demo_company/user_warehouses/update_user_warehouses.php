<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get input from POST (FormData)
    $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
    $warehouse_ids_json = isset($_POST['warehouse_ids']) ? $_POST['warehouse_ids'] : '[]';
    
    if ($user_id <= 0) {
        throw new Exception("معرف المستخدم غير صالح");
    }
    
    // Decode the JSON array
    $warehouse_ids = json_decode($warehouse_ids_json, true);
    if (!is_array($warehouse_ids)) {
        throw new Exception("قائمة المخازن يجب أن تكون مصفوفة");
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    // First, delete all existing warehouse assignments for this user
    $delete_query = "DELETE FROM user_warehouses WHERE user_id = ?";
    $delete_stmt = $conn->prepare($delete_query);
    $delete_stmt->bind_param("i", $user_id);
    $delete_stmt->execute();
    
    // Then, insert new warehouse assignments
    if (!empty($warehouse_ids)) {
        $insert_query = "INSERT INTO user_warehouses (user_id, warehouse_id) VALUES (?, ?)";
        $insert_stmt = $conn->prepare($insert_query);
        
        foreach ($warehouse_ids as $warehouse_id) {
            $warehouse_id = intval($warehouse_id);
            if ($warehouse_id > 0) {
                $insert_stmt->bind_param("ii", $user_id, $warehouse_id);
                $insert_stmt->execute();
            }
        }
    }
    
    // Commit transaction
    $conn->commit();
    
    print_success('تم تحديث المخازن بنجاح', [
        'user_id' => $user_id,
        'warehouse_count' => count($warehouse_ids)
    ]);
    
} catch (Exception $e) {
    // Rollback on error
    if (isset($conn)) {
        $conn->rollback();
    }
    
    print_failure($e->getMessage());
}

if (isset($conn)) {
    $conn->close();
}
?>
