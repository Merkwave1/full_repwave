<?php
/**
 * login.php — Demo company login with 7-day trial expiry check
 * 
 * This is a copy of template_company/auth/login.php with added:
 *   1. Trial expiry check (users_expires_at column)
 *   2. days_remaining in success response
 *   3. Password change prevention (demo accounts cannot change passwords)
 */
require_once '../db_connect.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $users_email    = $_POST['users_email']    ?? null;
    $users_password = $_POST['users_password'] ?? null;
    $users_hwid     = $_POST['users_hwid']     ?? null;
    $login_type     = $_POST['login_type']     ?? 'admin';
    $app_version    = $_POST['app_version']    ?? null;

    $client_ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';

    // Initial log data
    $log_data = [
        'login_logs_users_id'   => null,
        'login_logs_users_name' => $users_email,
        'login_logs_users_role' => 'unauthenticated',
        'login_logs_users_uuid' => null,
        'login_logs_users_ip'   => $client_ip,
        'login_logs_users_hwid' => $users_hwid,
        'login_logs_status'     => 'failure',
        'login_logs_reason'     => 'Unknown error'
    ];

    if (empty($users_email) || empty($users_password)) {
        $log_data['login_logs_reason'] = "Missing required fields.";
        log_login_attempt($log_data);
        print_failure("Error: Email and password are required.");
    }

    // --- Company Subscription Expiration Check ---
    $stmt_expiration = $conn->prepare("
        SELECT settings_value
        FROM settings
        WHERE settings_key = 'expiration_date'
        LIMIT 1
    ");
    if (!$stmt_expiration) {
        throw new Exception("Prepare failed for expiration check: " . $conn->error);
    }
    $stmt_expiration->execute();
    $result_expiration = $stmt_expiration->get_result();

    if ($result_expiration->num_rows === 0) {
        $log_data['login_logs_reason'] = "Subscription expiration not configured.";
        log_login_attempt($log_data);
        print_failure("Error: System subscription not configured. Contact support.");
    }

    $row_expiration = $result_expiration->fetch_assoc();
    $expiration_date_str = $row_expiration['settings_value'];
    $stmt_expiration->close();

    $current_date = new DateTime();
    $expiration_date = new DateTime($expiration_date_str);

    if ($current_date > $expiration_date) {
        $log_data['login_logs_reason'] = "System subscription expired.";
        log_login_attempt($log_data);
        print_failure("Error: System subscription has expired. Contact support.");
    }

    // --- Find user ---
    $stmt = $conn->prepare("
        SELECT 
            users_id, users_name, users_role, users_password, 
            users_status, users_uuid, users_email, users_expires_at, users_is_demo
        FROM users
        WHERE users_email = ? 
        LIMIT 1
    ");
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    $stmt->bind_param("s", $users_email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $log_data['login_logs_reason'] = "Invalid email.";
        log_login_attempt($log_data);
        print_failure("Error: Invalid email.");
    }

    $user = $result->fetch_assoc();
    $stmt->close();

    // Update log data with found user info
    $log_data['login_logs_users_id']   = $user['users_id'];
    $log_data['login_logs_users_name'] = $user['users_name'];
    $log_data['login_logs_users_role'] = $user['users_role'];
    $log_data['login_logs_users_uuid'] = $user['users_uuid'];

    // --- Account status check ---
    if ((int)$user['users_status'] === 0) {
        $log_data['login_logs_reason'] = "Account deactivated.";
        log_login_attempt($log_data);
        print_failure("Error: Your account is deactivated. Contact support.");
    }

    // ══════════════════════════════════════════════════════════════
    // ██  TRIAL EXPIRY CHECK (demo tenant only)  ██████████████████
    // ══════════════════════════════════════════════════════════════
    if (!empty($user['users_expires_at'])) {
        $trial_end = new DateTime($user['users_expires_at']);
        $now = new DateTime();
        
        if ($now > $trial_end) {
            // Trial has expired — block login
            $log_data['login_logs_status'] = 'expired';
            $log_data['login_logs_reason'] = "Trial expired.";
            log_login_attempt($log_data);
            print_failure("Your 7-day trial has expired. Visit rep.merkwave.com to subscribe.", [
                // ⚠️ CHANGE THE NUMBER IN THIS MESSAGE if TRIAL_DAYS changes in register_trial.php
                'trial_expired' => true,
                'expired_at'    => $trial_end->format('Y-m-d H:i:s')
            ]);
        }
    }
    // ══════════════════════════════════════════════════════════════

    if (password_verify($users_password, $user['users_password'])) {
        // --- Role authorization based on login type ---
        $normalizedRole = strtolower(trim($user['users_role']));

        if ($login_type === 'admin') {
            if ($normalizedRole !== 'admin') {
                $log_data['login_logs_reason'] = "Role not authorized for admin panel.";
                log_login_attempt($log_data);
                print_failure("Error: غير مسموح لك بالدخول");
            }
        } elseif ($login_type === 'rep') {
            $allowedRepRoles = ['rep', 'sales_rep', 'admin', 'store_keeper', 'storekeeper', 'store', 'cash'];
            if (!in_array($normalizedRole, $allowedRepRoles, true)) {
                $log_data['login_logs_reason'] = "Role not authorized for rep app.";
                log_login_attempt($log_data);
                print_failure("Error: غير مسموح لك بالدخول");
            }
        } else {
            $log_data['login_logs_reason'] = "Invalid login type.";
            log_login_attempt($log_data);
            print_failure("Error: Invalid login type.");
        }

        // --- App version check for non-admin ---
        if ($normalizedRole !== 'admin') {
            $version_file = __DIR__ . '/../../../apk/version.json';
            if (file_exists($version_file)) {
                $version_data = json_decode(file_get_contents($version_file), true);
                $required_version = $version_data['version'] ?? null;
                
                if ($required_version && $app_version !== $required_version) {
                    $log_data['login_logs_reason'] = "App version mismatch.";
                    log_login_attempt($log_data);
                    print_failure("من فضلك قم بالتحديث", [
                        'update_required'  => true,
                        'required_version' => $required_version,
                        'current_version'  => $app_version,
                        'download_url'     => $version_data['url'] ?? null,
                        'changelog'        => $version_data['changelog'] ?? null
                    ]);
                }
            }
        }

        // --- Generate new session UUID ---
        $new_uuid = bin2hex(random_bytes(16));

        $stmt_upd = $conn->prepare("UPDATE users SET users_uuid = ? WHERE users_id = ?");
        if (!$stmt_upd) throw new Exception("UUID update prepare failed: " . $conn->error);
        $stmt_upd->bind_param("si", $new_uuid, $user['users_id']);
        $stmt_upd->execute();
        $stmt_upd->close();

        $user['users_uuid'] = $new_uuid;

        // --- Log successful login ---
        $log_data['login_logs_status']     = 'success';
        $log_data['login_logs_reason']     = "Login successful.";
        $log_data['login_logs_users_uuid'] = $new_uuid;
        log_login_attempt($log_data);

        // Remove sensitive data
        unset($user['users_password']);

        // ── Add trial metadata to response ───────────────────────
        if (!empty($user['users_expires_at'])) {
            $trial_end = new DateTime($user['users_expires_at']);
            $now = new DateTime();
            $diff = $now->diff($trial_end);
            $user['trial_expires_at'] = $trial_end->format('Y-m-d H:i:s');
            $user['days_remaining']   = max(0, $diff->days);
            $user['is_trial']         = true;
        } else {
            $user['is_trial'] = false;
        }

        print_success("Login successful.", $user);
    } else {
        $log_data['login_logs_reason'] = "Invalid password.";
        log_login_attempt($log_data);
        print_failure("Error: Invalid password.");
    }

} catch (Exception | TypeError $e) {
    $log_data['login_logs_reason'] = "Internal Error: " . $e->getMessage();
    log_login_attempt($log_data);
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}

/**
 * Logs a login attempt to the login_logs table.
 */
function log_login_attempt($log_data) {
    global $conn;

    if (!isset($conn) || $conn === false) {
        error_log("Login log skipped — no DB connection. Data: " . json_encode($log_data));
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
            error_log("Login log prepare failed: " . $conn->error);
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
        error_log("Login log error: " . $e->getMessage());
    }
}
?>
