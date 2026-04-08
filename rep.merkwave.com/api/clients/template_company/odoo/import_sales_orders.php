<?php
/**
 * Import Sales Orders from Odoo
 * 
 * Imports sale.order and sale.order.line from Odoo to sales_orders and sales_order_items tables in Rep
 * Uses the same IDs from Odoo
 * 
 * Mapping:
 * - sales_orders_id: Odoo sale.order ID
 * - sales_orders_client_id: partner_id (must exist in clients table)
 * - sales_orders_representative_id: user_id (mapped to users table)
 * - sales_orders_warehouse_id: warehouse_id
 * - sales_orders_order_date: date_order
 * - sales_orders_status: mapped from state (draft, sent, sale, done, cancel)
 * - sales_orders_subtotal: amount_untaxed
 * - sales_orders_tax_amount: amount_tax
 * - sales_orders_total_amount: amount_total
 * - sales_orders_odoo_order_id: Odoo order ID
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
        CURLOPT_TIMEOUT => 600, // 10 minutes for large data
        CURLOPT_COOKIEJAR => $cookie_file,
        CURLOPT_COOKIEFILE => $cookie_file,
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    if (isset($result['error'])) throw new Exception($result['error']['data']['message'] ?? json_encode($result['error']));
    return $result['result'] ?? null;
}

/**
 * Map Odoo state to Rep status
 * Uses invoice_status for confirmed orders to determine if invoiced
 */
function mapOdooStateToStatus($state, $invoice_status = null) {
    // If order is confirmed (sale state), check invoice_status
    if ($state === 'sale' && $invoice_status === 'invoiced') {
        return 'Invoiced';
    }
    
    $mapping = [
        'draft' => 'Draft',
        'sent' => 'Pending',
        'sale' => 'Approved',
        'done' => 'Invoiced',
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
    
    // Get valid user IDs
    $users_result = $conn->query("SELECT users_id FROM users");
    $valid_users = [];
    while ($row = $users_result->fetch_assoc()) {
        $valid_users[$row['users_id']] = true;
    }
    
    // Get valid warehouse IDs
    $warehouses_result = $conn->query("SELECT warehouse_id FROM warehouse");
    $valid_warehouses = [];
    while ($row = $warehouses_result->fetch_assoc()) {
        $valid_warehouses[$row['warehouse_id']] = true;
    }
    
    // Get valid variant IDs
    $variants_result = $conn->query("SELECT variant_id FROM product_variants");
    $valid_variants = [];
    while ($row = $variants_result->fetch_assoc()) {
        $valid_variants[$row['variant_id']] = true;
    }
    
    // Get valid packaging type IDs
    $packaging_result = $conn->query("SELECT packaging_types_id FROM packaging_types");
    $valid_packaging = [];
    while ($row = $packaging_result->fetch_assoc()) {
        $valid_packaging[$row['packaging_types_id']] = true;
    }
    
    // Get all sales orders from Odoo
    $orders = importOdooCall($odoo_url, 'sale.order', 'search_read', $cookie_file, [[]], [
        'context' => ['active_test' => false],
        'fields' => ['id', 'name', 'partner_id', 'user_id', 'warehouse_id', 'date_order', 'commitment_date', 'state', 'invoice_status', 'amount_untaxed', 'amount_tax', 'amount_total', 'note', 'order_line']
    ]);
    
    if (empty($orders)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'No sales orders found in Odoo',
            'data' => [
                'imported' => 0,
                'updated' => 0
            ]
        ]);
        exit;
    }
    
    // Get all order lines in one query for efficiency
    $all_line_ids = [];
    foreach ($orders as $order) {
        if (!empty($order['order_line'])) {
            $all_line_ids = array_merge($all_line_ids, $order['order_line']);
        }
    }
    
    $order_lines = [];
    if (!empty($all_line_ids)) {
        // Fetch in batches of 1000 to avoid timeout
        $batches = array_chunk($all_line_ids, 1000);
        foreach ($batches as $batch) {
            $lines = importOdooCall($odoo_url, 'sale.order.line', 'search_read', $cookie_file, [
                [['id', 'in', $batch]]
            ], [
                'context' => ['active_test' => false],
        'fields' => ['id', 'order_id', 'product_id', 'product_uom', 'product_uom_qty', 'price_unit', 'price_subtotal', 'discount', 'price_tax', 'price_total', 'tax_id']
            ]);
            foreach ($lines as $line) {
                $order_lines[$line['id']] = $line;
            }
        }
    }
    
    $imported_orders = 0;
    $updated_orders = 0;
    $imported_items = 0;
    $skipped_orders = 0;
    $skipped_items = 0;
    $errors = [];
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        foreach ($orders as $order) {
            $order_id = $order['id'];
            $client_id = $order['partner_id'][0] ?? null;
            $user_id = $order['user_id'][0] ?? null;
            $warehouse_id = $order['warehouse_id'][0] ?? null;
            
            // Validate client exists
            if (!$client_id || !isset($valid_clients[$client_id])) {
                $skipped_orders++;
                $errors[] = "طلب رقم $order_id: تم التخطي - العميل رقم $client_id غير موجود";
                continue;
            }
            
            // Use default user if not found (user ID 1)
            if (!$user_id || !isset($valid_users[$user_id])) {
                $user_id = 1; // Default to admin/first user
            }
            
            // Use default warehouse if not found (warehouse ID 1)
            if (!$warehouse_id || !isset($valid_warehouses[$warehouse_id])) {
                $warehouse_id = 1;
            }
            
            $order_date = $order['date_order'] ?? date('Y-m-d H:i:s');
            $expected_delivery = $order['commitment_date'] ?: null;
            $invoice_status = $order['invoice_status'] ?? null;
            $status = mapOdooStateToStatus($order['state'] ?? 'draft', $invoice_status);
            $subtotal = $order['amount_untaxed'] ?? 0;
            $tax_amount = $order['amount_tax'] ?? 0;
            $total_amount = $order['amount_total'] ?? 0;
            $notes = $order['note'] ?: null;
            
            // Check if order exists
            $stmt = $conn->prepare("SELECT sales_orders_id FROM sales_orders WHERE sales_orders_id = ?");
            $stmt->bind_param("i", $order_id);
            $stmt->execute();
            $exists = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            
            if ($exists) {
                // Update existing order
                $stmt = $conn->prepare("UPDATE sales_orders SET 
                    sales_orders_client_id = ?,
                    sales_orders_representative_id = ?,
                    sales_orders_warehouse_id = ?,
                    sales_orders_order_date = ?,
                    sales_orders_expected_delivery_date = ?,
                    sales_orders_status = ?,
                    sales_orders_subtotal = ?,
                    sales_orders_discount_amount = 0,
                    sales_orders_tax_amount = ?,
                    sales_orders_total_amount = ?,
                    sales_orders_notes = ?,
                    sales_orders_odoo_order_id = ?,
                    sales_orders_updated_at = CURRENT_TIMESTAMP
                    WHERE sales_orders_id = ?");
                $stmt->bind_param("iiisssdddsii",
                    $client_id,
                    $user_id,
                    $warehouse_id,
                    $order_date,
                    $expected_delivery,
                    $status,
                    $subtotal,
                    $tax_amount,
                    $total_amount,
                    $notes,
                    $order_id,
                    $order_id
                );
                $stmt->execute();
                $stmt->close();
                $updated_orders++;
                
                // Delete existing items for this order
                // UPSERT mode: Skip delete to avoid FK constraint issues
                $stmt->close();
            } else {
                // Insert new order
                $stmt = $conn->prepare("INSERT INTO sales_orders (
                    sales_orders_id,
                    sales_orders_client_id,
                    sales_orders_representative_id,
                    sales_orders_warehouse_id,
                    sales_orders_order_date,
                    sales_orders_expected_delivery_date,
                    sales_orders_status,
                    sales_orders_subtotal,
                    sales_orders_discount_amount,
                    sales_orders_tax_amount,
                    sales_orders_total_amount,
                    sales_orders_notes,
                    sales_orders_odoo_order_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)");
                $stmt->bind_param("iiiisssdddsi",
                    $order_id,
                    $client_id,
                    $user_id,
                    $warehouse_id,
                    $order_date,
                    $expected_delivery,
                    $status,
                    $subtotal,
                    $tax_amount,
                    $total_amount,
                    $notes,
                    $order_id
                );
                $stmt->execute();
                $stmt->close();
                $imported_orders++;
            }
            
            // Import order items
            if (!empty($order['order_line'])) {
                foreach ($order['order_line'] as $line_id) {
                    if (!isset($order_lines[$line_id])) continue;
                    
                    $line = $order_lines[$line_id];
                    $variant_id = $line['product_id'][0] ?? null;
                    $packaging_type_id = $line['product_uom'][0] ?? 1;
                    
                    // Skip if variant doesn't exist
                    if (!$variant_id || !isset($valid_variants[$variant_id])) {
                        $skipped_items++;
                        continue;
                    }
                    
                    // Default packaging if not found
                    if (!isset($valid_packaging[$packaging_type_id])) {
                        $packaging_type_id = 1;
                    }
                    
                    $quantity = $line['product_uom_qty'] ?? 0;
                    $unit_price = $line['price_unit'] ?? 0;
                    $line_subtotal = $line['price_subtotal'] ?? 0;
                    $discount = $line['discount'] ?? 0;
                    $discount_amount = ($line_subtotal * $discount / 100);
                    $line_tax = $line['price_tax'] ?? 0;
                    $line_total = $line['price_total'] ?? 0;
                    
                    // Calculate tax rate if tax exists
                    $has_tax = ($line_tax > 0) ? 1 : 0;
                    $tax_rate = ($line_subtotal > 0 && $line_tax > 0) ? ($line_tax / $line_subtotal * 100) : null;
                    
                    $stmt = $conn->prepare("INSERT INTO sales_order_items (
                        sales_order_items_id,
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
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmt->bind_param("iiiiddddddid",
                        $line_id,
                        $order_id,
                        $variant_id,
                        $packaging_type_id,
                        $quantity,
                        $unit_price,
                        $line_subtotal,
                        $discount_amount,
                        $line_tax,
                        $tax_rate,
                        $has_tax,
                        $line_total
                    );
                    $stmt->execute();
                    $stmt->close();
                    $imported_items++;
                }
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
        'message' => "تم استيراد طلبات البيع: $imported_orders جديد، $updated_orders محدث، $skipped_orders تم تخطيه. الأصناف: $imported_items مستورد، $skipped_items تم تخطيه.",
        'data' => [
            'orders_imported' => $imported_orders,
            'orders_updated' => $updated_orders,
            'orders_skipped' => $skipped_orders,
            'items_imported' => $imported_items,
            'items_skipped' => $skipped_items,
            'total_orders_from_odoo' => count($orders),
            'skipped_orders_log' => $errors // Show all skipped orders
        ]
    ]);
    
} catch (Exception $e) {
    // Clean up cookie file on error
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
