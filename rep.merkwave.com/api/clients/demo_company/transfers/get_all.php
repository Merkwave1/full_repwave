<?php
/**
 * API endpoint to fetch all stock transfers, including their items (IDs only).
 *
 * This script retrieves a list of all transfers from the database. For each
 * transfer, it also fetches the associated items, returning only their IDs
 * and quantities.
 *
 * --- EXPECTED GET PARAMETERS ---
 * Optional GET params:
 *  - page (int, default 1)
 *  - limit (int, default 10)
 *  - status (string, optional)
 *  - source_warehouse_id (int, optional)
 *  - destination_warehouse_id (int, optional)
 * -------------------------------
 *
 * --- SUCCESSFUL JSON RESPONSE ---
 * {
 * "status": "success",
 * "message": "Transfers retrieved successfully.",
 * "data": [
 * {
 * "transfer_id": 1,
 * "transfer_source_warehouse_id": 1,
 * "transfer_destination_warehouse_id": 2,
 * "status": "Completed",
 * "transfer_initiated_by_user_id": 1,
 * "notes": "Weekly restock.",
 * "created_at": "2023-10-27 10:00:00",
 * "updated_at": "2023-10-27 10:05:00",
 * "items": [
 * {
 * "variant_id": 101,
 * "packaging_type_id": 2,
 * "quantity": 10.00
 * }
 * ]
 * }
 * ]
 * }
 * --------------------------------
 */

// Require necessary files and set error reporting
require_once '../db_connect.php'; // Make sure this path is correct
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Authenticate user (optional, but recommended)
    

    // Pagination params
    $page = isset($_GET['page']) && is_numeric($_GET['page']) && (int)$_GET['page'] > 0 ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) && (int)$_GET['limit'] > 0 ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    // Optional filters
    $filter_status = isset($_GET['status']) ? trim($_GET['status']) : null;
    $filter_source = isset($_GET['source_warehouse_id']) && is_numeric($_GET['source_warehouse_id']) ? (int)$_GET['source_warehouse_id'] : null;
    $filter_destination = isset($_GET['destination_warehouse_id']) && is_numeric($_GET['destination_warehouse_id']) ? (int)$_GET['destination_warehouse_id'] : null;

    $transfers = [];
    
    // SQL query to fetch all transfer headers (IDs only)
    // Build WHERE conditions
    $where = [];
    $types = '';
    $params = [];
    if ($filter_status !== null && $filter_status !== '') { $where[] = 't.transfer_status = ?'; $types .= 's'; $params[] = $filter_status; }
    if ($filter_source !== null) { $where[] = 't.transfer_source_warehouse_id = ?'; $types .= 'i'; $params[] = $filter_source; }
    if ($filter_destination !== null) { $where[] = 't.transfer_destination_warehouse_id = ?'; $types .= 'i'; $params[] = $filter_destination; }

    $whereSql = $where ? (' WHERE ' . implode(' AND ', $where)) : '';

    // Count total
    $sql_count = "SELECT COUNT(*) AS cnt FROM transfers t" . $whereSql;
    $stmt_count = $conn->prepare($sql_count);
    if ($types) { $stmt_count->bind_param($types, ...$params); }
    $stmt_count->execute();
    $res_count = $stmt_count->get_result();
    $row_count = $res_count->fetch_assoc();
    $total_items = (int)($row_count['cnt'] ?? 0);
    $stmt_count->close();

    // Fetch page of transfer headers
    $sql_transfers = "
        SELECT 
            t.transfer_id,
            t.transfer_source_warehouse_id,
            t.transfer_destination_warehouse_id,
            t.transfer_status AS status,
            t.transfer_initiated_by_user_id,
            t.transfer_notes AS notes,
            t.transfer_created_at AS created_at,
            t.transfer_updated_at AS updated_at
        FROM 
            transfers t
        " . $whereSql . "
        ORDER BY 
            t.transfer_created_at DESC
        LIMIT ? OFFSET ?
    ";

    // Add limit/offset to params
    $types_paged = $types . 'ii';
    $params_paged = array_merge($params, [$limit, $offset]);
    $stmt_transfers = $conn->prepare($sql_transfers);
    $stmt_transfers->bind_param($types_paged, ...$params_paged);
    $stmt_transfers->execute();
    $result_transfers = $stmt_transfers->get_result();
    
    // Prepare a statement to fetch item IDs for each transfer
    $stmt_items = $conn->prepare("
        SELECT
            ti.transfer_item_quantity AS quantity,
            i.variant_id,
            i.packaging_type_id
        FROM
            transfer_items ti
        JOIN
            inventory i ON ti.inventory_id = i.inventory_id
        WHERE
            ti.transfer_id = ?
    ");


    if ($result_transfers) {
        while ($transfer_row = $result_transfers->fetch_assoc()) {
            // Get items for the current transfer
            $stmt_items->bind_param("i", $transfer_row['transfer_id']);
            $stmt_items->execute();
            $result_items = $stmt_items->get_result();
            
            $items = [];
            while ($item_row = $result_items->fetch_assoc()) {
                // Type casting for consistency
                $item_row['variant_id'] = (int)$item_row['variant_id'];
                $item_row['packaging_type_id'] = $item_row['packaging_type_id'] ? (int)$item_row['packaging_type_id'] : null;
                $item_row['quantity'] = (float)$item_row['quantity'];
                $items[] = $item_row;
            }
            $result_items->free();
            
            // Add the items array to the transfer data
            $transfer_row['items'] = $items;
            
            // Type cast main transfer IDs
            $transfer_row['transfer_id'] = (int)$transfer_row['transfer_id'];
            $transfer_row['transfer_source_warehouse_id'] = (int)$transfer_row['transfer_source_warehouse_id'];
            $transfer_row['transfer_destination_warehouse_id'] = (int)$transfer_row['transfer_destination_warehouse_id'];
            if ($transfer_row['transfer_initiated_by_user_id']) {
                $transfer_row['transfer_initiated_by_user_id'] = (int)$transfer_row['transfer_initiated_by_user_id'];
            }
            
            $transfers[] = $transfer_row;
        }
        $result_transfers->free();
    }
    $stmt_items->close();
    $stmt_transfers->close();

    $total_pages = $limit > 0 ? max(1, (int)ceil($total_items / $limit)) : 1;
    echo json_encode([
        'status' => 'success',
        'message' => 'Transfers and their items retrieved successfully.',
        'data' => $transfers,
        'pagination' => [
            'total' => $total_items,
            'per_page' => $limit,
            'page' => $page,
            'total_pages' => $total_pages
        ]
    ]);
    exit;

} catch (Exception | TypeError $e) {
    print_failure("An unexpected error occurred: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
