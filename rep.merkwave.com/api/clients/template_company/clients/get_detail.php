<?php

require_once '../db_connect.php'; 
// functions.php يتم تضمينها تلقائيًا عبر db_connect.php

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // الحصول على users_uuid و client_id من طلب GET
    $users_uuid = $_GET['users_uuid'] ?? null;
    $client_id = $_GET['client_id'] ?? null;

    // التحقق من أن المعرفات المطلوبة موجودة
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }
    if (empty($client_id) || !is_numeric($client_id)) {
        print_failure("Error: Valid Client ID is required.");
    }

    // الحصول على user_id ودور المستخدم (role) من جدول users بناءً على users_uuid
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    if (!$stmt_user) {
        throw new Exception("Prepare failed for user lookup: " . $conn->error);
    }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();

    if (!$user_data) {
        print_failure("Error: Invalid User UUID provided.");
    }

    $current_user_id = $user_data['users_id'];
    $current_user_role = $user_data['users_role'];

    // بناء استعلام SQL لجلب جميع بيانات العميل
    // Join with countries and governorates to return names for backward compatibility
    $sql = "
        SELECT c.*, 
               co.countries_name_ar as clients_country_name_ar, 
               co.countries_name_en as clients_country_name_en,
               g.governorates_name_ar as clients_state_name_ar,
               g.governorates_name_en as clients_state_name_en,
               -- Alias names to old column names if needed, or just rely on IDs
               COALESCE(co.countries_name_ar, co.countries_name_en) as clients_country,
               COALESCE(g.governorates_name_ar, g.governorates_name_en) as clients_state
        FROM clients c
        LEFT JOIN countries co ON c.clients_country_id = co.countries_id
        LEFT JOIN governorates g ON c.clients_governorate_id = g.governorates_id
        WHERE c.clients_id = ?
    ";
    $params = [$client_id];
    $types = "i"; // 'i' for integer (client_id)

    // تطبيق منطق الصلاحيات: إذا كان المستخدم ليس مسؤولاً، قم بتصفية العميل حسب المندوب
    if ($current_user_role !== 'admin') {
        $sql .= " AND clients_rep_user_id = ?";
        $params[] = $current_user_id;
        $types .= "i"; // 'i' for integer (user_id)
    }
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed for client detail select: " . $conn->error);
    }

    // ربط المعاملات بالاستعلام
    $stmt->bind_param($types, ...$params);

    $stmt->execute();
    $result = $stmt->get_result();
    $client_data = $result->fetch_assoc(); // جلب صف واحد فقط

    if ($client_data) {
        print_success("Client details retrieved successfully.", $client_data);
    } else {
        print_failure("Error: Client not found or you do not have permission to view this client.");
    }
    exit;

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
