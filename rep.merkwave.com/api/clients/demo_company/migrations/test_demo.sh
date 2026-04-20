#!/bin/bash
# ================================================================
# test_demo.sh — End-to-end automated tests for the demo tenant
#
# Tests performed:
#   1.  Register a new trial user (POST register_trial.php)
#   2.  Login with new user → must succeed (trial is active)
#   3.  Attempt password change → must be blocked (demo restriction)
#   4.  Wait 30 seconds, then login again → must still succeed
#       (30 sec ≪ trial window, just verifying session still works)
#   5.  Manually expire that user in DB → login must now FAIL
#   6.  Run reset_demo.sh → verify DB row counts are restored
#   7.  Verify permanent demo users still exist after reset
#   8.  Verify the just-registered trial user was deleted (was expired)
#
# ---
#  ⚠️  TRIAL DURATION CHANGE — read this before running tests:
#      This script tests with a 30-second window (step 5 manually
#      expires the user).  When TRIAL_DAYS changes in register_trial.php,
#      you do NOT need to change anything in this script because
#      step 5 just sets users_expires_at = NOW() - INTERVAL 1 SECOND
#      directly in MySQL — it does not depend on the constant.
#
#  ⚠️  RESET INTERVAL CHANGE:
#      If the cron interval changes from 1 hour, update the comment
#      in reset_demo.sh.  This test script always calls reset_demo.sh
#      directly so it works regardless of cron.
# ---
#
# Usage (inside the PHP container):
#   bash /var/www/html/api/clients/demo_company/migrations/test_demo.sh
#
# Usage (from Docker host):
#   docker exec <php_container> bash /var/www/html/api/clients/demo_company/migrations/test_demo.sh
#
# Requirements:
#   - curl, jq, mysql client available in the container
#   - DEMO_API_URL env var, or defaults to http://localhost/api/clients/demo_company
# ================================================================

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────
API_BASE="${DEMO_API_URL:-http://localhost/api/clients/demo_company}"
DB_HOST="${DEMO_DB_HOST:-mysql}"
DB_USER="${DEMO_DB_USER:-demo_company_user}"
DB_PASS="${DEMO_DB_PASS:-demo_company_secure_pass}"
DB_NAME="${DEMO_DB_NAME:-demo_company_db}"
RESET_SCRIPT="${DEMO_SEED_FILE:+$(dirname ${DEMO_SEED_FILE})}/reset_demo.sh"
RESET_SCRIPT="${RESET_SCRIPT:-/var/www/html/api/clients/demo_company/migrations/reset_demo.sh}"
MYSQL_CMD="mysql -h${DB_HOST} -u${DB_USER} -p${DB_PASS} ${DB_NAME} -e"

PASS=0
FAIL=0
TEST_EMAIL="autotest_$(date +%s)@demo-test.local"
TEST_NAME="Auto Test User"

# ── Helpers ──────────────────────────────────────────────────────
ok()   { echo "[PASS] $*"; PASS=$((PASS+1)); }
fail() { echo "[FAIL] $*"; FAIL=$((FAIL+1)); }
section() { echo ""; echo "═══ $* ═══"; }
json_field() { echo "$1" | jq -r ".$2 // empty" 2>/dev/null || echo ""; }

# ── Test 1: Register a new trial user ────────────────────────────
section "1. Register new trial user"
echo "  Email: ${TEST_EMAIL}"
REG=$(curl -s -X POST "${API_BASE}/auth/register_trial.php" \
  -d "trial_name=${TEST_NAME}" \
  -d "trial_email=${TEST_EMAIL}" \
  -d "trial_phone=+201999999999" \
  -d "trial_company=Test Co")

echo "  Response: $(echo "$REG" | jq -c .)"
REG_STATUS=$(json_field "$REG" "status")
TEST_PASSWORD=$(json_field "$REG" "data.password")
TEST_USER_ID=$(json_field "$REG" "data.user_id")

if [ "$REG_STATUS" = "success" ] && [ -n "$TEST_PASSWORD" ]; then
  ok "Registration succeeded — user_id=${TEST_USER_ID}, password=${TEST_PASSWORD}"
else
  fail "Registration failed — status=${REG_STATUS}"
  echo "  Full response: $REG"
  # Cannot continue without a user
  echo ""
  echo "═══ Aborting: registration prerequisite failed ═══"
  exit 1
fi

# ── Test 2: Login with the new trial user ────────────────────────
section "2. Login with active trial account"
LOGIN1=$(curl -s -X POST "${API_BASE}/auth/login.php" \
  -d "users_email=${TEST_EMAIL}" \
  -d "users_password=${TEST_PASSWORD}" \
  -d "login_type=rep")

echo "  Response: $(echo "$LOGIN1" | jq -c .)"
LOGIN1_STATUS=$(json_field "$LOGIN1" "status")
if [ "$LOGIN1_STATUS" = "success" ]; then
  ok "Login succeeded (active trial)"
else
  fail "Login failed for active trial — status=${LOGIN1_STATUS}"
fi

# ── Test 3: Password change must be blocked ───────────────────────
section "3. Attempt password change (should be denied)"
CHG=$(curl -s -X POST "${API_BASE}/auth/change_password.php" \
  -d "users_email=${TEST_EMAIL}" \
  -d "old_password=${TEST_PASSWORD}" \
  -d "new_password=NewPass999")

echo "  Response: $(echo "$CHG" | jq -c .)"
CHG_STATUS=$(json_field "$CHG" "status")
CHG_DEMO=$(json_field "$CHG" "data.demo_restriction")
if [ "$CHG_STATUS" = "failure" ] && [ "$CHG_DEMO" = "true" ]; then
  ok "Password change correctly blocked (demo_restriction=true)"
else
  fail "Password change block test — expected failure+demo_restriction, got status=${CHG_STATUS}"
fi

# ── Test 4: Wait 30 sec, re-login — should still work ────────────
section "4. Re-login after 30 seconds (trial must still be valid)"
echo "  Waiting 30 seconds..."
sleep 30

LOGIN2=$(curl -s -X POST "${API_BASE}/auth/login.php" \
  -d "users_email=${TEST_EMAIL}" \
  -d "users_password=${TEST_PASSWORD}" \
  -d "login_type=rep")

echo "  Response: $(echo "$LOGIN2" | jq -c .)"
LOGIN2_STATUS=$(json_field "$LOGIN2" "status")
if [ "$LOGIN2_STATUS" = "success" ]; then
  ok "Re-login after 30 sec succeeded (trial still active)"
else
  fail "Re-login after 30 sec failed — trial should still be active — status=${LOGIN2_STATUS}"
fi

# ── Test 5: Manually expire the user, then login must fail ───────
section "5. Expire trial — login must be blocked"
echo "  Expiring user ${TEST_USER_ID} in DB..."
${MYSQL_CMD} "UPDATE users SET users_expires_at = NOW() - INTERVAL 1 SECOND WHERE users_id = ${TEST_USER_ID};"

LOGIN3=$(curl -s -X POST "${API_BASE}/auth/login.php" \
  -d "users_email=${TEST_EMAIL}" \
  -d "users_password=${TEST_PASSWORD}" \
  -d "login_type=rep")

echo "  Response: $(echo "$LOGIN3" | jq -c .)"
LOGIN3_STATUS=$(json_field "$LOGIN3" "status")
LOGIN3_EXPIRED=$(json_field "$LOGIN3" "data.trial_expired")
if [ "$LOGIN3_STATUS" = "failure" ] && [ "$LOGIN3_EXPIRED" = "true" ]; then
  ok "Expired trial correctly blocked login (trial_expired=true)"
else
  fail "Expired trial login block test — expected failure+trial_expired, got status=${LOGIN3_STATUS}"
fi

# ── Test 6: Run reset script ──────────────────────────────────────
section "6. Run hourly reset script"

# Count rows before reset
CLIENTS_BEFORE=$(${MYSQL_CMD} "SELECT COUNT(*) FROM clients;" --skip-column-names 2>/dev/null)
echo "  Clients before reset: ${CLIENTS_BEFORE}"

# Verify test user exists before reset
USER_BEFORE=$(${MYSQL_CMD} "SELECT COUNT(*) FROM users WHERE users_id=${TEST_USER_ID};" --skip-column-names 2>/dev/null)
echo "  Expired test user exists before reset: ${USER_BEFORE}"

if [ -f "$RESET_SCRIPT" ]; then
  bash "$RESET_SCRIPT"
  RESET_EXIT=$?
else
  fail "Reset script not found at: ${RESET_SCRIPT}"
  RESET_EXIT=1
fi

if [ $RESET_EXIT -eq 0 ]; then
  ok "Reset script ran without error"
else
  fail "Reset script returned exit code ${RESET_EXIT}"
fi

# ── Test 7: Verify permanent demo users still exist after reset ───
section "7. Permanent demo users preserved after reset"
ADMIN_OK=$(${MYSQL_CMD} "SELECT COUNT(*) FROM users WHERE users_email='admin@demo.repwave.local' AND users_expires_at IS NULL;" --skip-column-names 2>/dev/null)
AHMED_OK=$(${MYSQL_CMD} "SELECT COUNT(*) FROM users WHERE users_email='ahmed@demo.repwave.local' AND users_expires_at IS NULL;" --skip-column-names 2>/dev/null)
SARA_OK=$( ${MYSQL_CMD} "SELECT COUNT(*) FROM users WHERE users_email='sara@demo.repwave.local'  AND users_expires_at IS NULL;" --skip-column-names 2>/dev/null)

if [ "$ADMIN_OK" = "1" ]; then ok "Admin demo user present"; else fail "Admin demo user MISSING after reset"; fi
if [ "$AHMED_OK" = "1" ]; then ok "Ahmed demo user present"; else fail "Ahmed demo user MISSING after reset"; fi
if [ "$SARA_OK"  = "1" ]; then ok "Sara demo user present";  else fail "Sara demo user MISSING after reset"; fi

# ── Test 8: Expired trial user deleted by reset ───────────────────
section "8. Expired trial user removed by reset"
USER_AFTER=$(${MYSQL_CMD} "SELECT COUNT(*) FROM users WHERE users_id=${TEST_USER_ID};" --skip-column-names 2>/dev/null)
if [ "$USER_AFTER" = "0" ]; then
  ok "Expired trial user (id=${TEST_USER_ID}) was cleaned up by reset"
else
  fail "Expired trial user (id=${TEST_USER_ID}) still exists after reset (expected deletion)"
fi

# ── Test 9: Business data restored ────────────────────────────────
section "9. Business data restored after reset"
CLIENTS_AFTER=$(${MYSQL_CMD} "SELECT COUNT(*) FROM clients;" --skip-column-names 2>/dev/null)
PRODUCTS_AFTER=$(${MYSQL_CMD} "SELECT COUNT(*) FROM products;" --skip-column-names 2>/dev/null)
VISITS_AFTER=$(${MYSQL_CMD} "SELECT COUNT(*) FROM visits;" --skip-column-names 2>/dev/null)

echo "  clients=${CLIENTS_AFTER}, products=${PRODUCTS_AFTER}, visits=${VISITS_AFTER}"

if [ "$CLIENTS_AFTER" -ge 50 ]; then ok "Clients restored (${CLIENTS_AFTER} rows)"; else fail "Clients not restored — only ${CLIENTS_AFTER} rows"; fi
if [ "$PRODUCTS_AFTER" -ge 15 ]; then ok "Products restored (${PRODUCTS_AFTER} rows)"; else fail "Products not restored — only ${PRODUCTS_AFTER} rows"; fi
if [ "$VISITS_AFTER" -ge 15 ]; then ok "Visits restored (${VISITS_AFTER} rows)"; else fail "Visits not restored — only ${VISITS_AFTER} rows"; fi

# ── Summary ───────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  RESULTS: ${PASS} passed, ${FAIL} failed"
echo "═══════════════════════════════════════════════════"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
exit 0
