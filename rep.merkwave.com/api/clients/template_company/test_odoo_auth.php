<?php
// Test Odoo Authentication
require_once 'functions.php';

echo "Testing Odoo Authentication...\n\n";
echo "Configuration:\n";
echo "URL: " . ODOO_URL . "\n";
echo "Database: " . ODOO_DB . "\n";
echo "Username: " . ODOO_USERNAME . "\n";
echo "Password: " . str_repeat('*', strlen(ODOO_PASSWORD)) . "\n\n";

echo "Attempting authentication...\n";
$session_id = odooAuthenticate();

if ($session_id) {
    echo "✅ SUCCESS! Session ID: " . substr($session_id, 0, 20) . "...\n\n";
    
    // Try a simple API call
    echo "Testing API call (search for partners)...\n";
    $result = callOdooAPI('res.partner', 'search', [[['is_company', '=', true]]], ['limit' => 5]);
    
    if ($result !== false) {
        echo "✅ API Call SUCCESS! Found partner IDs: " . json_encode($result) . "\n";
    } else {
        echo "❌ API Call FAILED\n";
    }
} else {
    echo "❌ FAILED! Could not authenticate\n";
    echo "Check the error logs for details\n";
}
