<?php
/**
 * Update or Insert representative settings
 * Endpoint: representative_settings/upsert.php
 */

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Validate required field
    if (!isset($_GET['user_id']) || empty($_GET['user_id'])) {
        print_failure("معرف المستخدم مطلوب");
    }

    $user_id = intval($_GET['user_id']);

    // Check if user exists
    try {
        $userCheckQuery = "SELECT users_id, users_role FROM users WHERE users_id = ?";
        $userStmt = $conn->prepare($userCheckQuery);
        
        if (!$userStmt) {
            throw new Exception("فشل في تحضير استعلام التحقق من المستخدم: " . $conn->error);
        }

        $userStmt->bind_param("i", $user_id);
        $userStmt->execute();
        $userResult = $userStmt->get_result();

        if ($userResult->num_rows === 0) {
            $userStmt->close();
            print_failure("المستخدم غير موجود");
        }

        $userStmt->close();
    } catch (Exception $e) {
        print_failure("خطأ في التحقق من المستخدم: " . $e->getMessage());
    }

    // Extract settings with defaults - handle empty strings as null
    $work_start_latitude = (isset($_GET['work_start_latitude']) && $_GET['work_start_latitude'] !== '') ? floatval($_GET['work_start_latitude']) : null;
    $work_start_longitude = (isset($_GET['work_start_longitude']) && $_GET['work_start_longitude'] !== '') ? floatval($_GET['work_start_longitude']) : null;
    $work_end_latitude = (isset($_GET['work_end_latitude']) && $_GET['work_end_latitude'] !== '') ? floatval($_GET['work_end_latitude']) : null;
    $work_end_longitude = (isset($_GET['work_end_longitude']) && $_GET['work_end_longitude'] !== '') ? floatval($_GET['work_end_longitude']) : null;
    $gps_min_acceptable_accuracy_m = (isset($_GET['gps_min_acceptable_accuracy_m']) && $_GET['gps_min_acceptable_accuracy_m'] !== '') ? floatval($_GET['gps_min_acceptable_accuracy_m']) : 10.00;
    $gps_tracking_interval_sec = (isset($_GET['gps_tracking_interval_sec']) && $_GET['gps_tracking_interval_sec'] !== '') ? intval($_GET['gps_tracking_interval_sec']) : 300;
    $gps_tracking_enabled = isset($_GET['gps_tracking_enabled']) ? intval($_GET['gps_tracking_enabled']) : 1;
    $allow_out_of_plan_visits = isset($_GET['allow_out_of_plan_visits']) ? intval($_GET['allow_out_of_plan_visits']) : 1;
    $allow_start_work_from_anywhere = isset($_GET['allow_start_work_from_anywhere']) ? intval($_GET['allow_start_work_from_anywhere']) : 0;
    $allow_end_work_from_anywhere = isset($_GET['allow_end_work_from_anywhere']) ? intval($_GET['allow_end_work_from_anywhere']) : 0;
    $allow_start_visit_from_anywhere = isset($_GET['allow_start_visit_from_anywhere']) ? intval($_GET['allow_start_visit_from_anywhere']) : 0;
    $allow_end_visit_from_anywhere = isset($_GET['allow_end_visit_from_anywhere']) ? intval($_GET['allow_end_visit_from_anywhere']) : 0;

    // Check if settings already exist for this user
    try {
        $checkQuery = "SELECT rep_settings_id FROM representative_settings WHERE user_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        
        if (!$checkStmt) {
            throw new Exception("فشل في تحضير استعلام التحقق: " . $conn->error);
        }

        $checkStmt->bind_param("i", $user_id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        $exists = $checkResult->num_rows > 0;
        $checkStmt->close();
    } catch (Exception $e) {
        if (isset($conn)) $conn->close();
        print_failure("خطأ في التحقق من الإعدادات: " . $e->getMessage());
    }

    if ($exists) {
        // Update existing settings
        try {
            $updateQuery = "
                UPDATE representative_settings 
                SET 
                    work_start_latitude = ?,
                    work_start_longitude = ?,
                    work_end_latitude = ?,
                    work_end_longitude = ?,
                    gps_min_acceptable_accuracy_m = ?,
                    gps_tracking_interval_sec = ?,
                    gps_tracking_enabled = ?,
                    allow_out_of_plan_visits = ?,
                    allow_start_work_from_anywhere = ?,
                    allow_end_work_from_anywhere = ?,
                    allow_start_visit_from_anywhere = ?,
                    allow_end_visit_from_anywhere = ?,
                    rep_settings_updated_at = NOW()
                WHERE user_id = ?
            ";

            $stmt = $conn->prepare($updateQuery);

            if (!$stmt) {
                throw new Exception("فشل في تحضير استعلام التحديث: " . $conn->error);
            }

            $stmt->bind_param(
                "dddddiiiiiiii",
                $work_start_latitude,
                $work_start_longitude,
                $work_end_latitude,
                $work_end_longitude,
                $gps_min_acceptable_accuracy_m,
                $gps_tracking_interval_sec,
                $gps_tracking_enabled,
                $allow_out_of_plan_visits,
                $allow_start_work_from_anywhere,
                $allow_end_work_from_anywhere,
                $allow_start_visit_from_anywhere,
                $allow_end_visit_from_anywhere,
                $user_id
            );

            if (!$stmt->execute()) {
                throw new Exception("فشل في تنفيذ استعلام التحديث: " . $stmt->error);
            }

            $stmt->close();
            $conn->close();

            print_success("تم تحديث إعدادات المندوب بنجاح", ["user_id" => $user_id]);

        } catch (Exception $e) {
            if (isset($conn)) $conn->close();
            print_failure("خطأ في تحديث الإعدادات: " . $e->getMessage());
        }

    } else {
        // Insert new settings
        try {
            $insertQuery = "
                INSERT INTO representative_settings (
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
                    allow_end_visit_from_anywhere
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";

            $stmt = $conn->prepare($insertQuery);

            if (!$stmt) {
                throw new Exception("فشل في تحضير استعلام الإدراج: " . $conn->error);
            }

            $stmt->bind_param(
                "idddddiiiiiii",
                $user_id,
                $work_start_latitude,
                $work_start_longitude,
                $work_end_latitude,
                $work_end_longitude,
                $gps_min_acceptable_accuracy_m,
                $gps_tracking_interval_sec,
                $gps_tracking_enabled,
                $allow_out_of_plan_visits,
                $allow_start_work_from_anywhere,
                $allow_end_work_from_anywhere,
                $allow_start_visit_from_anywhere,
                $allow_end_visit_from_anywhere
            );

            if (!$stmt->execute()) {
                throw new Exception("فشل في تنفيذ استعلام الإدراج: " . $stmt->error);
            }

            $insert_id = $stmt->insert_id;
            $stmt->close();
            $conn->close();

            print_success("تم إنشاء إعدادات المندوب بنجاح", [
                "user_id" => $user_id,
                "rep_settings_id" => $insert_id
            ]);

        } catch (Exception $e) {
            if (isset($conn)) $conn->close();
            print_failure("خطأ في إنشاء الإعدادات: " . $e->getMessage());
        }
    }

} catch (Exception $e) {
    if (isset($conn)) $conn->close();
    print_failure("خطأ: " . $e->getMessage());
}
?>
