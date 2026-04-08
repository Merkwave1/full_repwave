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
if (empty($data['name_ar'])) {
    print_failure("الاسم بالعربي مطلوب");
}

if (empty($data['name_en'])) {
    print_failure("الاسم بالإنجليزي مطلوب");
}

try {
    $name_ar = trim($data['name_ar']);
    $name_en = trim($data['name_en']);
    $sort_order = isset($data['sort_order']) ? (int)$data['sort_order'] : 0;
    
    // Check if country already exists
    $checkStmt = $conn->prepare("SELECT countries_id FROM countries WHERE countries_name_ar = ? OR countries_name_en = ?");
    if (!$checkStmt) {
        throw new Exception("Prepare failed for check: " . $conn->error);
    }
    
    $checkStmt->bind_param('ss', $name_ar, $name_en);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        $checkStmt->close();
        print_failure("الدولة موجودة بالفعل");
    }
    $checkStmt->close();
    
    // Insert new country
    $stmt = $conn->prepare("
        INSERT INTO countries 
        (countries_name_ar, countries_name_en, countries_sort_order) 
        VALUES (?, ?, ?)
    ");
    
    if (!$stmt) {
        throw new Exception("Prepare failed for insert: " . $conn->error);
    }
    
    $stmt->bind_param('ssi', $name_ar, $name_en, $sort_order);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }
    
    $newId = $conn->insert_id;
    
    // Get the newly created country
    $getStmt = $conn->prepare("SELECT * FROM countries WHERE countries_id = ?");
    if (!$getStmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }
    
    $getStmt->bind_param('i', $newId);
    $getStmt->execute();
    $result = $getStmt->get_result();
    $country = $result->fetch_assoc();
    
    $responseData = [
        'id' => (int)$country['countries_id'],
        'name_ar' => $country['countries_name_ar'],
        'name_en' => $country['countries_name_en'],
        'sort_order' => (int)$country['countries_sort_order']
    ];
    
    print_success("تم إضافة الدولة بنجاح", $responseData);

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
