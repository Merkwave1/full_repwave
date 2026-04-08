<?php
/**
 * Import Credit Notes from Odoo - OPTIMIZED VERSION
 * 
 * Imports from account.move (move_type = 'out_refund') to sales_returns table
 * Features:
 * - Batch fetching of credit note lines (MUCH FASTER)
 * - Links to original invoices where possible
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
    
    // Get default user
    $default_user_id = 2;
    $result = $conn->query("SELECT users_id FROM users ORDER BY users_id ASC LIMIT 1");
    if ($result && $row = $result->fetch_assoc()) {
        $default_user_id = $row['users_id'];
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
    
    // Build sales_order mapping (odoo invoice_id -> local sales_order_id)
    $order_map = [];
    $result = $conn->query("SELECT sales_orders_id, sales_orders_odoo_invoice_id FROM sales_orders WHERE sales_orders_odoo_invoice_id IS NOT NULL");
    while ($row = $result->fetch_assoc()) {
        $order_map[$row['sales_orders_odoo_invoice_id']] = $row['sales_orders_id'];
    }
    
    // Get default packaging type
    $default_packaging_type_id = 1;
    $result = $conn->query("SELECT packaging_types_id FROM packaging_types ORDER BY packaging_types_id ASC LIMIT 1");
    if ($result && $row = $result->fetch_assoc()) {
        $default_packaging_type_id = $row['packaging_types_id'];
    }
    
    // ============================================
    // STEP 1: Fetch ALL credit notes at once
    // ============================================
    $credit_notes = importOdooCall(
        $odoo_url, 
        'account.move', 
        'search_read', 
        $cookie_file,
        [[['move_type', '=', 'out_refund'], ['state', '=', 'posted']]],
        ['context' => ['active_test' => false],

        'fields' => ['id', 'name', 'partner_id', 'invoice_date', 'amount_total', 'amount_untaxed', 'amount_tax', 'state', 'reversed_entry_id', 'invoice_line_ids', 'create_date']]
    );
    
    $cn_count = count($credit_notes);
    
    // ============================================
    // STEP 2: Collect all credit note line IDs
    // ============================================
    $all_line_ids = [];
    foreach ($credit_notes as $cn) {
        $line_ids = $cn['invoice_line_ids'] ?? [];
        $all_line_ids = array_merge($all_line_ids, $line_ids);
    }
    
    // ============================================
    // STEP 3: Fetch ALL credit note lines in ONE call
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

            'fields' => ['id', 'move_id', 'product_id', 'name', 'quantity', 'price_unit', 'price_subtotal', 'price_total']]
        );
    }
    
    // Build a map of move_id -> lines
    $lines_by_cn = [];
    foreach ($all_lines as $line) {
        $move_id = is_array($line['move_id']) ? $line['move_id'][0] : $line['move_id'];
        if (!isset($lines_by_cn[$move_id])) {
            $lines_by_cn[$move_id] = [];
        }
        $lines_by_cn[$move_id][] = $line;
    }
    
    // ============================================
    // STEP 4: Process credit notes with pre-fetched lines
    // ============================================
    $imported = 0;
    $updated = 0;
    $skipped = 0;
    $items_imported = 0;
    
    // Prepare statements
    $stmt_check = $conn->prepare("SELECT returns_id FROM sales_returns WHERE returns_odoo_credit_note_id = ?");
    
    $stmt_update = $conn->prepare("UPDATE sales_returns SET 
        returns_client_id = ?,
        returns_sales_order_id = ?,
        returns_date = ?,
        returns_total_amount = ?,
        returns_status = 'Processed',
        returns_reason = ?
        WHERE returns_id = ?");
    
    $stmt_insert = $conn->prepare("INSERT INTO sales_returns (
        returns_id,
        returns_client_id,
        returns_sales_order_id,
        returns_date,
        returns_reason,
        returns_total_amount,
        returns_status,
        returns_notes,
        returns_created_by_user_id,
        returns_odoo_credit_note_id
    ) VALUES (?, ?, ?, ?, ?, ?, 'Processed', ?, ?, ?)");
    
    $stmt_delete_items = $conn->prepare("DELETE FROM sales_return_items WHERE return_items_return_id = ?");
    
    $stmt_insert_item = $conn->prepare("INSERT INTO sales_return_items (
        return_items_return_id,
        return_items_sales_order_item_id,
        return_items_variant_id,
        return_items_packaging_type_id,
        return_items_quantity,
        return_items_unit_price,
        return_items_total_price,
        return_items_tax_amount,
        return_items_tax_rate,
        return_items_has_tax
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($credit_notes as $cn) {
        $odoo_cn_id = $cn['id'];
        $cn_name = $cn['name'];
        $partner_id = is_array($cn['partner_id']) ? $cn['partner_id'][0] : null;
        $invoice_date = $cn['invoice_date'];
        $amount_total = floatval($cn['amount_total']);
        $reversed_entry_id = is_array($cn['reversed_entry_id']) ? $cn['reversed_entry_id'][0] : null;
        $reversed_entry_name = is_array($cn['reversed_entry_id']) ? $cn['reversed_entry_id'][1] : null;
        
        // Get client ID
        $client_id = $client_map[$partner_id] ?? null;
        if (!$client_id) {
            $skipped++;
            continue;
        }
        
        // Get linked sales order (if the original invoice was جديد)
        $sales_order_id = $reversed_entry_id ? ($order_map[$reversed_entry_id] ?? null) : null;
        
        // Check if credit note already جديد
        $stmt_check->bind_param("i", $odoo_cn_id);
        $stmt_check->execute();
        $exists = $stmt_check->get_result()->fetch_assoc();
        
        $reason = "Credit Note: $cn_name" . ($reversed_entry_name ? " (Reversal of $reversed_entry_name)" : "");
        $notes = "Imported from Odoo Credit Note";
        
        if ($exists) {
            // Update existing return
            $return_id = $exists['returns_id'];
            $stmt_update->bind_param("iisdsi",
                $client_id,
                $sales_order_id,
                $invoice_date,
                $amount_total,
                $reason,
                $return_id
            );
            $stmt_update->execute();
            $updated++;
        } else {
            // Insert new return with Odoo credit note ID as primary key
            $stmt_insert->bind_param("iiissdsii",
                $odoo_cn_id,
                $client_id,
                $sales_order_id,
                $invoice_date,
                $reason,
                $amount_total,
                $notes,
                $default_user_id,
                $odoo_cn_id
            );
            
            if (!$stmt_insert->execute()) {
                $skipped++;
                continue;
            }
            $return_id = $odoo_cn_id;
            $imported++;
        }
        
        // Delete existing items for this return
        // UPSERT mode: Skip delete to avoid FK constraint issues
        
        // Get pre-fetched lines for this credit note
        $lines = $lines_by_cn[$odoo_cn_id] ?? [];
        
        foreach ($lines as $line) {
            $product_id = is_array($line['product_id']) ? $line['product_id'][0] : null;
            $variant_id = $variant_map[$product_id] ?? null;
            
            if (!$variant_id) continue;
            
            $quantity = floatval($line['quantity']);
            $unit_price = floatval($line['price_unit']);
            $subtotal = floatval($line['price_subtotal']);
            $total = floatval($line['price_total']);
            $tax_amount = $total - $subtotal;
            $tax_rate = $subtotal > 0 ? ($tax_amount / $subtotal * 100) : 0;
            $has_tax = $tax_amount > 0 ? 1 : 0;
            
            // Use NULL for sales_order_item_id (imported returns don't have direct link)
            $sales_order_item_id = null;
            
            // 10 params: i,null,i,i,d,d,d,d,d,i
            $stmt_insert_item->bind_param("iiiidddddi",
                $return_id,
                $sales_order_item_id,
                $variant_id,
                $default_packaging_type_id,
                $quantity,
                $unit_price,
                $total,
                $tax_amount,
                $tax_rate,
                $has_tax
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
        'message' => "تم استيراد الإشعارات الدائنة (المرتجعات): $imported جديدة، $updated محدثة، $skipped تم تخطيها",
        'data' => [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'items_imported' => $items_imported,
            'total_from_odoo' => $cn_count,
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
        'message' => 'فشل استيراد الإشعارات الدائنة: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
