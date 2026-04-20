<?php
/**
 * register_trial.php — Public endpoint for "Try It Now" demo signup
 * 
 * Creates a 6-day time-limited trial account in the demo_company tenant.
 * No authentication required. Rate-limited by IP address.
 * Sends email notification to admin on successful signup.
 *
 * POST params:
 *   trial_name       (required) — Full name of the visitor
 *   trial_email      (required) — Email address
 *   trial_phone      (optional) — Phone number
 *   trial_company    (optional) — Company name
 */
// Suppress display_errors so PHP notices/warnings don't corrupt JSON output
ini_set('display_errors', '0');
error_reporting(0);

require_once '../db_connect.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Configuration ────────────────────────────────────────────────
// ⚠️  DEMO DURATION — change this number to adjust the trial window.
//     Currently set to 7 days. To test instantly, set to a tiny
//     fraction of a day expressed in SQL (easier via users_expires_at
//     directly), or temporarily lower this value and re-register.
//     Also update 'demo_trial_days' in demo_seed.sql (settings INSERT)
//     and the error message in auth/login.php if you change it here.
const TRIAL_DAYS        = 7; 
const MAX_SIGNUPS_PER_IP = 3;
const ADMIN_NOTIFY_EMAIL = 'info@merkwave.com'; 
const DEMO_COMPANY_NAME  = 'demo_company';
const DEMO_DASHBOARD_URL = 'https://rep.merkwave.com/demo';
const DEMO_API_URL       = 'https://rep.merkwave.com/api/clients/demo_company';
// ────────────────────────────────────────────────────────────────

try {
    // ── 1. Extract & sanitize input ──────────────────────────────
    $trial_name    = trim($_POST['trial_name']    ?? '');
    $trial_email   = trim($_POST['trial_email']   ?? '');
    $trial_phone   = trim($_POST['trial_phone']   ?? '');
    $trial_company = trim($_POST['trial_company'] ?? '');
    $client_ip     = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';

    // ── 2. Validate required fields ─────────────────────────────
    if (empty($trial_name) || mb_strlen($trial_name) < 2 || mb_strlen($trial_name) > 100) {
        print_failure("Name is required (2–100 characters).");
    }

    if (empty($trial_email) || !filter_var($trial_email, FILTER_VALIDATE_EMAIL)) {
        print_failure("A valid email address is required.");
    }

    // Sanitize optional fields
    if (!empty($trial_phone) && !preg_match('/^[\+\d\s\-\(\)]{6,20}$/', $trial_phone)) {
        print_failure("Invalid phone number format.");
    }
    $trial_company = mb_substr($trial_company, 0, 200);

    // ── 3. Rate limit: max signups per IP total (never resets) ───
    $stmt_rl = $conn->prepare("
        SELECT COUNT(*) AS cnt
        FROM   trial_signups
        WHERE  ip_address = ?
    ");
    $stmt_rl->bind_param("s", $client_ip);
    $stmt_rl->execute();
    $rl_row = $stmt_rl->get_result()->fetch_assoc();
    $stmt_rl->close();

    if ((int)$rl_row['cnt'] >= MAX_SIGNUPS_PER_IP) {
        print_failure("Maximum number of trial accounts from your network has been reached.");
    }

    // ── 4. Block duplicate email ─────────────────────────────────
    $stmt_dup = $conn->prepare("SELECT users_id FROM users WHERE users_email = ? LIMIT 1");
    $stmt_dup->bind_param("s", $trial_email);
    $stmt_dup->execute();
    $stmt_dup->store_result();
    if ($stmt_dup->num_rows > 0) {
        $stmt_dup->close();
        print_failure("A trial account with this email already exists. Use your existing credentials to log in.");
    }
    $stmt_dup->close();

    // ── 5. Generate secure credentials ───────────────────────────
    // Fixed-format password: 8 hex chars (uppercase), not changeable by user
    $raw_password    = strtoupper(bin2hex(random_bytes(4))); // e.g. "A3F7C291"
    $hashed_password = password_hash($raw_password, PASSWORD_BCRYPT, ['cost' => 12]);
    $users_uuid      = bin2hex(random_bytes(16)); // 32-char hex UUID

    $expires_at = (new DateTime())->modify("+" . TRIAL_DAYS . " days")->format('Y-m-d H:i:s');

    // ── 6. Insert trial user into users table ────────────────────
    $stmt_ins = $conn->prepare("
        INSERT INTO users
            (users_name, users_email, users_password, users_phone,
             users_role, users_status, users_uuid, users_expires_at,
             users_is_demo, created_at)
        VALUES (?, ?, ?, ?, 'admin', 1, ?, ?, 1, NOW())
    ");
    $stmt_ins->bind_param("ssssss",
        $trial_name, $trial_email, $hashed_password, $trial_phone,
        $users_uuid, $expires_at
    );
    $stmt_ins->execute();
    $new_user_id = $conn->insert_id;
    $stmt_ins->close();

    // ── 7. Log signup for rate limiting + analytics ──────────────
    $stmt_log = $conn->prepare("
        INSERT INTO trial_signups 
            (ip_address, email, full_name, phone, company_name, user_id, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt_log->bind_param("sssssi",
        $client_ip, $trial_email, $trial_name, $trial_phone, $trial_company, $new_user_id
    );
    $stmt_log->execute();
    $stmt_log->close();

    // ── 8. Send email notification to admin ──────────────────────
    $email_sent = send_trial_notification(
        $trial_name, $trial_email, $trial_phone, $trial_company,
        $expires_at, $client_ip, $new_user_id
    );

    // ── 9. Return credentials to the user ────────────────────────
    print_success("Trial account created successfully!", [
        'user_id'        => $new_user_id,
        'email'          => $trial_email,
        'password'       => $raw_password,       // Shown ONCE — not recoverable
        'company_name'   => DEMO_COMPANY_NAME,
        'expires_at'     => $expires_at,
        'days'           => TRIAL_DAYS, // = 7 days — see TRIAL_DAYS constant above
        'dashboard_url'  => DEMO_DASHBOARD_URL,
        'api_url'        => DEMO_API_URL,
        'email_notified' => $email_sent,
    ]);

} catch (mysqli_sql_exception $e) {
    error_log('register_trial MySQL error: ' . $e->getMessage());
    // Handle duplicate entry (race condition)
    if ($e->getCode() === 1062) {
        print_failure("This email is already registered. Please use your existing credentials.");
    }
    print_failure("Something went wrong. Please try again later. (DB: " . $e->getCode() . ")");
} catch (Exception $e) {
    error_log('register_trial error: ' . $e->getMessage());
    print_failure("Something went wrong. Please try again later.");
}


/**
 * Sends an email notification to the admin about a new trial signup.
 * Uses PHP's built-in mail() function. For production, replace with
 * a proper mailer (PHPMailer, SendGrid, etc.).
 *
 * @return bool Whether the email was sent successfully
 */
function send_trial_notification($name, $email, $phone, $company, $expires_at, $ip, $user_id) {
    try {
        $to      = ADMIN_NOTIFY_EMAIL;
        $subject = "[RepWave Demo] New Trial Signup: {$name}";

        $body = "
        <html>
        <head><style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; }
            .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; max-width: 500px; }
            .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .value { font-size: 14px; margin-bottom: 12px; }
            .header { background: #1a56db; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0; }
        </style></head>
        <body>
            <div class='card'>
                <div class='header'>
                    <h2 style='margin:0;'>🚀 New Demo Trial Signup</h2>
                </div>
                <div style='padding: 20px;'>
                    <div class='label'>Name</div>
                    <div class='value'>" . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "</div>

                    <div class='label'>Email</div>
                    <div class='value'>" . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . "</div>

                    <div class='label'>Phone</div>
                    <div class='value'>" . htmlspecialchars($phone ?: 'Not provided', ENT_QUOTES, 'UTF-8') . "</div>

                    <div class='label'>Company</div>
                    <div class='value'>" . htmlspecialchars($company ?: 'Not provided', ENT_QUOTES, 'UTF-8') . "</div>

                    <div class='label'>Trial Expires</div>
                    <div class='value'>{$expires_at}</div>

                    <div class='label'>IP Address</div>
                    <div class='value'>{$ip}</div>

                    <div class='label'>User ID</div>
                    <div class='value'>{$user_id}</div>
                </div>
            </div>
        </body>
        </html>";

        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: RepWave Demo <noreply@merkwave.com>\r\n";
        $headers .= "Reply-To: {$email}\r\n";

        return mail($to, $subject, $body, $headers);
    } catch (Exception $e) {
        error_log('Trial notification email failed: ' . $e->getMessage());
        return false;
    }
}
?>
