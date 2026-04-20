<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_all

    $stmt = $conn->prepare("
        SELECT 
            pt.packaging_types_id, 
            pt.packaging_types_name, 
            pt.packaging_types_description, 
            pt.packaging_types_default_conversion_factor, 
            pt.packaging_types_compatible_base_unit_id,
            bu.base_units_name AS compatible_base_unit_name -- Join to get base unit name
        FROM packaging_types pt
        JOIN base_units bu ON pt.packaging_types_compatible_base_unit_id = bu.base_units_id
        ORDER BY pt.packaging_types_name ASC
    ");

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $packaging_types = [];
    while ($row = $result->fetch_assoc()) {
        $packaging_types[] = $row;
    }

    print_success("Packaging types retrieved successfully.", $packaging_types);

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
