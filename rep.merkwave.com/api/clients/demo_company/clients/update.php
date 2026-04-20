<?php
// Enables strict error reporting
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Include your database connection and helper functions
require_once '../db_connect.php'; 

// Include Odoo contact sync (optional - won't fail if not available)
if (file_exists(__DIR__ . '/../odoo/sync_contacts.php')) {
    require_once __DIR__ . '/../odoo/sync_contacts.php';
} 

function normalize_client_status($status) {
    $allowed = ['active', 'inactive', 'prospect', 'archived'];
    $aliases = [
        'active' => 'active',
        'inactive' => 'inactive',
        'prospect' => 'prospect',
        'archived' => 'archived',
        'prospective' => 'prospect',
        'pending' => 'prospect',
        'archieve' => 'archived',
        'نشط' => 'active',
        'فعال' => 'active',
        'غير نشط' => 'inactive',
        'غيرنشط' => 'inactive',
        'محتمل' => 'prospect',
        'قيد المتابعة' => 'prospect',
        'مؤرشف' => 'archived',
        'أرشيف' => 'archived',
        'ارشيف' => 'archived',
    ];

    if ($status === null) {
        return 'active';
    }

    $trimmed = trim((string) $status);
    if ($trimmed === '' || strtolower($trimmed) === 'null') {
        return 'active';
    }

    $lower = function_exists('mb_strtolower') ? mb_strtolower($trimmed, 'UTF-8') : strtolower($trimmed);

    if (in_array($lower, $allowed, true)) {
        return $lower;
    }

    if (isset($aliases[$trimmed])) {
        return $aliases[$trimmed];
    }

    if (isset($aliases[$lower])) {
        return $aliases[$lower];
    }

    $normalizedKey = preg_replace('/[\s_\-]+/u', '', $lower);
    foreach ($aliases as $key => $value) {
        $keyLower = function_exists('mb_strtolower') ? mb_strtolower($key, 'UTF-8') : strtolower($key);
        $cleanKey = preg_replace('/[\s_\-]+/u', '', $keyLower);
        if ($cleanKey === $normalizedKey) {
            return $value;
        }
    }

    return 'active';
}

try {
    // Check for authorization
    

    // --- Collect and Sanitize POST Data ---
    // The client ID is now required for an update
    $clients_id                  = $_POST['clients_id']                  ?? null;
    $clients_company_name        = $_POST['clients_company_name']        ?? null;
    $clients_rep_user_id         = $_POST['clients_rep_user_id']         ?? get_user_id_from_uuid_local();
    $clients_email               = $_POST['clients_email']               ?? null;
    $clients_website             = $_POST['clients_website']             ?? null;
    $clients_vat_number          = $_POST['clients_vat_number']          ?? null;
    $clients_description         = $_POST['clients_description']         ?? null;
    $clients_address             = $_POST['clients_address']             ?? null;
    $clients_street2             = $_POST['clients_street2']             ?? null;
    $clients_building_number     = $_POST['clients_building_number']     ?? null;
    $clients_city                = $_POST['clients_city']                ?? null;
    // Allow fallback to 'clients_state' or 'clients_governorate' if 'clients_governorate_id' is missing
    $clients_governorate_id      = $_POST['clients_governorate_id']      ?? $_POST['clients_governorate'] ?? $_POST['clients_state'] ?? null;
    $clients_zip                 = $_POST['clients_zip']                 ?? null;
    // Allow fallback to 'clients_country' if 'clients_country_id' is missing
    $clients_country_id          = $_POST['clients_country_id']          ?? $_POST['clients_country'] ?? null;
    $clients_latitude            = $_POST['clients_latitude']            ?? null;
    $clients_longitude           = $_POST['clients_longitude']           ?? null;
    $clients_area_tag_id         = $_POST['clients_area_tag_id']         ?? null;
    $clients_contact_name        = $_POST['clients_contact_name']        ?? null;
    $clients_contact_job_title   = $_POST['clients_contact_job_title']   ?? null;
    $clients_contact_phone_1     = $_POST['clients_contact_phone_1']     ?? null;
    $clients_contact_phone_2     = $_POST['clients_contact_phone_2']     ?? null;
    $clients_payment_terms       = $_POST['clients_payment_terms']       ?? null;
    $clients_credit_limit        = $_POST['clients_credit_limit']        ?? 0.00;
    $clients_industry_id         = $_POST['clients_industry_id']         ?? null;
    $clients_source              = $_POST['clients_source']              ?? null;
    $raw_clients_status          = $_POST['clients_status']              ?? null;
    $clients_status              = normalize_client_status($raw_clients_status); 
    error_log('Client update status normalized: raw=' . var_export($raw_clients_status, true) . ' => stored=' . $clients_status);

    if (!in_array($clients_status, ['active', 'inactive', 'prospect', 'archived'], true)) {
        error_log('Invalid client status received during update: ' . var_export($raw_clients_status, true));
        $clients_status = 'active';
    }
    $clients_client_type_id      = $_POST['clients_client_type_id']      ?? null; // FK
    $clients_reference_note      = $_POST['clients_reference_note']      ?? null;

    // Handle empty strings for nullable fields (set to NULL if empty)
    foreach (['clients_email', 'clients_website', 'clients_vat_number', 'clients_description', 
              'clients_address', 'clients_street2', 'clients_building_number', 'clients_city', 
              'clients_zip', 'clients_contact_name',
              'clients_contact_job_title', 'clients_contact_phone_1', 'clients_contact_phone_2',
              'clients_payment_terms', 'clients_source', 'clients_reference_note'] as $field) {
        if (isset($_POST[$field]) && $_POST[$field] === "") {
            $$field = null; 
        }
    }

    // Robust sanitization for integer fields (IDs)
    // Handles empty string, "null", "undefined", and ensures numeric value
    $int_fields = [
        'clients_governorate_id', 
        'clients_country_id', 
        'clients_industry_id', 
        'clients_area_tag_id'
    ];
    
    foreach ($int_fields as $field) {
        // Use the variable value (which might have been set via fallback), not just $_POST
        $val = $$field; 
        if ($val === '' || $val === 'null' || $val === 'undefined' || $val === null) {
            $$field = null;
        } elseif (is_numeric($val)) {
            $$field = (int)$val;
        } else {
            $$field = null;
        }
    }

    // Specific handling for numeric nullable fields if they come as empty string
    if (isset($_POST['clients_latitude']) && $_POST['clients_latitude'] === "") {$clients_latitude = null;}
    if (isset($_POST['clients_longitude']) && $_POST['clients_longitude'] === "") {$clients_longitude = null;}
    if (isset($_POST['clients_credit_limit']) && $_POST['clients_credit_limit'] === "") {$clients_credit_limit = 0.00;}


    // --- Validation for Required Fields ---
    if (empty($clients_id) || !is_numeric($clients_id) || $clients_id <= 0) {
        print_failure("Error: A valid Client ID is required for an update.");
        exit;
    }
    if (empty($clients_company_name)) { print_failure("Error: Company name is required."); exit; }
    if (empty($clients_email)) { print_failure("Error: Client email is required."); exit; }

    // Validate new client_type_id (FK)
    if (empty($clients_client_type_id) || !is_numeric($clients_client_type_id) || $clients_client_type_id <= 0) { 
        print_failure('Error: Invalid client_type_id.'); 
        exit; 
    }
    $stmt_chk = $conn->prepare("SELECT client_type_id FROM client_types WHERE client_type_id = ?");
    $stmt_chk->bind_param("i", $clients_client_type_id);
    $stmt_chk->execute();
    $res_chk = $stmt_chk->get_result();
    $row_chk = $res_chk->fetch_assoc();
    $stmt_chk->close();
    if (!$row_chk) { print_failure('Error: client_type_id does not exist.'); exit; }


    // --- Image Upload Handling ---
    $clients_image_db_path = null;
    $update_image_sql = "";
    if (isset($_FILES['clients_image'])) {
        // A new image is being uploaded, handle it
        $clients_image_db_path = handle_image_upload($_FILES['clients_image'], 'clients/');
        $clients_image = $clients_image_db_path ? "https://your-domain.example/{$clients_image_db_path}" : null;
        // Add the image field to the SQL update statement
    $update_image_sql = "clients_image = ?,";
    }

    // Debug logging for update parameters
    error_log("Updating client ID: $clients_id with Country ID: " . var_export($clients_country_id, true) . ", Governorate ID: " . var_export($clients_governorate_id, true));

    $conn->begin_transaction();

    try {
        // Construct the dynamic UPDATE statement
    $sql = "
            UPDATE clients SET 
                clients_company_name = ?, 
                clients_rep_user_id = ?, 
                clients_email = ?, 
                clients_website = ?, 
                clients_vat_number = ?, 
                clients_description = ?, 
                {$update_image_sql}
                clients_address = ?, 
                clients_street2 = ?,
                clients_building_number = ?,
                clients_city = ?, 
                clients_governorate_id = ?,
                clients_zip = ?,
                clients_country_id = ?,
                clients_latitude = ?, 
                clients_longitude = ?, 
                clients_area_tag_id = ?, 
                clients_contact_name = ?, 
                clients_contact_job_title = ?, 
                clients_contact_phone_1 = ?, 
                clients_contact_phone_2 = ?, 
                clients_payment_terms = ?, 
                clients_credit_limit = ?, 
                clients_industry_id = ?, 
                clients_source = ?, 
                clients_status = ?, 
                clients_client_type_id = ?, 
                clients_reference_note = ?,
                clients_updated_at = NOW()
            WHERE clients_id = ?
        ";
        
        $stmt = $conn->prepare($sql);

        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }

        // Types string to match number of parameters (without image)
        // Corrected types string:
        // s (company), i (rep), s (email), s (website), s (vat), s (desc)
        // s (address), s (street2), s (building), s (city), i (governorate_id), s (zip), i (country_id)
        // d (lat), d (long), i (area_tag_id), s (contact), s (job), s (phone1), s (phone2)
        // s (terms), d (credit), i (industry), s (source), s (status), i (type), s (note), i (id)
        $types = "sissssssssisiddisssssdissisi";
        $params = [
            $clients_company_name, $clients_rep_user_id, $clients_email, $clients_website, $clients_vat_number, 
            $clients_description, $clients_address, $clients_street2, $clients_building_number,
            $clients_city, $clients_governorate_id, $clients_zip, $clients_country_id,
            $clients_latitude, $clients_longitude, $clients_area_tag_id, $clients_contact_name, 
            $clients_contact_job_title, $clients_contact_phone_1, $clients_contact_phone_2, 
            $clients_payment_terms, $clients_credit_limit,
            $clients_industry_id, $clients_source, $clients_status, 
            $clients_client_type_id, 
            $clients_reference_note,
            $clients_id // This is for the WHERE clause
        ];

        if (isset($_FILES['clients_image'])) {
            // If an image is being updated, correct the types string and add the image to params.
            // Insert the image type 's' after the first 6 params (right after clients_description)
            $types = substr_replace($types, 's', 6, 0);
            array_splice($params, 6, 0, [$clients_image]); // Insert image into the params array at the correct position
        }

        $stmt->bind_param($types, ...$params);

        if (!$stmt->execute()) {
            throw new Exception("Error updating client: " . $stmt->error);
        }

    $conn->commit();
        
        // --- Sync to Odoo (after successful commit) ---
        $odoo_sync_result = null;
        if (function_exists('updateClientInOdoo') && function_exists('isOdooIntegrationEnabled') && isOdooIntegrationEnabled()) {
            try {
                // Build client data array from POST data for sync
                $client_data_for_sync = [
                    'clients_id' => $clients_id,
                    'clients_company_name' => $clients_company_name,
                    'clients_rep_user_id' => $clients_rep_user_id,
                    'clients_email' => $clients_email,
                    'clients_website' => $clients_website,
                    'clients_vat_number' => $clients_vat_number,
                    'clients_description' => $clients_description,
                    'clients_address' => $clients_address,
                    'clients_street2' => $clients_street2,
                    'clients_building_number' => $clients_building_number,
                    'clients_city' => $clients_city,
                    'clients_governorate_id' => $clients_governorate_id,
                    'clients_zip' => $clients_zip,
                    'clients_country_id' => $clients_country_id,
                    'clients_latitude' => $clients_latitude,
                    'clients_longitude' => $clients_longitude,
                    'clients_area_tag_id' => $clients_area_tag_id,
                    'clients_contact_name' => $clients_contact_name,
                    'clients_contact_job_title' => $clients_contact_job_title,
                    'clients_contact_phone_1' => $clients_contact_phone_1,
                    'clients_contact_phone_2' => $clients_contact_phone_2,
                    'clients_industry_id' => $clients_industry_id,
                    'clients_source' => $clients_source,
                    'clients_client_type_id' => $clients_client_type_id,
                ];
                
                // Get Odoo partner ID from database
                $stmt_odoo = $conn->prepare("SELECT clients_odoo_partner_id FROM clients WHERE clients_id = ?");
                $stmt_odoo->bind_param("i", $clients_id);
                $stmt_odoo->execute();
                $odoo_row = $stmt_odoo->get_result()->fetch_assoc();
                $stmt_odoo->close();
                
                if ($odoo_row) {
                    $client_data_for_sync['clients_odoo_partner_id'] = $odoo_row['clients_odoo_partner_id'];
                }
                
                $odoo_sync_result = updateClientInOdoo($clients_id, $client_data_for_sync);
                error_log("Client $clients_id Odoo sync result: " . json_encode($odoo_sync_result));
            } catch (Exception $sync_e) {
                error_log("Odoo sync error for client $clients_id: " . $sync_e->getMessage());
                $odoo_sync_result = ['status' => 'failed', 'message' => $sync_e->getMessage()];
            }
        }
        
        // Fetch the names for the response to ensure UI updates correctly
        $country_name = null;
        $governorate_name = null;
        
        if ($clients_country_id) {
            $stmt_c = $conn->prepare("SELECT COALESCE(countries_name_ar, countries_name_en) as name FROM countries WHERE countries_id = ?");
            $stmt_c->bind_param("i", $clients_country_id);
            $stmt_c->execute();
            $res_c = $stmt_c->get_result();
            if ($row_c = $res_c->fetch_assoc()) {
                $country_name = $row_c['name'];
            }
            $stmt_c->close();
        }

        if ($clients_governorate_id) {
            $stmt_g = $conn->prepare("SELECT COALESCE(governorates_name_ar, governorates_name_en) as name FROM governorates WHERE governorates_id = ?");
            $stmt_g->bind_param("i", $clients_governorate_id);
            $stmt_g->execute();
            $res_g = $stmt_g->get_result();
            if ($row_g = $res_g->fetch_assoc()) {
                $governorate_name = $row_g['name'];
            }
            $stmt_g->close();
        }

        // Cast the client ID to an integer before sending the response.
        // This ensures the JSON output is `{"clients_id": 68}` instead of `{"clients_id": "68"}`.
        print_success("Client updated successfully.", [
            'clients_id' => (int)$clients_id, 
            'clients_company_name' => $clients_company_name,
            'clients_country_id' => $clients_country_id,
            'clients_governorate_id' => $clients_governorate_id,
            'clients_country' => $country_name, // Return name for backward compatibility
            'clients_state' => $governorate_name, // Return name for backward compatibility
            'odoo_sync' => $odoo_sync_result
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt) && $stmt !== false) { $stmt->close(); }
    if (isset($conn) && $conn !== false) { $conn->close(); }
}
