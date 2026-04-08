<?php
/**
 * Import Purchase Returns from Odoo
 * 
 * Imports return stock.picking (returns to suppliers) from Odoo to purchase_returns and purchase_return_items tables
 * Uses the same IDs from Odoo
 * 
 * In Odoo, purchase returns are typically:
 * 1. Outgoing pickings to supplier partners with origin starting with P
 * 2. Return pickings created from purchase receipts (Return of WH/IN/xxx)
 * 
 * Mapping:
 * - purchase_returns_id: Odoo stock.picking ID
 * - purchase_returns_supplier_id: partner_id
 * - purchase_returns_purchase_order_id: Linked via origin or via original receipt
 * - purchase_returns_date: date_done
 * - purchase_returns_status: mapped from state
 * - purchase_returns_odoo_picking_id: Odoo picking ID
 * 
 * - purchase_return_items_id: Odoo stock.move ID
 * - purchase_return_items_return_id: picking_id
 * - purchase_return_items_purchase_order_item_id: purchase_line_id
 * - purchase_return_items_quantity: quantity
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
 * Map Odoo state to Rep return status
 */
function mapOdooStateToReturnStatus($state) {
    $mapping = [
        'draft' => 'Draft',
        'waiting' => 'Pending',
        'confirmed' => 'Approved',
        'assigned' => 'Approved',
        'done' => 'Delivered',
        'cancel' => 'Cancelled'
    ];
    return $mapping[$state] ?? 'Draft';
}

/**
 * Extract purchase order ID from origin
 */
function extractPurchaseOrderIdFromOrigin($origin, $valid_purchase_orders) {
    if (empty($origin)) return null;
    
    // Check for P00001 format
    if (preg_match('/P(\d+)/', $origin, $matches)) {
        $po_id = intval($matches[1]);
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
    // Get valid supplier IDs
    $suppliers_result = $conn->query("SELECT supplier_id FROM suppliers");
    $valid_suppliers = [];
    while ($row = $suppliers_result->fetch_assoc()) {
        $valid_suppliers[$row['supplier_id']] = true;
    }
    
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
    
    // Get supplier partner IDs from Odoo
    $supplier_partners = importOdooCall($odoo_url, 'res.partner', 'search_read', $cookie_file, [
        [['supplier_rank', '>', 0]]
    ], [
        'context' => ['active_test' => false],
        'fields' => ['id']
    ]);
    
    $supplier_partner_ids = [];
    foreach ($supplier_partners as $sp) {
        $supplier_partner_ids[$sp['id']] = true;
    }
    
    // Get outgoing picking types
    $picking_types = importOdooCall($odoo_url, 'stock.picking.type', 'search_read', $cookie_file, [
        [['code', '=', 'outgoing']]
    ], [
        'context' => ['active_test' => false],
        'fields' => ['id', 'name']
    ]);
    
    $outgoing_type_ids = array_column($picking_types, 'id');
    
    // Get stock moves with origin_returned_move_id (returns) linked to purchase lines
    $return_moves = importOdooCall($odoo_url, 'stock.move', 'search_read', $cookie_file, [
        [
            ['origin_returned_move_id', '!=', false],
            ['purchase_line_id', '!=', false]
        ]
    ], [
        'context' => ['active_test' => false],
        'fields' => ['id', 'picking_id', 'product_id', 'product_uom_qty', 'quantity', 'purchase_line_id', 'state', 'origin_returned_move_id']
    ]);
    
    // Get unique picking IDs from return moves
    $return_picking_ids = [];
    $moves_by_picking = [];
    foreach ($return_moves as $move) {
        if (!empty($move['picking_id'])) {
            $picking_id = $move['picking_id'][0];
            $return_picking_ids[$picking_id] = true;
            if (!isset($moves_by_picking[$picking_id])) {
                $moves_by_picking[$picking_id] = [];
            }
            $moves_by_picking[$picking_id][] = $move;
        }
    }
    
    // Also get outgoing pickings to suppliers with P origin (direct returns from purchase)
    $outgoing_to_supplier = [];
    if (!empty($outgoing_type_ids)) {
        $outgoing_to_supplier = importOdooCall($odoo_url, 'stock.picking', 'search_read', $cookie_file, [
            [
                ['picking_type_id', 'in', $outgoing_type_ids],
                ['origin', 'like', 'P%']
            ]
        ], [
            'context' => ['active_test' => false],
        'fields' => ['id', 'name', 'origin', 'partner_id', 'date_done', 'scheduled_date', 'user_id', 'state', 'move_ids', 'note']
        ]);
        
        foreach ($outgoing_to_supplier as $pick) {
            $return_picking_ids[$pick['id']] = true;
        }
    }
    
    if (empty($return_picking_ids)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على مرتجعات شراء في Odoo',
            'data' => ['imported' => 0]
        ]);
        exit;
    }
    
    // Get all return pickings
    $returns = importOdooCall($odoo_url, 'stock.picking', 'search_read', $cookie_file, [
        [['id', 'in', array_keys($return_picking_ids)]]
    ], [
        'context' => ['active_test' => false],
        'fields' => ['id', 'name', 'origin', 'partner_id', 'date_done', 'scheduled_date', 'user_id', 'state', 'move_ids', 'note']
    ]);
    
    // Get all moves for these pickings
    $all_move_ids = [];
    foreach ($returns as $ret) {
        if (!empty($ret['move_ids'])) {
            $all_move_ids = array_merge($all_move_ids, $ret['move_ids']);
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
        'fields' => ['id', 'picking_id', 'product_id', 'product_uom_qty', 'quantity', 'purchase_line_id', 'state', 'price_unit']
            ]);
            foreach ($move_data as $move) {
                $moves[$move['id']] = $move;
            }
        }
    }
    
    $imported_returns = 0;
    $updated_returns = 0;
    $imported_items = 0;
    $skipped_returns = 0;
    $skipped_items = 0;
    $errors = [];
    
    $conn->begin_transaction();
    
    try {
        foreach ($returns as $return) {
            $return_id = $return['id'];
            $origin = $return['origin'] ?? '';
            $supplier_id = $return['partner_id'][0] ?? null;
            
            // Validate supplier exists
            if (!$supplier_id || !isset($valid_suppliers[$supplier_id])) {
                $skipped_returns++;
                $errors[] = "مرتجع رقم $return_id: تم التخطي - المورد رقم $supplier_id غير موجود";
                continue;
            }
            
            // Extract purchase order ID
            $purchase_order_id = extractPurchaseOrderIdFromOrigin($origin, $valid_purchase_orders);
            
            $user_id = $return['user_id'][0] ?? null;
            if (!$user_id || !isset($valid_users[$user_id])) {
                $user_id = null;
            }
            
            $return_date = $return['date_done'] ?: ($return['scheduled_date'] ?: date('Y-m-d H:i:s'));
            $status = mapOdooStateToReturnStatus($return['state'] ?? 'draft');
            $delivered_date = ($status === 'Delivered') ? $return_date : null;
            $notes = $return['note'] ?: null;
            
            // Calculate total amount from moves
            $total_amount = 0;
            if (!empty($return['move_ids'])) {
                foreach ($return['move_ids'] as $move_id) {
                    if (isset($moves[$move_id])) {
                        $move = $moves[$move_id];
                        $qty = $move['quantity'] ?? $move['product_uom_qty'] ?? 0;
                        $price = $move['price_unit'] ?? 0;
                        $total_amount += $qty * $price;
                    }
                }
            }
            
            // Check if return exists
            $stmt = $conn->prepare("SELECT purchase_returns_id FROM purchase_returns WHERE purchase_returns_id = ?");
            $stmt->bind_param("i", $return_id);
            $stmt->execute();
            $exists = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            
            if ($exists) {
                $stmt = $conn->prepare("UPDATE purchase_returns SET 
                    purchase_returns_supplier_id = ?,
                    purchase_returns_purchase_order_id = ?,
                    purchase_returns_date = ?,
                    purchase_returns_total_amount = ?,
                    purchase_returns_status = ?,
                    purchase_returns_delivered_date = ?,
                    purchase_returns_delivered_by_user_id = ?,
                    purchase_returns_notes = ?,
                    purchase_returns_odoo_picking_id = ?,
                    purchase_returns_updated_at = CURRENT_TIMESTAMP
                    WHERE purchase_returns_id = ?");
                $stmt->bind_param("iisdssisii",
                    $supplier_id,
                    $purchase_order_id,
                    $return_date,
                    $total_amount,
                    $status,
                    $delivered_date,
                    $user_id,
                    $notes,
                    $return_id,
                    $return_id
                );
                $stmt->execute();
                $stmt->close();
                $updated_returns++;
                
                // UPSERT mode: Skip delete to avoid FK constraint issues
            } else {
                $stmt = $conn->prepare("INSERT INTO purchase_returns (
                    purchase_returns_id,
                    purchase_returns_supplier_id,
                    purchase_returns_purchase_order_id,
                    purchase_returns_date,
                    purchase_returns_total_amount,
                    purchase_returns_status,
                    purchase_returns_delivered_date,
                    purchase_returns_delivered_by_user_id,
                    purchase_returns_notes,
                    purchase_returns_odoo_picking_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("iiisdssisi",
                    $return_id,
                    $supplier_id,
                    $purchase_order_id,
                    $return_date,
                    $total_amount,
                    $status,
                    $delivered_date,
                    $user_id,
                    $notes,
                    $return_id
                );
                $stmt->execute();
                $stmt->close();
                $imported_returns++;
            }
            
            // Import return items
            if (!empty($return['move_ids'])) {
                foreach ($return['move_ids'] as $move_id) {
                    if (!isset($moves[$move_id])) continue;
                    
                    $move = $moves[$move_id];
                    
                    // Skip cancelled moves
                    if ($move['state'] === 'cancel') continue;
                    
                    $po_item_id = $move['purchase_line_id'][0] ?? null;
                    
                    // Skip if no purchase line linked
                    if (!$po_item_id || !isset($valid_po_items[$po_item_id])) {
                        $skipped_items++;
                        continue;
                    }
                    
                    $quantity = $move['quantity'] ?? $move['product_uom_qty'] ?? 0;
                    $unit_cost = $move['price_unit'] ?? 0;
                    $total_cost = $quantity * $unit_cost;
                    
                    $stmt = $conn->prepare("INSERT INTO purchase_return_items (
                        purchase_return_items_id,
                        purchase_return_items_return_id,
                        purchase_return_items_purchase_order_item_id,
                        purchase_return_items_quantity,
                        purchase_return_items_unit_cost,
                        purchase_return_items_total_cost
                    ) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE purchase_return_items_quantity = VALUES(purchase_return_items_quantity)");
                    $stmt->bind_param("iiiddd",
                        $move_id,
                        $return_id,
                        $po_item_id,
                        $quantity,
                        $unit_cost,
                        $total_cost
                    );
                    $stmt->execute();
                    $stmt->close();
                    $imported_items++;
                }
            }
        }
        
        // Update purchase_order_items with returned quantities
        $conn->query("
            UPDATE purchase_order_items poi
            SET poi.purchase_order_items_quantity_returned = COALESCE((
                SELECT SUM(pri.purchase_return_items_quantity)
                FROM purchase_return_items pri
                WHERE pri.purchase_return_items_purchase_order_item_id = poi.purchase_order_items_id
            ), 0)
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
        'message' => "تم استيراد مرتجعات الشراء: $imported_returns جديد، $updated_returns محدث، $skipped_returns تم تخطيه. الأصناف: $imported_items مستورد، $skipped_items تم تخطيه.",
        'data' => [
            'returns_imported' => $imported_returns,
            'returns_updated' => $updated_returns,
            'returns_skipped' => $skipped_returns,
            'items_imported' => $imported_items,
            'items_skipped' => $skipped_items,
            'total_returns_from_odoo' => count($returns),
            'skipped_returns_log' => $errors
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
