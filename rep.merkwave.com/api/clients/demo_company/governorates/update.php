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
    
    // Build update query dynamically
    $updateFields = [];
    $params = [];
    $types = '';
    
    if (isset($data['country_id'])) {
        // Check if country exists
        $countryCheckStmt = $conn->prepare("SELECT countries_id FROM countries WHERE countries_id = ?");
        if (!$countryCheckStmt) {
            throw new Exception("Prepare failed for country check: " . $conn->error);
        }
        
        $country_id = (int)$data['country_id'];
        $countryCheckStmt->bind_param('i', $country_id);
        $countryCheckStmt->execute();
        $countryResult = $countryCheckStmt->get_result();
        
        if ($countryResult->num_rows === 0) {
            $countryCheckStmt->close();
            print_failure("الدولة غير موجودة");
        }
        $countryCheckStmt->close();
        
        $updateFields[] = "governorates_country_id = ?";
        $params[] = $country_id;
        $types .= 'i';
    }
    
    if (isset($data['name_ar'])) {
        $updateFields[] = "governorates_name_ar = ?";
        $params[] = trim($data['name_ar']);
        $types .= 's';
    }
    
    if (isset($data['name_en'])) {
        $updateFields[] = "governorates_name_en = ?";
        $params[] = trim($data['name_en']);
        $types .= 's';
    }
    
    if (isset($data['sort_order'])) {
        $updateFields[] = "governorates_sort_order = ?";
        $params[] = (int)$data['sort_order'];
        $types .= 'i';
    }
    
    if (empty($updateFields)) {
        print_failure("لا توجد بيانات للتحديث");
    }
    
    // Add ID to params
    $params[] = $id;
    $types .= 'i';
    
    $sql = "UPDATE governorates SET " . implode(', ', $updateFields) . " WHERE governorates_id = ?";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed for update: " . $conn->error);
    }
    
    $stmt->bind_param($types, ...$params);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }
    
    // Get updated governorate with country info
    $getStmt = $conn->prepare("
        SELECT g.*, c.countries_name_ar, c.countries_name_en
        FROM governorates g
        INNER JOIN countries c ON g.governorates_country_id = c.countries_id
        WHERE g.governorates_id = ?
    ");
    if (!$getStmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }
    
    $getStmt->bind_param('i', $id);
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
    
    print_success("تم تحديث المحافظة بنجاح", $responseData);

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
