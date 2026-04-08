<?php
// Helper functions shared across endpoints. db_connect.php includes this file.
// Do not require db_connect.php here to avoid circular includes.
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');


$company_name='template_company';

// Helper function to get nullable POST values (convert empty strings to null)
function getNullable($key) {
    return (isset($_POST[$key]) && $_POST[$key] !== '') ? $_POST[$key] : null;
}

// Get required field value or fail with error message
function getRequired($key, $label = null) {
    if (empty($_POST[$key])) {
        $fieldName = $label ?? ucwords(str_replace('_', ' ', $key));
        print_failure("Error: $fieldName is required.");
        exit;
    }
    return $_POST[$key];
}

// Catch and log errors, then return failure response
function catchError($e, $context = '') {
    $contextPrefix = $context ? "$context: " : '';
    error_log($contextPrefix . $e->getMessage() . " at line " . $e->getLine());
    print_failure("Internal Error: " . $e->getMessage());
}

// ============================================
// ODOO API - General Functions
// ============================================

/**
 * Get Odoo settings from database with caching
 * @return array|false Array with keys: url, database, username, password, enabled
 */
function getOdooSettings() {
    static $cached_settings = null;
    
    if ($cached_settings !== null) {
        return $cached_settings;
    }
    
    try {
        global $conn;
        
        // Fetch all Odoo-related settings
        $stmt = $conn->prepare("
            SELECT settings_key, settings_value 
            FROM settings 
            WHERE settings_key LIKE 'odoo_%'
        ");
        
        if (!$stmt) {
            error_log('Failed to prepare statement for Odoo settings: ' . $conn->error);
            return false;
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $settings = [
            'url' => '',
            'database' => '',
            'username' => '',
            'password' => '',
            'enabled' => false
        ];
        
        while ($row = $result->fetch_assoc()) {
            switch ($row['settings_key']) {
                case 'odoo_url':
                    $settings['url'] = $row['settings_value'];
                    break;
                case 'odoo_database':
                    $settings['database'] = $row['settings_value'];
                    break;
                case 'odoo_username':
                    $settings['username'] = $row['settings_value'];
                    break;
                case 'odoo_password':
                    $settings['password'] = $row['settings_value'];
                    break;
                case 'odoo_integration_enabled':
                    $settings['enabled'] = ($row['settings_value'] === 'true' || $row['settings_value'] === '1');
                    break;
            }
        }
        
        $stmt->close();
        $cached_settings = $settings;
        return $settings;
        
    } catch (Exception $e) {
        error_log('Error fetching Odoo settings: ' . $e->getMessage());
        return false;
    }
}

// Authenticate with Odoo and return session ID
function odooAuthenticate() {
    static $cached_session = null;
    
    if ($cached_session !== null) {
        return $cached_session;
    }
    
    // Get Odoo settings from database
    $odoo_settings = getOdooSettings();
    if (!$odoo_settings) {
        error_log('Odoo authentication failed: Could not load settings');
        return false;
    }
    
    // Check if integration is enabled
    if (!$odoo_settings['enabled']) {
        error_log('Odoo authentication skipped: Integration is disabled');
        return false;
    }
    
    try {
        $auth_url = $odoo_settings['url'] . '/web/session/authenticate';
        $auth_data = [
            'jsonrpc' => '2.0',
            'method' => 'call',
            'params' => [
                'db' => $odoo_settings['database'],
                'login' => $odoo_settings['username'],
                'password' => $odoo_settings['password']
            ],
            'id' => rand()
        ];
        
        $ch = curl_init($auth_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($auth_data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Allow self-signed certs
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            error_log('Odoo authentication CURL error: ' . $curl_error);
            return false;
        }
        
        if ($http_code !== 200) {
            error_log('Odoo authentication HTTP error: ' . $http_code);
            error_log('Response: ' . substr($response, 0, 500));
            return false;
        }
        
        // Split headers and body
        $headers = substr($response, 0, $header_size);
        $body = substr($response, $header_size);
        
        // Try to extract session cookie from headers (case-insensitive)
        preg_match('/set-cookie: session_id=([^;]+)/i', $headers, $matches);
        $session_id = $matches[1] ?? null;
        
        // If no cookie, try to get session from JSON response
        if (!$session_id) {
            $json_response = json_decode($body, true);
            if (isset($json_response['result']['session_id'])) {
                $session_id = $json_response['result']['session_id'];
            } elseif (isset($json_response['result']['uid']) && $json_response['result']['uid']) {
                // Authentication successful but no explicit session_id
                // We need to extract all cookies and build our own session (case-insensitive)
                preg_match_all('/set-cookie: ([^=]+)=([^;]+)/i', $headers, $cookie_matches, PREG_SET_ORDER);
                $cookies = [];
                foreach ($cookie_matches as $cookie) {
                    $cookies[trim($cookie[1])] = trim($cookie[2]);
                }
                
                // Store all cookies as session (Odoo uses multiple cookies)
                if (!empty($cookies)) {
                    $cached_session = $cookies;
                    error_log('Odoo authentication successful: Cookies obtained - ' . json_encode(array_keys($cookies)));
                    return $cached_session;
                }
                
                // No cookies found, log headers for debugging
                error_log('No cookies found in headers. Full headers:');
                error_log($headers);
            }
        }
        
        if (!$session_id) {
            error_log('Odoo authentication failed: Could not get session ID');
            error_log('Headers: ' . substr($headers, 0, 500));
            error_log('Body: ' . substr($body, 0, 500));
            return false;
        }
        
        $cached_session = $session_id;
        error_log('Odoo authentication successful: Session ID obtained');
        return $session_id;
        
    } catch (Exception $e) {
        error_log('Odoo authentication error: ' . $e->getMessage());
        return false;
    }
}

// Call Odoo API with model, method, and arguments
function callOdooAPI($model, $method, $args = [], $kwargs = []) {
    $session_id = odooAuthenticate();
    
    if (!$session_id) {
        error_log('Odoo API call failed: Authentication failed');
        return false;
    }
    
    // Get Odoo settings for URL
    $odoo_settings = getOdooSettings();
    if (!$odoo_settings) {
        error_log('Odoo API call failed: Could not load settings');
        return false;
    }
    
    try {
        $api_url = $odoo_settings['url'] . '/web/dataset/call_kw/' . $model . '/' . $method;
        $api_data = [
            'jsonrpc' => '2.0',
            'method' => 'call',
            'params' => [
                'model' => $model,
                'method' => $method,
                'args' => $args,
                'kwargs' => $kwargs
            ],
            'id' => rand()
        ];
        
        // Build cookie header
        $cookie_header = '';
        if (is_array($session_id)) {
            // Multiple cookies
            $cookie_parts = [];
            foreach ($session_id as $key => $value) {
                $cookie_parts[] = $key . '=' . $value;
            }
            $cookie_header = implode('; ', $cookie_parts);
        } else {
            // Single session ID
            $cookie_header = 'session_id=' . $session_id;
        }
        
        $ch = curl_init($api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($api_data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Cookie: ' . $cookie_header
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $result = json_decode($response, true);
        
        if ($http_code === 200 && isset($result['result'])) {
            return $result['result'];
        } else {
            error_log('Odoo API call failed: ' . json_encode($result));
            return false;
        }
        
    } catch (Exception $e) {
        error_log('Odoo API call error: ' . $e->getMessage());
        return false;
    }
}

function insertData($table, $data, $json = true) {
    header("Content-Type: application/json; charset=UTF-8");

    global $pdo;
    foreach ($data as $field => $v)
        $ins[] = ':' . $field;
    $ins = implode(',', $ins);
    $fields = implode(',', array_keys($data));
    $sql = "INSERT INTO $table ($fields) VALUES ($ins)";

    $stmt = $pdo->prepare($sql);
    foreach ($data as $f => $v) {
        $stmt->bindValue(':' . $f, $v);
    }
    $stmt->execute();
    $count = $stmt->rowCount();
    if ($json == true) {
        if ($count > 0) {
            print_success("Data inserted successfully", ["inserted_id" => $pdo->lastInsertId()]);
        } else {
            print_failure("Data insertion failed");
        }
    }
    return $count;
}

function get_data($table, $conditions = [], $select = '*', $echojson = true) {
    global $conn;

    try {
        // Build WHERE clause
        $columns = array_keys($conditions);
        $placeholders = array_map(fn($col) => "`$col` = ?", $columns);
        $whereClause = $placeholders ? "WHERE " . implode(" AND ", $placeholders) : "";

        // Build SQL with selected columns
        $sql = "SELECT $select FROM `$table` $whereClause";

        // Prepare and bind
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);

        if (!empty($conditions)) {
            $types = str_repeat("s", count($conditions));
            $values = array_values($conditions);
            $stmt->bind_param($types, ...$values);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $rows = $result->fetch_all(MYSQLI_ASSOC);

        if ($echojson) {
            echo json_encode(["status" => "success", "message" => $rows]);
        }

        return $rows;

    } catch (\Throwable $e) {
        if ($echojson) {
            echo json_encode(["status" => "failure", "message" => $e->getMessage()]);
        }
        return null;
    }
}

// (versions helpers removed)

function deleteData($table, $where, $json = true)
{
    global $pdo;
    $stmt = $pdo->prepare("DELETE FROM $table WHERE $where");
    $stmt->execute();
    $count = $stmt->rowCount();
    if ($json == true) {
        if ($count > 0) {
            echo json_encode(array("status" => "success"));
        } else {
            echo json_encode(array("status" => "failure"));
        }
    }
    return $count;
}

function print_success($message, $data = null) {
    echo json_encode([
        "status" => "success",
        "message" => $message,
        "data" => $data
    ]);

    exit;
}

function print_failure($message, $data = null) {
    $response = [
        "status" => "failure",
        "message" => $message
    ];
    if ($data !== null) {
        $response["data"] = $data;
    }
    echo json_encode($response);
    exit;
}

/**
 * Update client balance by adding/subtracting amount
 * @param mysqli $conn Database connection
 * @param int $client_id Client ID
 * @param float $amount Amount to add (positive) or subtract (negative) from balance
 * @param string $description Optional description for logging
 * @return bool Success status
 */
function update_client_balance($conn, $client_id, $amount, $description = '') {
    try {
        // Update client balance
        $stmt = $conn->prepare("UPDATE clients SET clients_credit_balance = clients_credit_balance + ? WHERE clients_id = ?");
        $stmt->bind_param("di", $amount, $client_id);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $stmt->close();
            
            // Optional: Log the balance change if needed
            if (!empty($description)) {
                error_log("Client Balance Update: Client ID $client_id, Amount: $amount, Description: $description");
            }
            
            return true;
        }
        
        $stmt->close();
        return false;
        
    } catch (Exception $e) {
        error_log("Error updating client balance: " . $e->getMessage());
        return false;
    }
}


function handle_image_upload(array $file_input_array, string $sub_directory, array $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], int $max_size = 5242880) { // Default 5MB
    // $sub_directory=''; // REMOVED: This was overriding the parameter
    if ($file_input_array['error'] !== UPLOAD_ERR_OK) {
        // If no file was uploaded (UPLOAD_ERR_NO_FILE), return null as it might be optional
        if ($file_input_array['error'] === UPLOAD_ERR_NO_FILE) {
            return null;
        }
        // For other errors, throw an exception
        switch ($file_input_array['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                throw new Exception("Uploaded file exceeds maximum file size.");
            case UPLOAD_ERR_PARTIAL:
                throw new Exception("The uploaded file was only partially uploaded.");
            case UPLOAD_ERR_NO_TMP_DIR:
                throw new Exception("Missing a temporary folder for uploads.");
            case UPLOAD_ERR_CANT_WRITE:
                throw new Exception("Failed to write file to disk.");
            case UPLOAD_ERR_EXTENSION:
                throw new Exception("A PHP extension stopped the file upload.");
            default:
                throw new Exception("Unknown upload error with code: " . $file_input_array['error']);
        }
    }

    // Validate file size
    if ($file_input_array['size'] > $max_size) {
        throw new Exception("Uploaded file is too large (max " . ($max_size / 1024 / 1024) . "MB).");
    }

    // Validate file type using mime_content_type for security
    $file_mime_type = false;
    if (function_exists('mime_content_type')) {
        $file_mime_type = mime_content_type($file_input_array['tmp_name']);
    }
    
    // Fallback to finfo if mime_content_type fails
    if (!$file_mime_type && function_exists('finfo_file')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $file_mime_type = finfo_file($finfo, $file_input_array['tmp_name']);
        finfo_close($finfo);
    }
    
    // Last resort: check file extension
    if (!$file_mime_type) {
        $file_extension = strtolower(pathinfo($file_input_array['name'], PATHINFO_EXTENSION));
        $extension_to_mime = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp'
        ];
        $file_mime_type = $extension_to_mime[$file_extension] ?? 'unknown';
    }
    
    if (!in_array($file_mime_type, $allowed_types)) {
        throw new Exception("Invalid file type. Only " . implode(', ', array_map(function($type) { return str_replace('image/', '', $type); }, $allowed_types)) . " are allowed. Detected: " . $file_mime_type);
    }

    $uploadBaseDir = __DIR__ . '/uploads/images/'; 
    
    $targetDir = $uploadBaseDir . $sub_directory;

    // Debug logging
    error_log("Image upload debug - Base dir: " . $uploadBaseDir);
    error_log("Image upload debug - Target dir: " . $targetDir);
    error_log("Image upload debug - Sub directory: " . $sub_directory);

    // Ensure the directory exists with proper permissions
    if (!is_dir($targetDir)) {
        error_log("Creating directory: " . $targetDir);
        if (!mkdir($targetDir, 0777, true)) {
            throw new Exception("Failed to create upload directory: " . $targetDir . ". Check permissions.");
        }
        // Ensure permissions are set correctly (umask might override)
        chmod($targetDir, 0777);
    }

    // Check if directory is writable, try to fix if not
    if (!is_writable($targetDir)) {
        // Try to fix permissions
        @chmod($targetDir, 0777);
        if (!is_writable($targetDir)) {
            throw new Exception("Upload directory is not writable: " . $targetDir . ". Please run: chmod -R 777 " . dirname($targetDir));
        }
    }

    // Create a unique filename
    $fileExtension = pathinfo($file_input_array['name'], PATHINFO_EXTENSION);
    $fileName = uniqid('img_', true) . '.' . $fileExtension; // Use 'img_' prefix instead of subdirectory
    $targetFile = $targetDir . $fileName;

    // Move the uploaded file
    error_log("Moving uploaded file from: " . $file_input_array['tmp_name'] . " to: " . $targetFile);
    if (!move_uploaded_file($file_input_array['tmp_name'], $targetFile)) {
        throw new Exception("Failed to move uploaded file to " . $targetFile . ". Check server permissions.");
    }

    error_log("File uploaded successfully to: " . $targetFile);

    // Return the web-accessible path (relative to your web server's document root)
    // This path is what you'd use in <img src="..."> on your frontend
    // Example: If public_html is the root, and uploads is directly under it: 'uploads/images/clients/filename.png'
    // For now, assuming web-accessible path starts from public_html/
    global $company_name;
    return 'api/clients/' . $company_name . '/uploads/images/' . $sub_directory . $fileName;
}



function handle_file_upload(array $file_input_array, string $sub_directory_name = '', array $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], int $max_size = 5242880) { // Default 5MB
    if ($file_input_array['error'] !== UPLOAD_ERR_OK) {
        if ($file_input_array['error'] === UPLOAD_ERR_NO_FILE) {
            return null; // No file uploaded, might be optional
        }
        switch ($file_input_array['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                throw new Exception("Uploaded file exceeds maximum file size.");
            case UPLOAD_ERR_PARTIAL:
                throw new Exception("The uploaded file was only partially uploaded.");
            case UPLOAD_ERR_NO_TMP_DIR:
                throw new Exception("Missing a temporary folder for uploads.");
            case UPLOAD_ERR_CANT_WRITE:
                throw new Exception("Failed to write file to disk.");
            case UPLOAD_ERR_EXTENSION:
                throw new Exception("A PHP extension stopped the file upload.");
            default:
                throw new Exception("Unknown upload error with code: " . $file_input_array['error']);
        }
    }

    if ($file_input_array['size'] > $max_size) {
        throw new Exception("Uploaded file is too large (max " . ($max_size / 1024 / 1024) . "MB).");
    }

    $file_mime_type = mime_content_type($file_input_array['tmp_name']);
    if (!empty($allowed_types) && !in_array($file_mime_type, $allowed_types)) {
        throw new Exception("Invalid file type. Allowed types: " . implode(', ', array_map(function($type) { return str_replace(['image/', 'application/', 'text/'], '', $type); }, $allowed_types)) . ".");
    }

    $uploadBaseDir = __DIR__ . '/uploads/'; 
    
    // Ensure the sub_directory_name is clean and ends with a slash if not empty
    $final_sub_directory_segment = '';
    if (!empty($sub_directory_name)) {
        $final_sub_directory_segment = trim($sub_directory_name, '/') . '/'; // E.g., 'documents/'
    }

    $targetDir = $uploadBaseDir . $final_sub_directory_segment;

    // Ensure the directory exists with proper permissions
    if (!is_dir($targetDir)) {
        if (!mkdir($targetDir, 0777, true)) {
            throw new Exception("Failed to create upload directory: " . $targetDir . ". Check permissions.");
        }
        // Ensure permissions are set correctly (umask might override)
        chmod($targetDir, 0777);
    }

    // Check if directory is writable, try to fix if not
    if (!is_writable($targetDir)) {
        @chmod($targetDir, 0777);
        if (!is_writable($targetDir)) {
            throw new Exception("Upload directory is not writable: " . $targetDir . ". Please run: chmod -R 777 " . dirname($targetDir));
        }
    }

    // Create a unique filename without prefixing the sub_directory_name again
    $fileExtension = pathinfo($file_input_array['name'], PATHINFO_EXTENSION);
    $fileName = uniqid('', true) . '.' . $fileExtension; // Removed $sub_directory_name prefix from uniqid
    $targetFile = $targetDir . $fileName;

    // Move the uploaded file
    if (!move_uploaded_file($file_input_array['tmp_name'], $targetFile)) {
        throw new Exception("Failed to move uploaded file to " . $targetFile . ". Check server permissions.");
    }

    global $company_name;
    $web_accessible_base_url_for_uploads = 'https://your-domain.example/api/clients/' . $company_name . '/uploads/'; // Corrected base URL based on your structure
    return $web_accessible_base_url_for_uploads . $final_sub_directory_segment . $fileName;
}






function calculate_distance_haversine($lat1, $lon1, $lat2, $lon2, $unit = 'km') {
    if (($lat1 == $lat2) && ($lon1 == $lon2)) {
        return 0; // Same point, distance is 0
    }

    $theta = $lon1 - $lon2;
    $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
    $dist = acos($dist);
    $dist = rad2deg($dist);
    $miles = $dist * 60 * 1.1515; // Distance in miles

    switch ($unit) {
        case 'km':
            return ($miles * 1.609344); // Convert to kilometers
        case 'm':
            return ($miles * 1.609344 * 1000); // Convert to meters
        case 'n':
            return ($miles * 0.8684); // Convert to nautical miles
        default:
            return $miles; // Default to miles
    }
}


function log_inventory_movement_internal($variant_id, $packaging_type_id, $warehouse_id, $log_type, $quantity_change, $current_quantity, $user_id, $reference_id, $notes, $conn) {
    $stmt_log = $conn->prepare("
        INSERT INTO inventory_logs (
            inventory_log_variant_id, inventory_log_packaging_type_id, inventory_log_warehouse_id, 
            inventory_log_type, inventory_log_quantity_change, inventory_log_current_quantity, 
            inventory_log_user_id, inventory_log_reference_id, inventory_log_notes, inventory_log_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    if (!$stmt_log) {
        throw new Exception("Prepare failed for inventory log insert: " . $conn->error);
    }

    // ✅ FIX: The type definition string now correctly matches the 9 parameters being bound.
    $stmt_log->bind_param("iiisddiis", 
        $variant_id,          // i (integer)
        $packaging_type_id,   // i (integer)
        $warehouse_id,        // i (integer)
        $log_type,            // s (string)
        $quantity_change,     // d (double/float)
        $current_quantity,    // d (double/float)
        $user_id,             // i (integer)
        $reference_id,        // i (integer)
        $notes                // s (string)
    );

    if (!$stmt_log->execute()) {
        throw new Exception("Error inserting inventory log: " . $stmt_log->error);
    }
    $stmt_log->close();
}



function get_user_id_from_ip_logs() {

    try {
        global $conn;
    
        $varRequestip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
        
        // AUTO-CLEANUP: Remove old login logs (older than 24 hours) to prevent conflicts
        $stmt_cleanup = $conn->prepare("
            UPDATE login_logs 
            SET login_logs_status = 'expired' 
            WHERE login_logs_status = 'success' 
            AND login_logs_times < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ");
        $stmt_cleanup->execute();
        $stmt_cleanup->close();
        
        // DEBUG: Log the IP being checked
        error_log("Auth Check - IP: " . $varRequestip);
    
        $stmt_user_id = $conn->prepare("
            SELECT 
                l.login_logs_users_id, 
                l.login_logs_times, 
                u.users_name,
                TIMESTAMPDIFF(MINUTE, l.login_logs_times, NOW()) as minutes_ago
            FROM login_logs l
            LEFT JOIN users u ON l.login_logs_users_id = u.users_id
            WHERE l.login_logs_users_ip = ? AND l.login_logs_status = 'success'
            ORDER BY l.login_logs_times DESC
            LIMIT 1
        ");
    
        if (!$stmt_user_id) {
            error_log("Prepare failed for user ID retrieval in get_user_id_from_ip_logs: " . $conn->error);
            return null;
        }
    
        $stmt_user_id->bind_param("s", $varRequestip);
        $stmt_user_id->execute();
        $result_user_id = $stmt_user_id->get_result();
    
        $user_id = null;
        if ($result_user_id->num_rows > 0) {
            $row_user_id = $result_user_id->fetch_assoc();
            $user_id = $row_user_id['login_logs_users_id'];
            
            // Check if login is too old (more than 8 hours)
            if ($row_user_id['minutes_ago'] > 480) { // 8 hours = 480 minutes
                error_log("Login session expired for IP: " . $varRequestip . " (logged in " . $row_user_id['minutes_ago'] . " minutes ago)");
                
                // Mark as expired
                $stmt_expire = $conn->prepare("
                    UPDATE login_logs 
                    SET login_logs_status = 'expired' 
                    WHERE login_logs_users_ip = ? AND login_logs_users_id = ?
                ");
                $stmt_expire->bind_param("si", $varRequestip, $user_id);
                $stmt_expire->execute();
                $stmt_expire->close();
                
                $user_id = null; // Force re-login
            } else {
                // DEBUG: Log successful authentication
                error_log("Auth Success - User: " . ($row_user_id['users_name'] ?? 'Unknown') . " (ID: " . $user_id . ") for IP: " . $varRequestip . " (logged in " . $row_user_id['minutes_ago'] . " minutes ago)");
            }
        } else {
            error_log("No valid login logs found for IP: " . $varRequestip);
        }
        $stmt_user_id->close();
    
        return $user_id;} 
        catch (\Throwable $e) {
            print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
    }
       
    }

    


function get_user_id_from_uuid_local() {
    $uuid = $_POST['users_uuid'] ?? $_GET['users_uuid'] ?? null;

    try {
        global $conn;

        $stmt_user_id = $conn->prepare("
        SELECT users_id
        FROM users
        WHERE users_uuid = ?
        LIMIT 1
    ");
    if (!$stmt_user_id) {
        error_log("Prepare failed for user ID retrieval by UUID: " . $conn->error);
        return null;
    }
    $stmt_user_id->bind_param("s", $uuid);
    $stmt_user_id->execute();
    $result = $stmt_user_id->get_result();
    $user_id = null;
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $user_id = $row['users_id'];
    }
    $stmt_user_id->close();
    return $user_id;    }  catch (\Throwable $e) {
        print_failure("Internal Error: " . $e->getMessage() . " At line " . $e->getLine());
}
    
   
}

// Mobile-friendly authorization that prioritizes UUID over IP
// --- replace the body of check_mobile_authorization() with this updated implementation ---

function check_mobile_authorization() {
    try {
        global $conn;

        $authorized_role = null;
        $users_uuid = $_POST['users_uuid'] ?? $_GET['users_uuid'] ?? null;
        
        // PRIORITY 1: Check UUID if provided (mobile apps)
        if ($users_uuid) {
            error_log("DEBUG check_mobile_authorization: Checking UUID: " . $users_uuid);
            $stmt_uuid = $conn->prepare("
                SELECT users_role, users_name, users_status, users_id
                FROM users
                WHERE users_uuid = ? AND users_status = 1
                LIMIT 1
            ");
            
            if ($stmt_uuid) {
                $stmt_uuid->bind_param("s", $users_uuid);
                $stmt_uuid->execute();
                $result_uuid = $stmt_uuid->get_result();
                
                if ($result_uuid->num_rows > 0) {
                    $row_uuid = $result_uuid->fetch_assoc();
                    $authorized_role = $row_uuid['users_role'];
                    error_log("DEBUG check_mobile_authorization: UUID found role: " . $authorized_role . " for user: " . $row_uuid['users_name']);
                    $stmt_uuid->close();
                } else {
                    $stmt_uuid->close();
                    error_log("DEBUG check_mobile_authorization: Invalid or inactive UUID: " . $users_uuid);
                    print_failure("Invalid user credentials. Please login again.");
                }
            }
        }
        

        // FALLBACK: Check IP-based login logs (web admin)
        if (!$authorized_role) {
            $varRequestip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
            error_log("DEBUG check_mobile_authorization: Fallback to IP check: " . $varRequestip);
            
            $stmt_auth = $conn->prepare("
                SELECT login_logs_users_role, login_logs_users_name
                FROM login_logs
                WHERE login_logs_users_ip = ? AND login_logs_status = 'success'
                ORDER BY login_logs_times DESC
                LIMIT 1
            ");
            
            if ($stmt_auth) {
                $stmt_auth->bind_param("s", $varRequestip);
                $stmt_auth->execute();
                $result_auth = $stmt_auth->get_result();
                
                if ($result_auth->num_rows > 0) {
                    $row_auth = $result_auth->fetch_assoc();
                    $authorized_role = $row_auth['login_logs_users_role'];
                    error_log("DEBUG check_mobile_authorization: IP found role: " . $authorized_role);
                }
                $stmt_auth->close();
            }
        }
    
        // Normalize role string to handle variants
        $normalized_role = strtolower(trim((string)$authorized_role));
        if (in_array($normalized_role, ['sales_rep', 'rep'])) {
            $normalized_role = 'rep';
        } elseif (in_array($normalized_role, ['storekeeper', 'store', 'store_keeper'])) {
            $normalized_role = 'store_keeper';
        } elseif (in_array($normalized_role, ['admin', 'administrator', 'superadmin', 'cash'])) {
            $normalized_role = 'admin';
        }

        // Allow admins, reps, and store keepers for mobile actions
        if (in_array($normalized_role, ['admin', 'rep', 'store_keeper', 'cash'])) {
            error_log("DEBUG check_mobile_authorization: Authorization PASSED for normalized role: " . $normalized_role);
            return true;
        } else {
            error_log("DEBUG check_mobile_authorization: Authorization FAILED - role: " . ($normalized_role ?? 'NULL'));
            print_failure("You are not authorized to perform this action. Please ensure you are logged in properly.");
        }
        
    } catch (\Throwable $e) {
        error_log("ERROR check_mobile_authorization: " . $e->getMessage());
        print_failure("Authorization error: " . $e->getMessage());
    }
}
/**
 * Validates UUID for web admin requests
 * Checks if the provided UUID matches the one stored in the database for the user
 */
function validate_web_admin_uuid() {
    try {
        global $conn;
        
        // Get UUID from request (POST or GET)
        $provided_uuid = $_POST['users_uuid'] ?? $_GET['users_uuid'] ?? null;
        
        if (empty($provided_uuid)) {
            print_failure("Session expired. Please login again.");
            return false;
        }
        
        // Check if UUID exists and is associated with an active user
        $stmt_uuid_check = $conn->prepare("
            SELECT users_id, users_name, users_role, users_status
            FROM users
            WHERE users_uuid = ? AND users_status = 1
            LIMIT 1
        ");
        
        if (!$stmt_uuid_check) {
            error_log("Prepare failed for UUID validation: " . $conn->error);
            print_failure("Authentication error. Please login again.");
            return false;
        }
        
        $stmt_uuid_check->bind_param("s", $provided_uuid);
        $stmt_uuid_check->execute();
        $result = $stmt_uuid_check->get_result();
        
        if ($result->num_rows === 0) {
            $stmt_uuid_check->close();
            print_failure("Invalid session. Please login again.");
            return false;
        }
        
        $user_data = $result->fetch_assoc();
        $stmt_uuid_check->close();
        
        // Set global variables for use in other functions
        $GLOBALS['current_user_id'] = $user_data['users_id'];
        $GLOBALS['current_user_name'] = $user_data['users_name'];
        $GLOBALS['current_user_role'] = $user_data['users_role'];
        $GLOBALS['current_user_uuid'] = $provided_uuid;
        
        return true;
        
    } catch (\Throwable $e) {
        error_log("ERROR validate_web_admin_uuid: " . $e->getMessage());
        print_failure("Authentication error. Please login again.");
        return false;
    }
}

/**
 * Wrapper function to handle both mobile and web admin authorization
 * This should be called at the beginning of API endpoints that require authentication
 */
function validate_user_session() {
    // Check if this is a mobile request (has specific mobile indicators)
    $is_mobile_request = isset($_POST['users_hwid']) || isset($_GET['users_hwid']);
    
    if ($is_mobile_request) {
        // Use existing mobile authorization
        check_mobile_authorization();
    } else {
        // Use new web admin UUID validation
        if (!validate_web_admin_uuid()) {
            exit; // Stop execution if validation fails
        }
    }
}
/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param float $lat1 Latitude of first point
 * @param float $lon1 Longitude of first point
 * @param float $lat2 Latitude of second point
 * @param float $lon2 Longitude of second point
 * @return float Distance in meters
 */
function calculate_distance($lat1, $lon1, $lat2, $lon2) {
    $earth_radius = 6371000; // Earth radius in meters
    
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    
    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLon / 2) * sin($dLon / 2);
    
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    
    $distance = $earth_radius * $c;
    
    return $distance;
}


/**
 * Generate a compact timestamp-based unique ID in the format:
 * ddmmyyHHMMSSmmm  -> day(2) month(2) year2(2) Hour(2) Min(2) Sec(2) Millis(3)
 * Example: 261118202350145
 *
 * @param string|null $timezone Optional timezone identifier (e.g. 'UTC' or 'Europe/Cairo').
 * @return string
 */
function generate_unique_timestamp_id($timezone = null) {
    $tz = $timezone ? new DateTimeZone($timezone) : new DateTimeZone(date_default_timezone_get());
    $dt = new DateTime('now', $tz);
    // DateTime::format('u') returns microseconds (6 digits). Convert to milliseconds (3 digits).
    $ms = (int)($dt->format('u') / 1000);
    return $dt->format('dmyHis') . sprintf('%03d', $ms);
}
