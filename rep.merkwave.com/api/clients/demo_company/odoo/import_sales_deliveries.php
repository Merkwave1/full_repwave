<?php
/**
 * Import Sales Deliveries from Odoo - OPTIMIZED VERSION
 * 
 * Imports from stock.picking (picking_type_code = 'outgoing', state = 'done')
 * to sales_deliveries table
 * 
 * Features:
 * - Batch fetching of stock moves (MUCH FASTER)
 * - Links to sales orders via invoice relationship
 * - Imports delivered quantities
 */

require_once __DIR__ . '/../db_connect.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

$cookie_file = '/tmp/odoo_import_cookies_' . uniqid() . '.txt';

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
        CURLOPT_TIMEOUT => 600,
        CURLOPT_COOKIEJAR => $cookie_file,
        CURLOPT_COOKIEFILE => $cookie_file,
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    if (isset($result['error'])) throw new Exception($result['error']['data']['message'] ?? 'API call failed');
    return $result['result'] ?? [];
}

try {
    $start_time = microtime(true);    // Load Odoo settings from database
    // Odoo settings loaded from functions.php via db_connect.php
    $odoo_settings = getOdooSettings();
    $odoo_url = $odoo_settings['url'];
    $odoo_db = $odoo_settings['database'];
    
    // Authenticate with Odoo using database settings
    importOdooAuth($odoo_url, $odoo_db, $odoo_settings['username'], $odoo_settings['password'], $cookie_file);
    
    // Get default user
    $default_user_id = 2;
    $result = $conn->query("SELECT users_id FROM users ORDER BY users_id ASC LIMIT 1");
    if ($result && $row = $result->fetch_assoc()) {
        $default_user_id = $row['users_id'];
    }
    
    // Get default warehouse
    $default_warehouse_id = 1;
    $result = $conn->query("SELECT warehouse_id FROM warehouse ORDER BY warehouse_id ASC LIMIT 1");
    if ($result && $row = $result->fetch_assoc()) {
        $default_warehouse_id = $row['warehouse_id'];
    }
    
    // Build sales_order mapping (odoo invoice_id -> local sales_order_id)
    // Since we import from invoices, we need to map sale_id to invoice_id
    $order_map = [];
    $result = $conn->query("SELECT sales_orders_id, sales_orders_odoo_invoice_id FROM sales_orders WHERE sales_orders_odoo_invoice_id IS NOT NULL");
    while ($row = $result->fetch_assoc()) {
        $order_map[$row['sales_orders_odoo_invoice_id']] = $row['sales_orders_id'];
    }
    
    // Build product variant mapping (odoo product_id -> local variant_id)
    $variant_map = [];
    $result = $conn->query("SELECT variant_id, variant_odoo_product_id FROM product_variants WHERE variant_odoo_product_id IS NOT NULL");
    while ($row = $result->fetch_assoc()) {
        $variant_map[$row['variant_odoo_product_id']] = $row['variant_id'];
    }
    
    // Build sales_order_items mapping (sales_order_id + variant_id -> item_id)
    $order_items_map = [];
    $result = $conn->query("SELECT sales_order_items_id, sales_order_items_sales_order_id, sales_order_items_variant_id FROM sales_order_items");
    while ($row = $result->fetch_assoc()) {
        $key = $row['sales_order_items_sales_order_id'] . '_' . $row['sales_order_items_variant_id'];
        $order_items_map[$key] = $row['sales_order_items_id'];
    }
    
    // ============================================
    // STEP 1: Get sale_order to invoice mapping from Odoo
    // We need to link stock.picking (via sale_id) to our invoices
    // ============================================
    $sale_to_invoice = [];
    $invoices = importOdooCall(
        $odoo_url, 
        'account.move', 
        'search_read', 
        $cookie_file,
        [[['move_type', '=', 'out_invoice'], ['state', '=', 'posted']]],
        ['context' => ['active_test' => false],

        'fields' => ['id', 'invoice_origin']]
    );
    
    foreach ($invoices as $inv) {
        if (!empty($inv['invoice_origin'])) {
            // invoice_origin contains sale order name like "S00001"
            $sale_to_invoice[$inv['invoice_origin']] = $inv['id'];
        }
    }
    
    // ============================================
    // STEP 2: Fetch ALL outgoing deliveries (done state)
    // ============================================
    $pickings = importOdooCall(
        $odoo_url, 
        'stock.picking', 
        'search_read', 
        $cookie_file,
        [[['picking_type_code', '=', 'outgoing'], ['state', '=', 'done']]],
        ['context' => ['active_test' => false],

        'fields' => ['id', 'name', 'partner_id', 'scheduled_date', 'date_done', 'state', 'origin', 'sale_id', 'move_ids']]
    );
    
    $picking_count = count($pickings);
    
    // ============================================
    // STEP 3: Collect all move IDs
    // ============================================
    $all_move_ids = [];
    foreach ($pickings as $picking) {
        $move_ids = $picking['move_ids'] ?? [];
        $all_move_ids = array_merge($all_move_ids, $move_ids);
    }
    
    // ============================================
    // STEP 4: Fetch ALL stock moves in ONE call
    // ============================================
    $all_moves = [];
    if (!empty($all_move_ids)) {
        $all_moves = importOdooCall(
            $odoo_url, 
            'stock.move', 
            'search_read', 
            $cookie_file,
            [[['id', 'in', $all_move_ids], ['state', '=', 'done']]],
            ['context' => ['active_test' => false],

            'fields' => ['id', 'picking_id', 'product_id', 'product_uom_qty', 'quantity']]
        );
    }
    
    // Build map of picking_id -> moves
    $moves_by_picking = [];
    foreach ($all_moves as $move) {
        $picking_id = is_array($move['picking_id']) ? $move['picking_id'][0] : $move['picking_id'];
        if (!isset($moves_by_picking[$picking_id])) {
            $moves_by_picking[$picking_id] = [];
        }
        $moves_by_picking[$picking_id][] = $move;
    }
    
    // ============================================
    // STEP 5: Process pickings
    // ============================================
    $imported = 0;
    $updated = 0;
    $skipped = 0;
    $items_imported = 0;
    
    // Check if odoo_picking_id column exists
    $column_exists = false;
    $result = $conn->query("SHOW COLUMNS FROM sales_deliveries LIKE 'sales_deliveries_odoo_picking_id'");
    if ($result->num_rows > 0) {
        $column_exists = true;
    } else {
        // Add the column if it doesn't exist
        $conn->query("ALTER TABLE sales_deliveries ADD COLUMN sales_deliveries_odoo_picking_id INT(11) NULL");
        $column_exists = true;
    }
    
    // Prepare statements
    $stmt_check = $conn->prepare("SELECT sales_deliveries_id FROM sales_deliveries WHERE sales_deliveries_odoo_picking_id = ?");
    
    $stmt_insert = $conn->prepare("INSERT INTO sales_deliveries (
        sales_deliveries_id,
        sales_deliveries_sales_order_id,
        sales_deliveries_warehouse_id,
        sales_deliveries_delivery_date,
        sales_deliveries_delivered_by_user_id,
        sales_deliveries_delivery_status,
        sales_deliveries_delivery_notes,
        sales_deliveries_odoo_picking_id
    ) VALUES (?, ?, ?, ?, ?, 'Delivered', ?, ?)");
    
    $stmt_update = $conn->prepare("UPDATE sales_deliveries SET 
        sales_deliveries_sales_order_id = ?,
        sales_deliveries_delivery_date = ?,
        sales_deliveries_delivery_status = 'Delivered'
        WHERE sales_deliveries_id = ?");
    
    $stmt_delete_items = $conn->prepare("DELETE FROM sales_delivery_items WHERE sales_delivery_items_delivery_id = ?");
    
    $stmt_insert_item = $conn->prepare("INSERT INTO sales_delivery_items (
        sales_delivery_items_delivery_id,
        sales_delivery_items_sales_order_item_id,
        sales_delivery_items_quantity_delivered,
        sales_delivery_items_notes
    ) VALUES (?, ?, ?, ?)");
    
    foreach ($pickings as $picking) {
        $odoo_picking_id = $picking['id'];
        $picking_name = $picking['name'];
        $origin = $picking['origin'] ?? '';
        $date_done = $picking['date_done'];
        $sale_id = is_array($picking['sale_id']) ? $picking['sale_id'][0] : null;
        $sale_name = is_array($picking['sale_id']) ? $picking['sale_id'][1] : $origin;
        
        // Find the invoice ID from sale order origin
        $invoice_id = $sale_to_invoice[$sale_name] ?? $sale_to_invoice[$origin] ?? null;
        
        // Get local sales_order_id
        $local_order_id = $invoice_id ? ($order_map[$invoice_id] ?? null) : null;
        
        if (!$local_order_id) {
            $skipped++;
            continue;
        }
        
        // Check if delivery already جديد
        $stmt_check->bind_param("i", $odoo_picking_id);
        $stmt_check->execute();
        $exists = $stmt_check->get_result()->fetch_assoc();
        
        $notes = "Imported from Odoo: $picking_name";
        
        if ($exists) {
            // Update existing delivery
            $delivery_id = $exists['sales_deliveries_id'];
            $stmt_update->bind_param("isi",
                $local_order_id,
                $date_done,
                $delivery_id
            );
            $stmt_update->execute();
            $updated++;
        } else {
            // Insert new delivery with Odoo picking ID as primary key
            $stmt_insert->bind_param("iiisisi",
                $odoo_picking_id,
                $local_order_id,
                $default_warehouse_id,
                $date_done,
                $default_user_id,
                $notes,
                $odoo_picking_id
            );
            
            if (!$stmt_insert->execute()) {
                $skipped++;
                continue;
            }
            $delivery_id = $odoo_picking_id;
            $imported++;
        }
        
        // Delete existing items for this delivery
        // UPSERT mode: Skip delete to avoid FK constraint issues
        
        // Get pre-fetched moves for this picking
        $moves = $moves_by_picking[$odoo_picking_id] ?? [];
        
        foreach ($moves as $move) {
            $product_id = is_array($move['product_id']) ? $move['product_id'][0] : null;
            $variant_id = $variant_map[$product_id] ?? null;
            
            if (!$variant_id) continue;
            
            $quantity_delivered = floatval($move['quantity'] ?? $move['product_uom_qty']);
            
            // Find the sales_order_item_id
            $item_key = $local_order_id . '_' . $variant_id;
            $order_item_id = $order_items_map[$item_key] ?? null;
            
            if (!$order_item_id) continue;
            
            $item_notes = "";
            
            $stmt_insert_item->bind_param("iids",
                $delivery_id,
                $order_item_id,
                $quantity_delivered,
                $item_notes
            );
            $stmt_insert_item->execute();
            $items_imported++;
        }
    }
    
    // Close prepared statements
    $stmt_check->close();
    $stmt_insert->close();
    $stmt_update->close();
    $stmt_delete_items->close();
    $stmt_insert_item->close();
    
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    $elapsed_time = round(microtime(true) - $start_time, 2);
    
    echo json_encode([
        'status' => 'success',
        'message' => "تم استيراد تسليمات البيع: $imported جديدة، $updated محدثة، $skipped تم تخطيها",
        'data' => [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'items_imported' => $items_imported,
            'total_from_odoo' => $picking_count,
            'total_moves_fetched' => count($all_moves),
            'elapsed_seconds' => $elapsed_time
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    echo json_encode([
        'status' => 'error',
        'message' => 'فشل استيراد تسليمات البيع: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
