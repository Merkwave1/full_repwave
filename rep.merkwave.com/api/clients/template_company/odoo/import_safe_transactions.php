<?php
/**
 * Import Safe Transactions (Payments) from Odoo
 * 
 * Maps Odoo account.payment to:
 * - safe_transactions table
 * - payments table (for customer payments)
 * - supplier_payments table (for supplier payments)
 * 
 * Odoo payment_type:
 * - inbound = receipt (customer payment to us)
 * - outbound = payment (we pay to supplier)
 * 
 * Odoo partner_type:
 * - customer = client
 * - supplier = supplier
 */

require_once __DIR__ . '/../db_connect.php';

header('Content-Type: application/json; charset=utf-8');
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
        CURLOPT_TIMEOUT => 300,
        CURLOPT_COOKIEJAR => $cookie_file,
        CURLOPT_COOKIEFILE => $cookie_file,
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    if (isset($result['error'])) throw new Exception($result['error']['data']['message'] ?? 'API call failed');
    return $result['result'] ?? [];
}

try {    // Load Odoo settings from database
    // Odoo settings loaded from functions.php via db_connect.php
    $odoo_settings = getOdooSettings();
    $odoo_url = $odoo_settings['url'];
    $odoo_db = $odoo_settings['database'];
    
    // Authenticate with Odoo using database settings
    importOdooAuth($odoo_url, $odoo_db, $odoo_settings['username'], $odoo_settings['password'], $cookie_file);
    
    // Get default user (first admin or first user)
    $default_user_id = 2;
    $result = $conn->query("SELECT users_id FROM users ORDER BY users_id ASC LIMIT 1");
    if ($result && $row = $result->fetch_assoc()) {
        $default_user_id = $row['users_id'];
    }
    
    // Get default payment method
    $default_payment_method_id = 1;
    $result = $conn->query("SELECT payment_methods_id FROM payment_methods WHERE payment_methods_type = 'cash' LIMIT 1");
    if ($result && $row = $result->fetch_assoc()) {
        $default_payment_method_id = $row['payment_methods_id'];
    }
    
    // Build client mapping (odoo partner_id -> local client_id)
    $client_map = [];
    $result = $conn->query("SELECT clients_id, clients_odoo_partner_id FROM clients WHERE clients_odoo_partner_id IS NOT NULL");
    while ($row = $result->fetch_assoc()) {
        $client_map[$row['clients_odoo_partner_id']] = $row['clients_id'];
    }
    
    // Build supplier mapping - suppliers use Odoo ID directly as supplier_id
    // So we just need to verify the supplier exists
    $supplier_exists = [];
    $result = $conn->query("SELECT supplier_id FROM suppliers");
    while ($row = $result->fetch_assoc()) {
        $supplier_exists[$row['supplier_id']] = true;
    }
    
    // Fetch payments from Odoo (only posted/paid state)
    $payments = importOdooCall(
        $odoo_url, 
        'account.payment', 
        'search_read', 
        $cookie_file,
        [[['state', 'in', ['posted', 'paid']]]],
        ['context' => ['active_test' => false],

        'fields' => ['id', 'name', 'payment_type', 'partner_type', 'partner_id', 'amount', 'date', 'journal_id', 'state', 'memo', 'create_date']]
    );
    
    $imported_transactions = 0;
    $imported_payments = 0;
    $imported_refunds = 0;
    $imported_supplier_payments = 0;
    $updated = 0;
    $skipped = 0;
    $details = [];
    
    foreach ($payments as $payment) {
        $odoo_id = $payment['id'];
        $name = $payment['name'];
        $payment_type = $payment['payment_type']; // inbound or outbound
        $partner_type = $payment['partner_type']; // customer or supplier
        $partner_id = is_array($payment['partner_id']) ? $payment['partner_id'][0] : null;
        $partner_name = is_array($payment['partner_id']) ? $payment['partner_id'][1] : 'Unknown';
        $amount = floatval($payment['amount']);
        $payment_date = $payment['date'];
        $journal_id = is_array($payment['journal_id']) ? $payment['journal_id'][0] : null;
        $journal_name = is_array($payment['journal_id']) ? $payment['journal_id'][1] : 'Unknown';
        $memo = $payment['memo'] ?: $name;
        $create_date = $payment['create_date'] ?? $payment_date;
        
        // Safe ID is same as journal ID (we جديد safes with odoo journal id as safes_id)
        $safe_id = $journal_id;
        
        // Check if safe exists
        $stmt = $conn->prepare("SELECT safes_id FROM safes WHERE safes_id = ?");
        $stmt->bind_param("i", $safe_id);
        $stmt->execute();
        $safe_exists = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        
        if (!$safe_exists) {
            $skipped++;
            $details[] = ['id' => $odoo_id, 'name' => $name, 'action' => 'skipped', 'reason' => "Safe not found for journal $journal_name (ID: $journal_id)"];
            continue;
        }
        
        // Check if transaction already exists
        $stmt = $conn->prepare("SELECT safe_transactions_id FROM safe_transactions WHERE safe_transactions_odoo_id = ?");
        $stmt->bind_param("i", $odoo_id);
        $stmt->execute();
        $exists = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        
        if ($exists) {
            // Update existing transaction - determine type first
            $transaction_type = 'other';
            if ($payment_type === 'inbound' && $partner_type === 'customer') {
                $transaction_type = 'receipt';
            } elseif ($payment_type === 'outbound' && $partner_type === 'supplier') {
                $transaction_type = 'supplier_payment';
            } elseif ($payment_type === 'outbound' && $partner_type === 'customer') {
                $transaction_type = 'withdrawal';
            } elseif ($payment_type === 'inbound' && $partner_type === 'supplier') {
                $transaction_type = 'deposit';
            }
            
            $stmt = $conn->prepare("UPDATE safe_transactions SET 
                safe_transactions_safe_id = ?,
                safe_transactions_type = ?,
                safe_transactions_amount = ?,
                safe_transactions_date = ?,
                safe_transactions_description = ?
                WHERE safe_transactions_odoo_id = ?");
            $stmt->bind_param("isdssi", $safe_id, $transaction_type, $amount, $date, $name, $odoo_id);
            $stmt->execute();
            $stmt->close();
            $updated++;
            $details[] = ['id' => $odoo_id, 'name' => $name, 'action' => 'updated', 'reason' => 'تم التحديث'];
            continue;
        }
        
        // Determine transaction type based on payment_type and partner_type
        $transaction_type = 'other';
        $related_table = null;
        $related_id = null;
        
        if ($payment_type === 'inbound' && $partner_type === 'customer') {
            // Customer payment (receipt)
            $transaction_type = 'receipt';
            $related_table = 'payments';
        } elseif ($payment_type === 'outbound' && $partner_type === 'supplier') {
            // Supplier payment
            $transaction_type = 'supplier_payment';
            $related_table = 'supplier_payments';
        } elseif ($payment_type === 'outbound' && $partner_type === 'customer') {
            // Customer refund
            $transaction_type = 'withdrawal';
            $related_table = 'refunds';
        } elseif ($payment_type === 'inbound' && $partner_type === 'supplier') {
            // Supplier refund (we receive money back)
            $transaction_type = 'deposit';
        }
        
        // Insert safe transaction
        $stmt = $conn->prepare("INSERT INTO safe_transactions (
            safe_transactions_safe_id,
            safe_transactions_type,
            safe_transactions_payment_method_id,
            safe_transactions_amount,
            safe_transactions_balance_before,
            safe_transactions_balance_after,
            safe_transactions_description,
            safe_transactions_reference,
            safe_transactions_status,
            safe_transactions_date,
            safe_transactions_created_by,
            safe_transactions_related_table,
            safe_transactions_related_id,
            safe_transactions_odoo_id
        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, 'approved', ?, ?, ?, ?, ?)");
        
        $stmt->bind_param("isidsssissi",
            $safe_id,           // i - int
            $transaction_type,  // s - string
            $default_payment_method_id, // i - int
            $amount,            // d - double
            $memo,              // s - string
            $name,              // s - string
            $payment_date,      // s - string
            $default_user_id,   // i - int
            $related_table,     // s - string
            $related_id,        // s - string (nullable, cast to null)
            $odoo_id            // i - int
        );
        
        if (!$stmt->execute()) {
            $skipped++;
            $details[] = ['id' => $odoo_id, 'name' => $name, 'action' => 'failed', 'error' => $stmt->error];
            $stmt->close();
            continue;
        }
        
        $safe_transaction_id = $conn->insert_id;
        $stmt->close();
        $imported_transactions++;
        
        // Also create payment or supplier_payment record
        if ($transaction_type === 'receipt' && $partner_type === 'customer') {
            // Get client ID from partner
            $client_id = $client_map[$partner_id] ?? null;
            
            if ($client_id) {
                $stmt = $conn->prepare("INSERT INTO payments (
                    payments_client_id,
                    payments_method_id,
                    payments_amount,
                    payments_date,
                    payments_transaction_id,
                    payments_notes,
                    payments_rep_user_id,
                    payments_safe_id,
                    payments_safe_transaction_id,
                    payments_odoo_payment_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                
                $stmt->bind_param("iidsssiiii",
                    $client_id,
                    $default_payment_method_id,
                    $amount,
                    $payment_date,
                    $name,
                    $memo,
                    $default_user_id,
                    $safe_id,
                    $safe_transaction_id,
                    $odoo_id
                );
                
                if ($stmt->execute()) {
                    $payment_id = $conn->insert_id;
                    // Update safe_transaction with related_id
                    $conn->query("UPDATE safe_transactions SET safe_transactions_related_id = $payment_id WHERE safe_transactions_id = $safe_transaction_id");
                    $imported_payments++;
                }
                $stmt->close();
            }
        } elseif ($transaction_type === 'supplier_payment' && $partner_type === 'supplier') {
            // Get supplier ID - suppliers use Odoo ID directly as supplier_id
            $supplier_id = $partner_id;
            
            if ($supplier_id && isset($supplier_exists[$supplier_id])) {
                $stmt = $conn->prepare("INSERT INTO supplier_payments (
                    supplier_payments_supplier_id,
                    supplier_payments_method_id,
                    supplier_payments_amount,
                    supplier_payments_date,
                    supplier_payments_transaction_id,
                    supplier_payments_notes,
                    supplier_payments_rep_user_id,
                    supplier_payments_safe_id,
                    supplier_payments_safe_transaction_id,
                    supplier_payments_type,
                    supplier_payments_status,
                    supplier_payments_odoo_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Payment', 'Completed', ?)");
                
                $stmt->bind_param("iidsssiisi",
                    $supplier_id,
                    $default_payment_method_id,
                    $amount,
                    $payment_date,
                    $name,
                    $memo,
                    $default_user_id,
                    $safe_id,
                    $safe_transaction_id,
                    $odoo_id
                );
                
                if ($stmt->execute()) {
                    $sp_id = $conn->insert_id;
                    // Update safe_transaction with related_id
                    $conn->query("UPDATE safe_transactions SET safe_transactions_related_id = $sp_id WHERE safe_transactions_id = $safe_transaction_id");
                    $imported_supplier_payments++;
                }
                $stmt->close();
            }
        } elseif ($transaction_type === 'withdrawal' && $partner_type === 'customer') {
            // Customer refund - get client ID from partner
            $client_id = $client_map[$partner_id] ?? null;
            
            if ($client_id) {
                $stmt = $conn->prepare("INSERT INTO refunds (
                    refunds_client_id,
                    refunds_method_id,
                    refunds_amount,
                    refunds_date,
                    refunds_transaction_id,
                    refunds_notes,
                    refunds_rep_user_id,
                    refunds_safe_id,
                    refunds_safe_transaction_id,
                    refunds_odoo_payment_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                
                $stmt->bind_param("iidsssiiii",
                    $client_id,
                    $default_payment_method_id,
                    $amount,
                    $payment_date,
                    $name,
                    $memo,
                    $default_user_id,
                    $safe_id,
                    $safe_transaction_id,
                    $odoo_id
                );
                
                if ($stmt->execute()) {
                    $refund_id = $conn->insert_id;
                    // Update safe_transaction with related_id
                    $conn->query("UPDATE safe_transactions SET safe_transactions_related_id = $refund_id WHERE safe_transactions_id = $safe_transaction_id");
                    $imported_refunds++;
                }
                $stmt->close();
            }
        }
        
        $details[] = ['id' => $odoo_id, 'name' => $name, 'action' => 'imported', 'type' => $transaction_type, 'amount' => $amount];
    }
    
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => "تم استيراد معاملات الخزائن: $imported_transactions معاملة، $imported_payments تحصيل عميل، $imported_refunds مرتجع عميل، $imported_supplier_payments دفع مورد، $skipped تم تخطيه",
        'data' => [
            'transactions_imported' => $imported_transactions,
            'payments_imported' => $imported_payments,
            'refunds_imported' => $imported_refunds,
            'supplier_payments_imported' => $imported_supplier_payments,
            'skipped' => $skipped,
            'total_from_odoo' => count($payments),
            'details' => array_slice($details, 0, 50) // Limit details to 50 items
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    echo json_encode([
        'status' => 'error',
        'message' => 'فشل استيراد معاملات الخزائن: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
