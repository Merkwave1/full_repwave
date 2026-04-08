<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get pagination parameters
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10; // Default to 10 items per page

    // Get search parameters
    $search_term = $_GET['search'] ?? null; // A general search term to apply across multiple fields

    // Validate pagination parameters
    if ($page < 1) {
        $page = 1;
    }
    if ($limit < 1 || $limit > 100) { // Set a reasonable max limit
        $limit = 10;
    }

    $offset = ($page - 1) * $limit;

    // Build WHERE clause for search
    $where_clauses = [];
    $bind_types = "";
    $bind_params = [];

    if (!empty($search_term)) {
        $search_pattern = '%' . $search_term . '%';
        $where_clauses[] = "(
            p.products_name LIKE ? OR 
            p.products_description LIKE ? OR 
            p.products_category LIKE ? OR 
            p.products_sku LIKE ? OR 
            p.products_barcode LIKE ? OR 
            p.products_unit_of_measure LIKE ? OR 
            p.products_brand LIKE ?
        )";
        $bind_types .= "sssssss"; // 7 's' for the 7 LIKE clauses
        for ($i = 0; $i < 7; $i++) {
            $bind_params[] = $search_pattern;
        }
    }

    // First, get the total number of records for pagination metadata (with search filter)
    $sql_count = "SELECT COUNT(*) AS total_products FROM products p";
    if (!empty($where_clauses)) {
        $sql_count .= " WHERE " . implode(" AND ", $where_clauses);
    }

    $stmt_count = $conn->prepare($sql_count);
    if (!$stmt_count) {
        throw new Exception("Prepare failed for count query: " . $conn->error);
    }

    // Bind search parameters to count query
    if (!empty($bind_params)) {
        call_user_func_array([$stmt_count, 'bind_param'], array_merge([$bind_types], $bind_params));
    }
    
    $stmt_count->execute();
    $result_count = $stmt_count->get_result();
    $total_products = $result_count->fetch_assoc()['total_products'];
    $stmt_count->close();

    // Calculate total pages
    $total_pages = ceil($total_products / $limit);

    // Then, get the products for the current page (with search filter and pagination)
    $sql_select = "
        SELECT 
            p.products_id, 
            p.products_name, 
            p.products_description, 
            p.products_unit_price, 
            p.products_image_url, 
            p.products_category, 
            p.products_sku,
            p.products_barcode,
            p.products_unit_of_measure,
            p.products_brand
        FROM products p
    ";
    if (!empty($where_clauses)) {
        $sql_select .= " WHERE " . implode(" AND ", $where_clauses);
    }
    $sql_select .= " ORDER BY p.products_name ASC LIMIT ? OFFSET ?";

    // Add types and params for LIMIT and OFFSET to the end
    $bind_types_select = $bind_types . "ii"; 
    $bind_params_select = array_merge($bind_params, [&$limit, &$offset]);

    $stmt = $conn->prepare($sql_select);

    if (!$stmt) {
        throw new Exception("Prepare failed for select: " . $conn->error);
    }

    // Bind all parameters (search, limit, offset)
    call_user_func_array([$stmt, 'bind_param'], array_merge([$bind_types_select], $bind_params_select));
    
    $stmt->execute();
    $result = $stmt->get_result();

    $products = [];
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }

    // Prepare pagination metadata
    $pagination = [
        'total_records' => $total_products,
        'total_pages' => $total_pages,
        'current_page' => $page,
        'per_page' => $limit,
        'has_next_page' => ($page < $total_pages),
        'has_prev_page' => ($page > 1)
    ];

    print_success("Products retrieved successfully.", ['products' => $products, 'pagination' => $pagination]);

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
