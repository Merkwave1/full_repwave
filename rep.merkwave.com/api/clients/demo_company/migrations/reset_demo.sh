#!/bin/bash
# ================================================================
# reset_demo.sh — Hourly demo tenant data reset
#
# Purpose:
#   Shared demo database that any visitor can use freely.
#   Resets ALL business data every hour so no one's changes
#   accumulate.  Users table is PRESERVED so active 7-day trial
#   accounts keep working across resets.
#
# What is RESET (truncated + re-seeded) every run:
#   All sales, purchases, inventory, financials, visits, notifications
#
# What is PRESERVED across runs:
#   - users          (active trial accounts + permanent demo users)
#   - settings       (system config)
#   - trial_signups  (rate-limit analytics, older than 7 days cleaned)
#   - login_logs     (older than 7 days cleaned)
#
# ⚠️  TRIAL DURATION REMINDER:
#     If you change the trial expiry window, update BOTH:
#       1.  TRIAL_DAYS constant in auth/register_trial.php
#       2.  'demo_trial_days' in demo_seed.sql Settings section
#     Trial expiry check lives in auth/login.php.
#     Search for "TRIAL EXPIRY CHECK" to find it fast.
#
# Cron schedules:
#   The reset script must run inside the mysql container (which has the mysql client).
#   The migrations folder is mounted at /demo_migrations in the mysql container.
#
#   Every hour from Linux host:
#     0 * * * * docker exec repwave_share_mysql bash /demo_migrations/reset_demo.sh >> /var/log/reset_demo.log 2>&1
#
#   Install cron on Linux host and add the above line with: crontab -e
#
# ================================================================

set -euo pipefail

DB_HOST="${DEMO_DB_HOST:-localhost}"
DB_USER="${DEMO_DB_USER:-demo_company_user}"
DB_PASS="${DEMO_DB_PASS:-demo_company_secure_pass}"
DB_NAME="${DEMO_DB_NAME:-demo_company_db}"
SEED_FILE="${DEMO_SEED_FILE:-/demo_migrations/demo_seed.sql}"

MYSQL_CMD="mysql -h${DB_HOST} -u${DB_USER} -p${DB_PASS} ${DB_NAME}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ─── Starting hourly demo reset ───"

# ── 1. Delete expired trial accounts ────────────────────────────────
# Users whose 7-day trial window has passed are removed.
# Permanent demo users (users_expires_at IS NULL) are never deleted.
# ⚠️  If TRIAL_DAYS changes, this query still works automatically because
#     it compares against users_expires_at stored at registration time.
echo "[$(date '+%H:%M:%S')] Step 1: Cleaning expired trial accounts..."
${MYSQL_CMD} <<'EOF'
DELETE FROM users
WHERE users_expires_at IS NOT NULL
  AND users_expires_at < NOW();
EOF
echo "[$(date '+%H:%M:%S')] ✓ Expired accounts removed."

# ── 2. Clean old audit log records (>7 days) ────────────────────────
echo "[$(date '+%H:%M:%S')] Step 2: Cleaning old rate-limit / audit logs..."
${MYSQL_CMD} <<'EOF'
DELETE FROM trial_signups WHERE created_at < NOW() - INTERVAL 7 DAY;
DELETE FROM login_logs    WHERE login_logs_created_at < NOW() - INTERVAL 7 DAY;
EOF
echo "[$(date '+%H:%M:%S')] ✓ Old logs cleaned."

# ── 3. Truncate ALL business data tables ────────────────────────────
echo "[$(date '+%H:%M:%S')] Step 3: Truncating business data..."
${MYSQL_CMD} <<'EOF'
SET FOREIGN_KEY_CHECKS = 0;

-- ── Sales ──────────────────────────────────────────────────────────
TRUNCATE TABLE sales_orders;
TRUNCATE TABLE sales_order_items;
TRUNCATE TABLE invoices;
TRUNCATE TABLE sales_deliveries;
TRUNCATE TABLE sales_delivery_items;
TRUNCATE TABLE sales_returns;
TRUNCATE TABLE sales_return_items;

-- ── Purchasing ─────────────────────────────────────────────────────
TRUNCATE TABLE purchase_orders;
TRUNCATE TABLE purchase_order_items;
TRUNCATE TABLE goods_receipts;
TRUNCATE TABLE goods_receipt_items;
TRUNCATE TABLE purchase_returns;

-- ── Supplier Payments ──────────────────────────────────────────────
TRUNCATE TABLE supplier_payments;

-- ── Inventory ──────────────────────────────────────────────────────
TRUNCATE TABLE inventory;

-- ── Financials ─────────────────────────────────────────────────────
TRUNCATE TABLE invoices;
TRUNCATE TABLE payments;
TRUNCATE TABLE refunds;
TRUNCATE TABLE financial_transactions;
TRUNCATE TABLE safe_transactions;

-- ── Visits & Field Activity ────────────────────────────────────────
TRUNCATE TABLE visits;
TRUNCATE TABLE visit_activities;
TRUNCATE TABLE visit_plans;
TRUNCATE TABLE visit_plan_clients;
TRUNCATE TABLE representative_attendance;
TRUNCATE TABLE attendance_break_logs;
TRUNCATE TABLE notifications;

-- ── Reference / Lookup tables (re-seeded fresh) ───────────────────
TRUNCATE TABLE clients;
TRUNCATE TABLE client_interested_products;
TRUNCATE TABLE suppliers;
TRUNCATE TABLE products;
TRUNCATE TABLE product_variants;
TRUNCATE TABLE product_attributes;
TRUNCATE TABLE product_attribute_values;
TRUNCATE TABLE product_variant_attribute_map;
TRUNCATE TABLE product_preferred_packaging;
TRUNCATE TABLE categories;
TRUNCATE TABLE base_units;
TRUNCATE TABLE packaging_types;
TRUNCATE TABLE warehouse;
TRUNCATE TABLE safes;
TRUNCATE TABLE accounts;
TRUNCATE TABLE payment_methods;
TRUNCATE TABLE user_safes;
TRUNCATE TABLE user_warehouses;
TRUNCATE TABLE representative_settings;

-- ── Versions reset (clients will re-pull) ─────────────────────────
TRUNCATE TABLE versions;

-- ── Preserved: users (active trials + permanent demo), settings, trial_signups, login_logs ──
-- Permanent demo users are re-inserted by seed via ON DUPLICATE KEY

SET FOREIGN_KEY_CHECKS = 1;
EOF
echo "[$(date '+%H:%M:%S')] ✓ Business data truncated."

# ── 4. Re-seed from static snapshot ────────────────────────────────
echo "[$(date '+%H:%M:%S')] Step 4: Re-seeding demo data..."
if [ ! -f "${SEED_FILE}" ]; then
    echo "[$(date '+%H:%M:%S')] ✗ ERROR: Seed file not found: ${SEED_FILE}"
    exit 1
fi

${MYSQL_CMD} < "${SEED_FILE}"

if [ $? -eq 0 ]; then
    echo "[$(date '+%H:%M:%S')] ✓ Demo data re-seeded successfully."
else
    echo "[$(date '+%H:%M:%S')] ✗ ERROR: Seed import FAILED"
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ─── Hourly demo reset complete ───"
echo ""
