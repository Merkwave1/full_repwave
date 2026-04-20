<?php
/**
 * Import Goods Receipts (Purchase Receipts) from Odoo
 * 
 * Imports stock.picking (incoming from purchases) and stock.move from Odoo to goods_receipts and goods_receipt_items tables
 * Uses the same IDs from Odoo
 * 
 * Mapping:
 * - goods_receipt_id: Odoo stock.picking ID
 * - goods_receipt_warehouse_id: warehouse_id
 * - goods_receipt_date: date_done
 * - goods_receipt_received_by_user_id: user_id
 * - goods_receipt_odoo_picking_id: Odoo picking ID
 * 
 * - goods_receipt_item_id: Odoo stock.move ID
 * - goods_receipt_id: picking_id
 * - purchase_order_item_id: purchase_line_id
 * - quantity_received: quantity
 */

require_once __DIR__ . '/../db_connect.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

$cookie_file = '/tmp/odoo_import_cookies_' . uniqid() . '.txt';

/**
 * Authenticate with Odoo
 */
function importOdooAuth($url, $database, $username, $password, $cookie_file) {
    $auth_url = rtrim($url, '/') . '/web/session/authenticate';
    
    $payload = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => ['db' => $database, 'login' => $username, 'password' => $password],
        'id' => rand(1, 999999)
    ];
    
    $ch = curl_init($auth_url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_HEADER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_COOKIEJAR => $cookie_file,
        CURLOPT_COOKIEFILE => $cookie_file,
    ]);
    
    $response = curl_exec($ch);
    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $body = substr($response, $header_size);
    curl_close($ch);
    
    $result = json_decode($body, true);
    if (isset($result['result']['uid']) && $result['result']['uid']) return $result['result'];
    throw new Exception($result['error']['data']['message'] ?? 'فشل المصادقة');
}

/**
 * Call Odoo API
 */
function importOdooCall($url, $model, $method, $cookie_file, $args = [], $kwargs = []) {
    $call_url = rtrim($url, '/') . '/web/dataset/call_kw/' . $model . '/' . $method;
    
    $payload = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => ['model' => $model, 'method' => $method, 'args' => $args, 'kwargs' => $kwargs],
        'id' => rand(1, 999999)
    ];
    
    $ch = curl_init($call_url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_COOKIEJAR => $cookie_file,
        CURLOPT_COOKIEFILE => $cookie_file,
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    return $result['result'] ?? [];
}

/**
 * Extract purchase order ID from origin (P00001 -> 1)
 */
function extractPurchaseOrderIdFromOrigin($origin, $valid_purchase_orders) {
    if (empty($origin)) return null;
    
    // Check if origin starts with P (purchase order)
    if (preg_match('/^P(\d+)/', $origin, $matches)) {
        $po_id = intval($matches[1]);
        // Validate the purchase order exists
        if (isset($valid_purchase_orders[$po_id])) {
            return $po_id;
        }
    }
    return null;
}

// Main execution
try {
    // Load Odoo settings from database
    // Odoo settings loaded from functions.php via db_connect.php
    $odoo_settings = getOdooSettings();
    $odoo_url = $odoo_settings['url'];
    $odoo_db = $odoo_settings['database'];
    
    // Authenticate with Odoo using database settings
    importOdooAuth($odoo_url, $odoo_db, $odoo_settings['username'], $odoo_settings['password'], $cookie_file);
    
    // Build lookup maps
    // Get valid purchase order IDs
    $po_result = $conn->query("SELECT purchase_orders_id FROM purchase_orders");
    $valid_purchase_orders = [];
    while ($row = $po_result->fetch_assoc()) {
        $valid_purchase_orders[$row['purchase_orders_id']] = true;
    }
    
    // Get valid purchase order item IDs
    $poi_result = $conn->query("SELECT purchase_order_items_id FROM purchase_order_items");
    $valid_po_items = [];
    while ($row = $poi_result->fetch_assoc()) {
        $valid_po_items[$row['purchase_order_items_id']] = true;
    }
    
    // Get variant IDs mapped by Odoo product_id (which is stored as variant_odoo_product_id)
    $variant_result = $conn->query("SELECT variant_id, variant_odoo_product_id FROM product_variants WHERE variant_odoo_product_id IS NOT NULL");
    $odoo_to_variant = [];
    while ($row = $variant_result->fetch_assoc()) {
        $odoo_to_variant[$row['variant_odoo_product_id']] = $row['variant_id'];
    }
    
    // Get valid user IDs
    $users_result = $conn->query("SELECT users_id FROM users");
    $valid_users = [];
    while ($row = $users_result->fetch_assoc()) {
        $valid_users[$row['users_id']] = true;
    }
    
    // Get valid warehouse IDs
    $wh_result = $conn->query("SELECT warehouse_id FROM warehouse");
    $valid_warehouses = [];
    while ($row = $wh_result->fetch_assoc()) {
        $valid_warehouses[$row['warehouse_id']] = true;
    }
    
    // Get ALL picking types to map picking_type_id -> warehouse_id
    // We need this mapping for any picking type since some PO receipts use internal transfers
    $picking_types = importOdooCall($odoo_url, 'stock.picking.type', 'search_read', $cookie_file, [
        []  // Get all types
    ], [
        'context' => ['active_test' => false],
        'fields' => ['id', 'name', 'warehouse_id', 'code']
    ]);
    
    $type_to_warehouse = [];
    foreach ($picking_types as $pt) {
        $wh_id = $pt['warehouse_id'][0] ?? 1;
        $type_to_warehouse[$pt['id']] = isset($valid_warehouses[$wh_id]) ? $wh_id : 1;
    }
    
    // Get ALL pickings with purchase order origin (P00XXX) regardless of picking type
    // Some purchase receipts may use "internal" type (like Storage) instead of "incoming" type
    $receipts = importOdooCall($odoo_url, 'stock.picking', 'search_read', $cookie_file, [
        [
            ['origin', 'like', 'P0%'],  // Only purchase-related (P00001, etc.)
            ['state', '=', 'done']      // Only completed receipts
        ]
    ], [
        'context' => ['active_test' => false],
        'fields' => ['id', 'name', 'origin', 'partner_id', 'location_id', 'location_dest_id', 'picking_type_id', 'date_done', 'scheduled_date', 'user_id', 'state', 'move_ids', 'note']
    ]);
    
    if (empty($receipts)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على استلامات شراء مكتملة في Odoo',
            'data' => ['imported' => 0]
        ]);
        exit;
    }
    
    // Get all stock moves for these receipts
    $all_move_ids = [];
    foreach ($receipts as $receipt) {
        if (!empty($receipt['move_ids'])) {
            $all_move_ids = array_merge($all_move_ids, $receipt['move_ids']);
        }
    }
    
    $moves = [];
    if (!empty($all_move_ids)) {
        $batches = array_chunk($all_move_ids, 1000);
        foreach ($batches as $batch) {
            $move_data = importOdooCall($odoo_url, 'stock.move', 'search_read', $cookie_file, [
                [['id', 'in', $batch]]
            ], [
                'context' => ['active_test' => false],
        'fields' => ['id', 'picking_id', 'product_id', 'product_uom_qty', 'quantity', 'purchase_line_id', 'state']
            ]);
            foreach ($move_data as $move) {
                $moves[$move['id']] = $move;
            }
        }
    }
    
    $imported_receipts = 0;
    $updated_receipts = 0;
    $imported_items = 0;
    $skipped_receipts = 0;
    $skipped_items = 0;
    $errors = [];
    
    $conn->begin_transaction();
    
    try {
        foreach ($receipts as $receipt) {
            $receipt_id = $receipt['id'];
            $origin = $receipt['origin'] ?? '';
            
            // Extract purchase order ID from origin
            $purchase_order_id = extractPurchaseOrderIdFromOrigin($origin, $valid_purchase_orders);
            
            // Skip if not linked to a valid purchase order
            if (!$purchase_order_id) {
                $skipped_receipts++;
                $errors[] = "استلام رقم $receipt_id: تم التخطي - لم يتم العثور على طلب شراء مرتبط ($origin)";
                continue;
            }
            
            $picking_type_id = $receipt['picking_type_id'][0] ?? null;
            $warehouse_id = isset($type_to_warehouse[$picking_type_id]) ? $type_to_warehouse[$picking_type_id] : 1;
            $user_id = $receipt['user_id'][0] ?? null;
            
            // Validate user
            if (!$user_id || !isset($valid_users[$user_id])) {
                $user_id = null;
            }
            
            $receipt_date = $receipt['date_done'] ?: ($receipt['scheduled_date'] ?: date('Y-m-d H:i:s'));
            $notes = $receipt['note'] ?: "مستورد من Odoo - $origin";
            
            // Check if receipt exists by goods_receipt_id (same as Odoo picking ID)
            $stmt = $conn->prepare("SELECT goods_receipt_id FROM goods_receipts WHERE goods_receipt_id = ?");
            $stmt->bind_param("i", $receipt_id);
            $stmt->execute();
            $exists = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            
            $goods_receipt_id = $receipt_id; // Use Odoo picking ID as goods_receipt_id
            
            if ($exists) {
                // Update existing receipt
                $stmt = $conn->prepare("UPDATE goods_receipts SET 
                    goods_receipt_warehouse_id = ?,
                    goods_receipt_date = ?,
                    goods_receipt_received_by_user_id = ?,
                    goods_receipt_purchase_order_id = ?,
                    goods_receipt_notes = ?,
                    goods_receipt_odoo_picking_id = ?
                    WHERE goods_receipt_id = ?");
                $stmt->bind_param("isisisi",
                    $warehouse_id,
                    $receipt_date,
                    $user_id,
                    $purchase_order_id,
                    $notes,
                    $receipt_id,
                    $goods_receipt_id
                );
                $stmt->execute();
                $stmt->close();
                $updated_receipts++;
                
                // UPSERT mode: Skip delete to avoid FK constraint issues
            } else {
                // Insert new receipt with specific ID (Odoo picking ID)
                $stmt = $conn->prepare("INSERT INTO goods_receipts (
                    goods_receipt_id,
                    goods_receipt_warehouse_id,
                    goods_receipt_date,
                    goods_receipt_received_by_user_id,
                    goods_receipt_purchase_order_id,
                    goods_receipt_notes,
                    goods_receipt_odoo_picking_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("iisiisi",
                    $receipt_id,
                    $warehouse_id,
                    $receipt_date,
                    $user_id,
                    $purchase_order_id,
                    $notes,
                    $receipt_id
                );
                $stmt->execute();
                $stmt->close();
                $imported_receipts++;
            }
            
            // Import receipt items
            if (!empty($receipt['move_ids']) && $goods_receipt_id) {
                foreach ($receipt['move_ids'] as $move_id) {
                    if (!isset($moves[$move_id])) continue;
                    
                    $move = $moves[$move_id];
                    
                    // Skip cancelled moves
                    if ($move['state'] === 'cancel') continue;
                    
                    $po_item_id = $move['purchase_line_id'][0] ?? null;
                    $product_id = $move['product_id'][0] ?? null;
                    
                    // Get variant_id from Odoo product_id mapping
                    $variant_id = isset($odoo_to_variant[$product_id]) ? $odoo_to_variant[$product_id] : null;
                    
                    // Validate purchase_order_item_id if present
                    if ($po_item_id && !isset($valid_po_items[$po_item_id])) {
                        $po_item_id = null;
                    }
                    
                    // Skip if neither po_item_id nor variant_id is available
                    if (!$po_item_id && !$variant_id) {
                        $skipped_items++;
                        continue;
                    }
                    
                    // Use quantity (done) if available, otherwise product_uom_qty
                    $quantity_received = $move['quantity'] ?? $move['product_uom_qty'] ?? 0;
                    
                    $stmt = $conn->prepare("INSERT INTO goods_receipt_items (
                        goods_receipt_id,
                        purchase_order_item_id,
                        variant_id,
                        quantity_received
                    ) VALUES (?, ?, ?, ?)");
                    $stmt->bind_param("iiid",
                        $goods_receipt_id,
                        $po_item_id,
                        $variant_id,
                        $quantity_received
                    );
                    $stmt->execute();
                    $stmt->close();
                    $imported_items++;
                }
            }
        }
        
        // Update purchase_order_items with received quantities
        $conn->query("
            UPDATE purchase_order_items poi
            SET poi.purchase_order_items_quantity_received = COALESCE((
                SELECT SUM(gri.quantity_received)
                FROM goods_receipt_items gri
                WHERE gri.purchase_order_item_id = poi.purchase_order_items_id
            ), 0)
        ");
        
        // Update purchase_orders status based on received quantities
        $conn->query("
            UPDATE purchase_orders po
            SET po.purchase_orders_status = CASE
                WHEN (
                    SELECT COALESCE(SUM(poi.purchase_order_items_quantity_received), 0)
                    FROM purchase_order_items poi
                    WHERE poi.purchase_order_items_purchase_order_id = po.purchase_orders_id
                ) >= (
                    SELECT COALESCE(SUM(poi2.purchase_order_items_quantity_ordered), 0)
                    FROM purchase_order_items poi2
                    WHERE poi2.purchase_order_items_purchase_order_id = po.purchase_orders_id
                ) THEN 'Received'
                WHEN (
                    SELECT COALESCE(SUM(poi.purchase_order_items_quantity_received), 0)
                    FROM purchase_order_items poi
                    WHERE poi.purchase_order_items_purchase_order_id = po.purchase_orders_id
                ) > 0 THEN 'Partially Received'
                ELSE po.purchase_orders_status
            END
            WHERE po.purchase_orders_status NOT IN ('Draft', 'Cancelled')
        ");
        
        $conn->commit();
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
    
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    $conn->close();
    
    echo json_encode([
        'status' => 'success',
        'message' => "تم استيراد استلامات الشراء: $imported_receipts جديد، $updated_receipts محدث، $skipped_receipts تم تخطيه. الأصناف: $imported_items مستورد، $skipped_items تم تخطيه.",
        'data' => [
            'receipts_imported' => $imported_receipts,
            'receipts_updated' => $updated_receipts,
            'receipts_skipped' => $skipped_receipts,
            'items_imported' => $imported_items,
            'items_skipped' => $skipped_items,
            'total_receipts_from_odoo' => count($receipts),
            'skipped_receipts_log' => $errors
        ]
    ]);
    
} catch (Exception $e) {
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    if (isset($conn)) {
        $conn->rollback();
    }
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
