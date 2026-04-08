<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_all

    $stmt = $conn->prepare("
        SELECT 
            base_units_id, 
            base_units_name, 
            base_units_description
        FROM base_units
        ORDER BY base_units_name ASC
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $base_units = [];
    while ($row = $result->fetch_assoc()) {
        $base_units[] = $row;
    }

    print_success("Base units retrieved successfully.", $base_units);

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
