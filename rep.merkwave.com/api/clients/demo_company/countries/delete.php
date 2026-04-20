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
    print_failure("معرف الدولة مطلوب");
}

try {
    $id = (int)$data['id'];
    
    // Check if country exists
    $checkStmt = $conn->prepare("SELECT countries_id FROM countries WHERE countries_id = ?");
    if (!$checkStmt) {
        throw new Exception("Prepare failed for check: " . $conn->error);
    }
    
    $checkStmt->bind_param('i', $id);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        $checkStmt->close();
        print_failure("الدولة غير موجودة");
    }
    $checkStmt->close();
    
    // Check if country has governorates
    $govCheckStmt = $conn->prepare("SELECT COUNT(*) as count FROM governorates WHERE governorates_country_id = ?");
    if (!$govCheckStmt) {
        throw new Exception("Prepare failed for governorate check: " . $conn->error);
    }
    
    $govCheckStmt->bind_param('i', $id);
    $govCheckStmt->execute();
    $govResult = $govCheckStmt->get_result();
    $govData = $govResult->fetch_assoc();
    
    if ($govData['count'] > 0) {
        $govCheckStmt->close();
        print_failure("لا يمكن حذف الدولة لأنها تحتوي على محافظات. يجب حذف المحافظات أولاً");
    }
    $govCheckStmt->close();
    
    // Delete country
    $stmt = $conn->prepare("DELETE FROM countries WHERE countries_id = ?");
    if (!$stmt) {
        throw new Exception("Prepare failed for delete: " . $conn->error);
    }
    
    $stmt->bind_param('i', $id);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }
    
    print_success("تم حذف الدولة بنجاح", ['id' => $id]);

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
