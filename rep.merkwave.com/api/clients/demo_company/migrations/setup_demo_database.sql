-- ================================================================
-- setup_demo_database.sql
-- Complete setup for demo_company_db
--
-- Run order:
--   1. This file creates the DB, user, and ALL tables
--      (imports template schema + adds demo-specific tables)
--   2. 001_trial_schema.sql  – adds trial columns to users
--   3. demo_seed.sql         – populates all tables with demo data
--
-- Used by docker-compose as an init script on FRESH volumes:
--   volumes:
--     - ./api/clients/demo_company/migrations/setup_demo_database.sql
--       :/docker-entrypoint-initdb.d/02_demo_setup.sql:ro
--
-- Can also be applied manually at any time (idempotent):
--   docker exec repwave_share_mysql mysql -uroot -prootpass < setup_demo_database.sql
-- ================================================================

-- ── Create database + user ────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS `demo_company_db`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'demo_company_user'@'%'
  IDENTIFIED BY 'demo_company_secure_pass';

GRANT ALL PRIVILEGES ON `demo_company_db`.* TO 'demo_company_user'@'%';
FLUSH PRIVILEGES;

USE `demo_company_db`;
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ══════════════════════════════════════════════════════════════════
--  MISSING TABLES NOT IN TEMPLATE SCHEMA
--  (representative workflow, accounts, user assignments)
-- ══════════════════════════════════════════════════════════════════

-- ── accounts (chart of accounts) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `accounts` (
  `accounts_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code`        VARCHAR(50)  NOT NULL UNIQUE,
  `name`        VARCHAR(200) NOT NULL,
  `type`        VARCHAR(50)  NOT NULL COMMENT 'asset/liability/equity/income/expense',
  `sortid`      INT UNSIGNED DEFAULT 0,
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── representative_settings ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `representative_settings` (
  `rep_settings_id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`                      INT UNSIGNED NOT NULL UNIQUE,
  `work_start_latitude`          DOUBLE       DEFAULT NULL,
  `work_start_longitude`         DOUBLE       DEFAULT NULL,
  `work_end_latitude`            DOUBLE       DEFAULT NULL,
  `work_end_longitude`           DOUBLE       DEFAULT NULL,
  `gps_min_acceptable_accuracy_m` INT UNSIGNED DEFAULT 100,
  `gps_tracking_interval_sec`    INT UNSIGNED DEFAULT 300,
  `gps_tracking_enabled`         TINYINT(1)   NOT NULL DEFAULT 1,
  `allow_out_of_plan_visits`     TINYINT(1)   NOT NULL DEFAULT 1,
  `allow_start_work_from_anywhere` TINYINT(1) NOT NULL DEFAULT 1,
  `allow_end_work_from_anywhere`   TINYINT(1) NOT NULL DEFAULT 1,
  `allow_start_visit_from_anywhere` TINYINT(1) NOT NULL DEFAULT 1,
  `allow_end_visit_from_anywhere`   TINYINT(1) NOT NULL DEFAULT 1,
  `rep_settings_updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── representative_attendance ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `representative_attendance` (
  `attendance_id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`                  INT UNSIGNED NOT NULL,
  `attendance_date`          DATE         NOT NULL,
  `shift_start_time`         DATETIME     DEFAULT NULL,
  `shift_end_time`           DATETIME     DEFAULT NULL,
  `start_latitude`           DOUBLE       DEFAULT NULL,
  `start_longitude`          DOUBLE       DEFAULT NULL,
  `end_latitude`             DOUBLE       DEFAULT NULL,
  `end_longitude`            DOUBLE       DEFAULT NULL,
  `total_work_duration_sec`  INT UNSIGNED DEFAULT 0,
  `attendance_status`        VARCHAR(20)  NOT NULL DEFAULT 'ClockedIn'
                             COMMENT 'ClockedIn | Paused | ClockedOut',
  `created_at`               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_date (user_id, attendance_date),
  INDEX idx_date (attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── attendance_break_logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `attendance_break_logs` (
  `break_log_id`      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `attendance_id`     INT UNSIGNED NOT NULL,
  `break_type`        VARCHAR(20)  NOT NULL COMMENT 'Pause | Resume',
  `break_timestamp`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `break_reason`      VARCHAR(500) DEFAULT NULL,
  INDEX idx_attendance (attendance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── user_safes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_safes` (
  `user_safe_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`      INT UNSIGNED NOT NULL,
  `safe_id`      INT UNSIGNED NOT NULL,
  `created_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_safe (user_id, safe_id),
  INDEX idx_user (user_id),
  INDEX idx_safe (safe_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── user_warehouses ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_warehouses` (
  `user_warehouse_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`           INT UNSIGNED NOT NULL,
  `warehouse_id`      INT UNSIGNED NOT NULL,
  `created_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_warehouse (user_id, warehouse_id),
  INDEX idx_user (user_id),
  INDEX idx_warehouse (warehouse_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── supplier_payments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `supplier_payments` (
  `supplier_payments_id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `supplier_payments_supplier_id`         INT UNSIGNED NOT NULL,
  `supplier_payments_method_id`           INT UNSIGNED DEFAULT NULL,
  `supplier_payments_amount`              DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `supplier_payments_date`                DATE         NOT NULL,
  `supplier_payments_safe_id`             INT UNSIGNED DEFAULT NULL,
  `supplier_payments_purchase_order_id`   INT UNSIGNED DEFAULT NULL,
  `supplier_payments_notes`               TEXT         DEFAULT NULL,
  `supplier_payments_status`              VARCHAR(30)  NOT NULL DEFAULT 'paid'
                                          COMMENT 'paid | partial | pending | cancelled',
  `supplier_payments_created_by_user_id`  INT UNSIGNED DEFAULT NULL,
  `supplier_payments_created_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `supplier_payments_updated_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supplier (supplier_payments_supplier_id),
  INDEX idx_date      (supplier_payments_date),
  INDEX idx_status    (supplier_payments_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── trial_signups (demo-only: rate limiting + analytics) ─────────
CREATE TABLE IF NOT EXISTS `trial_signups` (
  `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ip_address`   VARCHAR(45)  NOT NULL,
  `email`        VARCHAR(255) NOT NULL,
  `full_name`    VARCHAR(100) NOT NULL DEFAULT '',
  `phone`        VARCHAR(30)  NOT NULL DEFAULT '',
  `company_name` VARCHAR(200) NOT NULL DEFAULT '',
  `user_id`      INT UNSIGNED NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_date (ip_address, created_at),
  INDEX idx_email   (email),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Transfers: add missing FK columns (upgrade existing minimal schema) ──────
ALTER TABLE transfers
  ADD COLUMN IF NOT EXISTS transfer_source_warehouse_id      INT UNSIGNED,
  ADD COLUMN IF NOT EXISTS transfer_destination_warehouse_id INT UNSIGNED,
  ADD COLUMN IF NOT EXISTS transfer_initiated_by_user_id     INT UNSIGNED,
  ADD COLUMN IF NOT EXISTS transfer_created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS transfer_updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE transfer_requests
  ADD COLUMN IF NOT EXISTS request_source_warehouse_id      INT UNSIGNED,
  ADD COLUMN IF NOT EXISTS request_destination_warehouse_id INT UNSIGNED,
  ADD COLUMN IF NOT EXISTS request_created_by_user_id       INT UNSIGNED,
  ADD COLUMN IF NOT EXISTS request_created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS `transfer_request_items` (
  `request_item_id`     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `request_id`          INT UNSIGNED NOT NULL,
  `variant_id`          INT UNSIGNED,
  `packaging_type_id`   INT UNSIGNED,
  `requested_quantity`  DECIMAL(10,2) DEFAULT 0,
  `request_item_note`   TEXT,
  FOREIGN KEY (`request_id`) REFERENCES `transfer_requests`(`request_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transfer_items` (
  `transfer_item_id`       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `transfer_id`            INT UNSIGNED NOT NULL,
  `inventory_id`           INT UNSIGNED,
  `transfer_item_quantity` DECIMAL(10,2) DEFAULT 0,
  FOREIGN KEY (`transfer_id`) REFERENCES `transfers`(`transfer_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── transfer_requests: add admin note + updated_at columns ───────
ALTER TABLE transfer_requests
  ADD COLUMN IF NOT EXISTS request_admin_note TEXT,
  ADD COLUMN IF NOT EXISTS request_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ── goods_receipt_items: rename to short column names expected by PHP ─
-- Rename primary key
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'goods_receipt_items' AND COLUMN_NAME = 'goods_receipt_items_id');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE goods_receipt_items RENAME COLUMN goods_receipt_items_id TO goods_receipt_item_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'goods_receipt_items' AND COLUMN_NAME = 'goods_receipt_items_goods_receipt_id');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE goods_receipt_items RENAME COLUMN goods_receipt_items_goods_receipt_id TO goods_receipt_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'goods_receipt_items' AND COLUMN_NAME = 'goods_receipt_items_variant_id');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE goods_receipt_items RENAME COLUMN goods_receipt_items_variant_id TO variant_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE goods_receipt_items
  ADD COLUMN IF NOT EXISTS purchase_order_item_id INT UNSIGNED AFTER variant_id;

-- ── sales_deliveries: rename + add columns expected by PHP ───────
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_deliveries' AND COLUMN_NAME = 'sales_deliveries_delivered_by');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE sales_deliveries RENAME COLUMN sales_deliveries_delivered_by TO sales_deliveries_delivered_by_user_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_deliveries' AND COLUMN_NAME = 'sales_deliveries_date');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE sales_deliveries RENAME COLUMN sales_deliveries_date TO sales_deliveries_delivery_date',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_deliveries' AND COLUMN_NAME = 'sales_deliveries_notes');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE sales_deliveries RENAME COLUMN sales_deliveries_notes TO sales_deliveries_delivery_notes',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE sales_deliveries
  ADD COLUMN IF NOT EXISTS sales_deliveries_warehouse_id INT UNSIGNED,
  ADD COLUMN IF NOT EXISTS sales_deliveries_delivery_address VARCHAR(500),
  ADD COLUMN IF NOT EXISTS sales_deliveries_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sales_deliveries_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ── sales_delivery_items: rename FK column + add new columns ─────
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_delivery_items' AND COLUMN_NAME = 'sales_delivery_items_sales_delivery_id');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE sales_delivery_items RENAME COLUMN sales_delivery_items_sales_delivery_id TO sales_delivery_items_delivery_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE sales_delivery_items
  ADD COLUMN IF NOT EXISTS sales_delivery_items_notes TEXT,
  ADD COLUMN IF NOT EXISTS sales_delivery_items_batch_date DATE;

-- ── sales_order_items: add quantity_delivered tracking column ─────
ALTER TABLE sales_order_items
  ADD COLUMN IF NOT EXISTS sales_order_items_quantity_delivered INT DEFAULT 0;

-- ── sales_order_items: add quantity_returned tracking column ──────
ALTER TABLE sales_order_items
  ADD COLUMN IF NOT EXISTS sales_order_items_quantity_returned INT DEFAULT 0;

-- ── purchase_orders: add order-level discount column ─────────────
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS purchase_orders_order_discount DECIMAL(15,2) DEFAULT 0.00 AFTER purchase_orders_total_amount;

-- ── purchase_order_items: add discount_amount, tax_rate, has_tax columns ───
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS purchase_order_items_discount_amount DECIMAL(15,2) DEFAULT 0.00 AFTER purchase_order_items_unit_cost,
  ADD COLUMN IF NOT EXISTS purchase_order_items_tax_rate DECIMAL(5,2) DEFAULT 0.00 AFTER purchase_order_items_discount_amount,
  ADD COLUMN IF NOT EXISTS purchase_order_items_has_tax TINYINT(1) DEFAULT 0 AFTER purchase_order_items_tax_rate;

-- ── suppliers: add missing updated_at column ─────────────────────
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS supplier_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ── product_variants: add timestamp columns ───────────────────────
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS variant_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS variant_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ── inventory: add tracking timestamp columns ─────────────────────
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS inventory_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS inventory_last_movement_at TIMESTAMP DEFAULT NULL;

-- ── sales_delivery_items: add created_at column ───────────────────
ALTER TABLE sales_delivery_items
  ADD COLUMN IF NOT EXISTS sales_delivery_items_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ── inventory_logs: movement audit table ─────────────────────────
CREATE TABLE IF NOT EXISTS inventory_logs (
  inventory_log_id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inventory_log_variant_id      INT UNSIGNED NOT NULL,
  inventory_log_packaging_type_id INT UNSIGNED DEFAULT NULL,
  inventory_log_warehouse_id    INT UNSIGNED NOT NULL,
  inventory_log_type            VARCHAR(50)  NOT NULL,
  inventory_log_quantity_change DOUBLE       NOT NULL DEFAULT 0,
  inventory_log_current_quantity DOUBLE      NOT NULL DEFAULT 0,
  inventory_log_user_id         INT UNSIGNED DEFAULT NULL,
  inventory_log_reference_id    INT UNSIGNED DEFAULT NULL,
  inventory_log_notes           TEXT,
  inventory_log_date            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_variant  (inventory_log_variant_id),
  INDEX idx_warehouse (inventory_log_warehouse_id),
  INDEX idx_date     (inventory_log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── payment_methods: add is_active column ─────────────────────────
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS payment_methods_is_active TINYINT(1) DEFAULT 1;

-- ── visit_plan_clients: rename id to visit_plan_clients_id + add timestamp ──
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'visit_plan_clients' AND COLUMN_NAME = 'id');
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE visit_plan_clients RENAME COLUMN id TO visit_plan_clients_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE visit_plan_clients
  ADD COLUMN IF NOT EXISTS visit_plan_client_added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ── safe_transactions: add payment_method_id + account_id + receipt_image columns ──
ALTER TABLE safe_transactions
  ADD COLUMN IF NOT EXISTS safe_transactions_payment_method_id INT UNSIGNED DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS safe_transactions_account_id INT UNSIGNED DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS safe_transactions_receipt_image VARCHAR(500) DEFAULT NULL;

-- ── settings: add timestamp columns ──
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS settings_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS settings_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ── rep_location_tracking: GPS telemetry from mobile reps ──
CREATE TABLE IF NOT EXISTS rep_location_tracking (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  latitude       DECIMAL(10,7) NOT NULL,
  longitude      DECIMAL(10,7) NOT NULL,
  tracking_time  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  battery_level  TINYINT UNSIGNED DEFAULT NULL,
  phone_info     VARCHAR(255) DEFAULT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_tracking_time (tracking_time),
  INDEX idx_user_time (user_id, tracking_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── inventory: set default packaging_type_id for NULL values ──────
UPDATE inventory SET packaging_type_id = 1 WHERE packaging_type_id IS NULL;
UPDATE sales_order_items SET sales_order_items_packaging_type_id = 1 WHERE sales_order_items_packaging_type_id IS NULL;

-- ================================================================
-- After this file runs, apply in order:
--   mysql demo_company_db < 001_trial_schema.sql
--   mysql demo_company_db < demo_seed.sql
-- ================================================================
