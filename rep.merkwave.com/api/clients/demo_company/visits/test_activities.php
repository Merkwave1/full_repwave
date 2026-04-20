<?php
// Simple test file to verify API response
echo "Test started at: " . date('Y-m-d H:i:s') . "\n";
echo "GET parameters: " . print_r($_GET, true) . "\n";

require_once '../db_connect.php';

header('Content-Type: application/json');

$visit_id = $_GET['visit_id'] ?? null;
$users_uuid = $_GET['users_uuid'] ?? null;

echo "Visit ID: $visit_id\n";
echo "User UUID: $users_uuid\n";

print_success("Test successful", [
    'visit_id' => $visit_id,
    'users_uuid' => $users_uuid,
    'timestamp' => date('Y-m-d H:i:s')
]);
?>
