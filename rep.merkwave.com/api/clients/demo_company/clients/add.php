<?php
// Include your database connection and helper functions
require_once '../db_connect.php'; 
require_once '../odoo/sync_contacts.php'; 


try {
    // Validate user session (UUID validation)
    validate_user_session();
    

    // Build data array for insertData function
    // Use helper to generate unique timestamp-based ID (ddmmyyHHMMSSmmm)
    $data = [
        'clients_company_name' => getRequired('clients_company_name', 'Company name'),
        'clients_rep_user_id' => $_POST['clients_rep_user_id'] ?? $GLOBALS['current_user_id'],
        'clients_email' => getNullable('clients_email'),
        'clients_website' => getNullable('clients_website'),
        'clients_vat_number' => getNullable('clients_vat_number'),
        'clients_description' => getNullable('clients_description'),
        'clients_address' => getNullable('clients_address'),
        'clients_street2' => getNullable('clients_street2'),
        'clients_building_number' => getNullable('clients_building_number'),
        'clients_city' => getNullable('clients_city'),
        'clients_governorate_id' => getNullable('clients_governorate_id') ?? getNullable('clients_governorate') ?? getNullable('clients_state'), // Map state input to governorate_id
        'clients_zip' => getNullable('clients_zip'),
        'clients_country_id' => getNullable('clients_country_id') ?? getNullable('clients_country'), // Map country input to country_id
        'clients_latitude' => getNullable('clients_latitude'),
        'clients_longitude' => getNullable('clients_longitude'),
        'clients_area_tag_id' => getNullable('clients_area_tag_id'),
        'clients_contact_name' => getNullable('clients_contact_name'),
        'clients_contact_job_title' => getNullable('clients_contact_job_title'),
        'clients_contact_phone_1' => getNullable('clients_contact_phone_1'),
        'clients_contact_phone_2' => getNullable('clients_contact_phone_2'),
        'clients_payment_terms' => getNullable('clients_payment_terms'),
        'clients_credit_limit' => getNullable('clients_credit_limit') ,
        'clients_industry_id' => getNullable('clients_industry_id'),
        'clients_source' => getNullable('clients_source'),
        'clients_status' => $_POST['clients_status'] ?? 'active',
        'clients_client_type_id' => getNullable('clients_client_type_id'),
        'clients_reference_note' => getNullable('clients_reference_note'),
    ];

    // Insert data using helper function
    $result = insertData('clients', $data, false); // Don't output JSON yet
    
    if ($result > 0) {
        global $pdo;
        $clients_id = $pdo->lastInsertId();
        
        // Sync to Odoo only if integration is enabled
        $odoo_partner_id = false;
        if (isOdooIntegrationEnabled()) {
            // Pass the PHP client ID to sync function (also updates clients_odoo_partner_id)
            $odoo_partner_id = syncContactToOdoo($data, $clients_id);
        }
        
        // Return success with both IDs
        print_success("Client created successfully.", [
            'clients_id' => $clients_id,
            'clients_company_name' => $data['clients_company_name'],
            'odoo_partner_id' => $odoo_partner_id,
            'odoo_synced' => $odoo_partner_id !== false
        ]);
    } else {
        print_failure("Failed to create client");
    }

} catch (Exception | TypeError $e) {
    catchError($e, 'Client add error');
}

