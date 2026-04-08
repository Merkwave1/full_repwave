<?php
require_once __DIR__ . '/../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

echo "Starting cleanup migration...\n";

// Drop old columns
$drop_sql = "
    ALTER TABLE clients 
    DROP COLUMN IF EXISTS clients_country,
    DROP COLUMN IF EXISTS clients_state;
";

try {
    $conn->query($drop_sql);
    echo "Dropped columns clients_country and clients_state.\n";
} catch (Exception $e) {
    echo "Error dropping columns: " . $e->getMessage() . "\n";
}

echo "Cleanup migration completed.\n";
?>
