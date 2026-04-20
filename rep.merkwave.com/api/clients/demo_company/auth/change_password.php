<?php
/**
 * change_password.php — BLOCKED for demo tenant
 * 
 * Demo trial accounts use system-controlled fixed passwords.
 * Password changes are not permitted to prevent users from locking
 * themselves out of shared demo accounts or interfering with the
 * nightly reset cycle.
 */
require_once '../db_connect.php';

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

print_failure("Password changes are not allowed on demo accounts. Your demo password is fixed for the duration of your trial.", [
    'demo_restriction' => true,
    'reason' => 'Demo accounts use system-controlled credentials.'
]);
?>
