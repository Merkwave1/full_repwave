<?php
/**
 * Import Purchase Receipts from Odoo
 * 
 * Imports stock.picking (incoming from purchases) and stock.move from Odoo to purchase_receipts and purchase_receipt_items tables
 * Uses the same IDs from Odoo
 * 
 * Mapping:
 * - purchase_receipts_id: Odoo stock.picking ID
 * - purchase_receipts_purchase_order_id: Linked via origin field (P00001)
 * - purchase_receipts_warehouse_id: warehouse_id
 * - purchase_receipts_receipt_date: date_done
 * - purchase_receipts_received_by_user_id: user_id
 * - purchase_receipts_receipt_status: mapped from state
 * - purchase_receipts_odoo_picking_id: Odoo picking ID
 * 
 * - purchase_receipt_items_id: Odoo stock.move ID
 * - purchase_receipt_items_receipt_id: picking_id
 * - purchase_receipt_items_purchase_order_item_id: purchase_line_id
 * - purchase_receipt_items_quantity_received: quantity
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
 * Map Odoo state to Rep receipt status
 */
function mapOdooStateToReceiptStatus($state) {
    $mapping = [
        'draft' => 'Draft',
        'waiting' => 'Draft',
        'confirmed' => 'Ready',
        'assigned' => 'Ready',
        'done' => 'Done',
        'cancel' => 'Cancelled'
    ];
    return $mapping[$state] ?? 'Draft';
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
    
    // First get the incoming picking types (receipts from suppliers)
    $picking_types = importOdooCall($odoo_url, 'stock.picking.type', 'search_read', $cookie_file, [
        [['code', '=', 'incoming']]
    ], [
        'context' => ['active_test' => false],
        'fields' => ['id', 'name', 'warehouse_id']
    ]);
    
    $incoming_type_ids = [];
    $type_to_warehouse = [];
    foreach ($picking_types as $pt) {
        $incoming_type_ids[] = $pt['id'];
        $wh_id = $pt['warehouse_id'][0] ?? 1;
        $type_to_warehouse[$pt['id']] = isset($valid_warehouses[$wh_id]) ? $wh_id : 1;
    }
    
    if (empty($incoming_type_ids)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على أنواع استلام واردة في Odoo',
            'data' => ['imported' => 0]
        ]);
        exit;
    }
    
    // Get incoming pickings (purchase receipts) - only those linked to purchase orders
    $receipts = importOdooCall($odoo_url, 'stock.picking', 'search_read', $cookie_file, [
        [
            ['picking_type_id', 'in', $incoming_type_ids],
            ['origin', 'like', 'P%']  // Only purchase-related
        ]
    ], [
        'context' => ['active_test' => false],
        'fields' => ['id', 'name', 'origin', 'partner_id', 'location_id', 'location_dest_id', 'picking_type_id', 'date_done', 'scheduled_date', 'user_id', 'state', 'move_ids', 'note']
    ]);
    
    if (empty($receipts)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على استلامات شراء في Odoo',
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
            $status = mapOdooStateToReceiptStatus($receipt['state'] ?? 'draft');
            $notes = $receipt['note'] ?: null;
            
            // Check if receipt exists
            $stmt = $conn->prepare("SELECT purchase_receipts_id FROM purchase_receipts WHERE purchase_receipts_id = ?");
            $stmt->bind_param("i", $receipt_id);
            $stmt->execute();
            $exists = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            
            if ($exists) {
                $stmt = $conn->prepare("UPDATE purchase_receipts SET 
                    purchase_receipts_purchase_order_id = ?,
                    purchase_receipts_warehouse_id = ?,
                    purchase_receipts_receipt_date = ?,
                    purchase_receipts_received_by_user_id = ?,
                    purchase_receipts_receipt_status = ?,
                    purchase_receipts_odoo_picking_id = ?,
                    purchase_receipts_notes = ?,
                    purchase_receipts_updated_at = CURRENT_TIMESTAMP
                    WHERE purchase_receipts_id = ?");
                $stmt->bind_param("iisisisi",
                    $purchase_order_id,
                    $warehouse_id,
                    $receipt_date,
                    $user_id,
                    $status,
                    $receipt_id,
                    $notes,
                    $receipt_id
                );
                $stmt->execute();
                $stmt->close();
                $updated_receipts++;
                
                // Delete existing items
                // UPSERT mode: Skip delete to avoid FK constraint issues
                $stmt->close();
            } else {
                $stmt = $conn->prepare("INSERT INTO purchase_receipts (
                    purchase_receipts_id,
                    purchase_receipts_purchase_order_id,
                    purchase_receipts_warehouse_id,
                    purchase_receipts_receipt_date,
                    purchase_receipts_received_by_user_id,
                    purchase_receipts_receipt_status,
                    purchase_receipts_odoo_picking_id,
                    purchase_receipts_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("iiisisis",
                    $receipt_id,
                    $purchase_order_id,
                    $warehouse_id,
                    $receipt_date,
                    $user_id,
                    $status,
                    $receipt_id,
                    $notes
                );
                $stmt->execute();
                $stmt->close();
                $imported_receipts++;
            }
            
            // Import receipt items
            if (!empty($receipt['move_ids'])) {
                foreach ($receipt['move_ids'] as $move_id) {
                    if (!isset($moves[$move_id])) continue;
                    
                    $move = $moves[$move_id];
                    
                    // Skip cancelled moves
                    if ($move['state'] === 'cancel') continue;
                    
                    $po_item_id = $move['purchase_line_id'][0] ?? null;
                    
                    // If no purchase_line_id, set to NULL (allow receipt items without direct PO item link)
                    if ($po_item_id && !isset($valid_po_items[$po_item_id])) {
                        $po_item_id = null;
                    }
                    
                    // Use quantity (done) if available, otherwise product_uom_qty
                    $quantity_received = $move['quantity'] ?? $move['product_uom_qty'] ?? 0;
                    
                    $stmt = $conn->prepare("INSERT INTO purchase_receipt_items (
                        purchase_receipt_items_id,
                        purchase_receipt_items_receipt_id,
                        purchase_receipt_items_purchase_order_item_id,
                        purchase_receipt_items_quantity_received
                    ) VALUES (?, ?, ?, ?)");
                    $stmt->bind_param("iiid",
                        $move_id,
                        $receipt_id,
                        $po_item_id,
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
                SELECT SUM(pri.purchase_receipt_items_quantity_received)
                FROM purchase_receipt_items pri
                WHERE pri.purchase_receipt_items_purchase_order_item_id = poi.purchase_order_items_id
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
