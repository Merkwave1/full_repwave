<?php
/**
 * transfer_requests/get_all.php
 * List transfer requests (pending by default) with items and creator.
 * Optional filters: status, source_warehouse_id, destination_warehouse_id
 */
require_once '../db_connect.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    

    $status = $_GET['status'] ?? 'Pending';
    $source_warehouse_id = $_GET['source_warehouse_id'] ?? null;
    $destination_warehouse_id = $_GET['destination_warehouse_id'] ?? null;

    $where = ["request_status = ?"]; $params = [$status]; $types = 's';
    if (!empty($source_warehouse_id)) { $where[] = "request_source_warehouse_id = ?"; $types .= 'i'; $params[] = (int)$source_warehouse_id; }
    if (!empty($destination_warehouse_id)) { $where[] = "request_destination_warehouse_id = ?"; $types .= 'i'; $params[] = (int)$destination_warehouse_id; }

    $sql = "SELECT r.request_id, r.request_source_warehouse_id, r.request_destination_warehouse_id, r.request_status, r.request_notes, r.request_created_by_user_id, r.request_created_at, u.users_name AS created_by_name
            FROM transfer_requests r
            LEFT JOIN users u ON u.users_id = r.request_created_by_user_id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY r.request_created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $res = $stmt->get_result();

    $requests = [];
    while ($row = $res->fetch_assoc()) {
        $row['items'] = [];
        $stmt_items = $conn->prepare("SELECT tri.request_item_id, tri.variant_id, tri.packaging_type_id, tri.requested_quantity, tri.request_item_note, pv.variant_name, p.products_name, pt.packaging_types_name
                                      FROM transfer_request_items tri
                                      LEFT JOIN product_variants pv ON pv.variant_id = tri.variant_id
                                      LEFT JOIN products p ON p.products_id = pv.variant_products_id
                                      LEFT JOIN packaging_types pt ON pt.packaging_types_id = tri.packaging_type_id
                                      WHERE tri.request_id = ?");
        $stmt_items->bind_param('i', $row['request_id']);
        $stmt_items->execute();
        $items_res = $stmt_items->get_result();
        $row['items'] = $items_res->fetch_all(MYSQLI_ASSOC);
        $stmt_items->close();

        $requests[] = $row;
    }

    print_success("Requests fetched.", $requests);
} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
