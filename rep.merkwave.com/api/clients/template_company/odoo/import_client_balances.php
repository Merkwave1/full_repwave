<?php
/**
 * Import Client Balances from Odoo
 * 
 * Updates clients_credit_balance and clients_credit_limit from Odoo res.partner
 * 
 * In Odoo:
 * - credit = Total Receivable (amount owed BY the customer)
 * - debit = Total Payable (amount owed TO the customer)
 * - credit_limit = Credit limit set for the customer
 * - total_due = Net balance due (may include both)
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
        CURLOPT_TIMEOUT => 300,
        CURLOPT_COOKIEJAR => $cookie_file,
        CURLOPT_COOKIEFILE => $cookie_file,
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    if (isset($result['error'])) throw new Exception($result['error']['data']['message'] ?? json_encode($result['error']));
    return $result['result'] ?? null;
}

// Main execution
try {
    // Get Odoo settings from database
    require_once __DIR__ . '/../functions.php';
    $odooSettings = getOdooSettings();
    
    if (!$odooSettings || empty($odooSettings['url'])) {
        echo json_encode(['status' => 'error', 'message' => 'لم يتم العثور على إعدادات Odoo']);
        exit;
    }
    
    $odoo_url = $odooSettings['url'];
    $database = $odooSettings['database'];
    $username = $odooSettings['username'];
    $password = $odooSettings['password'];
    
    // Authenticate with Odoo
    importOdooAuth($odoo_url, $database, $username, $password, $cookie_file);
    
    // Build client mapping (local client_id -> odoo partner_id)
    $client_map = [];
    $result = $conn->query("SELECT clients_id, clients_odoo_partner_id FROM clients WHERE clients_odoo_partner_id IS NOT NULL");
    while ($row = $result->fetch_assoc()) {
        $client_map[$row['clients_odoo_partner_id']] = $row['clients_id'];
    }
    
    if (empty($client_map)) {
        echo json_encode(['status' => 'error', 'message' => 'لا يوجد عملاء مرتبطين بـ Odoo']);
        exit;
    }
    
    $odoo_partner_ids = array_keys($client_map);
    
    // Fetch partner balances from Odoo
    // credit = receivable (what customer owes us)
    // credit_limit = credit limit
    $partners = importOdooCall(
        $odoo_url,
        'res.partner',
        'search_read',
        $cookie_file,
        [[['id', 'in', $odoo_partner_ids]]],
        ['context' => ['active_test' => false],

        'fields' => ['id', 'name', 'credit', 'debit', 'credit_limit']]
    );
    
    if (!$partners) {
        echo json_encode(['status' => 'error', 'message' => 'فشل في جلب أرصدة العملاء من Odoo']);
        exit;
    }
    
    // Prepare update statement
    $stmt = $conn->prepare("UPDATE clients SET 
        clients_credit_balance = ?,
        clients_credit_limit = ?
        WHERE clients_id = ?");
    
    $updated = 0;
    $skipped = 0;
    $details = [];
    
    foreach ($partners as $partner) {
        $odoo_partner_id = $partner['id'];
        $local_client_id = $client_map[$odoo_partner_id] ?? null;
        
        if (!$local_client_id) {
            $skipped++;
            continue;
        }
        
        // In Odoo:
        // credit = Total amount receivable (customer owes us) - THIS IS THE BALANCE
        // debit = Total amount payable (we owe customer)
        // Net balance = credit - debit (positive means customer owes us)
        
        $credit = floatval($partner['credit'] ?? 0);
        $debit = floatval($partner['debit'] ?? 0);
        $credit_limit = floatval($partner['credit_limit'] ?? 0);
        
        // The balance we store is the net amount owed by customer
        // Positive = customer owes us, Negative = we owe customer
        // Multiply by -1 to invert: positive becomes negative and vice versa
        $balance = ($credit - $debit) * -1;
        
        $stmt->bind_param("ddi", $balance, $credit_limit, $local_client_id);
        
        if ($stmt->execute()) {
            $updated++;
            if ($updated <= 10) {
                $details[] = [
                    'client_id' => $local_client_id,
                    'name' => $partner['name'],
                    'balance' => $balance,
                    'credit_limit' => $credit_limit
                ];
            }
        } else {
            $skipped++;
        }
    }
    
    $stmt->close();
    
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => "تم تحديث أرصدة العملاء: $updated محدثة، $skipped تم تخطيها",
        'data' => [
            'updated' => $updated,
            'skipped' => $skipped,
            'total_partners' => count($partners),
            'sample' => $details
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
