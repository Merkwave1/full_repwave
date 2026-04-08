<?php
// product/get_preferred_packaging.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Adjust as necessary for your security policies
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Include database connection and helper functions
require_once '../db_connect.php'; // Assuming this file sets up $conn and defines print_success/print_failure

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$stmt = null; // Initialize $stmt to null for finally block

try {
    // Prepare SQL statement to retrieve preferred packaging types for all products
    // Selecting only products_id and packaging_types_id as requested
    $sql = "SELECT
                p.products_id,
                pt.packaging_types_id
            FROM
                products p
            JOIN
                product_preferred_packaging ppp ON p.products_id = ppp.products_id
            JOIN
                packaging_types pt ON ppp.packaging_type_id = pt.packaging_types_id
            ORDER BY
                p.products_id ASC, pt.packaging_types_id ASC";

    $stmt = $conn->prepare($sql);

    if ($stmt === false) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $products_with_preferred_packaging = [];
    $current_product_id = null;
    $product_index = -1;

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            if ($row['products_id'] !== $current_product_id) {
                // New product encountered
                $current_product_id = $row['products_id'];
                $product_index++;
                $products_with_preferred_packaging[$product_index] = [
                    'products_id' => $row['products_id'],
                    'preferred_packaging_ids' => [] // Changed key and structure to store only IDs
                ];
            }

            // Add packaging type ID to the current product's preferred_packaging_ids list
            $products_with_preferred_packaging[$product_index]['preferred_packaging_ids'][] = $row['packaging_types_id'];
        }

        print_success("All preferred packaging IDs retrieved successfully.", [
            "products_with_preferred_packaging" => $products_with_preferred_packaging
        ]);
    } else {
        print_success("No preferred packaging found for any product.", [
            "products_with_preferred_packaging" => []
        ]);
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if ($stmt !== null) {
        $stmt->close();
    }
    if ($conn !== null) { // Ensure $conn exists before trying to close
        $conn->close();
    }
}

?>
