<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);



try {
    // Validate user session (UUID validation)
    validate_user_session();
    
    // Get user data from global variables set by validation function
    $current_user_id = $GLOBALS['current_user_id'];
    $current_user_role = $GLOBALS['current_user_role'];

    // بناء استعلام SQL
    $sql = "
        SELECT 
        c.clients_id,
        c.clients_odoo_partner_id,
        c.clients_company_name,
        c.clients_email,
        c.clients_contact_name,
        c.clients_contact_phone_1,
        c.clients_city,
        c.clients_credit_balance,
        c.clients_status,
        c.clients_type,
        c.clients_client_type_id,
        ct.client_type_name,
        c.clients_last_visit,
        c.clients_area_tag_id,
        c.clients_industry_id,
        c.clients_rep_user_id,    -- يتم جلب هذا الحقل دائمًا لاستخدامه في شرط WHERE
        c.clients_country_id,
        c.clients_governorate_id,
        COALESCE(co.countries_name_ar, co.countries_name_en) as clients_country,
        COALESCE(g.governorates_name_ar, g.governorates_name_en) as clients_state
        FROM clients c
        LEFT JOIN client_types ct ON ct.client_type_id = c.clients_client_type_id
        LEFT JOIN countries co ON c.clients_country_id = co.countries_id
        LEFT JOIN governorates g ON c.clients_governorate_id = g.governorates_id
    ";

    $params = [];
    $types = "";

    // تطبيق منطق الصلاحيات: إذا كان المستخدم ليس مسؤولاً، قم بتصفية العملاء حسب المندوب
    if ($current_user_role !== 'admin' && $current_user_role !== 'store_keeper' && $current_user_role !== 'cash') {
        $sql .= " WHERE c.clients_rep_user_id = ?";
        $params[] = $current_user_id;
        $types .= "i"; // 'i' for integer (user_id)
    }
    
    $sql .= " ORDER BY c.clients_company_name ASC";

    // Debug: Log the SQL query being executed
    error_log("🔍 DEBUG: SQL Query: " . $sql);
    error_log("🔍 DEBUG: User Role: " . $current_user_role . ", User ID: " . $current_user_id);

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $clients = [];
    while ($row = $result->fetch_assoc()) {
        // إذا لم يكن المستخدم مسؤولاً، قم بإزالة clients_rep_user_id من صف البيانات
        if ($current_user_role !== 'admin' && $current_user_role !== 'store_keeper' && $current_user_role !== 'cash') {
            unset($row['clients_rep_user_id']);
        }
        $clients[] = $row;
    }

    // Debug: Log the first client data to see what fields are included
    if (!empty($clients)) {
        error_log("🔍 DEBUG: First client data: " . json_encode($clients[0]));
        error_log("🔍 DEBUG: Total clients found: " . count($clients));
    } else {
        error_log("🔍 DEBUG: No clients found");
    }

    // إضافة user_id كـ repid إلى البيانات المرجعة
    print_success("Clients retrieved successfully.", ['clients' => $clients]);
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
