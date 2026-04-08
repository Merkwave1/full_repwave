<?php
/**
 * Get representative settings by user ID
 * Endpoint: representative_settings/get_by_user.php?user_id={id}
 */

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Validate user_id parameter
    if (!isset($_GET['user_id']) || empty($_GET['user_id'])) {
        throw new Exception("معرف المستخدم مطلوب");
    }

    $user_id = intval($_GET['user_id']);

    // Check if user exists and is a representative
    $userCheckQuery = "SELECT users_id, users_role FROM users WHERE users_id = ?";
    $userStmt = $conn->prepare($userCheckQuery);
    
    if (!$userStmt) {
        throw new Exception("فشل في تحضير استعلام التحقق من المستخدم: " . $conn->error);
    }

    $userStmt->bind_param("i", $user_id);
    $userStmt->execute();
    $userResult = $userStmt->get_result();

    if ($userResult->num_rows === 0) {
        throw new Exception("المستخدم غير موجود");
    }

    $user = $userResult->fetch_assoc();
    $userStmt->close();

    // Query to get representative settings
    $query = "
        SELECT 
            rep_settings_id,
            user_id,
            work_start_latitude,
            work_start_longitude,
            work_end_latitude,
            work_end_longitude,
            gps_min_acceptable_accuracy_m,
            gps_tracking_interval_sec,
            gps_tracking_enabled,
            allow_out_of_plan_visits,
            allow_start_work_from_anywhere,
            allow_end_work_from_anywhere,
            allow_start_visit_from_anywhere,
            allow_end_visit_from_anywhere,
            rep_settings_updated_at
        FROM representative_settings 
        WHERE user_id = ?
    ";

    $stmt = $conn->prepare($query);

    if (!$stmt) {
        throw new Exception("فشل في تحضير الاستعلام: " . $conn->error);
    }

    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $settings = $result->fetch_assoc();
        
        // Convert tinyint to boolean for easier frontend handling
        $settings['gps_tracking_enabled'] = (bool)$settings['gps_tracking_enabled'];
        $settings['allow_out_of_plan_visits'] = (bool)$settings['allow_out_of_plan_visits'];
        $settings['allow_start_work_from_anywhere'] = (bool)$settings['allow_start_work_from_anywhere'];
        $settings['allow_end_work_from_anywhere'] = (bool)$settings['allow_end_work_from_anywhere'];
        $settings['allow_start_visit_from_anywhere'] = (bool)$settings['allow_start_visit_from_anywhere'];
        $settings['allow_end_visit_from_anywhere'] = (bool)$settings['allow_end_visit_from_anywhere'];
        
        echo json_encode([
            "status" => "success",
            "message" => "تم جلب إعدادات المندوب بنجاح",
            "data" => $settings
        ]);
    } else {
        // Return default settings if no settings exist
        $defaultSettings = [
            "user_id" => $user_id,
            "work_start_latitude" => null,
            "work_start_longitude" => null,
            "work_end_latitude" => null,
            "work_end_longitude" => null,
            "gps_min_acceptable_accuracy_m" => 10.00,
            "gps_tracking_interval_sec" => 300,
            "gps_tracking_enabled" => true,
            "allow_out_of_plan_visits" => true,
            "allow_start_work_from_anywhere" => true,
            "allow_end_work_from_anywhere" => true,
            "allow_start_visit_from_anywhere" => true,
            "allow_end_visit_from_anywhere" => true,
            "rep_settings_updated_at" => null
        ];
        
        echo json_encode([
            "status" => "success",
            "message" => "لا توجد إعدادات، تم إرجاع القيم الافتراضية",
            "data" => $defaultSettings
        ]);
    }

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>
