<?php
/**
 * Import Purchase Orders from Odoo
 * 
 * Imports purchase.order and purchase.order.line from Odoo to purchase_orders and purchase_order_items tables
 * Uses the same IDs from Odoo
 * 
 * Mapping:
 * - purchase_orders_id: Odoo purchase.order ID
 * - purchase_orders_supplier_id: partner_id (must exist in suppliers table)
 * - purchase_orders_warehouse_id: picking_type_id mapped to warehouse
 * - purchase_orders_order_date: date_order
 * - purchase_orders_status: mapped from state (draft, sent, purchase, done, cancel)
 * 
 * - purchase_order_items_id: Odoo purchase.order.line ID
 * - purchase_order_items_purchase_order_id: order_id
 * - purchase_order_items_variant_id: product_id
 * - purchase_order_items_quantity_ordered: product_qty
 * - purchase_order_items_unit_cost: price_unit
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
 * Map Odoo state to Rep purchase order status
 * Uses receipt_status to determine if received
 */
function mapOdooStateToStatus($state, $receipt_status = null) {
    // If order is confirmed, check receipt_status
    if ($state === 'purchase') {
        if ($receipt_status === 'full') {
            return 'Received';
        } else if ($receipt_status === 'partial') {
            return 'Partially Received';
        }
        return 'Ordered';
    }
    
    $mapping = [
        'draft' => 'Draft',
        'sent' => 'Draft',
        'to approve' => 'Draft',
        'purchase' => 'Ordered',
        'done' => 'Received',
        'cancel' => 'Cancelled'
    ];
    return $mapping[$state] ?? 'Draft';
}

// Main execution
/**
 * Validate and format date for MySQL
 * Returns null if invalid date
 */
function formatDateForMySQL($date) {
    if (empty($date) || $date === false) {
        return null;
    }
    
    // If it's just a year (e.g., "2025"), return null
    if (preg_match('/^\d{4}$/', trim($date))) {
        return null;
    }
    
    // Try to parse the date
    $timestamp = strtotime($date);
    if ($timestamp === false) {
        return null;
    }
    
    // Return formatted date
    return date('Y-m-d H:i:s', $timestamp);
}
try {
    // Load Odoo settings from database
    // Odoo settings loaded from functions.php via db_connect.php
    $odoo_settings = getOdooSettings();
    $odoo_url = $odoo_settings['url'];
    $odoo_db = $odoo_settings['database'];
    
    // Authenticate with Odoo using database settings
    importOdooAuth($odoo_url, $odoo_db, $odoo_settings['username'], $odoo_settings['password'], $cookie_file);
    
    // Build lookup maps for validation
    // Get valid supplier IDs (from suppliers table)
    $suppliers_result = $conn->query("SELECT supplier_id FROM suppliers");
    $valid_suppliers = [];
    while ($row = $suppliers_result->fetch_assoc()) {
        $valid_suppliers[$row['supplier_id']] = true;
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
    
    // Get all purchase orders from Odoo (including archived)
    $orders = importOdooCall($odoo_url, 'purchase.order', 'search_read', $cookie_file, [[]], [
        'context' => ['active_test' => false],
        'fields' => ['id', 'name', 'partner_id', 'picking_type_id', 'date_order', 'date_planned', 'date_approve', 'state', 'receipt_status', 'amount_untaxed', 'amount_tax', 'amount_total', 'notes', 'order_line']
    ]);
    
    if (empty($orders)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على طلبات شراء في Odoo',
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
            $lines = importOdooCall($odoo_url, 'purchase.order.line', 'search_read', $cookie_file, [
                [['id', 'in', $batch]]
            ], [
                'fields' => ['id', 'order_id', 'product_id', 'product_uom', 'product_qty', 'qty_received', 'qty_invoiced', 'price_unit', 'price_subtotal', 'discount', 'price_tax', 'price_total', 'taxes_id']
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
            $supplier_id = $order['partner_id'][0] ?? null;
            $warehouse_id = 1; // Default warehouse - Odoo uses picking_type_id
            
            // Validate supplier exists
            if (!$supplier_id || !isset($valid_suppliers[$supplier_id])) {
                $skipped_orders++;
                $errors[] = "طلب شراء رقم $order_id: تم التخطي - المورد رقم $supplier_id غير موجود";
                continue;
            }
            
            $order_date = formatDateForMySQL($order['date_order']) ?? date('Y-m-d H:i:s');
            $expected_delivery = formatDateForMySQL($order['date_planned']);
            $actual_delivery = ($order['state'] === 'done' || $order['receipt_status'] === 'full') ? formatDateForMySQL($order['date_approve']) : null;
            $receipt_status = $order['receipt_status'] ?? null;
            $status = mapOdooStateToStatus($order['state'] ?? 'draft', $receipt_status);
            $total_amount = $order['amount_total'] ?? 0;
            $notes = $order['notes'] ?: null;
            
            // Check if order exists
            $stmt = $conn->prepare("SELECT purchase_orders_id FROM purchase_orders WHERE purchase_orders_id = ?");
            $stmt->bind_param("i", $order_id);
            if (!$stmt->execute()) { throw new Exception("Order " . $order_id . ": " . $stmt->error . " | actual_delivery=" . var_export($actual_delivery, true)); }
            $exists = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            
            if ($exists) {
                // Update existing order
                $stmt = $conn->prepare("UPDATE purchase_orders SET 
                    purchase_orders_odoo_id = ?,
                    purchase_orders_supplier_id = ?,
                    purchase_orders_warehouse_id = ?,
                    purchase_orders_order_date = ?,
                    purchase_orders_expected_delivery_date = ?,
                    purchase_orders_actual_delivery_date = ?,
                    purchase_orders_total_amount = ?,
                    purchase_orders_status = ?,
                    purchase_orders_notes = ?,
                    purchase_orders_updated_at = CURRENT_TIMESTAMP
                    WHERE purchase_orders_id = ?");
                $stmt->bind_param("iiisssdssi",
                    $order_id,
                    $supplier_id,
                    $warehouse_id,
                    $order_date,
                    $expected_delivery,
                    $actual_delivery,
                    $total_amount,
                    $status,
                    $notes,
                    $order_id
                );
                if (!$stmt->execute()) { throw new Exception("Order " . $order_id . ": " . $stmt->error . " | actual_delivery=" . var_export($actual_delivery, true)); }
                $stmt->close();
                $updated_orders++;
                
                // Don't delete existing items - use UPSERT instead to avoid FK constraint issues
            } else {
                // Insert new order
                $stmt = $conn->prepare("INSERT INTO purchase_orders (
                    purchase_orders_id,
                    purchase_orders_odoo_id,
                    purchase_orders_supplier_id,
                    purchase_orders_warehouse_id,
                    purchase_orders_order_date,
                    purchase_orders_expected_delivery_date,
                    purchase_orders_actual_delivery_date,
                    purchase_orders_total_amount,
                    purchase_orders_status,
                    purchase_orders_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("iiiisssdss",
                    $order_id,
                    $order_id,
                    $supplier_id,
                    $warehouse_id,
                    $order_date,
                    $expected_delivery,
                    $actual_delivery,
                    $total_amount,
                    $status,
                    $notes
                );
                if (!$stmt->execute()) { throw new Exception("Order " . $order_id . ": " . $stmt->error . " | actual_delivery=" . var_export($actual_delivery, true)); }
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
                    
                    $quantity_ordered = $line['product_qty'] ?? 0;
                    $quantity_received = $line['qty_received'] ?? 0;
                    $unit_cost = $line['price_unit'] ?? 0;
                    $line_subtotal = $line['price_subtotal'] ?? 0;
                    $discount = $line['discount'] ?? 0;
                    $line_tax = $line['price_tax'] ?? 0;
                    $line_total = $line['price_total'] ?? 0;
                    
                    // Calculate tax rate if tax exists
                    $has_tax = ($line_tax > 0) ? 1 : 0;
                    $tax_rate = ($line_subtotal > 0 && $line_tax > 0) ? ($line_tax / $line_subtotal * 100) : 0;
                    
                    $stmt = $conn->prepare("INSERT INTO purchase_order_items (
                        purchase_order_items_id,
                        purchase_order_items_purchase_order_id,
                        purchase_order_items_variant_id,
                        purchase_order_items_packaging_type_id,
                        purchase_order_items_quantity_ordered,
                        purchase_order_items_quantity_received,
                        purchase_order_items_unit_cost,
                        purchase_order_items_discount_amount,
                        purchase_order_items_tax_rate,
                        purchase_order_items_has_tax,
                        purchase_order_items_total_cost
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        purchase_order_items_quantity_ordered = VALUES(purchase_order_items_quantity_ordered),
                        purchase_order_items_quantity_received = VALUES(purchase_order_items_quantity_received),
                        purchase_order_items_unit_cost = VALUES(purchase_order_items_unit_cost),
                        purchase_order_items_total_cost = VALUES(purchase_order_items_total_cost)");
                    $stmt->bind_param("iiiiiddddid",
                        $line_id,
                        $order_id,
                        $variant_id,
                        $packaging_type_id,
                        $quantity_ordered,
                        $quantity_received,
                        $unit_cost,
                        $discount,
                        $tax_rate,
                        $has_tax,
                        $line_total
                    );
                    if (!$stmt->execute()) { throw new Exception("Order " . $order_id . ": " . $stmt->error . " | actual_delivery=" . var_export($actual_delivery, true)); }
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
        'message' => "تم استيراد طلبات الشراء: $imported_orders جديد، $updated_orders محدث، $skipped_orders تم تخطيه. الأصناف: $imported_items مستورد، $skipped_items تم تخطيه.",
        'data' => [
            'orders_imported' => $imported_orders,
            'orders_updated' => $updated_orders,
            'orders_skipped' => $skipped_orders,
            'items_imported' => $imported_items,
            'items_skipped' => $skipped_items,
            'total_orders_from_odoo' => count($orders),
            'skipped_orders_log' => $errors
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
