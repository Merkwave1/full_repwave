<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // No IP or role authorization check as requested for get_all

    // Fetch all attributes
    $stmt_attributes = $conn->prepare("
        SELECT 
            attribute_id, 
            attribute_name, 
            attribute_description
        FROM product_attributes
        ORDER BY attribute_name ASC
    ");
    if (!$stmt_attributes) {
        throw new Exception("Prepare failed for attributes select: " . $conn->error);
    }
    $stmt_attributes->execute();
    $result_attributes = $stmt_attributes->get_result();

    $attributes = [];
    while ($row = $result_attributes->fetch_assoc()) {
        $row['values'] = []; // Initialize empty array for values
        $attributes[$row['attribute_id']] = $row;
    }
    $stmt_attributes->close();

    // Fetch all attribute values and group them by attribute_id
    if (!empty($attributes)) {
        $attribute_ids = implode(',', array_keys($attributes)); // Get IDs for IN clause
        
        $stmt_values = $conn->prepare("
            SELECT 
                attribute_value_id, 
                attribute_value_attribute_id, 
                attribute_value_value
            FROM product_attribute_values
            WHERE attribute_value_attribute_id IN (" . $attribute_ids . ")
            ORDER BY attribute_value_value ASC
        ");
        if (!$stmt_values) {
            throw new Exception("Prepare failed for attribute values select: " . $conn->error);
        }
        // No bind_param needed if using IN clause with implode (be cautious with large lists)
        $stmt_values->execute();
        $result_values = $stmt_values->get_result();

        while ($row_value = $result_values->fetch_assoc()) {
            $attribute_id = $row_value['attribute_value_attribute_id'];
            if (isset($attributes[$attribute_id])) {
                $attributes[$attribute_id]['values'][] = [
                    'attribute_value_id' => $row_value['attribute_value_id'],
                    'attribute_value_value' => $row_value['attribute_value_value']
                ];
            }
        }
        $stmt_values->close();
    }

    // Convert associative array to indexed array for final output
    $final_attributes = array_values($attributes);

    print_success("Product attributes with values retrieved successfully.", $final_attributes);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt_attributes) && $stmt_attributes !== false) {
        $stmt_attributes->close();
    }
    if (isset($stmt_values) && $stmt_values !== false) {
        $stmt_values->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
