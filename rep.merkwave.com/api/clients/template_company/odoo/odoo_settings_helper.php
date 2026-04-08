<?php
/**
 * Odoo Settings Helper
 * 
 * Fetches Odoo connection settings from the database settings table
 * This allows dynamic configuration without hardcoding credentials
 */

/**
 * Get Odoo connection settings from database
 * 
 * @param mysqli $conn Database connection
 * @return array Odoo settings (url, database, username, password)
 * @throws Exception If settings are not found or integration is disabled
 */
function getOdooSettings($conn) {
    $settings = [];
    $required_keys = ['odoo_url', 'odoo_database', 'odoo_username', 'odoo_password'];
    
    // Fetch all odoo settings in one query
    $placeholders = implode(',', array_fill(0, count($required_keys) + 1, '?'));
    $keys = array_merge($required_keys, ['odoo_integration_enabled']);
    
    $stmt = $conn->prepare("SELECT settings_key, settings_value FROM settings WHERE settings_key IN ('" . implode("','", $keys) . "')");
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($row = $result->fetch_assoc()) {
        $settings[$row['settings_key']] = $row['settings_value'];
    }
    $stmt->close();
    
    // Check if integration is enabled
    if (isset($settings['odoo_integration_enabled']) && $settings['odoo_integration_enabled'] !== 'true') {
        throw new Exception('تكامل Odoo غير مفعّل. يرجى تفعيله من الإعدادات.');
    }
    
    // Validate required settings
    foreach ($required_keys as $key) {
        if (empty($settings[$key])) {
            throw new Exception("إعداد Odoo مفقود: $key. يرجى تكوين إعدادات Odoo من صفحة الإعدادات.");
        }
    }
    
    return [
        'url' => rtrim($settings['odoo_url'], '/'),
        'database' => $settings['odoo_database'],
        'username' => $settings['odoo_username'],
        'password' => $settings['odoo_password']
    ];
}

/**
 * Authenticate with Odoo using settings from database
 * 
 * @param mysqli $conn Database connection
 * @param string $cookie_file Path to cookie file
 * @return array Authentication result
 */
function authenticateOdooFromSettings($conn, $cookie_file) {
    $settings = getOdooSettings($conn);
    return importOdooAuth(
        $settings['url'], 
        $settings['database'], 
        $settings['username'], 
        $settings['password'], 
        $cookie_file
    );
}
