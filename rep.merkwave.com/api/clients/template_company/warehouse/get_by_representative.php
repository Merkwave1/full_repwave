<?php
// Enables strict error reporting
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Include your database connection and helper functions
require_once '../db_connect.php'; 

try {
    // Get user UUID from request (GET or POST)
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;

    // --- Validation ---
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
        exit;
    }

    // Get the representative's actual user_id from their UUID
    $representative_user_id = get_user_id_from_uuid_local($users_uuid);

    if (empty($representative_user_id) || !is_numeric($representative_user_id) || $representative_user_id <= 0) {
        print_failure("Error: Valid Representative User ID not found for provided UUID.");
        exit;
    }

    $my_warehouses = [];
    $other_main_warehouses = [];

    // 1. Fetch warehouses specifically assigned to this representative
    $stmt_my_warehouses = $conn->prepare("
        SELECT
            *
        FROM
            warehouse
        WHERE
            warehouse_representative_user_id = ?
        ORDER BY
            warehouse_name ASC
    ");

    if (!$stmt_my_warehouses) {
        throw new Exception("Prepare failed for my warehouses: " . $conn->error);
    }

    $stmt_my_warehouses->bind_param("i", $representative_user_id);
    $stmt_my_warehouses->execute();
    $result_my_warehouses = $stmt_my_warehouses->get_result();
    $my_warehouses = $result_my_warehouses->fetch_all(MYSQLI_ASSOC);
    $stmt_my_warehouses->close();


    // 2. Fetch other 'main' warehouses not assigned to this representative
    $stmt_other_main_warehouses = $conn->prepare("
        SELECT
        *
        FROM
            warehouse
        WHERE
            warehouse_type = 'main' AND (warehouse_representative_user_id IS NULL OR warehouse_representative_user_id != ?)
        ORDER BY
            warehouse_name ASC
    ");

    if (!$stmt_other_main_warehouses) {
        throw new Exception("Prepare failed for other main warehouses: " . $conn->error);
    }

    $stmt_other_main_warehouses->bind_param("i", $representative_user_id);
    $stmt_other_main_warehouses->execute();
    $result_other_main_warehouses = $stmt_other_main_warehouses->get_result();
    $other_main_warehouses = $result_other_main_warehouses->fetch_all(MYSQLI_ASSOC);
    $stmt_other_main_warehouses->close();


    print_success("Warehouses retrieved successfully.", [
        'my_warehouses' => $my_warehouses,
        'other_main_warehouses' => $other_main_warehouses
    ]);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
?>
