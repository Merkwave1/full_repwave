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

if (empty($data['country_id'])) {
    print_failure("الدولة مطلوبة");
}

try {
    $name_ar = trim($data['name_ar']);
    $name_en = trim($data['name_en']);
    $country_id = (int)$data['country_id'];
    $sort_order = isset($data['sort_order']) ? (int)$data['sort_order'] : 0;
    
    // Check if country exists
    $countryCheckStmt = $conn->prepare("SELECT countries_id FROM countries WHERE countries_id = ?");
    if (!$countryCheckStmt) {
        throw new Exception("Prepare failed for country check: " . $conn->error);
    }
    
    $countryCheckStmt->bind_param('i', $country_id);
    $countryCheckStmt->execute();
    $countryResult = $countryCheckStmt->get_result();
    
    if ($countryResult->num_rows === 0) {
        $countryCheckStmt->close();
        print_failure("الدولة غير موجودة");
    }
    $countryCheckStmt->close();
    
    // Check if governorate already exists for this country
    $checkStmt = $conn->prepare("SELECT governorates_id FROM governorates 
                                  WHERE governorates_country_id = ? AND (governorates_name_ar = ? OR governorates_name_en = ?)");
    if (!$checkStmt) {
        throw new Exception("Prepare failed for duplicate check: " . $conn->error);
    }
    
    $checkStmt->bind_param('iss', $country_id, $name_ar, $name_en);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        $checkStmt->close();
        print_failure("المحافظة موجودة بالفعل في هذه الدولة");
    }
    $checkStmt->close();
    
    // Insert new governorate
    $stmt = $conn->prepare("INSERT INTO governorates 
                            (governorates_country_id, governorates_name_ar, governorates_name_en, governorates_sort_order) 
                            VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        throw new Exception("Prepare failed for insert: " . $conn->error);
    }
    
    $stmt->bind_param('issi', $country_id, $name_ar, $name_en, $sort_order);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }
    
    $newId = $conn->insert_id;
    
    // Get the newly created governorate with country info
    $getStmt = $conn->prepare("
        SELECT g.*, c.countries_name_ar, c.countries_name_en
        FROM governorates g
        INNER JOIN countries c ON g.governorates_country_id = c.countries_id
        WHERE g.governorates_id = ?
    ");
    if (!$getStmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }
    
    $getStmt->bind_param('i', $newId);
    $getStmt->execute();
    $result = $getStmt->get_result();
    $governorate = $result->fetch_assoc();
    
    $responseData = [
        'id' => (int)$governorate['governorates_id'],
        'country_id' => (int)$governorate['governorates_country_id'],
        'country_name_ar' => $governorate['countries_name_ar'],
        'country_name_en' => $governorate['countries_name_en'],
        'name_ar' => $governorate['governorates_name_ar'],
        'name_en' => $governorate['governorates_name_en'],
        'sort_order' => (int)$governorate['governorates_sort_order']
    ];
    
    print_success("تم إضافة المحافظة بنجاح", $responseData);

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
