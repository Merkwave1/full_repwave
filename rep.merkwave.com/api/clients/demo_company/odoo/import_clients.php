<?php
/**
 * Import Clients/Contacts from Odoo
 * 
 * Imports res.partner (companies) from Odoo to clients table in Rep
 * Uses Odoo partner ID as Rep client ID for synchronization.
 * 
 * IMPORTANT: Run these imports first (in order):
 * 1. import_countries.php
 * 2. import_governorates.php  
 * 3. import_client_area_tags.php
 * 4. import_client_industries.php
 * 5. import_client_types.php
 * 6. import_users.php (for sales representatives)
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
 * Map Odoo partner to Rep client format
 */
function mapPartnerToClient($partner, $repUsersMap, $defaultUserId) {
    $odoo_id = $partner['id'];
    
    // Get sales rep from sales_representative_id (hr.employee Many2one field)
    $rep_user_id = $defaultUserId;
    if (!empty($partner['sales_representative_id']) && is_array($partner['sales_representative_id'])) {
        $employee_id = $partner['sales_representative_id'][0];
        // Employee ID is directly used as user_id in Rep (from import_users)
        if (isset($repUsersMap[$employee_id])) {
            $rep_user_id = $employee_id;
        }
    }
    
    // Build address
    $address = (!empty($partner['street']) && $partner['street'] !== false) ? $partner['street'] : null;
    $street2 = (!empty($partner['street2']) && $partner['street2'] !== false) ? $partner['street2'] : null;
    $zip = (!empty($partner['zip']) && $partner['zip'] !== false) ? $partner['zip'] : null;
    $building_number = (!empty($partner['building_number']) && $partner['building_number'] !== false) ? $partner['building_number'] : null;
    
    // Get area_tag ID from area_tag field (contact.area.tag Many2one)
    $area_tag_id = getOdooValue($partner['area_tag'], 0);
    
    // Get contact_industry ID (NOT industry_id - contact_industry is the custom field)
    $industry_id = getOdooValue($partner['contact_industry'], 0);
    
    // Get contact type ID
    $client_type_id = getOdooValue($partner['contact_type'], 0);
    
    // Get country name and ID
    $country = getOdooValue($partner['country_id'], 1);
    $country_id = getOdooValue($partner['country_id'], 0);
    
    // Get governorate/state ID
    $governorate_id = getOdooValue($partner['state_id'], 0);

    // Get city from Odoo city field
    $city = $partner['city'] ?? null;

    
    // Latitude and longitude
    $lat = !empty($partner['partner_latitude']) && $partner['partner_latitude'] != 0 ? $partner['partner_latitude'] : null;
    $lng = !empty($partner['partner_longitude']) && $partner['partner_longitude'] != 0 ? $partner['partner_longitude'] : null;
    
    // Phone mapping: mobile → phone_1 (primary), mobile2 → phone_2 (secondary)
    $mobile = cleanPhone($partner['mobile']);
    $mobile2 = cleanPhone($partner['mobile2']);
    $phone = cleanPhone($partner['phone']);
    
    $phone_1 = $mobile ?: $phone; // Primary: mobile first, fallback to phone
    $phone_2 = $mobile2 ?: ($mobile ? $phone : null); // Secondary: mobile2 first, then phone if mobile is primary
    
    // Contact source is a string field, not array
    $contact_source = (!empty($partner['contact_source']) && $partner['contact_source'] !== false) 
        ? (is_array($partner['contact_source']) ? $partner['contact_source'][1] : $partner['contact_source']) 
        : null;
    
    return [
        'clients_id' => $odoo_id,
        'clients_company_name' => $partner['name'] ?? 'Unknown',
        'clients_rep_user_id' => $rep_user_id,
        'clients_email' => (!empty($partner['email']) && $partner['email'] !== false) ? strtolower($partner['email']) : null,
        'clients_website' => (!empty($partner['website']) && $partner['website'] !== false) ? $partner['website'] : null,
        'clients_vat_number' => (!empty($partner['vat']) && $partner['vat'] !== false) ? substr($partner['vat'], 0, 50) : null,
        'clients_odoo_partner_id' => $odoo_id,
        'clients_address' => $address,
        'clients_street2' => $street2,
        'clients_building_number' => $building_number,
        'clients_zip' => $zip,
        'clients_city' => $city,
        'clients_country_id' => $country_id,
        'clients_governorate_id' => $governorate_id,
        'clients_latitude' => $lat,
        'clients_longitude' => $lng,
        'clients_area_tag_id' => $area_tag_id,
        'clients_contact_name' => (!empty($partner['contact_person_name']) && $partner['contact_person_name'] !== false) ? $partner['contact_person_name'] : null,
        'clients_contact_job_title' => (!empty($partner['contact_job_title']) && $partner['contact_job_title'] !== false) ? $partner['contact_job_title'] : null,
        'clients_contact_phone_1' => $phone_1,
        'clients_contact_phone_2' => $phone_2,
        'clients_industry_id' => $industry_id,
        'clients_source' => $contact_source,
        'clients_status' => ($partner['active'] ?? true) ? 'active' : 'inactive',
        'clients_client_type_id' => $client_type_id,
        'clients_reference_note' => (!empty($partner['ref']) && $partner['ref'] !== false) ? $partner['ref'] : null,
    ];
}

/**
 * Get Country ID by name
 */
function getCountryIdByName($name) {
    global $conn;
    if (empty($name)) return null;
    $stmt = $conn->prepare("SELECT countries_id FROM countries WHERE countries_name_ar = ? OR countries_name_en = ? LIMIT 1");
    $stmt->bind_param("ss", $name, $name);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        return $row['countries_id'];
    }
    return null;
}

/**
 * Get Governorate ID by name
 */
function getGovernorateIdByName($name) {
    global $conn;
    if (empty($name)) return null;
    $stmt = $conn->prepare("SELECT governorates_id FROM governorates WHERE governorates_name_ar = ? OR governorates_name_en = ? LIMIT 1");
    $stmt->bind_param("ss", $name, $name);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        return $row['governorates_id'];
    }
    return null;
}

// Main execution
try {
    $json_input = file_get_contents('php://input');
    $input = json_decode($json_input, true) ?? [];
    $input = array_merge($_POST, $input);
    
    $mode = $input['mode'] ?? 'update';
    $dry_run = isset($input['dry_run']) && ($input['dry_run'] === true || $input['dry_run'] === 'true');
    $limit = isset($input['limit']) ? (int)$input['limit'] : 0; // 0 = no limit
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
    
    // Get default user ID (first admin or first user)
    $stmt = $conn->prepare("SELECT users_id FROM users WHERE users_role = 'admin' ORDER BY users_id LIMIT 1");
    $stmt->execute();
    $result = $stmt->get_result();
    $defaultUser = $result->fetch_assoc();
    $defaultUserId = $defaultUser ? $defaultUser['users_id'] : 1;
    $stmt->close();
    
    // Get existing Rep users (imported from hr.employee with employee_id as users_id)
    $repUsers = [];
    $stmt = $conn->prepare("SELECT users_id FROM users");
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $repUsers[(int)$row['users_id']] = true;
    }
    $stmt->close();
    
    // Authenticate
    importOdooAuth($odoo_url, $odoo_database, $odoo_username, $odoo_password, $cookie_file);
    
    // repUsers map is used directly - sales_representative_id points to hr.employee
    // which is جديد with employee_id as users_id in Rep
    
    // Build kwargs for search_read
    $kwargs = [
        'fields' => [
            'id', 'name', 'street', 'street2', 'city', 'state_id', 'country_id', 'zip',
            'vat', 'phone', 'mobile', 'mobile2', 'email', 'website',
            'area_tag', 'contact_industry', 'contact_type', 'sales_representative_id',
            'partner_latitude', 'partner_longitude',
            'contact_job_title', 'ref', 'active', 'contact_source', 'contact_person_name',
            'building_number'
        ],
        'order' => 'id ASC'
    ];
    
    if ($limit > 0) $kwargs['limit'] = $limit;
    if ($offset > 0) $kwargs['offset'] = $offset;
    
    // Fetch all partners (companies AND individuals) from Odoo
    // Use empty domain [] to get all contacts
    $partners = importOdooCall($odoo_url, 'res.partner', 'search_read', $cookie_file,
        [[]],  // All contacts (companies + individuals)
        $kwargs
    );
    
    if (file_exists($cookie_file)) unlink($cookie_file);
    
    if (!is_array($partners)) {
        print_failure('Failed to fetch contacts from Odoo');
        exit;
    }
    
    if (empty($partners)) {
        print_success('No contacts found in Odoo', ['total_from_odoo' => 0]);
        exit;
    }
    
    // Get existing clients
    $existing = [];
    $existingPhones = [];
    $existingNames = [];
    $stmt = $conn->prepare("SELECT clients_id, clients_contact_phone_1, clients_company_name FROM clients");
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $existing[(int)$row['clients_id']] = true;
        if ($row['clients_contact_phone_1']) {
            $existingPhones[$row['clients_contact_phone_1']] = (int)$row['clients_id'];
        }
        $existingNames[strtolower($row['clients_company_name'])] = (int)$row['clients_id'];
    }
    $stmt->close();
    
    // Process partners
    foreach ($partners as $partner) {
        try {
            $clientData = mapPartnerToClient($partner, $repUsers, $defaultUserId);
            $clientId = $clientData['clients_id'];
            $clientName = $clientData['clients_company_name'];
            $phone = $clientData['clients_contact_phone_1'];
            
            // Check for duplicate phone (if phone exists and belongs to different client)
            if ($phone && isset($existingPhones[$phone]) && $existingPhones[$phone] !== $clientId) {
                $stats['skipped']++;
                $stats['details'][] = [
                    'action' => 'skipped',
                    'id' => $clientId,
                    'name' => $clientName,
                    'reason' => 'Duplicate phone: ' . $phone
                ];
                continue;
            }
            
            // Check for duplicate name (if name exists and belongs to different client)
            $nameLower = strtolower($clientName);
            if (isset($existingNames[$nameLower]) && $existingNames[$nameLower] !== $clientId) {
                // Append ID to make unique
                $clientData['clients_company_name'] = $clientName . ' (' . $clientId . ')';
            }
            
            if (isset($existing[$clientId])) {
                // Update existing client
                if (!$dry_run) {
                    $updateFields = [];
                    $updateTypes = '';
                    $updateValues = [];
                    
                    foreach ($clientData as $key => $value) {
                        if ($key === 'clients_id') continue; // Skip ID
                        $updateFields[] = "$key = ?";
                        $updateTypes .= ($key === 'clients_rep_user_id' || $key === 'clients_odoo_partner_id' || 
                                        $key === 'clients_area_tag_id' || $key === 'clients_industry_id' ||
                                        $key === 'clients_client_type_id' || $key === 'clients_country_id' || 
                                        $key === 'clients_governorate_id') ? 'i' : 's';
                        $updateValues[] = $value;
                    }
                    
                    $updateTypes .= 'i';
                    $updateValues[] = $clientId;
                    
                    $sql = "UPDATE clients SET " . implode(', ', $updateFields) . " WHERE clients_id = ?";
                    $stmt = $conn->prepare($sql);
                    $stmt->bind_param($updateTypes, ...$updateValues);
                    $stmt->execute();
                    $stmt->close();
                }
                
                $stats['updated']++;
                $stats['details'][] = ['action' => 'updated', 'id' => $clientId, 'name' => $clientName];
            } else {
                // Insert new client
                if (!$dry_run) {
                    $columns = implode(', ', array_keys($clientData));
                    $placeholders = implode(', ', array_fill(0, count($clientData), '?'));
                    
                    $types = '';
                    foreach ($clientData as $key => $value) {
                        $types .= ($key === 'clients_id' || $key === 'clients_rep_user_id' || 
                                  $key === 'clients_odoo_partner_id' || $key === 'clients_area_tag_id' || 
                                  $key === 'clients_industry_id' || $key === 'clients_client_type_id' ||
                                  $key === 'clients_country_id' || $key === 'clients_governorate_id') ? 'i' : 's';
                    }
                    
                    $sql = "INSERT INTO clients ($columns) VALUES ($placeholders)";
                    $stmt = $conn->prepare($sql);
                    $stmt->bind_param($types, ...array_values($clientData));
                    $stmt->execute();
                    $stmt->close();
                }
                
                $stats['created']++;
                $stats['details'][] = ['action' => 'created', 'id' => $clientId, 'name' => $clientName];
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
    
    $message = sprintf('تم استيراد العملاء: %d جديد، %d محدث، %d تخطي، %d فشل', 
        $stats['created'], $stats['updated'], $stats['skipped'], $stats['failed']);
    if ($dry_run) $message = '[محاكاة] ' . $message;
    
    // Filter details by action type
    $skipped_details = array_filter($stats['details'], fn($d) => $d['action'] === 'skipped');
    $failed_details = array_filter($stats['details'], fn($d) => $d['action'] === 'failed');
    
    print_success($message, [
        'created' => $stats['created'],
        'updated' => $stats['updated'],
        'skipped' => $stats['skipped'],
        'failed' => $stats['failed'],
        'total_from_odoo' => count($partners),
        'dry_run' => $dry_run,
        'skipped_details' => array_values($skipped_details),
        'failed_details' => array_values($failed_details)
    ]);
    
} catch (Exception $e) {
    if (isset($cookie_file) && file_exists($cookie_file)) unlink($cookie_file);
    print_failure('خطأ في الاستيراد: ' . $e->getMessage());
}
?>
