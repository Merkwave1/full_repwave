<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    print_failure("Invalid JSON data");
}

// Validate required fields
if (empty($data['id'])) {
    print_failure("معرف المحافظة مطلوب");
}

try {
    $id = (int)$data['id'];
    
    // Check if governorate exists
    $checkStmt = $conn->prepare("SELECT governorates_id FROM governorates WHERE governorates_id = ?");
    if (!$checkStmt) {
        throw new Exception("Prepare failed for check: " . $conn->error);
    }
    
    $checkStmt->bind_param('i', $id);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        $checkStmt->close();
        print_failure("المحافظة غير موجودة");
    }
    $checkStmt->close();
    
    // Note: You might want to check if there are clients using this governorate
    // Uncomment the following code if you add a governorate reference to the clients table
    /*
    $clientCheckStmt = $conn->prepare("SELECT COUNT(*) as count FROM clients WHERE clients_governorate_id = ?");
    if (!$clientCheckStmt) {
        throw new Exception("Prepare failed for client check: " . $conn->error);
    }
    
    $clientCheckStmt->bind_param('i', $id);
    $clientCheckStmt->execute();
    $clientResult = $clientCheckStmt->get_result();
    $clientCount = $clientResult->fetch_assoc()['count'];
    
    if ($clientCount > 0) {
        $clientCheckStmt->close();
        print_failure("لا يمكن حذف المحافظة لأنها مرتبطة بعملاء. يجب تحديث العملاء أولاً");
    }
    $clientCheckStmt->close();
    */
    
    // Delete governorate
    $stmt = $conn->prepare("DELETE FROM governorates WHERE governorates_id = ?");
    if (!$stmt) {
        throw new Exception("Prepare failed for delete: " . $conn->error);
    }
    
    $stmt->bind_param('i', $id);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }
    
    print_success("تم حذف المحافظة بنجاح", ['id' => $id]);

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
