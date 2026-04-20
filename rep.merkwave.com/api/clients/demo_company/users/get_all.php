<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get optional user_type filter parameter
    $user_type = isset($_GET['user_type']) ? trim($_GET['user_type']) : null;
    
    // Build the query with optional WHERE clause for user_type filtering
    $query = "
    SELECT 
        users_id, 
        users_name, 
        users_role,
        users_status,
        users_image,
        users_email,
        users_phone,
        users_national_id
    FROM users";
    
    $params = [];
    $types = "";
    
    if ($user_type) {
        $query .= " WHERE users_role = ?";
        $params[] = $user_type;
        $types .= "s";
    }
    
    $query .= " ORDER BY users_name ASC";
    
    $stmt = $conn->prepare($query);

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    if ($user_type) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    
    print_success("Users retrieved successfully.", $users);

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
