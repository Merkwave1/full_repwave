<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get input from POST (FormData)
    $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
    $safe_ids_json = isset($_POST['safe_ids']) ? $_POST['safe_ids'] : '[]';
    
    if ($user_id <= 0) {
        throw new Exception("معرف المستخدم غير صالح");
    }
    
    // Decode the JSON array
    $safe_ids = json_decode($safe_ids_json, true);
    if (!is_array($safe_ids)) {
        throw new Exception("قائمة الخزن يجب أن تكون مصفوفة");
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    // First, delete all existing safe assignments for this user
    $delete_query = "DELETE FROM user_safes WHERE user_id = ?";
    $delete_stmt = $conn->prepare($delete_query);
    $delete_stmt->bind_param("i", $user_id);
    $delete_stmt->execute();
    
    // Then, insert new safe assignments
    if (!empty($safe_ids)) {
        $insert_query = "INSERT INTO user_safes (user_id, safe_id) VALUES (?, ?)";
        $insert_stmt = $conn->prepare($insert_query);
        
        foreach ($safe_ids as $safe_id) {
            $safe_id = intval($safe_id);
            if ($safe_id > 0) {
                $insert_stmt->bind_param("ii", $user_id, $safe_id);
                $insert_stmt->execute();
            }
        }
    }
    
    // Commit transaction
    $conn->commit();
    
    print_success('تم تحديث الخزن بنجاح', [
        'user_id' => $user_id,
        'safe_count' => count($safe_ids)
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
