<?php
/**
 * Import Users from Odoo Employees
 * 
 * This endpoint imports employees from Odoo and creates/updates users in the Rep system.
 * Uses Odoo employee ID as Rep user ID for synchronization.
 * 
 * POST Parameters:
 *   - mode: 'update' (default) or 'replace' - how to handle existing data
 *   - dry_run: boolean - if true, don't make changes, just return what would happen
 * 
 * Response:
 *   - status: 'success' or 'error'
 *   - message: description
 *   - data: import statistics
 */

require_once __DIR__ . '/../db_connect.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Cookie file for Odoo session
$cookie_file = '/tmp/odoo_import_cookies_' . uniqid() . '.txt';

// Placeholder default password for the shared template; replace in the target environment.
define('DEFAULT_USER_PASSWORD', 'CHANGE_ME_PASSWORD');
define('DEFAULT_PASSWORD_HASH', password_hash(DEFAULT_USER_PASSWORD, PASSWORD_BCRYPT));

/**
 * Authenticate with Odoo and return session cookie file path
 */
function importOdooAuthenticate($url, $database, $username, $password, $cookie_file) {
    $auth_url = rtrim($url, '/') . '/web/session/authenticate';
    
    $payload = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => [
            'db' => $database,
            'login' => $username,
            'password' => $password
        ],
        'id' => rand(1, 999999)
    ];
    
    $ch = curl_init($auth_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_COOKIEJAR, $cookie_file);
    curl_setopt($ch, CURLOPT_COOKIEFILE, $cookie_file);
    
    $response = curl_exec($ch);
    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($curl_error) {
        throw new Exception("Connection error: " . $curl_error);
    }
    
    if ($http_code !== 200) {
        throw new Exception("HTTP error: " . $http_code);
    }
    
    $body = substr($response, $header_size);
    $result = json_decode($body, true);
    
    if (isset($result['result']) && isset($result['result']['uid']) && $result['result']['uid']) {
        return $result['result'];
    }
    
    $error = $result['error']['data']['message'] ?? $result['error']['message'] ?? 'فشل المصادقة';
    throw new Exception($error);
}

/**
 * Call Odoo JSON-RPC method using authenticated session
 */
function importOdooCall($url, $model, $method, $cookie_file, $args = [], $kwargs = []) {
    $call_url = rtrim($url, '/') . '/web/dataset/call_kw/' . $model . '/' . $method;
    
    $payload = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => [
            'model' => $model,
            'method' => $method,
            'args' => $args,
            'kwargs' => $kwargs
        ],
        'id' => rand(1, 999999)
    ];
    
    $ch = curl_init($call_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_COOKIEJAR, $cookie_file);
    curl_setopt($ch, CURLOPT_COOKIEFILE, $cookie_file);
    
    $response = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($curl_error) {
        throw new Exception("API call error: " . $curl_error);
    }
    
    if ($http_code !== 200) {
        throw new Exception("HTTP error: " . $http_code . " - Response: " . substr($response, 0, 500));
    }
    
    $result = json_decode($response, true);
    
    if ($result === null) {
        throw new Exception("Invalid JSON response: " . substr($response, 0, 500));
    }
    
    if (isset($result['error'])) {
        $error = $result['error']['data']['message'] ?? $result['error']['message'] ?? json_encode($result['error']);
        throw new Exception("Odoo API error: " . $error);
    }
    
    return $result['result'] ?? null;
}

/**
 * Map Odoo employee to Rep user format
 * Uses Odoo employee ID as the Rep user ID
 */
function importMapEmployeeToUser($employee) {
    $odoo_id = $employee['id'];
    
    // Get email - use work_email or generate from name
    $email = $employee['work_email'] ?? '';
    if (empty($email) || $email === false) {
        $email = $employee['private_email'] ?? '';
    }
    if (empty($email) || $email === false) {
        $name_slug = strtolower(preg_replace('/[^a-zA-Z0-9]/', '.', $employee['name'] ?? 'user'));
        $name_slug = preg_replace('/\.+/', '.', $name_slug);
        $email = trim($name_slug, '.') . '@template-company.local';
    }
    
    // Determine role based on job title or department
    $job_title = strtolower($employee['job_title'] ?? '');
    $department = '';
    if (is_array($employee['department_id'] ?? null) && count($employee['department_id']) > 1) {
        $department = strtolower($employee['department_id'][1]);
    }
    
    $role = 'rep'; // Default role
    
    // Check if department is Administration (case insensitive)
    $isAdminDepartment = strpos($department, 'admin') !== false || 
                         strpos($department, 'إدارة') !== false ||
                         $department === 'administration';
    
    // Check if job title suggests admin role
    $isAdminJob = strpos($job_title, 'admin') !== false || 
                  strpos($job_title, 'مدير') !== false || 
                  strpos($job_title, 'manager') !== false;
    
    if ($isAdminDepartment || $isAdminJob) {
        $role = 'admin';
    } elseif (strpos($job_title, 'store') !== false || strpos($job_title, 'مخزن') !== false ||
              strpos($job_title, 'warehouse') !== false || strpos($job_title, 'keeper') !== false ||
              strpos($department, 'store') !== false || strpos($department, 'مخزن') !== false) {
        $role = 'store_keeper';
    }
    
    // Get phone
    $phone = $employee['work_phone'] ?? $employee['mobile_phone'] ?? $employee['phone'] ?? null;
    if ($phone && $phone !== false) {
        $phone = substr(preg_replace('/[^0-9+]/', '', $phone), 0, 20);
    } else {
        $phone = null;
    }
    
    return [
        'users_id' => $odoo_id,
        'users_name' => $employee['name'] ?? 'Unknown',
        'users_email' => strtolower($email),
        'users_password' => DEFAULT_PASSWORD_HASH,
        'users_role' => $role,
        'users_phone' => $phone,
        'users_status' => ($employee['active'] ?? true) ? 1 : 0,
        'users_uuid' => md5($email . $odoo_id . time())
    ];
}

/**
 * Get existing users indexed by ID
 */
function importGetExistingUsers($conn) {
    $stmt = $conn->prepare("SELECT * FROM users");
    $stmt->execute();
    $result = $stmt->get_result();
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[(int)$row['users_id']] = $row;
    }
    
    $stmt->close();
    return $users;
}

/**
 * Insert a new user with specific ID
 */
function importInsertUser($conn, $userData) {
    $columns = implode(', ', array_keys($userData));
    $placeholders = implode(', ', array_fill(0, count($userData), '?'));
    
    // Determine types
    $types = '';
    foreach ($userData as $key => $value) {
        if ($key === 'users_id' || $key === 'users_status') {
            $types .= 'i';
        } else {
            $types .= 's';
        }
    }
    
    $sql = "INSERT INTO users ($columns) VALUES ($placeholders)";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $values = array_values($userData);
    $stmt->bind_param($types, ...$values);
    
    if (!$stmt->execute()) {
        throw new Exception("Insert failed: " . $stmt->error);
    }
    
    $id = $stmt->insert_id ?: $userData['users_id'];
    $stmt->close();
    
    return $id;
}

/**
 * Update an existing user
 */
function importUpdateUser($conn, $userId, $userData, $updatePassword = false) {
    // Remove users_id from update data
    unset($userData['users_id']);
    
    // Don't update password if user already has one (unless forced)
    if (!$updatePassword) {
        unset($userData['users_password']);
    }
    
    // Don't update UUID
    unset($userData['users_uuid']);
    
    if (empty($userData)) {
        return false;
    }
    
    $setParts = [];
    $types = '';
    $values = [];
    
    foreach ($userData as $key => $value) {
        $setParts[] = "$key = ?";
        if ($key === 'users_status') {
            $types .= 'i';
        } else {
            $types .= 's';
        }
        $values[] = $value;
    }
    
    $types .= 'i';
    $values[] = $userId;
    
    $sql = "UPDATE users SET " . implode(', ', $setParts) . " WHERE users_id = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param($types, ...$values);
    
    if (!$stmt->execute()) {
        throw new Exception("Update failed: " . $stmt->error);
    }
    
    $affected = $stmt->affected_rows;
    $stmt->close();
    
    return $affected >= 0;
}

/**
 * Delete users not in Odoo (for replace mode)
 */
function importDeleteUsersNotInOdoo($conn, $odooIds) {
    if (empty($odooIds)) {
        return 0;
    }
    
    $placeholders = implode(',', array_fill(0, count($odooIds), '?'));
    $types = str_repeat('i', count($odooIds));
    
    $sql = "DELETE FROM users WHERE users_id NOT IN ($placeholders)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$odooIds);
    $stmt->execute();
    
    $deleted = $stmt->affected_rows;
    $stmt->close();
    
    return $deleted;
}

// Main execution
try {
    // Get request data
    $json_input = file_get_contents('php://input');
    $input = json_decode($json_input, true) ?? [];
    $input = array_merge($_POST, $input);
    
    $mode = $input['mode'] ?? 'update';
    $dry_run = isset($input['dry_run']) && ($input['dry_run'] === true || $input['dry_run'] === 'true' || $input['dry_run'] === '1');
    
    // Statistics
    $stats = [
        'created' => 0,
        'updated' => 0,
        'skipped' => 0,
        'failed' => 0,
        'deleted' => 0,
        'details' => []
    ];
    
    // Get Odoo settings
    $stmt = $conn->prepare("SELECT settings_key, settings_value FROM settings WHERE settings_key LIKE 'odoo_%'");
    $stmt->execute();
    $result = $stmt->get_result();
    
    $odooSettings = [];
    while ($row = $result->fetch_assoc()) {
        $odooSettings[$row['settings_key']] = $row['settings_value'];
    }
    $stmt->close();
    
    $odoo_url = $odooSettings['odoo_url'] ?? '';
    $odoo_database = $odooSettings['odoo_database'] ?? '';
    $odoo_username = $odooSettings['odoo_username'] ?? '';
    $odoo_password = $odooSettings['odoo_password'] ?? '';
    
    if (empty($odoo_url) || empty($odoo_database) || empty($odoo_username) || empty($odoo_password)) {
        print_failure('Odoo settings are incomplete. Please configure Odoo integration first.');
        exit;
    }
    
    // Authenticate with Odoo
    $authResult = importOdooAuthenticate($odoo_url, $odoo_database, $odoo_username, $odoo_password, $cookie_file);
    
    if (!$authResult || !isset($authResult['uid'])) {
        print_failure('Failed to authenticate with Odoo');
        exit;
    }
    
    // Fetch employees from Odoo
    $employees = importOdooCall($odoo_url, 'hr.employee', 'search_read', $cookie_file,
        [[]],  // domain as first argument
        [
            'fields' => [
                'id', 'name', 'work_email', 'private_email',
                'work_phone', 'mobile_phone', 'phone',
                'job_title', 'department_id', 'active'
            ],
            'order' => 'id ASC'
        ]
    );
    
    // Clean up cookie file
    if (file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    if (!is_array($employees)) {
        print_failure('Failed to fetch employees from Odoo. Response: ' . json_encode($employees));
        exit;
    }
    
    if (empty($employees)) {
        print_failure('No employees found in Odoo');
        exit;
    }
    
    // Get existing users
    $existingUsers = importGetExistingUsers($conn);
    
    // Collect Odoo IDs for replace mode
    $odooIds = [];
    
    // Process each employee
    foreach ($employees as $emp) {
        try {
            $userData = importMapEmployeeToUser($emp);
            $userId = $userData['users_id'];
            $name = $userData['users_name'];
            $email = $userData['users_email'];
            
            $odooIds[] = $userId;
            
            if (isset($existingUsers[$userId])) {
                // User exists - update
                $existing = $existingUsers[$userId];
                
                // Check if existing user has a password
                $hasPassword = !empty($existing['users_password']);
                
                if (!$dry_run) {
                    // Update without changing password if user already has one
                    importUpdateUser($conn, $userId, $userData, !$hasPassword);
                }
                
                $stats['updated']++;
                $stats['details'][] = [
                    'action' => 'updated',
                    'id' => $userId,
                    'name' => $name,
                    'email' => $email,
                    'password_updated' => !$hasPassword
                ];
            } else {
                // New user - insert with specific ID
                if (!$dry_run) {
                    importInsertUser($conn, $userData);
                }
                
                $stats['created']++;
                $stats['details'][] = [
                    'action' => 'created',
                    'id' => $userId,
                    'name' => $name,
                    'email' => $email,
                    'password' => (string)$userId  // Show what the password is
                ];
            }
        } catch (Exception $e) {
            $stats['failed']++;
            $stats['details'][] = [
                'action' => 'failed',
                'id' => $emp['id'] ?? 'unknown',
                'name' => $emp['name'] ?? 'Unknown',
                'error' => $e->getMessage()
            ];
        }
    }
    
    // In replace mode, delete users not in Odoo
    if ($mode === 'replace' && !$dry_run && !empty($odooIds)) {
        $stats['deleted'] = importDeleteUsersNotInOdoo($conn, $odooIds);
    }
    
    // Prepare response message
    $message = sprintf(
        'تم استيراد المستخدمين من Odoo: %d جديد، %d محدث، %d فشل',
        $stats['created'],
        $stats['updated'],
        $stats['failed']
    );
    
    if ($stats['deleted'] > 0) {
        $message .= sprintf('، %d محذوف', $stats['deleted']);
    }
    
    if ($dry_run) {
        $message = '[محاكاة] ' . $message;
    }
    
    print_success($message, [
        'created' => $stats['created'],
        'updated' => $stats['updated'],
        'skipped' => $stats['skipped'],
        'failed' => $stats['failed'],
        'deleted' => $stats['deleted'],
        'total_from_odoo' => count($employees),
        'dry_run' => $dry_run,
        'mode' => $mode,
        'details' => $stats['details']
    ]);
    
} catch (Exception $e) {
    // Clean up cookie file on error
    if (isset($cookie_file) && file_exists($cookie_file)) {
        unlink($cookie_file);
    }
    
    error_log('Import users from Odoo error: ' . $e->getMessage());
    print_failure('خطأ في الاستيراد: ' . $e->getMessage());
}
?>
