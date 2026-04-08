<?php
require_once __DIR__ . '/../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

echo "Starting migration...\n";

// 1. Add new columns if they don't exist
$columns_sql = "
    ALTER TABLE clients 
    ADD COLUMN IF NOT EXISTS clients_country_id INT NULL,
    ADD COLUMN IF NOT EXISTS clients_governorate_id INT NULL;
";

try {
    $conn->query($columns_sql);
    echo "Added columns clients_country_id and clients_governorate_id.\n";
} catch (Exception $e) {
    echo "Error adding columns: " . $e->getMessage() . "\n";
}

// 2. Migrate data for Country
echo "Migrating Country data...\n";
$update_country_sql = "
    UPDATE clients c
    JOIN countries co ON (
        c.clients_country = co.countries_name_ar 
        OR c.clients_country = co.countries_name_en 
        OR (c.clients_country REGEXP '^[0-9]+$' AND c.clients_country = CAST(co.countries_id AS CHAR))
    )
    SET c.clients_country_id = co.countries_id
    WHERE c.clients_country_id IS NULL AND c.clients_country IS NOT NULL AND c.clients_country != '';
";

try {
    $conn->query($update_country_sql);
    echo "Updated clients_country_id based on name matches.\n";
} catch (Exception $e) {
    echo "Error updating country IDs: " . $e->getMessage() . "\n";
}

// 3. Migrate data for Governorate (State)
echo "Migrating Governorate data...\n";
$update_gov_sql = "
    UPDATE clients c
    JOIN governorates g ON (
        c.clients_state COLLATE utf8mb4_general_ci = g.governorates_name_ar 
        OR c.clients_state COLLATE utf8mb4_general_ci = g.governorates_name_en
    )
    SET c.clients_governorate_id = g.governorates_id
    WHERE c.clients_governorate_id IS NULL AND c.clients_state IS NOT NULL AND c.clients_state != '';
";

try {
    $conn->query($update_gov_sql);
    echo "Updated clients_governorate_id based on name matches.\n";
} catch (Exception $e) {
    echo "Error updating governorate IDs: " . $e->getMessage() . "\n";
}

// 4. Add Foreign Keys
echo "Adding Foreign Key Constraints...\n";

try {
    // Ensure no invalid IDs exist before adding constraints (set to NULL if not found in parent table)
    $conn->query("UPDATE clients SET clients_country_id = NULL WHERE clients_country_id NOT IN (SELECT countries_id FROM countries)");
    $conn->query("UPDATE clients SET clients_governorate_id = NULL WHERE clients_governorate_id NOT IN (SELECT governorates_id FROM governorates)");

    // Add Foreign Key for Country
    $conn->query("
        ALTER TABLE clients 
        ADD CONSTRAINT fk_clients_country 
        FOREIGN KEY (clients_country_id) REFERENCES countries(countries_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
    ");
    echo "Added Foreign Key: fk_clients_country\n";

    // Add Foreign Key for Governorate
    $conn->query("
        ALTER TABLE clients 
        ADD CONSTRAINT fk_clients_governorate 
        FOREIGN KEY (clients_governorate_id) REFERENCES governorates(governorates_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
    ");
    echo "Added Foreign Key: fk_clients_governorate\n";

} catch (Exception $e) {
    // Check if error is "Duplicate key name" which means it already exists
    if (strpos($e->getMessage(), 'Duplicate') !== false) {
        echo "Foreign keys already exist.\n";
    } else {
        echo "Error adding foreign keys: " . $e->getMessage() . "\n";
    }
}

echo "Migration completed.\n";
?>
