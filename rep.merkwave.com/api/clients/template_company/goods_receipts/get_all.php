<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get user UUID from request (GET or POST)
    $users_uuid = $_GET['users_uuid'] ?? $_POST['users_uuid'] ?? null;
    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    // Validate user and get user ID
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    $stmt_user->bind_param('s', $users_uuid);
    $stmt_user->execute();
    $user = $stmt_user->get_result()->fetch_assoc();
    $stmt_user->close();
    if (!$user) {
        print_failure('Error: Invalid user UUID.');
    }

    // Pagination
    $page = isset($_GET['page']) && is_numeric($_GET['page']) && (int)$_GET['page']>0 ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) && is_numeric($_GET['limit']) && (int)$_GET['limit']>0 ? (int)$_GET['limit'] : 10;
    $offset = ($page - 1) * $limit;

    // Read optional filters from request
    // Accept either 'search' or 'searchTerm' (frontend variations). Normalize obvious invalid values.
    if (isset($_GET['search'])) $search = trim($_GET['search']);
    elseif (isset($_GET['searchTerm'])) $search = trim($_GET['searchTerm']);
    elseif (isset($_POST['search'])) $search = trim($_POST['search']);
    elseif (isset($_POST['searchTerm'])) $search = trim($_POST['searchTerm']);
    else $search = '';
    // Normalize accidental literal strings from some clients
    if (in_array(strtolower($search), ['undefined', 'null'], true)) $search = '';
    $date_from = isset($_GET['date_from']) ? trim($_GET['date_from']) : (isset($_POST['date_from']) ? trim($_POST['date_from']) : '');
    $date_to = isset($_GET['date_to']) ? trim($_GET['date_to']) : (isset($_POST['date_to']) ? trim($_POST['date_to']) : '');
    $filter_warehouse = isset($_GET['warehouse_id']) ? trim($_GET['warehouse_id']) : (isset($_POST['warehouse_id']) ? trim($_POST['warehouse_id']) : '');
    $filter_recipient = isset($_GET['recipient_id']) ? trim($_GET['recipient_id']) : (isset($_POST['recipient_id']) ? trim($_POST['recipient_id']) : '');

    // Build WHERE clauses based on filters
    $whereClauses = [];
    if ($search !== '') {
        $s = mysqli_real_escape_string($conn, $search);
        // Cast numeric ID to CHAR to allow LIKE searches against it
        $whereClauses[] = "(CAST(gr.goods_receipt_id AS CHAR) LIKE '%$s%' OR COALESCE(u.users_name, '') LIKE '%$s%' OR COALESCE(w.warehouse_name, '') LIKE '%$s%' OR COALESCE(gr.goods_receipt_notes, '') LIKE '%$s%')";
    }
    if ($date_from !== '') {
        $df = mysqli_real_escape_string($conn, $date_from);
        $whereClauses[] = "gr.goods_receipt_date >= '$df'";
    }
    if ($date_to !== '') {
        $dt = mysqli_real_escape_string($conn, $date_to);
        $whereClauses[] = "gr.goods_receipt_date <= '$dt'";
    }
    if ($filter_warehouse !== '') {
        $wid = (int)$filter_warehouse;
        $whereClauses[] = "gr.goods_receipt_warehouse_id = $wid";
    }
    if ($filter_recipient !== '') {
        $rid = (int)$filter_recipient;
        $whereClauses[] = "gr.goods_receipt_received_by_user_id = $rid";
    }
    $whereSql = '';
    if (count($whereClauses) > 0) {
        $whereSql = ' WHERE ' . implode(' AND ', $whereClauses);
    }

    // Total count (distinct receipts) with same filters
    $count_sql = "SELECT COUNT(DISTINCT gr.goods_receipt_id) AS cnt FROM goods_receipts gr LEFT JOIN users u ON gr.goods_receipt_received_by_user_id = u.users_id LEFT JOIN warehouse w ON gr.goods_receipt_warehouse_id = w.warehouse_id $whereSql";
    $res_count = mysqli_query($conn, $count_sql);
    $rowc = mysqli_fetch_assoc($res_count);
    $total_items = (int)($rowc['cnt'] ?? 0);

    // SQL query to get a page of goods receipts with related information
    $query = "
        SELECT 
            gr.goods_receipt_id as receipt_id,
            gr.goods_receipt_warehouse_id as warehouse_id,
            gr.goods_receipt_date as receipt_date,
            COALESCE(gr.goods_receipt_notes, '') as notes,
            gr.goods_receipt_received_by_user_id as received_by_user_id,
            gr.goods_receipt_odoo_picking_id as odoo_picking_id,
            gr.goods_receipt_purchase_order_id as purchase_order_id,
            COALESCE(u.users_name, '') as received_by_user_name,
            COALESCE(w.warehouse_name, '') as warehouse_name,
            GROUP_CONCAT(
                JSON_OBJECT(
                    'product_id', COALESCE(COALESCE(p.products_id, p2.products_id), 0),
                    'product_name', COALESCE(COALESCE(p.products_name, p2.products_name), ''),
                    'variant_id', COALESCE(COALESCE(pv.variant_id, pv2.variant_id), 0),
                    'variant_name', COALESCE(COALESCE(pv.variant_name, pv2.variant_name), ''),
                    'variant_sku', COALESCE(COALESCE(pv.variant_sku, pv2.variant_sku), ''),
                    'quantity_received', COALESCE(gri.quantity_received, 0),
                    'purchase_order_id', COALESCE(poi.purchase_order_items_purchase_order_id, 0),
                    'purchase_order_item_id', COALESCE(poi.purchase_order_items_id, 0),
                    'production_date', COALESCE(gri.goods_receipt_items_production_date, NULL)
                )
            ) as items
        FROM goods_receipts gr
        LEFT JOIN users u ON gr.goods_receipt_received_by_user_id = u.users_id
        LEFT JOIN warehouse w ON gr.goods_receipt_warehouse_id = w.warehouse_id
        LEFT JOIN goods_receipt_items gri ON gr.goods_receipt_id = gri.goods_receipt_id
        LEFT JOIN purchase_order_items poi ON gri.purchase_order_item_id = poi.purchase_order_items_id
        LEFT JOIN product_variants pv ON poi.purchase_order_items_variant_id = pv.variant_id
        LEFT JOIN product_variants pv2 ON gri.variant_id = pv2.variant_id
        LEFT JOIN products p ON pv.variant_products_id = p.products_id
        LEFT JOIN products p2 ON pv2.variant_products_id = p2.products_id
    $whereSql
    GROUP BY gr.goods_receipt_id
    ORDER BY gr.goods_receipt_id DESC
    LIMIT $limit OFFSET $offset
    ";

    $result = mysqli_query($conn, $query);
    $receipts = [];

    while ($row = mysqli_fetch_assoc($result)) {
        // Parse the items JSON
        $items = [];
        if (!empty($row['items'])) {
            $itemsString = $row['items'];
            // Split by JSON objects and parse each one
            $itemsArray = explode('},{', $itemsString);
            foreach ($itemsArray as $index => $itemString) {
                // Fix JSON formatting
                if ($index === 0 && count($itemsArray) > 1) {
                    $itemString .= '}';
                } elseif ($index === count($itemsArray) - 1 && count($itemsArray) > 1) {
                    $itemString = '{' . $itemString;
                } elseif (count($itemsArray) > 1) {
                    $itemString = '{' . $itemString . '}';
                }
                
                $item = json_decode($itemString, true);
                if ($item) {
                    $items[] = $item;
                }
            }
        }

        $receipts[] = [
            'receipt_id' => $row['receipt_id'],
            'warehouse_id' => $row['warehouse_id'],
            'warehouse_name' => $row['warehouse_name'],
            'receipt_date' => $row['receipt_date'],
            'notes' => $row['notes'],
            'received_by_user_id' => $row['received_by_user_id'],
            'received_by_user_name' => $row['received_by_user_name'],
            'odoo_picking_id' => $row['odoo_picking_id'],
            'purchase_order_id' => $row['purchase_order_id'],
            'items' => $items
        ];
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Goods receipts retrieved successfully.',
        'data' => $receipts,
        'pagination' => [
            'total' => $total_items,
            'per_page' => $limit,
            'page' => $page,
            'total_pages' => ($limit>0 ? max(1, (int)ceil($total_items/$limit)) : 1)
        ]
    ]);
    exit;

} catch (Exception $e) {
    print_failure("Error: " . $e->getMessage());
}

?>
