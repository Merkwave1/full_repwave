<?php

require_once '../db_connect.php'; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $users_email        = $_POST['users_email']        ?? null;
    $users_password     = $_POST['users_password']     ?? null;
    $users_hwid         = $_POST['users_hwid']         ?? null; // Hardware ID from client
    $login_type         = $_POST['login_type']         ?? 'admin'; // Default to admin for backward compatibility
    $app_version        = $_POST['app_version']        ?? null; // App version from client

    $client_ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';

    // Initial log data for potential failure
    $log_data = [
        'login_logs_users_id'   => null, // Unknown yet
        'login_logs_users_name' => $users_email,
        'login_logs_users_role' => 'unauthenticated',
        'login_logs_users_uuid' => null, // Unknown yet
        'login_logs_users_ip'   => $client_ip,
        'login_logs_users_hwid' => $users_hwid,
        'login_logs_status'     => 'failure',
        'login_logs_reason'     => 'Unknown error' // Default reason
    ];

    if (empty($users_email) || empty($users_password)) { 
        $log_data['login_logs_reason'] = "Missing required fields.";
        log_login_attempt($log_data); // Log failure
        print_failure("Error: Email and password are required.");
    }

    // --- Company Subscription Expiration Check ---
    // This check remains as it's a system-wide setting, not user-specific company
    $stmt_expiration = $conn->prepare("
        SELECT settings_value
        FROM settings
        WHERE settings_key = 'expiration_date'
        LIMIT 1
    ");
    if (!$stmt_expiration) {
        throw new Exception("Prepare failed for expiration date check: " . $conn->error);
    }
    $stmt_expiration->execute();
    $result_expiration = $stmt_expiration->get_result();

    if ($result_expiration->num_rows === 0) {
        $log_data['login_logs_reason'] = "Subscription expiration date not configured.";
        log_login_attempt($log_data);
        print_failure("Error: System subscription expiration date is not configured. Please contact support.");
    }

    $row_expiration = $result_expiration->fetch_assoc();
    $expiration_date_str = $row_expiration['settings_value'];
    $stmt_expiration->close();

    $current_date = new DateTime();
    $expiration_date = new DateTime($expiration_date_str);

    if ($current_date > $expiration_date) {
        $log_data['login_logs_reason'] = "System subscription expired.";
        log_login_attempt($log_data);
        print_failure("Error: System subscription has expired. Please contact support.");
    }
    // --- End Company Subscription Expiration Check ---


    $stmt = $conn->prepare("
        SELECT 
            users_id, users_name, users_role, users_password, users_status, users_uuid, users_email
        FROM users
        WHERE users_email = ? 
        LIMIT 1
    ");
    if (!$stmt) {
        throw new Exception("Prepare failed for user authentication: " . $conn->error);
    }
    $stmt->bind_param("s", $users_email); // Only bind email
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $log_data['login_logs_reason'] = "Invalid email."; // Updated message
        log_login_attempt($log_data);
        print_failure("Error: Invalid email."); // Updated message
    }

    $user = $result->fetch_assoc();
    $stmt->close();

    // Update log data with user info
    $log_data['login_logs_users_id'] = $user['users_id'];
    $log_data['login_logs_users_name'] = $user['users_name'];
    $log_data['login_logs_users_role'] = $user['users_role'];
    $log_data['login_logs_users_uuid'] = $user['users_uuid'];

    if ((int)$user['users_status'] === 0) {
        $log_data['login_logs_reason'] = "Account deactivated.";
        log_login_attempt($log_data);
        print_failure("Error: Your account is deactivated. Please contact support.");
    }

    if (password_verify($users_password, $user['users_password'])) {
        // Check role authorization based on login type
        $normalizedRole = strtolower(trim($user['users_role']));

        if ($login_type === 'admin') {
            // For admin panel access, only admin role is allowed
            if ($normalizedRole !== 'admin') {
                $log_data['login_logs_reason'] = "Access denied: Role not authorized for admin panel.";
                log_login_attempt($log_data);
                print_failure("Error: غير مسموح لك بالدخول");
            }
        } elseif ($login_type === 'rep') {
            // For rep app access, allow rep, admin, store_keeper, and cash roles
            $allowedRepRoles = ['rep', 'sales_rep', 'admin', 'store_keeper', 'storekeeper', 'store', 'cash'];
            if (!in_array($normalizedRole, $allowedRepRoles, true)) {
                $log_data['login_logs_reason'] = "Access denied: Role not authorized for rep app.";
                log_login_attempt($log_data);
                print_failure("Error: غير مسموح لك بالدخول");
            }
        } else {
            // Unknown login type
            $log_data['login_logs_reason'] = "Access denied: Invalid login type.";
            log_login_attempt($log_data);
            print_failure("Error: Invalid login type.");
        }
        
        // --- App Version Check for Non-Admin Users ---
        // Only check version for rep app login (non-admin users)
        if ( $normalizedRole !== 'admin') {
            // Read required version from version.json
            $version_file = __DIR__ . '/../../../apk/version.json';
            if (file_exists($version_file)) {
                $version_data = json_decode(file_get_contents($version_file), true);
                $required_version = $version_data['version'] ?? null;
                
                if ($required_version && $app_version !== $required_version) {
                    $log_data['login_logs_reason'] = "App version mismatch. Required: $required_version, Got: $app_version";
                    log_login_attempt($log_data);
                    print_failure("من فضلك قم بالتحديث", [
                        'update_required' => true,
                        'required_version' => $required_version,
                        'current_version' => $app_version,
                        'download_url' => $version_data['url'] ?? null,
                        'changelog' => $version_data['changelog'] ?? null
                    ]);
                }
            }
        }
        // --- End App Version Check ---
        
        // Generate new UUID for this login session
        $new_uuid = bin2hex(random_bytes(16)); // Generate a 32-character hex UUID
        
        // Update the user's UUID in the database
        $stmt_update_uuid = $conn->prepare("
            UPDATE users 
            SET users_uuid = ? 
            WHERE users_id = ?
        ");
        if (!$stmt_update_uuid) {
            throw new Exception("Prepare failed for UUID update: " . $conn->error);
        }
        $stmt_update_uuid->bind_param("si", $new_uuid, $user['users_id']);
        $stmt_update_uuid->execute();
        $stmt_update_uuid->close();
        
        // Update the user data with the new UUID
        $user['users_uuid'] = $new_uuid;
        
        // Login successful
        $log_data['login_logs_status'] = 'success';
        $log_data['login_logs_reason'] = "Login successful.";
        $log_data['login_logs_users_uuid'] = $new_uuid; // Update log with new UUID
        log_login_attempt($log_data);

        // Remove sensitive data before sending to client
        unset($user['users_password']);

        print_success("Login successful.", $user);
    } else {
        // Invalid password
        $log_data['login_logs_reason'] = "Invalid password.";
        log_login_attempt($log_data);
        print_failure("Error: Invalid password.");
    }

} catch (Exception | TypeError $e) {
    // Catch any unexpected errors during the process
    $log_data['login_logs_reason'] = "Internal Error: " . $e->getMessage();
    log_login_attempt($log_data); // Log the internal error as a failure
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    // Close connection if it's still open
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}

/**
 * Logs a login attempt to the login_logs table.
 * This function is included directly in login.php to avoid circular dependencies with db_connect.php
 * if db_connect.php also uses it.
 *
 * @param array $log_data An associative array containing login log details.
 */
function log_login_attempt($log_data) {
    global $conn; // Use the global connection object

    // Ensure conn is available, if not, just log to PHP error log
    if (!isset($conn) || $conn === false) {
        error_log("Attempted to log login attempt, but database connection is not available. Data: " . json_encode($log_data));
        return;
    }

    try {
        $stmt_log = $conn->prepare("
            INSERT INTO login_logs (
                login_logs_users_id, login_logs_users_name, login_logs_users_role, 
                login_logs_users_uuid, login_logs_users_ip, login_logs_users_hwid, 
                login_logs_status, login_logs_reason, login_logs_times
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");

        if (!$stmt_log) {
            error_log("Prepare failed for login log insert: " . $conn->error);
            return;
        }

        $stmt_log->bind_param("isssssss", 
            $log_data['login_logs_users_id'], $log_data['login_logs_users_name'], 
            $log_data['login_logs_users_role'], $log_data['login_logs_users_uuid'], 
            $log_data['login_logs_users_ip'], $log_data['login_logs_users_hwid'], 
            $log_data['login_logs_status'], $log_data['login_logs_reason']
        );

        $stmt_log->execute();
        $stmt_log->close();
    } catch (Exception $e) {
        error_log("Error logging login attempt: " . $e->getMessage() . " Data: " . json_encode($log_data));
    }
}
?>
