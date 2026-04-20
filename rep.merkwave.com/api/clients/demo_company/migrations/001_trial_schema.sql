-- ================================================================
-- RepWave Demo Tenant — Schema Migration
-- Run this on demo_company_db AFTER importing the base schema
-- from template_company_db (structure only, no data).
--
-- Usage:
--   1. mysqldump -u root -p template_company_db --no-data > schema.sql
--   2. mysql -u root -p demo_company_db < schema.sql
--   3. mysql -u root -p demo_company_db < 001_trial_schema.sql
-- ================================================================

-- ── 1. Add trial expiry column to users table ─────────────────────
-- (Skip if already exists — safe to re-run via the procedure below)
DROP PROCEDURE IF EXISTS add_trial_columns;
DELIMITER //
CREATE PROCEDURE add_trial_columns()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'users_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN users_expires_at DATETIME NULL DEFAULT NULL
      COMMENT 'NULL = permanent account. NOT NULL = trial expiry timestamp';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'users_is_demo'
  ) THEN
    ALTER TABLE users ADD COLUMN users_is_demo TINYINT(1) NOT NULL DEFAULT 0
      COMMENT '1 = created via Try Now form, 0 = seeded/permanent demo user';
  END IF;
END //
DELIMITER ;
CALL add_trial_columns();
DROP PROCEDURE IF EXISTS add_trial_columns;

-- ── 3. Create trial_signups table for rate limiting & analytics ───
CREATE TABLE IF NOT EXISTS trial_signups (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ip_address      VARCHAR(45)   NOT NULL,
    email           VARCHAR(255)  NOT NULL,
    full_name       VARCHAR(100)  NOT NULL DEFAULT '',
    phone           VARCHAR(30)   NOT NULL DEFAULT '',
    company_name    VARCHAR(200)  NOT NULL DEFAULT '',
    user_id         INT UNSIGNED  NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_date  (ip_address, created_at),
    INDEX idx_email    (email),
    INDEX idx_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Insert demo tenant settings ───────────────────────────────
INSERT INTO settings (settings_key, settings_value, settings_description, settings_type)
VALUES
  ('expiration_date',    '2099-12-31', 'Demo tenant system expiry (effectively never)', 'string'),
  ('users_limits',       '9999',       'No practical limit on demo trial users',        'string'),
  ('demo_trial_days',    '6',          'Trial duration in days',                        'string'),
  ('demo_max_per_ip',    '3',          'Max trial signups per IP per day',              'string'),
  ('company_name',       'Nile Foods Demo Co.', 'Demo company display name',            'string'),
  ('company_currency',   'EGP',        'Default currency for demo',                     'string')
ON DUPLICATE KEY UPDATE settings_value = VALUES(settings_value);

-- ── 5. Create index for efficient expiry checks (skip if exists) ─
DROP PROCEDURE IF EXISTS add_trial_indexes;
DELIMITER //
CREATE PROCEDURE add_trial_indexes()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_expires'
  ) THEN
    ALTER TABLE users ADD INDEX idx_users_expires (users_expires_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_demo'
  ) THEN
    ALTER TABLE users ADD INDEX idx_users_demo (users_is_demo);
  END IF;
END //
DELIMITER ;
CALL add_trial_indexes();
DROP PROCEDURE IF EXISTS add_trial_indexes;

-- ════════════════════════════════════════════════════════════════
-- Migration complete. Now run demo_seed.sql to populate dummy data.
-- ════════════════════════════════════════════════════════════════

-- ── 6. Add missing purchase_returns_reason column ────────────────
DROP PROCEDURE IF EXISTS add_purchase_returns_reason;
DELIMITER //
CREATE PROCEDURE add_purchase_returns_reason()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_returns' AND COLUMN_NAME = 'purchase_returns_reason'
  ) THEN
    ALTER TABLE purchase_returns ADD COLUMN purchase_returns_reason TEXT NULL AFTER purchase_returns_notes;
  END IF;
END //
DELIMITER ;
CALL add_purchase_returns_reason();
DROP PROCEDURE IF EXISTS add_purchase_returns_reason;

-- ── 7. Add missing columns for purchase_returns, safe_transactions, supplier_payments ──
DROP PROCEDURE IF EXISTS add_schema_v2_columns;
DELIMITER //
CREATE PROCEDURE add_schema_v2_columns()
BEGIN
  -- purchase_returns extra columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_returns' AND COLUMN_NAME = 'purchase_returns_created_by_user_id') THEN
    ALTER TABLE purchase_returns ADD COLUMN purchase_returns_created_by_user_id INT UNSIGNED NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_returns' AND COLUMN_NAME = 'purchase_returns_updated_at') THEN
    ALTER TABLE purchase_returns ADD COLUMN purchase_returns_updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_returns' AND COLUMN_NAME = 'purchase_returns_odoo_picking_id') THEN
    ALTER TABLE purchase_returns ADD COLUMN purchase_returns_odoo_picking_id INT NULL;
  END IF;
  -- safe_transactions extra columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'safe_transactions' AND COLUMN_NAME = 'safe_transactions_related_id') THEN
    ALTER TABLE safe_transactions ADD COLUMN safe_transactions_related_id INT UNSIGNED NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'safe_transactions' AND COLUMN_NAME = 'safe_transactions_approved_by') THEN
    ALTER TABLE safe_transactions ADD COLUMN safe_transactions_approved_by INT UNSIGNED NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'safe_transactions' AND COLUMN_NAME = 'safe_transactions_odoo_id') THEN
    ALTER TABLE safe_transactions ADD COLUMN safe_transactions_odoo_id INT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'safe_transactions' AND COLUMN_NAME = 'safe_transactions_approved_date') THEN
    ALTER TABLE safe_transactions ADD COLUMN safe_transactions_approved_date TIMESTAMP NULL;
  END IF;
  -- supplier_payments extra columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_payments' AND COLUMN_NAME = 'supplier_payments_transaction_id') THEN
    ALTER TABLE supplier_payments ADD COLUMN supplier_payments_transaction_id VARCHAR(200) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_payments' AND COLUMN_NAME = 'supplier_payments_rep_user_id') THEN
    ALTER TABLE supplier_payments ADD COLUMN supplier_payments_rep_user_id INT UNSIGNED NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_payments' AND COLUMN_NAME = 'supplier_payments_safe_transaction_id') THEN
    ALTER TABLE supplier_payments ADD COLUMN supplier_payments_safe_transaction_id INT UNSIGNED NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_payments' AND COLUMN_NAME = 'supplier_payments_type') THEN
    ALTER TABLE supplier_payments ADD COLUMN supplier_payments_type VARCHAR(50) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_payments' AND COLUMN_NAME = 'supplier_payments_odoo_id') THEN
    ALTER TABLE supplier_payments ADD COLUMN supplier_payments_odoo_id INT NULL;
  END IF;
END //
DELIMITER ;
CALL add_schema_v2_columns();
DROP PROCEDURE IF EXISTS add_schema_v2_columns;

-- ── 8. Create purchase_return_items table if missing ──────────────
CREATE TABLE IF NOT EXISTS purchase_return_items (
  purchase_return_items_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  purchase_return_items_return_id INT UNSIGNED NOT NULL,
  purchase_return_items_purchase_order_item_id INT UNSIGNED NULL,
  purchase_return_items_quantity INT NOT NULL DEFAULT 0,
  purchase_return_items_unit_cost DECIMAL(15,2) NULL DEFAULT 0.00,
  purchase_return_items_total_cost DECIMAL(15,2) NULL DEFAULT 0.00,
  purchase_return_items_notes TEXT NULL,
  purchase_return_items_created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_return_id (purchase_return_items_return_id),
  INDEX idx_order_item_id (purchase_return_items_purchase_order_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
