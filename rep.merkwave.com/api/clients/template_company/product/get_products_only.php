<?php
// get_products_only.php - Returns only products without variants (for interested products feature)

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $search_term = $_GET['search'] ?? null;
    $client_id = $_GET['client_id'] ?? null;

    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    // Optional search filter
    if (!empty($search_term)) {
        $search_pattern = '%' . $search_term . '%';
        $where_clauses[] = "(
            p.products_name LIKE ? OR
            p.products_description LIKE ? OR
            p.products_brand LIKE ?
        )";
        $bind_types .= "sss";
        for ($i = 0; $i < 3; $i++) {
            $bind_params[] = $search_pattern;
        }
    }

    // Exclude products already added to this client's interested products
    if (!empty($client_id) && is_numeric($client_id)) {
        $where_clauses[] = "p.products_id NOT IN (
            SELECT products_id 
            FROM client_interested_products 
            WHERE client_id = ?
        )";
        $bind_types .= "i";
        $bind_params[] = (int)$client_id;
    }

    // Select only products (no variants)
    $sql_select = "
        SELECT
            p.products_id,
            p.products_name,
            p.products_category_id,
            p.products_description,
            p.products_brand,
            p.products_image_url,
            p.products_is_active,
            p.products_weight,
            p.products_volume
        FROM products p
        WHERE p.products_is_active = 1
    ";

    if (!empty($where_clauses)) {
        $sql_select .= " AND " . implode(" AND ", $where_clauses);
    }

    $sql_select .= " ORDER BY p.products_name ASC";

    $stmt = $conn->prepare($sql_select);
    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    if (!empty($bind_params)) {
        $stmt->bind_param($bind_types, ...$bind_params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $products = [];
    while ($row = $result->fetch_assoc()) {
        $products[] = [
            'products_id' => $row['products_id'],
            'products_name' => $row['products_name'],
            'products_category_id' => $row['products_category_id'],
            'products_description' => $row['products_description'],
            'products_brand' => $row['products_brand'],
            'products_image_url' => $row['products_image_url'],
            'products_is_active' => $row['products_is_active'],
            'products_weight' => $row['products_weight'],
            'products_volume' => $row['products_volume']
        ];
    }

    $stmt->close();

    print_success("Products retrieved successfully.", ['products' => $products]);

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
