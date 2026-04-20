<?php
/**
 * Import Packaging Types from Odoo UOMs
 * 
 * Imports uom.uom from Odoo to packaging_types table in Rep
 * 
 * Mapping:
 * - packaging_types_id: Odoo UOM ID (to keep same ID)
 * - packaging_types_name: UOM name (Units, kg, L, m, etc.)
 * - packaging_types_compatible_base_unit_id: category_id (FK to base_units)
 * - packaging_types_default_conversion_factor: factor from Odoo
 * - packaging_types_description: null
 * 
 * Note: Must run import_base_units first to ensure base_units exist
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

// Main execution
try {
    // Load Odoo settings from database
    // Odoo settings loaded from functions.php via db_connect.php
    $odoo_settings = getOdooSettings();
    $odoo_url = $odoo_settings['url'];
    $odoo_db = $odoo_settings['database'];
    
    // Authenticate with Odoo using database settings
    importOdooAuth($odoo_url, $odoo_db, $odoo_settings['username'], $odoo_settings['password'], $cookie_file);
    
    // Get all UOMs from Odoo
    $uoms = importOdooCall($odoo_url, 'uom.uom', 'search_read', $cookie_file, [[]], [
        'fields' => ['id', 'name', 'category_id', 'factor', 'uom_type', 'rounding']
    ]);
    
    if (empty($uoms)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'لم يتم العثور على وحدات قياس في Odoo',
            'data' => [
                'imported' => 0,
                'updated' => 0
            ]
        ]);
        exit;
    }
    
    $imported = 0;
    $updated = 0;
    $skipped = 0;
    $errors = [];
    
    foreach ($uoms as $uom) {
        $packaging_types_id = $uom['id'];
        $packaging_types_name = $uom['name'];
        
        // category_id is an array [id, name] in Odoo - this becomes the base unit FK
        $packaging_types_compatible_base_unit_id = getOdooValue($uom['category_id'], 0);
        
        // Odoo's factor: how many of this unit equals 1 reference unit in same category
        // - For "bigger" units (Dozens): factor < 1 (0.0833 = 1/12)
        // - For "smaller" units (g): factor > 1 (1000 g = 1 kg)
        // - For "reference" units: factor = 1
        $packaging_types_default_conversion_factor = $uom['factor'] ?? 1;
        
        // Check if base_unit exists
        $stmt = $conn->prepare("SELECT base_units_id FROM base_units WHERE base_units_id = ?");
        $stmt->bind_param("i", $packaging_types_compatible_base_unit_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $base_exists = $result->fetch_assoc();
        $stmt->close();
        
        if (!$base_exists) {
            $errors[] = "Base unit ID $packaging_types_compatible_base_unit_id not found for UOM '$packaging_types_name' (ID: $packaging_types_id). Run import_base_units first.";
            $skipped++;
            continue;
        }
        
        // Check if packaging type exists by ID
        $stmt = $conn->prepare("SELECT packaging_types_id FROM packaging_types WHERE packaging_types_id = ?");
        $stmt->bind_param("i", $packaging_types_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists_by_id = $result->fetch_assoc();
        $stmt->close();
        
        // Also check if exists by name (different ID but same name)
        $stmt = $conn->prepare("SELECT packaging_types_id FROM packaging_types WHERE packaging_types_name = ? AND packaging_types_id != ?");
        $stmt->bind_param("si", $packaging_types_name, $packaging_types_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists_by_name = $result->fetch_assoc();
        $stmt->close();
        
        if ($exists_by_name) {
            // Name exists with different ID - update that record
            $old_id = $exists_by_name['packaging_types_id'];
            $stmt = $conn->prepare("UPDATE packaging_types SET 
                packaging_types_id = ?,
                packaging_types_compatible_base_unit_id = ?, 
                packaging_types_default_conversion_factor = ? 
                WHERE packaging_types_id = ?");
            $stmt->bind_param("iidi", 
                $packaging_types_id,
                $packaging_types_compatible_base_unit_id, 
                $packaging_types_default_conversion_factor,
                $old_id
            );
            if ($stmt->execute()) {
                $updated++;
            } else {
                $errors[] = "Failed to update packaging type '$packaging_types_name' (ID $old_id -> $packaging_types_id): " . $stmt->error;
            }
            $stmt->close();
        } elseif ($exists_by_id) {
            // Update existing
            $stmt = $conn->prepare("UPDATE packaging_types SET 
                packaging_types_name = ?, 
                packaging_types_compatible_base_unit_id = ?, 
                packaging_types_default_conversion_factor = ? 
                WHERE packaging_types_id = ?");
            $stmt->bind_param("sidi", 
                $packaging_types_name, 
                $packaging_types_compatible_base_unit_id, 
                $packaging_types_default_conversion_factor,
                $packaging_types_id
            );
            if ($stmt->execute()) {
                $updated++;
            } else {
                $errors[] = "Failed to update packaging type ID $packaging_types_id: " . $stmt->error;
            }
            $stmt->close();
        } else {
            // Insert new with specific ID
            $stmt = $conn->prepare("INSERT INTO packaging_types (
                packaging_types_id, 
                packaging_types_name, 
                packaging_types_compatible_base_unit_id, 
                packaging_types_default_conversion_factor
            ) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("isid", 
                $packaging_types_id, 
                $packaging_types_name, 
                $packaging_types_compatible_base_unit_id, 
                $packaging_types_default_conversion_factor
            );
            if ($stmt->execute()) {
                $imported++;
            } else {
                $errors[] = "Failed to insert packaging type ID $packaging_types_id: " . $stmt->error;
            }
            $stmt->close();
        }
    }
    
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    $conn->close();
    
    echo json_encode([
        'status' => 'success',
        'message' => "تم استيراد وحدات التعبئة: $imported جديد، $updated محدث، $skipped تم تخطيه",
        'data' => [
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'total_from_odoo' => count($uoms),
            'errors' => $errors
        ]
    ]);
    
} catch (Exception $e) {
    // Clean up cookie file on error
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
