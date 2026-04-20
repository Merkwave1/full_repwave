<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$stmt_user = null;
$stmt = null;
$product_stmt = null;

try {
    $products_id = $_GET['products_id'] ?? $_GET['product_id'] ?? null;
    $users_uuid = $_GET['users_uuid'] ?? null;

    if (empty($products_id) || !is_numeric($products_id) || (int)$products_id <= 0) {
        print_failure('Error: Valid product ID is required.');
    }

    if (empty($users_uuid)) {
        print_failure('Error: User UUID is required.');
    }

    $product_id_int = (int)$products_id;

    $stmt_user = $conn->prepare('SELECT users_id, users_role FROM users WHERE users_uuid = ?');
    if (!$stmt_user) {
        throw new Exception('Prepare failed for user lookup: ' . $conn->error);
    }
    $stmt_user->bind_param('s', $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();
    $stmt_user = null;

    if (!$user_data) {
        print_failure('Error: Invalid User UUID provided.');
    }

    $current_user_id = (int)$user_data['users_id'];
    $current_user_role = $user_data['users_role'] ?? 'rep';

    $product_info = null;
    $productsTableCheck = $conn->query("SHOW TABLES LIKE 'products'");
    if ($productsTableCheck === false) {
        throw new Exception('Error checking products table: ' . $conn->error);
    }
    $hasProductsTable = $productsTableCheck->num_rows > 0;
    $productsTableCheck->free();

    if ($hasProductsTable) {
        $columnsToCheck = [
            'products_name' => false,
            'products_brand' => false,
            'products_image_url' => false,
            'products_category' => false,
            'products_category_id' => false,
            'products_description' => false,
        ];

        foreach ($columnsToCheck as $column => $_) {
            $escapedColumn = $conn->real_escape_string($column);
            $columnResult = $conn->query("SHOW COLUMNS FROM products WHERE Field = '" . $escapedColumn . "'");
            if ($columnResult) {
                $columnsToCheck[$column] = $columnResult->num_rows > 0;
                $columnResult->free();
            }
        }

        $categoriesTableCheck = $conn->query("SHOW TABLES LIKE 'categories'");
        if ($categoriesTableCheck === false) {
            throw new Exception('Error checking categories table: ' . $conn->error);
        }
        $hasCategoriesTable = $categoriesTableCheck->num_rows > 0;
        $categoriesTableCheck->free();

        $selectParts = ["p.products_id"];
        if ($columnsToCheck['products_name']) {
            $selectParts[] = "COALESCE(p.products_name, CONCAT('منتج رقم ', p.products_id)) AS products_name";
        } else {
            $selectParts[] = "CONCAT('منتج رقم ', p.products_id) AS products_name";
        }
        if ($columnsToCheck['products_brand']) {
            $selectParts[] = "COALESCE(p.products_brand, '') AS products_brand";
        } else {
            $selectParts[] = "'' AS products_brand";
        }
        if ($columnsToCheck['products_image_url']) {
            $selectParts[] = "COALESCE(p.products_image_url, '') AS products_image_url";
        } else {
            $selectParts[] = "'' AS products_image_url";
        }

        $joinClause = '';
        $categoryExpressions = [];
        if ($columnsToCheck['products_category'] && $columnsToCheck['products_category_id'] && $hasCategoriesTable) {
            $joinClause = " LEFT JOIN categories cat ON cat.categories_id = p.products_category_id";
            $categoryExpressions[] = "cat.categories_name";
            $categoryExpressions[] = "p.products_category";
        } elseif ($columnsToCheck['products_category_id'] && $hasCategoriesTable) {
            $joinClause = " LEFT JOIN categories cat ON cat.categories_id = p.products_category_id";
            $categoryExpressions[] = "cat.categories_name";
        } elseif ($columnsToCheck['products_category']) {
            $categoryExpressions[] = "p.products_category";
        }

        if (!empty($categoryExpressions)) {
            $selectParts[] = "COALESCE(" . implode(', ', $categoryExpressions) . ", 'غير مصنف') AS products_category";
        } else {
            $selectParts[] = "'غير مصنف' AS products_category";
        }

        if ($columnsToCheck['products_description']) {
            $selectParts[] = "COALESCE(p.products_description, '') AS products_description";
        } else {
            $selectParts[] = "'' AS products_description";
        }

        $product_sql = "SELECT " . implode(", ", $selectParts) . " FROM products p" . $joinClause . " WHERE p.products_id = ? LIMIT 1";

        $product_stmt = $conn->prepare($product_sql);
        if ($product_stmt) {
            $product_stmt->bind_param('i', $product_id_int);
            $product_stmt->execute();
            $product_result = $product_stmt->get_result();
            $product_info = $product_result->fetch_assoc();
            $product_stmt->close();
            $product_stmt = null;
        }
    }

    if (!$product_info) {
        $product_info = [
            'products_id' => $product_id_int,
            'products_name' => 'منتج رقم ' . $product_id_int,
            'products_brand' => '',
            'products_image_url' => '',
            'products_category' => 'غير مصنف',
            'products_description' => '',
        ];
    } else {
        $product_info['products_id'] = (int)($product_info['products_id'] ?? $product_id_int);
        $product_info['products_brand'] = $product_info['products_brand'] ?? '';
        $product_info['products_image_url'] = $product_info['products_image_url'] ?? '';
        $product_info['products_category'] = $product_info['products_category'] ?? 'غير مصنف';
        $product_info['products_description'] = $product_info['products_description'] ?? '';
    }

    $sql = <<<SQL
        SELECT 
            c.clients_id,
            COALESCE(c.clients_company_name, c.clients_contact_name, CONCAT("عميل رقم ", c.clients_id)) AS client_display_name,
            c.clients_company_name,
            c.clients_contact_name,
            c.clients_contact_phone_1,
            c.clients_city,
            c.clients_status,
            c.clients_type,
            c.clients_credit_balance,
            c.clients_last_visit,
            u.users_name AS representative_name
        FROM client_interested_products cip
        JOIN clients c ON c.clients_id = cip.client_id
        LEFT JOIN users u ON u.users_id = c.clients_rep_user_id
        WHERE cip.products_id = ?
    SQL;

    $types = 'i';
    $params = [$product_id_int];

    if ($current_user_role !== 'admin' && $current_user_role !== 'store_keeper') {
        $sql .= ' AND c.clients_rep_user_id = ?';
        $types .= 'i';
        $params[] = $current_user_id;
    }

    $sql .= ' ORDER BY client_display_name ASC';

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Prepare failed for interested clients select: ' . $conn->error);
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $clients = [];
    while ($row = $result->fetch_assoc()) {
        $row['clients_id'] = isset($row['clients_id']) ? (int)$row['clients_id'] : null;
        $row['clients_credit_balance'] = isset($row['clients_credit_balance']) ? (float)$row['clients_credit_balance'] : null;
        $clients[] = $row;
    }

    $stmt->close();
    $stmt = null;

    $response = [
        'product' => $product_info,
        'clients' => $clients,
        'total_clients' => count($clients),
    ];

    print_success('Interested product clients retrieved successfully.', $response);

} catch (Exception | TypeError $e) {
    print_failure('Internal Error: ' . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt instanceof mysqli_stmt) {
        $stmt->close();
    }
    if (isset($stmt_user) && $stmt_user instanceof mysqli_stmt) {
        $stmt_user->close();
    }
    if (isset($product_stmt) && $product_stmt instanceof mysqli_stmt) {
        $product_stmt->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}

?>
