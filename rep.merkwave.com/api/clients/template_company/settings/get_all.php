<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_all

    // Build the base query
    $sql = "SELECT 
                settings_id, 
                settings_key, 
                settings_value, 
                settings_description, 
                settings_type
            FROM settings";
    
    $conditions = [];
    $types = "";
    $params = [];
    
    // Add filters based on GET parameters
    
    // Filter by type
    if (isset($_GET['type']) && !empty($_GET['type'])) {
        $conditions[] = "settings_type = ?";
        $types .= "s";
        $params[] = $_GET['type'];
    }
    
    // Filter by key pattern
    if (isset($_GET['key_pattern']) && !empty($_GET['key_pattern'])) {
        $conditions[] = "settings_key LIKE ?";
        $types .= "s";
        $params[] = '%' . $_GET['key_pattern'] . '%';
    }
    
    // Filter by category (based on key prefix)
    if (isset($_GET['category']) && !empty($_GET['category'])) {
        switch ($_GET['category']) {
            case 'company':
                $conditions[] = "settings_key LIKE 'company_%'";
                break;
            case 'system':
                $conditions[] = "(settings_key LIKE 'users_%' OR settings_key LIKE 'expiration_%' OR settings_key LIKE 'timezone%' OR settings_key LIKE 'language%' OR settings_key LIKE 'date_%' OR settings_key LIKE 'time_%' OR settings_key LIKE 'fiscal_%')";
                break;
            case 'financial':
                $conditions[] = "(settings_key LIKE 'currency_%' OR settings_key LIKE 'tax_%' OR settings_key LIKE 'payment_%' OR settings_key LIKE 'decimal_%' OR settings_key LIKE 'default_currency%')";
                break;
            case 'mobile':
                $conditions[] = "(settings_key LIKE 'gps_%' OR settings_key LIKE 'visit_%' OR settings_key LIKE 'offline_%' OR settings_key LIKE 'location_%' OR settings_key LIKE 'max_photo_%' OR settings_key LIKE 'require_check_%')";
                break;
            case 'notifications':
                $conditions[] = "(settings_key LIKE 'notification_%' OR settings_key LIKE 'email_%' OR settings_key LIKE 'sms_%' OR settings_key LIKE 'push_%' OR settings_key LIKE 'admin_email%')";
                break;
            case 'security':
                $conditions[] = "(settings_key LIKE 'session_%' OR settings_key LIKE 'password_%' OR settings_key LIKE 'max_login_%' OR settings_key LIKE 'lockout_%' OR settings_key LIKE 'require_password_%' OR settings_key LIKE 'two_factor_%')";
                break;
            case 'inventory':
                $conditions[] = "(settings_key LIKE 'low_stock_%' OR settings_key LIKE 'allow_negative_%' OR settings_key LIKE 'require_batch_%' OR settings_key LIKE 'auto_reorder_%' OR settings_key LIKE 'reorder_%' OR settings_key LIKE 'max_expiry_%')";
                break;
            case 'business_rules':
                $conditions[] = "(settings_key LIKE 'auto_approve_%' OR settings_key LIKE 'credit_limit_%' OR settings_key LIKE 'require_visit_%' OR settings_key LIKE 'order_%' OR settings_key LIKE 'invoice_%' OR settings_key LIKE 'return_%' OR settings_key LIKE 'max_discount_%')";
                break;
            case 'prefixes':
                $conditions[] = "settings_key LIKE '%_prefix'";
                break;
        }
    }
    
    if (!empty($conditions)) {
        $sql .= " WHERE " . implode(" AND ", $conditions);
    }
    
    $sql .= " ORDER BY settings_key ASC";
    
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }
    
    // Bind parameters if any
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();

    $settings = [];
    $organized_settings = [];
    
    while ($row = $result->fetch_assoc()) {
        $settings[] = $row;
        
        // Also create organized format
        $organized_settings[$row['settings_key']] = [
            'id' => $row['settings_id'],
            'value' => $row['settings_value'],
            'description' => $row['settings_description'],
            'type' => $row['settings_type']
        ];
    }
    
    // Return format based on request
    $format = $_GET['format'] ?? 'list';
    
    if ($format === 'organized') {
        print_success("Settings retrieved successfully.", $organized_settings);
    } else {
        print_success("Settings retrieved successfully.", $settings);
    }

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
