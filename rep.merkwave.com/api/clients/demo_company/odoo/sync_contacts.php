<?php
/**
 * Odoo Contact Sync Functions
 * 
 * Handles synchronization of clients (contacts) to Odoo.
 * All Odoo integration functions should be in this folder.
 * 
 * @author RepWave Integration
 * @version 2.0
 */

if (!function_exists('callOdooAPI')) {
    require_once __DIR__ . '/../functions.php';
}

/**
 * Check if Odoo integration is enabled
 * This should be called before any sync operation
 * 
 * @return bool True if enabled, false otherwise
 */
function isOdooIntegrationEnabled() {
    $settings = getOdooSettings();
    return $settings && !empty($settings['enabled']);
}

/**
 * Sync a client/contact to Odoo
 * 
 * @param array $clientData Client data from PHP
 * @param int|null $php_client_id PHP client ID
 * @return int|false Odoo partner ID or false on failure/disabled
 */
function syncContactToOdoo($clientData, $php_client_id = null) {
    // Check if integration is enabled FIRST - don't proceed or log if disabled
    if (!isOdooIntegrationEnabled()) {
        error_log('Odoo contact sync skipped: Integration is disabled');
        return false;
    }
    
    global $pdo;
    $sync_status = 'failed';
    $error_message = null;
    $partner_id = false;
    
    try {
        // Prepare contact data for Odoo
        $odoo_contact_data = [
            'name' => $clientData['clients_company_name'],
            'is_company' => true,
        ];
        
        // Add PHP client ID as reference (using ref field in Odoo)
        if ($php_client_id) {
            $odoo_contact_data['ref'] = $php_client_id;
        }
        
        // Email
        if (!empty($clientData['clients_email'])) {
            $odoo_contact_data['email'] = $clientData['clients_email'];
        }
        
        // Website
        if (!empty($clientData['clients_website'])) {
            $odoo_contact_data['website'] = $clientData['clients_website'];
        }
        
        // VAT/Tax ID
        if (!empty($clientData['clients_vat_number'])) {
            $odoo_contact_data['vat'] = $clientData['clients_vat_number'];
        }
        
        // Address fields - street (main address)
        if (!empty($clientData['clients_address'])) {
            $odoo_contact_data['street'] = $clientData['clients_address'];
        }
        
        // Street2 (second address line)
        if (!empty($clientData['clients_street2'])) {
            $odoo_contact_data['street2'] = $clientData['clients_street2'];
        }
        
        // Building number - use custom field from contact_edits module
        if (!empty($clientData['clients_building_number'])) {
            $odoo_contact_data['building_number'] = $clientData['clients_building_number'];
        }
        
        // City - this is the actual city field in Odoo
        if (!empty($clientData['clients_city'])) {
            $odoo_contact_data['city'] = $clientData['clients_city'];
        }
        
        // ZIP/Postal code
        if (!empty($clientData['clients_zip'])) {
            $odoo_contact_data['zip'] = $clientData['clients_zip'];
        }
        
        // Country - Get country name/code from database by ID (MUST be before state)
        $odoo_country_id = null;
        if (!empty($clientData['clients_country_id'])) {
            $country_data = getCountryDataById($clientData['clients_country_id']);
            if ($country_data) {
                $country_identifier = null;
                if (!empty($country_data['code'])) {
                    $country_identifier = strtoupper(trim($country_data['code']));
                } elseif (!empty($country_data['name_en'])) {
                    $country_identifier = trim($country_data['name_en']);
                } elseif (!empty($country_data['name_ar'])) {
                    $country_identifier = trim($country_data['name_ar']);
                }
                
                if ($country_identifier) {
                    $odoo_country_id = getOrCreateOdooCountry($country_identifier);
                    if ($odoo_country_id) {
                        $odoo_contact_data['country_id'] = $odoo_country_id;
                    }
                }
            }
        }
        
        // State/Province - requires country_id to be set first
        if (!empty($clientData['clients_governorate_id']) && $odoo_country_id) {
            $gov_data = getGovernorateDataById($clientData['clients_governorate_id']);
            if ($gov_data) {
                $state_name = !empty($gov_data['name_en']) ? $gov_data['name_en'] : $gov_data['name_ar'];
                if ($state_name) {
                    $odoo_state_id = getOrCreateOdooState($state_name, $odoo_country_id);
                    if ($odoo_state_id) {
                        $odoo_contact_data['state_id'] = $odoo_state_id;
                    }
                }
            }
        }
        
        // Description/Internal Notes
        if (!empty($clientData['clients_description'])) {
            $odoo_contact_data['comment'] = $clientData['clients_description'];
        }
        
        // Contact Person Details
        if (!empty($clientData['clients_contact_name'])) {
            $odoo_contact_data['contact_person_name'] = $clientData['clients_contact_name'];
        }
        
        if (!empty($clientData['clients_contact_job_title'])) {
            $odoo_contact_data['contact_job_title'] = $clientData['clients_contact_job_title'];
        }
        
        // Phone numbers
        if (!empty($clientData['clients_contact_phone_1'])) {
            $odoo_contact_data['mobile'] = $clientData['clients_contact_phone_1'];
        }
        
        if (!empty($clientData['clients_contact_phone_2'])) {
            $odoo_contact_data['mobile2'] = $clientData['clients_contact_phone_2'];
        }
        
        // Geolocation
        if (!empty($clientData['clients_latitude'])) {
            $odoo_contact_data['partner_latitude'] = (float)$clientData['clients_latitude'];
        }
        
        if (!empty($clientData['clients_longitude'])) {
            $odoo_contact_data['partner_longitude'] = (float)$clientData['clients_longitude'];
        }
        
        // Contact Source
        if (!empty($clientData['clients_source'])) {
            $odoo_contact_data['contact_source'] = $clientData['clients_source'];
        }
        
        // Area Tag
        if (!empty($clientData['clients_area_tag_id'])) {
            $odoo_area_tag_id = getOrCreateOdooAreaTag($clientData['clients_area_tag_id']);
            if ($odoo_area_tag_id) {
                $odoo_contact_data['area_tag'] = $odoo_area_tag_id;
            }
        }
        
        // Contact Industry
        if (!empty($clientData['clients_industry_id'])) {
            $odoo_industry_id = getOrCreateOdooIndustry($clientData['clients_industry_id']);
            if ($odoo_industry_id) {
                $odoo_contact_data['contact_industry'] = $odoo_industry_id;
            }
        }
        
        // Contact Type
        if (!empty($clientData['clients_client_type_id'])) {
            $odoo_contact_type_id = getOrCreateOdooContactType($clientData['clients_client_type_id']);
            if ($odoo_contact_type_id) {
                $odoo_contact_data['contact_type'] = $odoo_contact_type_id;
            }
        }
        
        // Sales representative
        if (!empty($clientData['clients_rep_user_id'])) {
            $odoo_employee_id = getOrCreateOdooEmployee($clientData['clients_rep_user_id']);
            if ($odoo_employee_id) {
                $odoo_contact_data['sales_representative_id'] = $odoo_employee_id;
            }
        }
        
        // Call Odoo API to create contact
        $partner_id = callOdooAPI('res.partner', 'create', [$odoo_contact_data]);
        
        if ($partner_id) {
            $sync_status = 'success';
            error_log('Odoo sync successful: Contact created with ID ' . $partner_id);
        } else {
            $error_message = 'Could not create contact in Odoo';
            error_log('Odoo sync failed: ' . $error_message);
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log('Odoo contact sync error: ' . $error_message);
    }
    
    // Log the sync attempt - only if we actually tried to sync
    if ($php_client_id && $pdo) {
        logContactSync($php_client_id, $partner_id, $sync_status, $error_message);
        
        // Update the clients table with the Odoo partner ID
        if ($partner_id !== false && $partner_id > 0) {
            $updateStmt = $pdo->prepare("UPDATE clients SET clients_odoo_partner_id = ? WHERE clients_id = ?");
            $updateStmt->execute([$partner_id, $php_client_id]);
        }
    }
    
    return $partner_id;
}

/**
 * Find Odoo contact by email or name
 */
function findOdooContact($email = null, $name = null) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        $domain = [];
        
        if ($email) {
            $domain[] = ['email', '=', $email];
        }
        
        if ($name) {
            if (!empty($domain)) {
                $domain = ['|', ...$domain, ['name', '=', $name]];
            } else {
                $domain[] = ['name', '=', $name];
            }
        }
        
        if (empty($domain)) {
            return false;
        }
        
        $result = callOdooAPI('res.partner', 'search', [$domain], ['limit' => 1]);
        
        if ($result && is_array($result) && count($result) > 0) {
            return $result[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log('Odoo contact search error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Get or create Odoo employee from PHP user
 */
function getOrCreateOdooEmployee($php_user_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        global $pdo;
        
        $stmt = $pdo->prepare("SELECT users_id, users_name, users_email FROM users WHERE users_id = ?");
        $stmt->execute([$php_user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            error_log("PHP user not found: ID $php_user_id");
            return false;
        }
        
        // Try to find employee by barcode
        $barcode = 'PHP' . str_pad($php_user_id, 8, '0', STR_PAD_LEFT);
        $barcode_domain = [['barcode', '=', $barcode]];
        $existing_employees = callOdooAPI('hr.employee', 'search_read', [$barcode_domain, ['id', 'name', 'work_email', 'barcode']]);
        
        if (!empty($existing_employees) && isset($existing_employees[0]['id'])) {
            return $existing_employees[0]['id'];
        }
        
        // Try email or name
        $domain = [];
        if (!empty($user['users_email'])) {
            $domain = [['work_email', '=', $user['users_email']]];
        } else {
            $domain = [['name', '=', $user['users_name']]];
        }
        
        $existing_employees = callOdooAPI('hr.employee', 'search_read', [$domain, ['id', 'name', 'work_email']]);
        
        if (!empty($existing_employees) && isset($existing_employees[0]['id'])) {
            return $existing_employees[0]['id'];
        }
        
        // Create new employee
        $employee_data = [
            'name' => $user['users_name'],
            'barcode' => $barcode,
        ];
        
        if (!empty($user['users_email'])) {
            $employee_data['work_email'] = $user['users_email'];
        }
        
        $employee_id = callOdooAPI('hr.employee', 'create', [$employee_data]);
        
        if ($employee_id) {
            error_log("Odoo employee created: ID {$employee_id} for PHP user {$php_user_id}");
            return $employee_id;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log('Error getting Odoo employee: ' . $e->getMessage());
        return false;
    }
}

/**
 * Update existing contact in Odoo
 */
function updateOdooContact($partner_id, $data) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        $result = callOdooAPI('res.partner', 'write', [[$partner_id], $data]);
        
        if ($result) {
            error_log('Odoo update successful: Contact ID ' . $partner_id);
            return true;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log('Odoo contact update error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Update a client in Odoo when updated in RepWave
 * 
 * This function prepares all client data and syncs changes to Odoo.
 * If the client doesn't have an Odoo partner ID, it will create a new contact.
 * 
 * @param int $client_id PHP client ID
 * @param array|null $client_data Optional client data (if not provided, will fetch from DB)
 * @return array Result with status and message
 */
function updateClientInOdoo($client_id, $client_data = null) {
    // Check if integration is enabled
    if (!isOdooIntegrationEnabled()) {
        return ['status' => 'skipped', 'message' => 'Odoo integration is disabled'];
    }
    
    global $conn;
    $sync_status = 'failed';
    $sync_action = 'update';
    $error_message = null;
    
    try {
        // Fetch client data if not provided
        if ($client_data === null) {
            $stmt = $conn->prepare("SELECT * FROM clients WHERE clients_id = ?");
            $stmt->bind_param("i", $client_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $client_data = $result->fetch_assoc();
            $stmt->close();
            
            if (!$client_data) {
                return ['status' => 'failed', 'message' => 'Client not found'];
            }
        }
        
        $odoo_partner_id = $client_data['clients_odoo_partner_id'] ?? null;
        
        // If no Odoo partner ID exists, create a new contact instead
        if (empty($odoo_partner_id)) {
            error_log("Client $client_id has no Odoo partner ID - creating new contact");
            $sync_action = 'create';
            $new_partner_id = syncContactToOdoo($client_data, $client_id);
            
            if ($new_partner_id) {
                return [
                    'status' => 'success',
                    'action' => 'create',
                    'odoo_partner_id' => $new_partner_id,
                    'message' => 'Client created in Odoo'
                ];
            } else {
                return ['status' => 'failed', 'message' => 'Failed to create client in Odoo'];
            }
        }
        
        // Prepare update data for Odoo
        $odoo_update_data = [
            'name' => $client_data['clients_company_name'],
        ];
        
        // Email
        if (isset($client_data['clients_email'])) {
            $odoo_update_data['email'] = $client_data['clients_email'] ?: false;
        }
        
        // Website
        if (isset($client_data['clients_website'])) {
            $odoo_update_data['website'] = $client_data['clients_website'] ?: false;
        }
        
        // VAT/Tax ID
        if (isset($client_data['clients_vat_number'])) {
            $odoo_update_data['vat'] = $client_data['clients_vat_number'] ?: false;
        }
        
        // Address - with building number prefix
        if (isset($client_data['clients_address'])) {
            $odoo_update_data['street'] = $client_data['clients_address'] ?: false;
        }
        
        // Building number - use custom field from contact_edits module
        if (isset($client_data['clients_building_number'])) {
            $odoo_update_data['building_number'] = $client_data['clients_building_number'] ?: false;
        }
        
        // Street2
        if (isset($client_data['clients_street2'])) {
            $odoo_update_data['street2'] = $client_data['clients_street2'] ?: false;
        }
        
        // City
        if (isset($client_data['clients_city'])) {
            $odoo_update_data['city'] = $client_data['clients_city'] ?: false;
        }
        
        // ZIP code
        if (isset($client_data['clients_zip'])) {
            $odoo_update_data['zip'] = $client_data['clients_zip'] ?: false;
        }
        
        // Country
        $odoo_country_id = null;
        if (!empty($client_data['clients_country_id'])) {
            $country_data = getCountryDataById($client_data['clients_country_id']);
            if ($country_data) {
                $country_identifier = null;
                if (!empty($country_data['code'])) {
                    $country_identifier = strtoupper(trim($country_data['code']));
                } elseif (!empty($country_data['name_en'])) {
                    $country_identifier = trim($country_data['name_en']);
                }
                
                if ($country_identifier) {
                    $odoo_country_id = getOrCreateOdooCountry($country_identifier);
                    if ($odoo_country_id) {
                        $odoo_update_data['country_id'] = $odoo_country_id;
                    }
                }
            }
        }
        
        // State/Province - must have country first
        if (!empty($client_data['clients_governorate_id']) && $odoo_country_id) {
            $gov_data = getGovernorateDataById($client_data['clients_governorate_id']);
            if ($gov_data) {
                $state_name = !empty($gov_data['name_en']) ? $gov_data['name_en'] : $gov_data['name_ar'];
                if ($state_name) {
                    $odoo_state_id = getOrCreateOdooState($state_name, $odoo_country_id);
                    if ($odoo_state_id) {
                        $odoo_update_data['state_id'] = $odoo_state_id;
                    }
                }
            }
        }
        
        // Description/Internal Notes
        if (isset($client_data['clients_description'])) {
            $odoo_update_data['comment'] = $client_data['clients_description'] ?: false;
        }
        
        // Contact Person Details
        if (isset($client_data['clients_contact_name'])) {
            $odoo_update_data['contact_person_name'] = $client_data['clients_contact_name'] ?: false;
        }
        
        if (isset($client_data['clients_contact_job_title'])) {
            $odoo_update_data['contact_job_title'] = $client_data['clients_contact_job_title'] ?: false;
        }
        
        // Phone numbers
        if (isset($client_data['clients_contact_phone_1'])) {
            $odoo_update_data['mobile'] = $client_data['clients_contact_phone_1'] ?: false;
        }
        
        if (isset($client_data['clients_contact_phone_2'])) {
            $odoo_update_data['mobile2'] = $client_data['clients_contact_phone_2'] ?: false;
        }
        
        // Geolocation
        if (isset($client_data['clients_latitude']) && $client_data['clients_latitude'] !== null) {
            $odoo_update_data['partner_latitude'] = (float)$client_data['clients_latitude'];
        }
        
        if (isset($client_data['clients_longitude']) && $client_data['clients_longitude'] !== null) {
            $odoo_update_data['partner_longitude'] = (float)$client_data['clients_longitude'];
        }
        
        // Contact Source
        if (isset($client_data['clients_source'])) {
            $odoo_update_data['contact_source'] = $client_data['clients_source'] ?: false;
        }
        
        // Area Tag
        if (!empty($client_data['clients_area_tag_id'])) {
            $odoo_area_tag_id = getOrCreateOdooAreaTag($client_data['clients_area_tag_id']);
            if ($odoo_area_tag_id) {
                $odoo_update_data['area_tag'] = $odoo_area_tag_id;
            }
        }
        
        // Contact Industry
        if (!empty($client_data['clients_industry_id'])) {
            $odoo_industry_id = getOrCreateOdooIndustry($client_data['clients_industry_id']);
            if ($odoo_industry_id) {
                $odoo_update_data['contact_industry'] = $odoo_industry_id;
            }
        }
        
        // Contact Type
        if (!empty($client_data['clients_client_type_id'])) {
            $odoo_contact_type_id = getOrCreateOdooContactType($client_data['clients_client_type_id']);
            if ($odoo_contact_type_id) {
                $odoo_update_data['contact_type'] = $odoo_contact_type_id;
            }
        }
        
        // Sales representative
        if (!empty($client_data['clients_rep_user_id'])) {
            $odoo_employee_id = getOrCreateOdooEmployee($client_data['clients_rep_user_id']);
            if ($odoo_employee_id) {
                $odoo_update_data['sales_representative_id'] = $odoo_employee_id;
            }
        }
        
        // Call Odoo API to update contact
        $result = updateOdooContact($odoo_partner_id, $odoo_update_data);
        
        if ($result) {
            $sync_status = 'success';
            error_log("Client $client_id updated in Odoo: Partner ID $odoo_partner_id");
            
            // Log the sync
            logContactSync($client_id, $odoo_partner_id, 'success', null);
            
            return [
                'status' => 'success',
                'action' => 'update',
                'odoo_partner_id' => $odoo_partner_id,
                'message' => 'Client updated in Odoo'
            ];
        } else {
            $error_message = 'Failed to update contact in Odoo';
            logContactSync($client_id, $odoo_partner_id, 'failed', $error_message);
            return ['status' => 'failed', 'message' => $error_message];
        }
        
    } catch (Exception $e) {
        $error_message = $e->getMessage();
        error_log("Odoo client update error for client $client_id: $error_message");
        
        if ($client_id) {
            logContactSync($client_id, $odoo_partner_id ?? null, 'failed', $error_message);
        }
        
        return ['status' => 'failed', 'message' => $error_message];
    }
}

/**
 * Log contact sync attempt
 */
function logContactSync($php_client_id, $odoo_partner_id, $status, $error_message = null) {
    try {
        global $pdo;
        
        if (!$pdo) {
            return false;
        }
        
        // Create table if it doesn't exist
        $createTable = "
            CREATE TABLE IF NOT EXISTS odoo_contact_sync_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                php_client_id INT NOT NULL,
                odoo_partner_id INT NULL,
                sync_status ENUM('success', 'failed') NOT NULL,
                error_message TEXT NULL,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_php_client_id (php_client_id),
                INDEX idx_sync_status (sync_status),
                INDEX idx_synced_at (synced_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        
        $pdo->exec($createTable);
        
        $stmt = $pdo->prepare("
            INSERT INTO odoo_contact_sync_logs 
            (php_client_id, odoo_partner_id, sync_status, error_message) 
            VALUES (?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $php_client_id,
            $odoo_partner_id ?: null,
            $status,
            $error_message
        ]);
        
        return true;
        
    } catch (Exception $e) {
        error_log('Error logging contact sync: ' . $e->getMessage());
        return false;
    }
}

/**
 * Get or create Odoo Area Tag
 */
function getOrCreateOdooAreaTag($php_area_tag_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        global $pdo;
        
        $stmt = $pdo->prepare("SELECT client_area_tag_name FROM client_area_tags WHERE client_area_tag_id = ?");
        $stmt->execute([$php_area_tag_id]);
        $area_tag = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$area_tag) {
            return false;
        }
        
        $tag_name = $area_tag['client_area_tag_name'];
        
        $domain = [['name', '=', $tag_name]];
        $existing_tags = callOdooAPI('contact.area.tag', 'search', [$domain]);
        
        if (!empty($existing_tags) && is_array($existing_tags) && count($existing_tags) > 0) {
            return $existing_tags[0];
        }
        
        $tag_data = ['name' => $tag_name];
        return callOdooAPI('contact.area.tag', 'create', [$tag_data]);
        
    } catch (Exception $e) {
        error_log('Error getting Odoo area tag: ' . $e->getMessage());
        return false;
    }
}

/**
 * Get or create Odoo Industry
 */
function getOrCreateOdooIndustry($php_industry_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        global $pdo;
        
        $stmt = $pdo->prepare("SELECT client_industries_name FROM client_industries WHERE client_industries_id = ?");
        $stmt->execute([$php_industry_id]);
        $industry = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$industry) {
            return false;
        }
        
        $industry_name = $industry['client_industries_name'];
        
        $domain = [['name', '=', $industry_name]];
        $existing_industries = callOdooAPI('res.partner.industry', 'search', [$domain]);
        
        if (!empty($existing_industries) && is_array($existing_industries) && count($existing_industries) > 0) {
            return $existing_industries[0];
        }
        
        $industry_data = ['name' => $industry_name];
        return callOdooAPI('res.partner.industry', 'create', [$industry_data]);
        
    } catch (Exception $e) {
        error_log('Error getting Odoo industry: ' . $e->getMessage());
        return false;
    }
}

/**
 * Get or create Odoo Contact Type
 */
function getOrCreateOdooContactType($php_client_type_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        global $pdo;
        
        $stmt = $pdo->prepare("SELECT client_type_name FROM client_types WHERE client_type_id = ?");
        $stmt->execute([$php_client_type_id]);
        $client_type = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$client_type) {
            return false;
        }
        
        $type_name = $client_type['client_type_name'];
        
        $domain = [['name', '=', $type_name]];
        $existing_types = callOdooAPI('contact.type', 'search', [$domain]);
        
        if (!empty($existing_types) && is_array($existing_types) && count($existing_types) > 0) {
            return $existing_types[0];
        }
        
        $type_data = ['name' => $type_name];
        return callOdooAPI('contact.type', 'create', [$type_data]);
        
    } catch (Exception $e) {
        error_log('Error getting Odoo contact type: ' . $e->getMessage());
        return false;
    }
}

/**
 * Get country data from database by ID
 */
function getCountryDataById($country_id) {
    global $conn;
    
    try {
        if (empty($country_id)) {
            return false;
        }
        
        $stmt = $conn->prepare("SELECT countries_name_ar as name_ar, countries_name_en as name_en FROM countries WHERE countries_id = ?");
        $stmt->bind_param("i", $country_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            return $result->fetch_assoc();
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log('Error getting country data: ' . $e->getMessage());
        return false;
    }
}

/**
 * Get governorate data from database by ID
 */
function getGovernorateDataById($governorate_id) {
    global $conn;
    
    try {
        if (empty($governorate_id)) {
            return false;
        }
        
        $stmt = $conn->prepare("SELECT governorates_name_ar as name_ar, governorates_name_en as name_en FROM governorates WHERE governorates_id = ?");
        $stmt->bind_param("i", $governorate_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            return $result->fetch_assoc();
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log('Error getting governorate data: ' . $e->getMessage());
        return false;
    }
}

/**
 * Get Odoo Country ID by ISO code or name
 */
function getOrCreateOdooCountry($country_code_or_name) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        if (empty($country_code_or_name)) {
            return false;
        }
        
        // Try by ISO code first
        $domain_code = [['code', '=', strtoupper($country_code_or_name)]];
        $existing_countries = callOdooAPI('res.country', 'search', [$domain_code], ['limit' => 1]);
        
        if (!empty($existing_countries) && is_array($existing_countries) && count($existing_countries) > 0) {
            return $existing_countries[0];
        }
        
        // Try by name
        $domain_name = [['name', 'ilike', $country_code_or_name]];
        $existing_countries = callOdooAPI('res.country', 'search', [$domain_name], ['limit' => 1]);
        
        if (!empty($existing_countries) && is_array($existing_countries) && count($existing_countries) > 0) {
            return $existing_countries[0];
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log('Error getting Odoo country: ' . $e->getMessage());
        return false;
    }
}

/**
 * Get or create Odoo State/Province by name and country ID
 * 
 * @param string $state_name State/Province name
 * @param int $country_id Odoo country ID
 * @return int|false Odoo state ID or false on failure
 */
function getOrCreateOdooState($state_name, $country_id) {
    if (!isOdooIntegrationEnabled()) {
        return false;
    }
    
    try {
        if (empty($state_name) || empty($country_id)) {
            return false;
        }
        
        // Try to find existing state by name and country
        $domain = [
            ['name', 'ilike', $state_name],
            ['country_id', '=', (int)$country_id]
        ];
        $existing_states = callOdooAPI('res.country.state', 'search', [$domain], ['limit' => 1]);
        
        if (!empty($existing_states) && is_array($existing_states) && count($existing_states) > 0) {
            return $existing_states[0];
        }
        
        // Try to create new state
        $state_code = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $state_name), 0, 5));
        if (empty($state_code)) {
            $state_code = 'ST' . rand(100, 999);
        }
        
        $state_data = [
            'name' => $state_name,
            'code' => $state_code,
            'country_id' => (int)$country_id
        ];
        
        $new_state_id = callOdooAPI('res.country.state', 'create', [$state_data]);
        
        if ($new_state_id) {
            error_log("Created Odoo state '$state_name' with ID $new_state_id");
            return $new_state_id;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log('Error getting/creating Odoo state: ' . $e->getMessage());
        return false;
    }
}
