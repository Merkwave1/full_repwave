<?php
/**
 * Import Customer Invoices from Odoo - OPTIMIZED VERSION
 * 
 * Imports from account.move (move_type = 'out_invoice') to sales_orders table
 * Features:
 * - Batch fetching of invoice lines (MUCH FASTER)
 * - Sets delivery status based on invoice state
 * - All invoices are marked as Delivered (since they're posted invoices)
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
        CURLOPT_TIMEOUT => 600, // 10 minutes timeout for large data
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
    
    // Get default user and warehouse
    $default_user_id = 2;
    $result = $conn->query("SELECT users_id FROM users ORDER BY users_id ASC LIMIT 1");
    if ($result && $row = $result->fetch_assoc()) {
        $default_user_id = $row['users_id'];
    }
    
    $default_warehouse_id = 1;
    $result = $conn->query("SELECT warehouse_id FROM warehouse ORDER BY warehouse_id ASC LIMIT 1");
    if ($result && $row = $result->fetch_assoc()) {
        $default_warehouse_id = $row['warehouse_id'];
    }
    
    // Build client mapping (odoo partner_id -> local client_id)
    $client_map = [];
    $result = $conn->query("SELECT clients_id, clients_odoo_partner_id FROM clients WHERE clients_odoo_partner_id IS NOT NULL");
    while ($row = $result->fetch_assoc()) {
        $client_map[$row['clients_odoo_partner_id']] = $row['clients_id'];
    }
    
    // Build product variant mapping (odoo product_id -> local variant_id)
    $variant_map = [];
    $result = $conn->query("SELECT variant_id, variant_odoo_product_id FROM product_variants WHERE variant_odoo_product_id IS NOT NULL");
    while ($row = $result->fetch_assoc()) {
        $variant_map[$row['variant_odoo_product_id']] = $row['variant_id'];
    }
    
    // Get default packaging type
    $default_packaging_type_id = 1;
    $result = $conn->query("SELECT packaging_types_id FROM packaging_types ORDER BY packaging_types_id ASC LIMIT 1");
    if ($result && $row = $result->fetch_assoc()) {
        $default_packaging_type_id = $row['packaging_types_id'];
    }
    
    // ============================================
    // STEP 1: Fetch ALL customer invoices at once
    // ============================================
    $invoices = importOdooCall(
        $odoo_url, 
        'account.move', 
        'search_read', 
        $cookie_file,
        [[['move_type', '=', 'out_invoice'], ['state', '=', 'posted']]],
        ['context' => ['active_test' => false],

        'fields' => ['id', 'name', 'partner_id', 'invoice_date', 'amount_total', 'amount_untaxed', 'amount_tax', 'state', 'payment_state', 'invoice_line_ids', 'create_date']]
    );
    
    $invoice_count = count($invoices);
    
    // ============================================
    // STEP 2: Collect all invoice line IDs
    // ============================================
    $all_line_ids = [];
    $invoice_to_lines = [];
    foreach ($invoices as $invoice) {
        $invoice_id = $invoice['id'];
        $line_ids = $invoice['invoice_line_ids'] ?? [];
        $invoice_to_lines[$invoice_id] = $line_ids;
        $all_line_ids = array_merge($all_line_ids, $line_ids);
    }
    
    // ============================================
    // STEP 3: Fetch ALL invoice lines in ONE call (MAJOR SPEED IMPROVEMENT)
    // ============================================
    $all_lines = [];
    if (!empty($all_line_ids)) {
        $all_lines = importOdooCall(
            $odoo_url, 
            'account.move.line', 
            'search_read', 
            $cookie_file,
            [[['id', 'in', $all_line_ids], ['display_type', '=', 'product']]],
            ['context' => ['active_test' => false],

            'fields' => ['id', 'move_id', 'product_id', 'name', 'quantity', 'price_unit', 'price_subtotal', 'price_total', 'discount']]
        );
    }
    
    // Build a map of move_id -> lines
    $lines_by_invoice = [];
    foreach ($all_lines as $line) {
        $move_id = is_array($line['move_id']) ? $line['move_id'][0] : $line['move_id'];
        if (!isset($lines_by_invoice[$move_id])) {
            $lines_by_invoice[$move_id] = [];
        }
        $lines_by_invoice[$move_id][] = $line;
    }
    
    // ============================================
    // STEP 4: Process invoices with pre-fetched lines
    // ============================================
    $imported = 0;
    $updated = 0;
    $skipped = 0;
    $items_imported = 0;
    $details = [];
    
    // Prepare statements for batch operations
    $stmt_check = $conn->prepare("SELECT sales_orders_id FROM sales_orders WHERE sales_orders_odoo_invoice_id = ?");
    
    $stmt_update = $conn->prepare("UPDATE sales_orders SET 
        sales_orders_client_id = ?,
        sales_orders_order_date = ?,
        sales_orders_subtotal = ?,
        sales_orders_tax_amount = ?,
        sales_orders_total_amount = ?,
        sales_orders_status = ?,
        sales_orders_delivery_status = ?
        WHERE sales_orders_id = ?");
    
    $stmt_insert = $conn->prepare("INSERT INTO sales_orders (
        sales_orders_id,
        sales_orders_client_id,
        sales_orders_representative_id,
        sales_orders_warehouse_id,
        sales_orders_order_date,
        sales_orders_status,
        sales_orders_approval_status,
        sales_orders_delivery_status,
        sales_orders_subtotal,
        sales_orders_tax_amount,
        sales_orders_total_amount,
        sales_orders_notes,
        sales_orders_odoo_invoice_id
    ) VALUES (?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?, ?, ?)");
    
    $stmt_delete_items = $conn->prepare("DELETE FROM sales_order_items WHERE sales_order_items_sales_order_id = ?");
    
    $stmt_insert_item = $conn->prepare("INSERT INTO sales_order_items (
        sales_order_items_sales_order_id,
        sales_order_items_variant_id,
        sales_order_items_packaging_type_id,
        sales_order_items_quantity,
        sales_order_items_unit_price,
        sales_order_items_subtotal,
        sales_order_items_discount_amount,
        sales_order_items_tax_amount,
        sales_order_items_tax_rate,
        sales_order_items_has_tax,
        sales_order_items_total_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($invoices as $invoice) {
        $odoo_invoice_id = $invoice['id'];
        $invoice_name = $invoice['name'];
        $partner_id = is_array($invoice['partner_id']) ? $invoice['partner_id'][0] : null;
        $partner_name = is_array($invoice['partner_id']) ? $invoice['partner_id'][1] : 'Unknown';
        $invoice_date = $invoice['invoice_date'];
        $amount_total = floatval($invoice['amount_total']);
        $amount_untaxed = floatval($invoice['amount_untaxed']);
        $amount_tax = floatval($invoice['amount_tax']);
        $payment_state = $invoice['payment_state'];
        
        // Get client ID
        $client_id = $client_map[$partner_id] ?? null;
        if (!$client_id) {
            $skipped++;
            continue;
        }
        
        // Check if invoice already جديد
        $stmt_check->bind_param("i", $odoo_invoice_id);
        $stmt_check->execute();
        $exists = $stmt_check->get_result()->fetch_assoc();
        
        // Status mapping - Posted invoices are Invoiced
        $status = 'Invoiced';
        
        // Delivery status - Posted invoices in Odoo are delivered
        $delivery_status = 'Delivered';
        
        if ($exists) {
            // Update existing order
            $order_id = $exists['sales_orders_id'];
            $stmt_update->bind_param("isdddssi",
                $client_id,
                $invoice_date,
                $amount_untaxed,
                $amount_tax,
                $amount_total,
                $status,
                $delivery_status,
                $order_id
            );
            $stmt_update->execute();
            $updated++;
            $action = 'updated';
        } else {
            // Insert new order with Odoo invoice ID as primary key
            $notes = "Imported from Odoo Invoice: $invoice_name";
            
            $stmt_insert->bind_param("iiiisssdddssi",
                $odoo_invoice_id,
                $client_id,
                $default_user_id,
                $default_warehouse_id,
                $invoice_date,
                $status,
                $delivery_status,
                $amount_untaxed,
                $amount_tax,
                $amount_total,
                $notes,
                $odoo_invoice_id
            );
            
            if (!$stmt_insert->execute()) {
                $skipped++;
                continue;
            }
            $order_id = $odoo_invoice_id;
            $imported++;
            $action = 'imported';
        }
        
        // Delete existing items for this order
        // UPSERT mode: Skip delete to avoid FK constraint issues
        
        // Get pre-fetched lines for this invoice
        $lines = $lines_by_invoice[$odoo_invoice_id] ?? [];
        
        foreach ($lines as $line) {
            $product_id = is_array($line['product_id']) ? $line['product_id'][0] : null;
            $variant_id = $variant_map[$product_id] ?? null;
            
            if (!$variant_id) continue; // Skip if product not found
            
            $quantity = floatval($line['quantity']);
            $unit_price = floatval($line['price_unit']);
            $subtotal = floatval($line['price_subtotal']);
            $total = floatval($line['price_total']);
            $discount = floatval($line['discount'] ?? 0);
            $tax_amount = $total - $subtotal;
            $tax_rate = $subtotal > 0 ? ($tax_amount / $subtotal * 100) : 0;
            $has_tax = $tax_amount > 0 ? 1 : 0;
            $discount_amount = $discount > 0 ? ($unit_price * $quantity * $discount / 100) : 0;
            
            // Delivered quantity = ordered quantity (since invoice is posted)
            // Note: delivered_quantity column doesn't exist, delivery is tracked in sales_deliveries table
            
            // 11 placeholders: i,i,i,d,d,d,d,d,d,i,d = iiiddddddid
            $stmt_insert_item->bind_param("iiiddddddid",
                $order_id,                 // i - sales_order_items_sales_order_id
                $variant_id,               // i - sales_order_items_variant_id
                $default_packaging_type_id, // i - sales_order_items_packaging_type_id
                $quantity,                 // d - sales_order_items_quantity
                $unit_price,               // d - sales_order_items_unit_price
                $subtotal,                 // d - sales_order_items_subtotal
                $discount_amount,          // d - sales_order_items_discount_amount
                $tax_amount,               // d - sales_order_items_tax_amount
                $tax_rate,                 // d - sales_order_items_tax_rate
                $has_tax,                  // i - sales_order_items_has_tax
                $total                     // d - sales_order_items_total_price
            );
            $stmt_insert_item->execute();
            $items_imported++;
        }
    }
    
    // Close prepared statements
    $stmt_check->close();
    $stmt_update->close();
    $stmt_insert->close();
    $stmt_delete_items->close();
    $stmt_insert_item->close();
    
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    $elapsed_time = round(microtime(true) - $start_time, 2);
    
    echo json_encode([
        'status' => 'success',
        'message' => "تم استيراد الفواتير: $imported جديدة، $updated محدثة، $skipped تم تخطيها",
        'data' => [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'items_imported' => $items_imported,
            'total_from_odoo' => $invoice_count,
            'total_lines_fetched' => count($all_lines),
            'elapsed_seconds' => $elapsed_time
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    echo json_encode([
        'status' => 'error',
        'message' => 'فشل استيراد الفواتير: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
