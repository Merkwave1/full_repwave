<?php
/**
 * Import Suppliers from Odoo
 * 
 * Imports res.partner (suppliers) from Odoo to suppliers table in Rep
 * Suppliers in Odoo have supplier_rank > 0 or contact_type = 'Supplier'
 * 
 * Mapping:
 * - supplier_name: partner name
 * - supplier_contact_person: contact_person_name field
 * - supplier_phone: mobile or phone
 * - supplier_email: email
 * - supplier_address: street + street2
 * - supplier_notes: ref (reference note)
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

/**
 * Get value from Odoo field (handles [id, name] format)
 */
function getOdooValue($field, $index = 0) {
    if ($field === false || $field === null) return null;
    if (is_array($field) && isset($field[$index])) return $field[$index];
    return $field;
}

/**
 * Clean phone number
 */
function cleanPhone($phone) {
    if (empty($phone) || $phone === false) return null;
    $phone = preg_replace('/[^0-9+]/', '', $phone);
    return substr($phone, 0, 50) ?: null;
}

/**
 * Map Odoo partner (supplier) to Rep supplier format
 */
function mapPartnerToSupplier($partner) {
    $name = $partner['name'] ?? 'Unknown Supplier';
    
    // Build address
    $address_parts = [];
    if (!empty($partner['street']) && $partner['street'] !== false) $address_parts[] = $partner['street'];
    if (!empty($partner['street2']) && $partner['street2'] !== false) $address_parts[] = $partner['street2'];
    if (!empty($partner['city']) && $partner['city'] !== false) $address_parts[] = $partner['city'];
    
    // Get country/state names
    $state = getOdooValue($partner['state_id'], 1);
    $country = getOdooValue($partner['country_id'], 1);
    if ($state) $address_parts[] = $state;
    if ($country) $address_parts[] = $country;
    
    $address = !empty($address_parts) ? implode(', ', $address_parts) : null;
    
    // Phone: prefer mobile, fallback to phone
    $mobile = cleanPhone($partner['mobile']);
    $phone = cleanPhone($partner['phone']);
    $supplier_phone = $mobile ?: $phone;
    
    // Contact person name
    $contact_person = (!empty($partner['contact_person_name']) && $partner['contact_person_name'] !== false) 
        ? $partner['contact_person_name'] 
        : null;
    
    // Email
    $email = (!empty($partner['email']) && $partner['email'] !== false) 
        ? strtolower($partner['email']) 
        : null;
    
    // Notes from ref field
    $notes = (!empty($partner['ref']) && $partner['ref'] !== false) 
        ? $partner['ref'] 
        : null;
    
    return [
        'odoo_id' => $partner['id'],
        'supplier_name' => $name,
        'supplier_contact_person' => $contact_person,
        'supplier_phone' => $supplier_phone,
        'supplier_email' => $email,
        'supplier_address' => $address,
        'supplier_notes' => $notes,
    ];
}

// Main execution
try {
    $json_input = file_get_contents('php://input');
    $input = json_decode($json_input, true) ?? [];
    $input = array_merge($_POST, $input);
    
    $mode = $input['mode'] ?? 'update';
    $dry_run = isset($input['dry_run']) && ($input['dry_run'] === true || $input['dry_run'] === 'true');
    $limit = isset($input['limit']) ? (int)$input['limit'] : 0;
    $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
    
    $stats = ['created' => 0, 'updated' => 0, 'failed' => 0, 'skipped' => 0, 'details' => []];
    
    // Get Odoo settings
    $stmt = $conn->prepare("SELECT settings_key, settings_value FROM settings WHERE settings_key LIKE 'odoo_%'");
    $stmt->execute();
    $result = $stmt->get_result();
    $odooSettings = [];
    while ($row = $result->fetch_assoc()) {
        $odooSettings[$row['settings_key']] = $row['settings_value'];
    }
    $stmt->close();
    
    $odoo_url = $odooSettings['odoo_url'] ?? '';
    $odoo_database = $odooSettings['odoo_database'] ?? '';
    $odoo_username = $odooSettings['odoo_username'] ?? '';
    $odoo_password = $odooSettings['odoo_password'] ?? '';
    
    if (empty($odoo_url) || empty($odoo_database)) {
        print_failure('Odoo settings are incomplete');
        exit;
    }
    
    // Authenticate
    importOdooAuth($odoo_url, $odoo_database, $odoo_username, $odoo_password, $cookie_file);
    
    // Build kwargs for search_read
    $kwargs = [
        'fields' => [
            'id', 'name', 'street', 'street2', 'city', 'state_id', 'country_id',
            'phone', 'mobile', 'email', 'ref', 'contact_person_name', 'active'
        ],
        'order' => 'id ASC'
    ];
    
    if ($limit > 0) $kwargs['limit'] = $limit;
    if ($offset > 0) $kwargs['offset'] = $offset;
    
    // Fetch suppliers from Odoo (supplier_rank > 0 indicates supplier)
    // Try supplier_rank first, fallback to is_supplier if that doesn't work
    $partners = importOdooCall($odoo_url, 'res.partner', 'search_read', $cookie_file,
        [[['supplier_rank', '>', 0]]],
        $kwargs
    );
    
    if (file_exists($cookie_file)) unlink($cookie_file);
    
    if (!is_array($partners)) {
        print_failure('Failed to fetch suppliers from Odoo');
        exit;
    }
    
    if (empty($partners)) {
        print_success('No suppliers found in Odoo', ['total_from_odoo' => 0]);
        exit;
    }
    
    // Get existing suppliers by ID (using Odoo partner ID as supplier_id)
    $existingById = [];
    $stmt = $conn->prepare("SELECT supplier_id, supplier_name FROM suppliers");
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $existingById[(int)$row['supplier_id']] = $row['supplier_name'];
    }
    $stmt->close();
    
    // Process partners (suppliers)
    foreach ($partners as $partner) {
        try {
            // Skip inactive
            if (isset($partner['active']) && $partner['active'] === false) {
                $stats['skipped']++;
                $stats['details'][] = [
                    'action' => 'skipped',
                    'id' => $partner['id'],
                    'name' => $partner['name'],
                    'reason' => 'Inactive in Odoo'
                ];
                continue;
            }
            
            $supplierData = mapPartnerToSupplier($partner);
            $supplierName = $supplierData['supplier_name'];
            
            // Use Odoo ID as supplier_id
            $supplierId = $supplierData['odoo_id'];
            unset($supplierData['odoo_id']);
            
            if (isset($existingById[$supplierId])) {
                // Update existing supplier
                
                if (!$dry_run) {
                    $stmt = $conn->prepare("UPDATE suppliers SET 
                        supplier_contact_person = ?,
                        supplier_phone = ?,
                        supplier_email = ?,
                        supplier_address = ?,
                        supplier_notes = ?,
                        supplier_odoo_partner_id = ?
                        WHERE supplier_id = ?");
                    $stmt->bind_param('sssssii',
                        $supplierData['supplier_contact_person'],
                        $supplierData['supplier_phone'],
                        $supplierData['supplier_email'],
                        $supplierData['supplier_address'],
                        $supplierData['supplier_notes'],
                        $supplierId,
                        $supplierId
                    );
                    $stmt->execute();
                    $stmt->close();
                }
                
                $stats['updated']++;
                $stats['details'][] = ['action' => 'updated', 'id' => $supplierId, 'name' => $supplierName];
            } else {
                // Insert new supplier with Odoo ID as supplier_id
                if (!$dry_run) {
                    $stmt = $conn->prepare("INSERT INTO suppliers 
                        (supplier_id, supplier_name, supplier_contact_person, supplier_phone, supplier_email, supplier_address, supplier_notes, supplier_odoo_partner_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmt->bind_param('issssssi',
                        $supplierId,
                        $supplierData['supplier_name'],
                        $supplierData['supplier_contact_person'],
                        $supplierData['supplier_phone'],
                        $supplierData['supplier_email'],
                        $supplierData['supplier_address'],
                        $supplierData['supplier_notes'],
                        $supplierId
                    );
                    $stmt->execute();
                    $stmt->close();
                    
                    // Track in existing map to avoid duplicates
                    $existingById[$supplierId] = $supplierData['supplier_name'];
                }
                
                $stats['created']++;
                $stats['details'][] = ['action' => 'created', 'id' => $supplierId, 'name' => $supplierName];
            }
            
        } catch (Exception $e) {
            $stats['failed']++;
            $stats['details'][] = [
                'action' => 'failed',
                'id' => $partner['id'] ?? 0,
                'name' => $partner['name'] ?? 'Unknown',
                'error' => $e->getMessage()
            ];
        }
    }
    
    $message = sprintf('تم استيراد الموردين: %d جديد، %d محدث، %d تخطي، %d فشل', 
        $stats['created'], $stats['updated'], $stats['skipped'], $stats['failed']);
    if ($dry_run) $message = '[محاكاة] ' . $message;
    
    print_success($message, [
        'created' => $stats['created'],
        'updated' => $stats['updated'],
        'skipped' => $stats['skipped'],
        'failed' => $stats['failed'],
        'total_from_odoo' => count($partners),
        'dry_run' => $dry_run,
        'details' => array_slice($stats['details'], 0, 100)
    ]);
    
} catch (Exception $e) {
    if (isset($cookie_file) && file_exists($cookie_file)) unlink($cookie_file);
    print_failure('خطأ في الاستيراد: ' . $e->getMessage());
}
?>
