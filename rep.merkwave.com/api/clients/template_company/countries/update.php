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
    
    // Build update query dynamically
    $updateFields = [];
    $params = [];
    $types = '';
    
    if (isset($data['name_ar'])) {
        $updateFields[] = "countries_name_ar = ?";
        $params[] = trim($data['name_ar']);
        $types .= 's';
    }
    
    if (isset($data['name_en'])) {
        $updateFields[] = "countries_name_en = ?";
        $params[] = trim($data['name_en']);
        $types .= 's';
    }
    
    if (isset($data['sort_order'])) {
        $updateFields[] = "countries_sort_order = ?";
        $params[] = (int)$data['sort_order'];
        $types .= 'i';
    }
    
    if (empty($updateFields)) {
        print_failure("لا توجد بيانات للتحديث");
    }
    
    // Add ID to params
    $params[] = $id;
    $types .= 'i';
    
    $sql = "UPDATE countries SET " . implode(', ', $updateFields) . " WHERE countries_id = ?";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed for update: " . $conn->error);
    }
    
    $stmt->bind_param($types, ...$params);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }
    
    // Get updated country
    $getStmt = $conn->prepare("SELECT * FROM countries WHERE countries_id = ?");
    if (!$getStmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }
    
    $getStmt->bind_param('i', $id);
    $getStmt->execute();
    $result = $getStmt->get_result();
    $country = $result->fetch_assoc();
    
    $responseData = [
        'id' => (int)$country['countries_id'],
        'name_ar' => $country['countries_name_ar'],
        'name_en' => $country['countries_name_en'],
        'sort_order' => (int)$country['countries_sort_order']
    ];
    
    print_success("تم تحديث الدولة بنجاح", $responseData);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) {
        $stmt->close();
    }
    if (isset($getStmt) && $getStmt !== false) {
        $getStmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
