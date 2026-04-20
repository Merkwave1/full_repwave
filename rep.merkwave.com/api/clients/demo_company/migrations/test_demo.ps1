# test_demo.ps1 - Full end-to-end demo lifecycle test
# Requires Docker Desktop running with repwave containers up.
# Usage: powershell -ExecutionPolicy Bypass -File .\test_demo.ps1
#
# FULL TEST PLAN - 15 tests:
#   Phase A: Registration (5 tests)
#   Phase B: Permanent users (2 tests)
#   Phase C: Trial expiry with 3-second simulation (3 tests)
#   Phase D: Reset / Reseed (5 tests)

$API = 'http://localhost:8082/api/clients/demo_company'
$MYSQL = 'repwave_share_mysql'
$RESET_SCRIPT = '/demo_migrations/reset_demo.sh'
$TEST_EMAIL = 'fulltest_' + (Get-Date -Format 'yyyyMMddHHmmss') + '@test.local'

$pass_count = 0
$fail_count = 0
$skip_count = 0

function Test-Pass {
    param([string]$msg)
    Write-Host "  [PASS] $msg" -ForegroundColor Green
    $script:pass_count++
}

function Test-Fail {
    param([string]$msg)
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
    $script:fail_count++
}

function Test-Skip {
    param([string]$msg)
    Write-Host "  [SKIP] $msg" -ForegroundColor DarkGray
    $script:skip_count++
}

function Invoke-API {
    param([string]$method, [string]$path, [hashtable]$body = $null)
    $uri = $API + $path
    $params = @{ Method = $method; Uri = $uri; UseBasicParsing = $true }
    if ($body) {
        $parts = @()
        foreach ($kv in $body.GetEnumerator()) {
            $parts += [uri]::EscapeDataString($kv.Key) + '=' + [uri]::EscapeDataString($kv.Value)
        }
        $params.Body = $parts -join '&'
        $params.ContentType = 'application/x-www-form-urlencoded'
    }
    try {
        $resp = Invoke-WebRequest @params -ErrorAction Stop
        return ($resp.Content | ConvertFrom-Json)
    }
    catch {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            return ($reader.ReadToEnd() | ConvertFrom-Json)
        }
        catch {
            return $null
        }
    }
}

function Invoke-SQL {
    param([string]$sql)
    $result = docker exec $MYSQL mysql -uroot -prootpass demo_company_db -se "$sql" 2>&1
    return $result | Where-Object { $_ -notmatch 'Warning' }
}

function Get-SQLInt {
    param([string]$sql)
    $raw = Invoke-SQL $sql
    $num = $raw | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1
    if ($num) { return [int]$num } else { return 0 }
}

Write-Host ''
Write-Host '=============================================================' -ForegroundColor Cyan
Write-Host '  RepWave Demo - Full End-to-End Lifecycle Test' -ForegroundColor Cyan
Write-Host '=============================================================' -ForegroundColor Cyan
Write-Host "  API:        $API"
Write-Host "  Test email: $TEST_EMAIL"
Write-Host ('  Time:       ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Write-Host ''

# ===================================================================
# Phase A: Registration
# ===================================================================
Write-Host '-- Phase A: Registration ---------------------------------' -ForegroundColor Magenta

# TEST 1: Clean slate
Write-Host 'TEST  1: Pre-test cleanup...' -ForegroundColor Yellow
Invoke-SQL 'DELETE FROM users WHERE users_is_demo = 1;' | Out-Null
Invoke-SQL 'DELETE FROM trial_signups WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY);' | Out-Null
$user_count_before = Get-SQLInt 'SELECT COUNT(*) FROM users;'
Test-Pass "Cleaned test users, $user_count_before permanent users remain"

# TEST 2: Register trial user
Write-Host 'TEST  2: Register new trial user...' -ForegroundColor Yellow
$reg = Invoke-API 'POST' '/auth/register_trial.php' @{
    trial_name    = 'Full-Test User'
    trial_email   = $TEST_EMAIL
    trial_phone   = '+201888888888'
    trial_company = 'Test Corp'
}
if ($reg -and $reg.status -eq 'success' -and $reg.data.user_id) {
    $TRIAL_ID = [int]$reg.data.user_id
    $TRIAL_PASS = $reg.data.password
    $TRIAL_DAYS = $reg.data.days
    Test-Pass "Registered id=$TRIAL_ID pass=$TRIAL_PASS trial=${TRIAL_DAYS}d"
}
else {
    Test-Fail ('Registration failed: ' + ($reg | ConvertTo-Json -Compress))
    $TRIAL_ID = 0
    $TRIAL_PASS = ''
}

# TEST 3: Login as trial user
Write-Host 'TEST  3: Login as trial user (rep role)...' -ForegroundColor Yellow
if ($TRIAL_ID -gt 0) {
    $login = Invoke-API 'POST' '/auth/login.php' @{
        users_email = $TEST_EMAIL; users_password = $TRIAL_PASS; login_type = 'rep'
    }
    if ($login -and $login.status -eq 'success') {
        Test-Pass ('Trial user login OK - name: ' + $login.data.users_name)
    }
    else {
        Test-Fail ('Trial login failed: ' + ($login | ConvertTo-Json -Compress))
    }
}
else {
    Test-Skip 'No trial user registered'
}

# TEST 4: Duplicate email blocked
Write-Host 'TEST  4: Same email cannot re-register...' -ForegroundColor Yellow
if ($TRIAL_ID -gt 0) {
    $dup = Invoke-API 'POST' '/auth/register_trial.php' @{
        trial_name = 'Duplicate'; trial_email = $TEST_EMAIL; trial_phone = '+201777777777'
    }
    if ($dup -and $dup.status -eq 'failure' -and $dup.message -match 'already exists') {
        Test-Pass ('Duplicate email blocked: ' + $dup.message)
    }
    else {
        Test-Fail ('Duplicate NOT blocked: ' + ($dup | ConvertTo-Json -Compress))
    }
}
else {
    Test-Skip 'No trial user to test duplicate'
}

# TEST 5: Password change blocked
Write-Host 'TEST  5: Password change blocked (demo restriction)...' -ForegroundColor Yellow
$chg = Invoke-API 'POST' '/auth/change_password.php' @{
    users_email = $TEST_EMAIL; old_password = $TRIAL_PASS; new_password = 'Hacked123'
}
if ($chg -and $chg.status -eq 'failure' -and $chg.data.demo_restriction -eq $true) {
    Test-Pass 'Password change blocked (demo_restriction=true)'
}
else {
    Test-Fail ('Password change NOT blocked: ' + ($chg | ConvertTo-Json -Compress))
}

# ===================================================================
# Phase B: Permanent user logins
# ===================================================================
Write-Host ''
Write-Host '-- Phase B: Permanent Users ------------------------------' -ForegroundColor Magenta

# TEST 6: Admin login
Write-Host 'TEST  6: Admin login...' -ForegroundColor Yellow
$adm = Invoke-API 'POST' '/auth/login.php' @{
    users_email = 'admin@demo.repwave.local'; users_password = 'DemoPass123'; login_type = 'admin'
}
if ($adm -and $adm.status -eq 'success') {
    Test-Pass ('Admin login OK - ' + $adm.data.users_name)
}
else {
    Test-Fail ('Admin login failed: ' + ($adm | ConvertTo-Json -Compress))
}

# TEST 7: Rep login (permanent rep user Ahmed)
Write-Host 'TEST  7: Permanent rep login (Ahmed)...' -ForegroundColor Yellow
$rep = Invoke-API 'POST' '/auth/login.php' @{
    users_email = 'ahmed@demo.repwave.local'; users_password = 'DemoPass123'; login_type = 'rep'
}
if ($rep -and $rep.status -eq 'success') {
    Test-Pass ('Rep login OK - ' + $rep.data.users_name)
}
else {
    Test-Fail ('Rep login failed: ' + ($rep | ConvertTo-Json -Compress))
}

# ===================================================================
# Phase C: Trial expiry (simulated with 3-second window)
# ===================================================================
Write-Host ''
Write-Host '-- Phase C: Trial Expiry (6-sec simulation) -------------' -ForegroundColor Magenta

# TEST 8: Set expiry to NOW + 6 seconds
Write-Host 'TEST  8: Set trial expiry to 6 seconds from now...' -ForegroundColor Yellow
if ($TRIAL_ID -gt 0) {
    Invoke-SQL "UPDATE users SET users_expires_at = DATE_ADD(NOW(), INTERVAL 6 SECOND) WHERE users_id = $TRIAL_ID;" | Out-Null
    $expiry_raw = Invoke-SQL "SELECT users_expires_at FROM users WHERE users_id = $TRIAL_ID;"
    $expiry_val = $expiry_raw | Where-Object { $_ -match '\d{4}' } | Select-Object -First 1
    Test-Pass "Expiry set to: $expiry_val"
}
else {
    Test-Skip 'No trial user'
}

# TEST 9: Login immediately - should still work
Write-Host 'TEST  9: Login immediately (before expiry)...' -ForegroundColor Yellow
if ($TRIAL_ID -gt 0) {
    $quick = Invoke-API 'POST' '/auth/login.php' @{
        users_email = $TEST_EMAIL; users_password = $TRIAL_PASS; login_type = 'rep'
    }
    if ($quick -and $quick.status -eq 'success') {
        Test-Pass 'Login before expiry succeeded'
    }
    else {
        Test-Fail ('Login before expiry failed: ' + ($quick | ConvertTo-Json -Compress))
    }
}
else {
    Test-Skip 'No trial user'
}

# TEST 10: Wait 8 seconds, login blocked
Write-Host 'TEST 10: Waiting 8 seconds for trial to expire...' -ForegroundColor Yellow
if ($TRIAL_ID -gt 0) {
    Start-Sleep -Seconds 8
    $expired = Invoke-API 'POST' '/auth/login.php' @{
        users_email = $TEST_EMAIL; users_password = $TRIAL_PASS; login_type = 'rep'
    }
    if ($expired -and $expired.data.trial_expired -eq $true) {
        Test-Pass ('Expired trial correctly blocked - trial_expired=true, expired_at=' + $expired.data.expired_at)
    }
    elseif ($expired -and $expired.status -eq 'failure') {
        Test-Pass 'Expired trial blocked (status=failure)'
    }
    else {
        Test-Fail ('Expired trial NOT blocked: ' + ($expired | ConvertTo-Json -Compress))
    }
}
else {
    Test-Skip 'No trial user'
}

# ===================================================================
# Phase D: Reset / Reseed
# ===================================================================
Write-Host ''
Write-Host '-- Phase D: Hourly Reset & Reseed ------------------------' -ForegroundColor Magenta

# TEST 11: Run reset
Write-Host 'TEST 11: Run hourly reset script...' -ForegroundColor Yellow
$reset_out = docker exec $MYSQL bash $RESET_SCRIPT 2>&1
if ($reset_out -match 'reset complete') {
    Test-Pass 'Reset completed successfully'
}
elseif ($reset_out -match 'rror') {
    $errs = $reset_out | Where-Object { $_ -match 'rror' } | Select-Object -First 3
    Test-Fail ('Reset error: ' + ($errs -join ' | '))
}
else {
    Test-Fail 'Reset did not complete'
}

# TEST 12: Expired user deleted
Write-Host 'TEST 12: Expired trial user purged by reset...' -ForegroundColor Yellow
if ($TRIAL_ID -gt 0) {
    $exists = Get-SQLInt "SELECT COUNT(*) FROM users WHERE users_id = $TRIAL_ID;"
    if ($exists -eq 0) {
        Test-Pass "Expired user id=$TRIAL_ID deleted by reset"
    }
    else {
        Test-Fail "Expired user id=$TRIAL_ID still exists"
    }
}
else {
    Test-Skip 'No trial user'
}

# TEST 13: Same email can re-register after purge
Write-Host 'TEST 13: Same email can re-register after purge...' -ForegroundColor Yellow
if ($TRIAL_ID -gt 0) {
    # Clean rate limit for this test
    Invoke-SQL "DELETE FROM trial_signups WHERE email = '$TEST_EMAIL';" | Out-Null
    $rereg = Invoke-API 'POST' '/auth/register_trial.php' @{
        trial_name = 'Comeback User'; trial_email = $TEST_EMAIL; trial_phone = '+201888888888'
    }
    if ($rereg -and $rereg.status -eq 'success' -and $rereg.data.user_id) {
        $NEW_ID = [int]$rereg.data.user_id
        Test-Pass "Re-registration succeeded - new id=$NEW_ID (old was $TRIAL_ID)"
        # Clean up: remove the re-registered user so test is idempotent
        Invoke-SQL "DELETE FROM users WHERE users_id = $NEW_ID;" | Out-Null
    }
    else {
        Test-Fail ('Re-registration failed: ' + ($rereg | ConvertTo-Json -Compress))
    }
}
else {
    Test-Skip 'No trial user to re-register'
}

# TEST 14: Permanent users intact
Write-Host 'TEST 14: Permanent users survive reset...' -ForegroundColor Yellow
$perm = Get-SQLInt 'SELECT COUNT(*) FROM users WHERE users_is_demo = 0;'
if ($perm -ge 4) {
    Test-Pass "$perm permanent users intact (Admin, Ahmed, Sara, Omar)"
}
else {
    Test-Fail "Only $perm permanent users (expected >= 4)"
}

# TEST 15: Demo data fully restored
Write-Host 'TEST 15: Demo data fully restored after reset...' -ForegroundColor Yellow
$clients = Get-SQLInt 'SELECT COUNT(*) FROM clients;'
$products = Get-SQLInt 'SELECT COUNT(*) FROM products;'
$accounts = Get-SQLInt 'SELECT COUNT(*) FROM accounts;'
$attend = Get-SQLInt 'SELECT COUNT(*) FROM representative_attendance;'
$safes = Get-SQLInt 'SELECT COUNT(*) FROM user_safes;'
$all_ok = ($clients -ge 50) -and ($products -ge 15) -and ($accounts -ge 13) -and ($attend -ge 12) -and ($safes -ge 3)
if ($all_ok) {
    Test-Pass "Data OK: clients=$clients products=$products accounts=$accounts attendance=$attend safes=$safes"
}
else {
    Test-Fail "Data counts wrong: clients=$clients products=$products accounts=$accounts attendance=$attend safes=$safes"
}

# ===================================================================
# FINAL CLEANUP & SUMMARY
# ===================================================================
Invoke-SQL "DELETE FROM trial_signups WHERE email = '$TEST_EMAIL';" | Out-Null
Invoke-SQL "DELETE FROM users WHERE users_email = '$TEST_EMAIL';" | Out-Null

Write-Host ''
Write-Host '=============================================================' -ForegroundColor Cyan
$total = $pass_count + $fail_count
$pct = 0
if ($total -gt 0) { $pct = [math]::Round(($pass_count / $total) * 100) }
$skipText = ''
if ($skip_count -gt 0) { $skipText = " [$skip_count skipped]" }
$color = 'Green'
if ($fail_count -gt 0) { $color = 'Red' }
Write-Host "  RESULTS: $pass_count/$total passed ($pct%)$skipText" -ForegroundColor $color
if ($fail_count -gt 0) {
    Write-Host "  $fail_count test(s) FAILED" -ForegroundColor Red
}
else {
    Write-Host '  ALL TESTS PASSED' -ForegroundColor Green
}
Write-Host '=============================================================' -ForegroundColor Cyan
Write-Host ''

exit $fail_count
