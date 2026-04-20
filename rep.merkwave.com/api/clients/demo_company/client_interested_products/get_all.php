<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $client_id = $_GET['client_id'] ?? null;
    $users_uuid = $_GET['users_uuid'] ?? null;

    if (empty($client_id) || !is_numeric($client_id) || (int)$client_id <= 0) {
        print_failure("Error: Valid Client ID is required.");
    }

    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

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

    $current_user_id = (int)$user_data['users_id'];
    $current_user_role = $user_data['users_role'] ?? 'rep';

    $sql = "
        SELECT
            cip.client_id,
            cip.products_id,
            p.products_name,
            p.products_brand,
            COALESCE(c.categories_name, '') AS products_category,
            p.products_image_url,
            p.products_description,
            p.products_is_active,
            p.products_created_at,
            p.products_updated_at
        FROM client_interested_products cip
        JOIN products p ON p.products_id = cip.products_id
        LEFT JOIN categories c ON c.categories_id = p.products_category_id
        WHERE cip.client_id = ?
    ";

    $params = [(int)$client_id];
    $types = "i";

    if ($current_user_role !== 'admin') {
        $sql .= " AND EXISTS (
            SELECT 1 FROM clients c
            WHERE c.clients_id = cip.client_id
              AND c.clients_rep_user_id = ?
        )";
        $params[] = $current_user_id;
        $types .= "i";
    }

    $sql .= " ORDER BY p.products_name ASC";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed for interested products select: " . $conn->error);
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $interested_products = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    print_success(
        "Client interested products retrieved successfully.",
        ['interested_products' => $interested_products]
    );

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt instanceof mysqli_stmt) {
        $stmt->close();
    }
    if (isset($stmt_user) && $stmt_user instanceof mysqli_stmt) {
        $stmt_user->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
