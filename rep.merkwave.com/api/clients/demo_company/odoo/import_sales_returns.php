<?php
/**
 * Import Sales Returns from Odoo
 * 
 * Imports stock.picking (returns/incoming linked to sales) from Odoo to sales_returns and sales_return_items tables
 * Uses the same IDs from Odoo
 * 
 * Returns in Odoo are incoming pickings that have origin referencing a sale order
 * or have return_id pointing to original delivery
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
        'confirmed' => 'Pending',
        'assigned' => 'Approved',
        'done' => 'Processed',
        'cancel' => 'Cancelled'
    ];
    return $mapping[$state] ?? 'Draft';
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
    
    // Build lookup maps for validation
    // Get valid client IDs
    $clients_result = $conn->query("SELECT clients_id FROM clients");
    $valid_clients = [];
    while ($row = $clients_result->fetch_assoc()) {
        $valid_clients[$row['clients_id']] = true;
    }
    
    // Get valid sales order IDs with client mapping
    $orders_result = $conn->query("SELECT sales_orders_id, sales_orders_client_id FROM sales_orders");
    $valid_orders = [];
    $order_client_map = [];
    while ($row = $orders_result->fetch_assoc()) {
        $valid_orders[$row['sales_orders_id']] = true;
        $order_client_map[$row['sales_orders_id']] = $row['sales_orders_client_id'];
    }
    
    // Get valid user IDs
    $users_result = $conn->query("SELECT users_id FROM users");
    $valid_users = [];
    while ($row = $users_result->fetch_assoc()) {
        $valid_users[$row['users_id']] = true;
    }
    
    // Get valid sales order items IDs with price mapping
    $items_result = $conn->query("SELECT sales_order_items_id, sales_order_items_unit_price, sales_order_items_tax_rate, sales_order_items_has_tax FROM sales_order_items");
    $valid_items = [];
    $items_price_map = [];
    while ($row = $items_result->fetch_assoc()) {
        $valid_items[$row['sales_order_items_id']] = true;
        $items_price_map[$row['sales_order_items_id']] = [
            'unit_price' => $row['sales_order_items_unit_price'],
            'tax_rate' => $row['sales_order_items_tax_rate'],
            'has_tax' => $row['sales_order_items_has_tax']
        ];
    }
    
    // Get deliveries with their sale_order mapping
    $deliveries_result = $conn->query("SELECT sales_deliveries_id, sales_deliveries_sales_order_id FROM sales_deliveries");
    $delivery_order_map = [];
    while ($row = $deliveries_result->fetch_assoc()) {
        $delivery_order_map[$row['sales_deliveries_id']] = $row['sales_deliveries_sales_order_id'];
    }
    
    // Get returns (incoming pickings that are returns from deliveries)
    // Returns have return_id pointing to original delivery picking
    $returns = importOdooCall($odoo_url, 'stock.picking', 'search_read', $cookie_file, [
        [
            '|',
            ['return_id', '!=', false],
            '&',
            ['origin', 'ilike', 'Return'],
            ['picking_type_id.code', '=', 'incoming']
        ]
    ], [
        'context' => ['active_test' => false],
        'fields' => ['id', 'name', 'return_id', 'partner_id', 'origin', 'state', 'date_done', 'user_id', 'note', 'scheduled_date', 'move_ids_without_package', 'sale_id']
    ]);
    
    if (empty($returns)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لا توجد مرتجعات في Odoo',
            'data' => ['imported' => 0, 'updated' => 0]
        ]);
        exit;
    }
    
    // Get all stock moves in one query for efficiency
    $all_move_ids = [];
    foreach ($returns as $return) {
        if (!empty($return['move_ids_without_package'])) {
            $all_move_ids = array_merge($all_move_ids, $return['move_ids_without_package']);
        }
    }
    
    $stock_moves = [];
    if (!empty($all_move_ids)) {
        $batches = array_chunk($all_move_ids, 1000);
        foreach ($batches as $batch) {
            $moves = importOdooCall($odoo_url, 'stock.move', 'search_read', $cookie_file, [
                [['id', 'in', $batch]]
            ], [
                'context' => ['active_test' => false],
        'fields' => ['id', 'picking_id', 'product_id', 'sale_line_id', 'origin_returned_move_id', 'quantity', 'product_uom_qty', 'state', 'price_unit', 'to_refund']
            ]);
            foreach ($moves as $move) {
                $stock_moves[$move['id']] = $move;
            }
        }
    }
    
    $imported_returns = 0;
    $updated_returns = 0;
    $imported_items = 0;
    $skipped_returns = 0;
    $skipped_items = 0;
    $errors = [];
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        foreach ($returns as $return) {
            $return_id = $return['id'];
            $partner_id = $return['partner_id'][0] ?? null;
            $user_id = $return['user_id'][0] ?? null;
            $original_delivery_id = $return['return_id'][0] ?? null;
            $sale_order_id = $return['sale_id'][0] ?? null;
            
            // Try to get sale_order_id from original delivery if not directly available
            if (!$sale_order_id && $original_delivery_id) {
                $sale_order_id = $delivery_order_map[$original_delivery_id] ?? null;
            }
            
            // Try to get client from partner_id
            $client_id = $partner_id;
            
            // Validate client exists or get from sale order
            if (!$client_id || !isset($valid_clients[$client_id])) {
                if ($sale_order_id && isset($order_client_map[$sale_order_id])) {
                    $client_id = $order_client_map[$sale_order_id];
                } else {
                    $skipped_returns++;
                    $errors[] = "مرتجع رقم $return_id: تم التخطي - العميل رقم $partner_id غير موجود";
                    continue;
                }
            }
            
            // Use NULL for user if not found in valid_users (FK allows NULL)
            if (!$user_id || !isset($valid_users[$user_id])) {
                $user_id = null;
            }
            
            $return_date = $return['date_done'] ?? $return['scheduled_date'] ?? date('Y-m-d H:i:s');
            $status = mapOdooStateToReturnStatus($return['state'] ?? 'draft');
            $notes = $return['note'] ?: null;
            $reason = $return['origin'] ?: 'Return from delivery';
            
            // Check if return exists
            $stmt = $conn->prepare("SELECT returns_id FROM sales_returns WHERE returns_id = ?");
            $stmt->bind_param("i", $return_id);
            $stmt->execute();
            $exists = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            
            $total_amount = 0; // Will be calculated from items
            
            if ($exists) {
                // Update existing return
                $stmt = $conn->prepare("UPDATE sales_returns SET 
                    returns_client_id = ?,
                    returns_sales_order_id = ?,
                    returns_date = ?,
                    returns_reason = ?,
                    returns_status = ?,
                    returns_notes = ?,
                    returns_created_by_user_id = ?,
                    returns_odoo_picking_id = ?,
                    returns_updated_at = CURRENT_TIMESTAMP
                    WHERE returns_id = ?");
                $stmt->bind_param("iisssiiii",
                    $client_id,
                    $sale_order_id,
                    $return_date,
                    $reason,
                    $status,
                    $notes,
                    $user_id,
                    $return_id,
                    $return_id
                );
                $stmt->execute();
                $stmt->close();
                $updated_returns++;
            } else {
                // Insert new return with specific ID
                $stmt = $conn->prepare("INSERT INTO sales_returns 
                    (returns_id, returns_client_id, returns_sales_order_id, returns_date, 
                     returns_reason, returns_total_amount, returns_status, returns_notes, returns_created_by_user_id, returns_odoo_picking_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("iiissdssii",
                    $return_id,
                    $client_id,
                    $sale_order_id,
                    $return_date,
                    $reason,
                    $total_amount,
                    $status,
                    $notes,
                    $user_id,
                    $return_id
                );
                $stmt->execute();
                $stmt->close();
                $imported_returns++;
            }
            
            // Process return items (stock moves)
            $return_total = 0;
            if (!empty($return['move_ids_without_package'])) {
                foreach ($return['move_ids_without_package'] as $move_id) {
                    $move = $stock_moves[$move_id] ?? null;
                    if (!$move) continue;
                    
                    $item_id = $move['id'];
                    $sale_line_id = $move['sale_line_id'][0] ?? null;
                    
                    // If no direct sale_line_id, try to get from original returned move
                    if (!$sale_line_id && isset($move['origin_returned_move_id']) && $move['origin_returned_move_id']) {
                        $orig_move_id = $move['origin_returned_move_id'][0];
                        // Look up original move's sale_line_id
                        if (isset($stock_moves[$orig_move_id])) {
                            $sale_line_id = $stock_moves[$orig_move_id]['sale_line_id'][0] ?? null;
                        }
                    }
                    
                    $quantity = $move['quantity'] ?? $move['product_uom_qty'] ?? 0;
                    
                    // Validate sale order item exists
                    if (!$sale_line_id || !isset($valid_items[$sale_line_id])) {
                        $skipped_items++;
                        continue;
                    }
                    
                    // Get price info from original sale order item
                    $price_info = $items_price_map[$sale_line_id] ?? ['unit_price' => 0, 'tax_rate' => 0, 'has_tax' => 0];
                    $unit_price = $move['price_unit'] ?? $price_info['unit_price'];
                    $tax_rate = $price_info['tax_rate'] ?? 0;
                    $has_tax = $price_info['has_tax'] ?? 0;
                    $item_total = $quantity * $unit_price;
                    $tax_amount = $has_tax ? ($item_total * $tax_rate / 100) : 0;
                    
                    $return_total += $item_total + $tax_amount;
                    
                    // Check if item exists
                    $stmt = $conn->prepare("SELECT return_items_id FROM sales_return_items WHERE return_items_id = ?");
                    $stmt->bind_param("i", $item_id);
                    $stmt->execute();
                    $item_exists = $stmt->get_result()->fetch_assoc();
                    $stmt->close();
                    
                    if ($item_exists) {
                        // Update existing item
                        $stmt = $conn->prepare("UPDATE sales_return_items SET 
                            return_items_return_id = ?,
                            return_items_sales_order_item_id = ?,
                            return_items_quantity = ?,
                            return_items_unit_price = ?,
                            return_items_total_price = ?,
                            return_items_tax_amount = ?,
                            return_items_tax_rate = ?,
                            return_items_has_tax = ?
                            WHERE return_items_id = ?");
                        $stmt->bind_param("iidddddii",
                            $return_id,
                            $sale_line_id,
                            $quantity,
                            $unit_price,
                            $item_total,
                            $tax_amount,
                            $tax_rate,
                            $has_tax,
                            $item_id
                        );
                        $stmt->execute();
                        $stmt->close();
                    } else {
                        // Insert new item
                        $stmt = $conn->prepare("INSERT INTO sales_return_items 
                            (return_items_id, return_items_return_id, return_items_sales_order_item_id, 
                             return_items_quantity, return_items_unit_price, return_items_total_price,
                             return_items_tax_amount, return_items_tax_rate, return_items_has_tax) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                        $stmt->bind_param("iiidddddi",
                            $item_id,
                            $return_id,
                            $sale_line_id,
                            $quantity,
                            $unit_price,
                            $item_total,
                            $tax_amount,
                            $tax_rate,
                            $has_tax
                        );
                        $stmt->execute();
                        $stmt->close();
                        $imported_items++;
                    }
                }
            }
            
            // Update return total amount
            if ($return_total > 0) {
                $stmt = $conn->prepare("UPDATE sales_returns SET returns_total_amount = ? WHERE returns_id = ?");
                $stmt->bind_param("di", $return_total, $return_id);
                $stmt->execute();
                $stmt->close();
            }
        }
        
        $conn->commit();
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
    
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    $conn->close();
    
    echo json_encode([
        'status' => 'success',
        'message' => "تم استيراد المرتجعات: $imported_returns جديد، $updated_returns محدث، $skipped_returns تم تخطيه. البنود: $imported_items مستورد، $skipped_items تم تخطيه.",
        'data' => [
            'returns_imported' => $imported_returns,
            'returns_updated' => $updated_returns,
            'returns_skipped' => $skipped_returns,
            'items_imported' => $imported_items,
            'items_skipped' => $skipped_items,
            'total_returns_from_odoo' => count($returns),
            'skipped_returns_log' => array_slice($errors, 0, 50)
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
        'message' => 'خطأ في استيراد المرتجعات: ' . $e->getMessage()
    ]);
}
