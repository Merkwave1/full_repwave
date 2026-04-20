-- ==============================================================
-- RepWave / template_company — Complete Database Schema
-- Auto-seeded by docker-compose on first run.
-- ==============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- =========================
-- 1. SETTINGS
-- =========================
CREATE TABLE IF NOT EXISTS `settings` (
  `settings_id`       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `settings_key`      VARCHAR(100) NOT NULL UNIQUE,
  `settings_value`    TEXT,
  `settings_description` TEXT,
  `settings_category` VARCHAR(50)  DEFAULT 'general',
  `settings_type`     VARCHAR(20)  DEFAULT 'text',
  `settings_label`    VARCHAR(150),
  `created_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `settings` (`settings_key`,`settings_value`,`settings_category`,`settings_label`) VALUES
  ('expiration_date','2030-12-31','system','Subscription Expiration Date'),
  ('company_name','شركة الاختبار','company','Company Name'),
  ('company_currency','EGP','financial','Currency'),
  ('default_currency','EGP','financial','Default Currency'),
  ('users_limits','50','system','Maximum Users'),
  ('defult_client_credit_limit','0','financial','Default Client Credit Limit'),
  ('odoo_integration_enabled','0','integration','Odoo Integration Enabled');

-- =========================
-- 2. VERSIONS  (version-sync)
-- =========================
CREATE TABLE IF NOT EXISTS `versions` (
  `versions_id`  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `entity`       VARCHAR(100) NOT NULL UNIQUE,
  `version`      INT UNSIGNED NOT NULL DEFAULT 1,
  `updated_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `versions` (`entity`,`version`) VALUES
  ('users',1),('clients',1),('suppliers',1),('products',1),('inventory',1),
  ('warehouses',1),('sales_orders',1),('purchase_orders',1),('safes',1),
  ('visits',1),('categories',1),('notifications',1),('settings',1),
  ('base_units',1),('product_attributes',1),('packaging_types',1),
  ('payment_methods',1),('client_area_tags',1),('client_types',1),
  ('client_industries',1),('countries',1),('governorates',1),
  ('sales_returns',1),('purchase_returns',1),('visit_plans',1),
  ('financial_transactions',1),('goods_receipts',1);

-- =========================
-- 3. USERS
-- =========================
CREATE TABLE IF NOT EXISTS `users` (
  `users_id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `users_name`       VARCHAR(200) NOT NULL,
  `users_email`      VARCHAR(200) NOT NULL UNIQUE,
  `users_password`   VARCHAR(255) NOT NULL,
  `users_role`       VARCHAR(50) NOT NULL DEFAULT 'rep',
  `users_phone`      VARCHAR(50),
  `users_national_id` VARCHAR(50),
  `users_status`     TINYINT(1) NOT NULL DEFAULT 1,
  `users_uuid`       VARCHAR(64),
  `users_image`      VARCHAR(500),
  `created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- password = "password"  (bcrypt)
INSERT IGNORE INTO `users` (`users_name`,`users_email`,`users_password`,`users_role`,`users_status`,`users_uuid`) VALUES
  ('مدير النظام','admin@repwave.test','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin',1,UUID()),
  ('مندوب المبيعات','rep@repwave.test','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','rep',1,UUID());

-- =========================
-- 4. LOGIN_LOGS
-- =========================
CREATE TABLE IF NOT EXISTS `login_logs` (
  `login_logs_id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `login_logs_users_id`    INT UNSIGNED,
  `login_logs_users_name`  VARCHAR(200),
  `login_logs_users_role`  VARCHAR(50),
  `login_logs_users_uuid`  VARCHAR(64),
  `login_logs_users_ip`    VARCHAR(50),
  `login_logs_users_hwid`  VARCHAR(255),
  `login_logs_status`      VARCHAR(20) DEFAULT 'failure',
  `login_logs_reason`      TEXT,
  `login_logs_created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 5. COUNTRIES & GOVERNORATES
-- =========================
CREATE TABLE IF NOT EXISTS `countries` (
  `countries_id`       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `countries_name_ar`  VARCHAR(200) NOT NULL,
  `countries_name_en`  VARCHAR(200),
  `countries_sort_order` INT UNSIGNED DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `countries` (`countries_id`,`countries_name_ar`,`countries_name_en`,`countries_sort_order`) VALUES
  (1,'مصر','Egypt',1),(2,'السعودية','Saudi Arabia',2);

CREATE TABLE IF NOT EXISTS `governorates` (
  `governorates_id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `governorates_name_ar`    VARCHAR(200) NOT NULL,
  `governorates_name_en`    VARCHAR(200),
  `governorates_country_id` INT UNSIGNED,
  `governorates_sort_order` INT UNSIGNED DEFAULT 0,
  FOREIGN KEY (`governorates_country_id`) REFERENCES `countries`(`countries_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `governorates` (`governorates_id`,`governorates_name_ar`,`governorates_name_en`,`governorates_country_id`) VALUES
  (1,'القاهرة','Cairo',1),(2,'الإسكندرية','Alexandria',1),(3,'الجيزة','Giza',1);

-- =========================
-- 6. CATEGORIES
-- =========================
CREATE TABLE IF NOT EXISTS `categories` (
  `categories_id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `categories_name`        VARCHAR(200) NOT NULL UNIQUE,
  `categories_description` VARCHAR(500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 7. CLIENT LOOKUP TABLES
-- =========================
CREATE TABLE IF NOT EXISTS `client_area_tags` (
  `client_area_tag_id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `client_area_tag_name`       VARCHAR(200) NOT NULL UNIQUE,
  `client_area_tag_sort_order` INT UNSIGNED DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `client_types` (
  `client_type_id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `client_type_name`       VARCHAR(200) NOT NULL UNIQUE,
  `client_type_sort_order` INT UNSIGNED DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `client_industries` (
  `client_industries_id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `client_industries_name`       VARCHAR(200) NOT NULL UNIQUE,
  `client_industries_sort_order` INT UNSIGNED DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `client_document_types` (
  `document_type_id`   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `document_type_name` VARCHAR(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 8. CLIENTS
-- =========================
CREATE TABLE IF NOT EXISTS `clients` (
  `clients_id`               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `clients_odoo_partner_id`  INT,
  `clients_company_name`     VARCHAR(300) NOT NULL,
  `clients_email`            VARCHAR(200),
  `clients_website`          VARCHAR(300),
  `clients_vat_number`       VARCHAR(100),
  `clients_description`      TEXT,
  `clients_contact_name`     VARCHAR(200),
  `clients_contact_job_title` VARCHAR(200),
  `clients_contact_phone_1`  VARCHAR(50),
  `clients_contact_phone_2`  VARCHAR(50),
  `clients_address`          VARCHAR(500),
  `clients_street2`          VARCHAR(300),
  `clients_building_number`  VARCHAR(50),
  `clients_city`             VARCHAR(200),
  `clients_zip`              VARCHAR(20),
  `clients_country_id`       INT UNSIGNED,
  `clients_governorate_id`   INT UNSIGNED,
  `clients_latitude`         DECIMAL(10,8),
  `clients_longitude`        DECIMAL(11,8),
  `clients_area_tag_id`      INT UNSIGNED,
  `clients_client_type_id`   INT UNSIGNED,
  `clients_industry_id`      INT UNSIGNED,
  `clients_rep_user_id`      INT UNSIGNED,
  `clients_credit_limit`     DECIMAL(15,2) DEFAULT 0,
  `clients_credit_balance`   DECIMAL(15,2) DEFAULT 0,
  `clients_status`           VARCHAR(50) DEFAULT 'active',
  `clients_type`             VARCHAR(50),
  `clients_last_visit`       TIMESTAMP NULL,
  `clients_payment_terms`    VARCHAR(100),
  `clients_source`           VARCHAR(100),
  `clients_reference_note`   TEXT,
  `clients_created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `clients_updated_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`clients_country_id`) REFERENCES `countries`(`countries_id`) ON DELETE SET NULL,
  FOREIGN KEY (`clients_governorate_id`) REFERENCES `governorates`(`governorates_id`) ON DELETE SET NULL,
  FOREIGN KEY (`clients_area_tag_id`) REFERENCES `client_area_tags`(`client_area_tag_id`) ON DELETE SET NULL,
  FOREIGN KEY (`clients_client_type_id`) REFERENCES `client_types`(`client_type_id`) ON DELETE SET NULL,
  FOREIGN KEY (`clients_industry_id`) REFERENCES `client_industries`(`client_industries_id`) ON DELETE SET NULL,
  FOREIGN KEY (`clients_rep_user_id`) REFERENCES `users`(`users_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 9. CLIENT DOCUMENTS
-- =========================
CREATE TABLE IF NOT EXISTS `client_documents` (
  `client_document_id`                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `client_document_client_id`          INT UNSIGNED,
  `client_document_type_id`            INT UNSIGNED,
  `client_document_title`              VARCHAR(300),
  `client_document_file_path`          VARCHAR(500),
  `client_document_file_mime_type`     VARCHAR(100),
  `client_document_file_size_kb`       INT,
  `client_document_uploaded_by_user_id` INT UNSIGNED,
  `client_document_notes`              TEXT,
  `client_document_created_at`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `client_document_updated_at`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_document_client_id`) REFERENCES `clients`(`clients_id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_document_type_id`)   REFERENCES `client_document_types`(`document_type_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 10. CLIENT INTERESTED PRODUCTS
-- =========================
CREATE TABLE IF NOT EXISTS `client_interested_products` (
  `client_id`   INT UNSIGNED NOT NULL,
  `products_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`client_id`,`products_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 11. BASE UNITS
-- =========================
CREATE TABLE IF NOT EXISTS `base_units` (
  `base_units_id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `base_units_name`        VARCHAR(100) NOT NULL UNIQUE,
  `base_units_description` VARCHAR(300)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 12. PAYMENT METHODS
-- =========================
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `payment_methods_id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `payment_methods_name`        VARCHAR(200) NOT NULL UNIQUE,
  `payment_methods_description` VARCHAR(500),
  `payment_methods_type`        VARCHAR(50),
  `payment_methods_created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `payment_methods_updated_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `payment_methods` (`payment_methods_name`,`payment_methods_description`,`payment_methods_type`) VALUES
  ('نقدي','الدفع النقدي','cash'),('تحويل بنكي','التحويل البنكي','bank');

-- =========================
-- 13. PRODUCTS
-- =========================
CREATE TABLE IF NOT EXISTS `products` (
  `products_id`                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `products_name`                  VARCHAR(300) NOT NULL,
  `products_category_id`           INT UNSIGNED,
  `products_unit_of_measure_id`    INT UNSIGNED,
  `products_brand`                 VARCHAR(200),
  `products_description`           TEXT,
  `products_image_url`             VARCHAR(500),
  `products_is_active`             TINYINT(1) DEFAULT 1,
  `products_weight`                DECIMAL(10,3),
  `products_volume`                DECIMAL(10,3),
  `products_supplier_id`           INT UNSIGNED,
  `products_expiry_period_in_days` INT,
  `products_has_tax`               TINYINT(1) DEFAULT 0,
  `products_tax_rate`              DECIMAL(5,2) DEFAULT 0,
  `products_created_at`            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `products_updated_at`            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`products_category_id`)        REFERENCES `categories`(`categories_id`) ON DELETE SET NULL,
  FOREIGN KEY (`products_unit_of_measure_id`) REFERENCES `base_units`(`base_units_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 14. PRODUCT ATTRIBUTES
-- =========================
CREATE TABLE IF NOT EXISTS `product_attributes` (
  `attribute_id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `attribute_name`        VARCHAR(200) NOT NULL,
  `attribute_description` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_attribute_values` (
  `attribute_value_id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `attribute_value_attribute_id` INT UNSIGNED NOT NULL,
  `attribute_value_value`        VARCHAR(200) NOT NULL,
  FOREIGN KEY (`attribute_value_attribute_id`) REFERENCES `product_attributes`(`attribute_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 15. PRODUCT VARIANTS
-- =========================
CREATE TABLE IF NOT EXISTS `product_variants` (
  `variant_id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `variant_products_id`     INT UNSIGNED NOT NULL,
  `variant_name`            VARCHAR(300),
  `variant_sku`             VARCHAR(100),
  `variant_barcode`         VARCHAR(100),
  `variant_image_url`       VARCHAR(500),
  `variant_unit_price`      DECIMAL(15,2) DEFAULT 0,
  `variant_cost_price`      DECIMAL(15,2) DEFAULT 0,
  `variant_weight`          DECIMAL(10,3),
  `variant_volume`          DECIMAL(10,3),
  `variant_status`          VARCHAR(50) DEFAULT 'active',
  `variant_notes`           TEXT,
  `variant_has_tax`         TINYINT(1) DEFAULT 0,
  `variant_tax_rate`        DECIMAL(5,2) DEFAULT 0,
  `variant_odoo_product_id` INT,
  FOREIGN KEY (`variant_products_id`) REFERENCES `products`(`products_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_variant_attribute_map` (
  `variant_attribute_map_variant_id`         INT UNSIGNED NOT NULL,
  `variant_attribute_map_attribute_value_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`variant_attribute_map_variant_id`,`variant_attribute_map_attribute_value_id`),
  FOREIGN KEY (`variant_attribute_map_variant_id`)         REFERENCES `product_variants`(`variant_id`) ON DELETE CASCADE,
  FOREIGN KEY (`variant_attribute_map_attribute_value_id`) REFERENCES `product_attribute_values`(`attribute_value_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 16. PACKAGING TYPES
-- =========================
CREATE TABLE IF NOT EXISTS `packaging_types` (
  `packaging_types_id`                        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `packaging_types_name`                      VARCHAR(200) NOT NULL,
  `packaging_types_description`               VARCHAR(500),
  `packaging_types_default_conversion_factor` DECIMAL(10,4) DEFAULT 1,
  `packaging_types_compatible_base_unit_id`   INT UNSIGNED,
  FOREIGN KEY (`packaging_types_compatible_base_unit_id`) REFERENCES `base_units`(`base_units_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 16b. PRODUCT PREFERRED PACKAGING
-- =========================
CREATE TABLE IF NOT EXISTS `product_preferred_packaging` (
  `id`                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `products_id`       INT UNSIGNED NOT NULL,
  `packaging_type_id` INT UNSIGNED NOT NULL,
  FOREIGN KEY (`products_id`)       REFERENCES `products`(`products_id`) ON DELETE CASCADE,
  FOREIGN KEY (`packaging_type_id`) REFERENCES `packaging_types`(`packaging_types_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 17. SUPPLIERS
-- =========================
CREATE TABLE IF NOT EXISTS `suppliers` (
  `supplier_id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `supplier_name`            VARCHAR(300) NOT NULL,
  `supplier_contact_person`  VARCHAR(200),
  `supplier_phone`           VARCHAR(50),
  `supplier_email`           VARCHAR(200),
  `supplier_address`         VARCHAR(500),
  `supplier_notes`           TEXT,
  `supplier_balance`         DECIMAL(15,2) DEFAULT 0,
  `supplier_created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `supplier_odoo_partner_id` INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 18. WAREHOUSE
-- =========================
CREATE TABLE IF NOT EXISTS `warehouse` (
  `warehouse_id`                       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `warehouse_name`                     VARCHAR(300) NOT NULL,
  `warehouse_type`                     VARCHAR(50),
  `warehouse_code`                     VARCHAR(50),
  `warehouse_address`                  VARCHAR(500),
  `warehouse_contact_person`           VARCHAR(200),
  `warehouse_phone`                    VARCHAR(50),
  `warehouse_status`                   VARCHAR(50) DEFAULT 'active',
  `warehouse_representative_user_id`   INT UNSIGNED,
  FOREIGN KEY (`warehouse_representative_user_id`) REFERENCES `users`(`users_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 19. INVENTORY
-- =========================
CREATE TABLE IF NOT EXISTS `inventory` (
  `inventory_id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `variant_id`                INT UNSIGNED NOT NULL,
  `packaging_type_id`         INT UNSIGNED,
  `warehouse_id`              INT UNSIGNED,
  `inventory_production_date` DATE,
  `inventory_quantity`        INT DEFAULT 0,
  `inventory_status`          VARCHAR(50) DEFAULT 'available',
  FOREIGN KEY (`variant_id`)       REFERENCES `product_variants`(`variant_id`) ON DELETE CASCADE,
  FOREIGN KEY (`packaging_type_id`) REFERENCES `packaging_types`(`packaging_types_id`) ON DELETE SET NULL,
  FOREIGN KEY (`warehouse_id`)     REFERENCES `warehouse`(`warehouse_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 20. SAFES
-- =========================
CREATE TABLE IF NOT EXISTS `safes` (
  `safes_id`                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `safes_name`              VARCHAR(200) NOT NULL,
  `safes_description`       TEXT,
  `safes_balance`           DECIMAL(15,2) DEFAULT 0,
  `safes_type`              VARCHAR(50),
  `safes_rep_user_id`       INT UNSIGNED,
  `safes_payment_method_id` INT UNSIGNED,
  `safes_is_active`         TINYINT(1) DEFAULT 1,
  `safes_color`             VARCHAR(20),
  `safes_odoo_journal_id`   INT,
  `safes_created_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `safes_updated_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`safes_rep_user_id`)       REFERENCES `users`(`users_id`) ON DELETE SET NULL,
  FOREIGN KEY (`safes_payment_method_id`) REFERENCES `payment_methods`(`payment_methods_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 21. SAFE TRANSACTIONS
-- =========================
CREATE TABLE IF NOT EXISTS `safe_transactions` (
  `safe_transactions_id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `safe_transactions_safe_id`         INT UNSIGNED,
  `safe_transactions_type`            VARCHAR(50),
  `safe_transactions_amount`          DECIMAL(15,2) DEFAULT 0,
  `safe_transactions_balance_before`  DECIMAL(15,2) DEFAULT 0,
  `safe_transactions_balance_after`   DECIMAL(15,2) DEFAULT 0,
  `safe_transactions_description`     TEXT,
  `safe_transactions_reference`       VARCHAR(200),
  `safe_transactions_date`            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `safe_transactions_created_by`      INT UNSIGNED,
  `safe_transactions_status`          VARCHAR(50) DEFAULT 'pending',
  `safe_transactions_related_table`   VARCHAR(100),
  `safe_transactions_created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`safe_transactions_safe_id`)    REFERENCES `safes`(`safes_id`) ON DELETE SET NULL,
  FOREIGN KEY (`safe_transactions_created_by`) REFERENCES `users`(`users_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 22. PAYMENTS (client_payments)
-- =========================
CREATE TABLE IF NOT EXISTS `payments` (
  `payments_id`                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `payments_client_id`            INT UNSIGNED,
  `payments_method_id`            INT UNSIGNED,
  `payments_amount`               DECIMAL(15,2) DEFAULT 0,
  `payments_date`                 DATE,
  `payments_transaction_id`       VARCHAR(200),
  `payments_safe_id`              INT UNSIGNED,
  `payments_notes`                TEXT,
  `payments_rep_user_id`          INT UNSIGNED,
  `payments_visit_id`             INT UNSIGNED,
  `payments_safe_transaction_id`  INT UNSIGNED,
  `payments_odoo_payment_id`      INT,
  `payments_created_at`           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `payments_updated_at`           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`payments_client_id`)  REFERENCES `clients`(`clients_id`) ON DELETE SET NULL,
  FOREIGN KEY (`payments_method_id`)  REFERENCES `payment_methods`(`payment_methods_id`) ON DELETE SET NULL,
  FOREIGN KEY (`payments_safe_id`)    REFERENCES `safes`(`safes_id`) ON DELETE SET NULL,
  FOREIGN KEY (`payments_rep_user_id`) REFERENCES `users`(`users_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 23. REFUNDS (client_refunds)
-- =========================
CREATE TABLE IF NOT EXISTS `refunds` (
  `refunds_id`                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `refunds_client_id`            INT UNSIGNED,
  `refunds_method_id`            INT UNSIGNED,
  `refunds_amount`               DECIMAL(15,2) DEFAULT 0,
  `refunds_date`                 DATE,
  `refunds_transaction_id`       VARCHAR(200),
  `refunds_safe_id`              INT UNSIGNED,
  `refunds_notes`                TEXT,
  `refunds_rep_user_id`          INT UNSIGNED,
  `refunds_visit_id`             INT UNSIGNED,
  `refunds_safe_transaction_id`  INT UNSIGNED,
  `refunds_odoo_payment_id`      INT,
  `refunds_created_at`           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `refunds_updated_at`           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`refunds_client_id`)  REFERENCES `clients`(`clients_id`) ON DELETE SET NULL,
  FOREIGN KEY (`refunds_method_id`)  REFERENCES `payment_methods`(`payment_methods_id`) ON DELETE SET NULL,
  FOREIGN KEY (`refunds_safe_id`)    REFERENCES `safes`(`safes_id`) ON DELETE SET NULL,
  FOREIGN KEY (`refunds_rep_user_id`) REFERENCES `users`(`users_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 24. INVOICES
-- =========================
CREATE TABLE IF NOT EXISTS `invoices` (
  `invoices_id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `invoices_client_id`       INT UNSIGNED,
  `invoices_date`            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `invoices_due_date`        TIMESTAMP NULL,
  `invoices_expiration_date` TIMESTAMP NULL,
  `invoices_total_amount`    DECIMAL(15,2) DEFAULT 0,
  `invoices_status`          VARCHAR(50) DEFAULT 'draft',
  `invoices_notes`           TEXT,
  `invoices_created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `invoices_updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`invoices_client_id`) REFERENCES `clients`(`clients_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 25. PURCHASE ORDERS
-- =========================
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `purchase_orders_id`                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `purchase_orders_supplier_id`            INT UNSIGNED,
  `purchase_orders_warehouse_id`           INT UNSIGNED,
  `purchase_orders_order_date`             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `purchase_orders_expected_delivery_date` DATE,
  `purchase_orders_actual_delivery_date`   DATE,
  `purchase_orders_total_amount`           DECIMAL(15,2) DEFAULT 0,
  `purchase_orders_status`                 VARCHAR(50) DEFAULT 'Ordered',
  `purchase_orders_notes`                  TEXT,
  `purchase_orders_odoo_id`                INT,
  `purchase_orders_created_at`             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `purchase_orders_updated_at`             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`purchase_orders_supplier_id`)  REFERENCES `suppliers`(`supplier_id`) ON DELETE SET NULL,
  FOREIGN KEY (`purchase_orders_warehouse_id`) REFERENCES `warehouse`(`warehouse_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `purchase_order_items_id`                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `purchase_order_items_purchase_order_id`     INT UNSIGNED NOT NULL,
  `purchase_order_items_variant_id`            INT UNSIGNED,
  `purchase_order_items_packaging_type_id`     INT UNSIGNED,
  `purchase_order_items_quantity_ordered`       INT DEFAULT 0,
  `purchase_order_items_quantity_received`      INT DEFAULT 0,
  `purchase_order_items_quantity_returned`      INT DEFAULT 0,
  `purchase_order_items_unit_cost`             DECIMAL(15,2) DEFAULT 0,
  `purchase_order_items_total_cost`            DECIMAL(15,2) DEFAULT 0,
  `purchase_order_items_notes`                 TEXT,
  FOREIGN KEY (`purchase_order_items_purchase_order_id`) REFERENCES `purchase_orders`(`purchase_orders_id`) ON DELETE CASCADE,
  FOREIGN KEY (`purchase_order_items_variant_id`)        REFERENCES `product_variants`(`variant_id`) ON DELETE SET NULL,
  FOREIGN KEY (`purchase_order_items_packaging_type_id`) REFERENCES `packaging_types`(`packaging_types_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 26. PURCHASE RETURNS
-- =========================
CREATE TABLE IF NOT EXISTS `purchase_returns` (
  `purchase_returns_id`               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `purchase_returns_purchase_order_id` INT UNSIGNED,
  `purchase_returns_supplier_id`      INT UNSIGNED,
  `purchase_returns_warehouse_id`     INT UNSIGNED,
  `purchase_returns_date`             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `purchase_returns_total_amount`     DECIMAL(15,2) DEFAULT 0,
  `purchase_returns_status`           VARCHAR(50) DEFAULT 'Pending',
  `purchase_returns_notes`            TEXT,
  `purchase_returns_reason`           TEXT,
  `purchase_returns_created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`purchase_returns_purchase_order_id`) REFERENCES `purchase_orders`(`purchase_orders_id`) ON DELETE SET NULL,
  FOREIGN KEY (`purchase_returns_supplier_id`)       REFERENCES `suppliers`(`supplier_id`) ON DELETE SET NULL,
  FOREIGN KEY (`purchase_returns_warehouse_id`)      REFERENCES `warehouse`(`warehouse_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 27. SALES ORDERS
-- =========================
CREATE TABLE IF NOT EXISTS `sales_orders` (
  `sales_orders_id`                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sales_orders_client_id`              INT UNSIGNED,
  `sales_orders_representative_id`      INT UNSIGNED,
  `sales_orders_warehouse_id`           INT UNSIGNED,
  `sales_orders_visit_id`               INT UNSIGNED,
  `sales_orders_status`                 VARCHAR(50) DEFAULT 'Pending',
  `sales_orders_delivery_status`        VARCHAR(50) DEFAULT 'Not Delivered',
  `sales_orders_order_date`             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `sales_orders_expected_delivery_date` DATE,
  `sales_orders_actual_delivery_date`   DATE,
  `sales_orders_subtotal`               DECIMAL(15,2) DEFAULT 0,
  `sales_orders_discount_amount`        DECIMAL(15,2) DEFAULT 0,
  `sales_orders_tax_amount`             DECIMAL(15,2) DEFAULT 0,
  `sales_orders_total_amount`           DECIMAL(15,2) DEFAULT 0,
  `sales_orders_notes`                  TEXT,
  `sales_orders_odoo_invoice_id`        INT,
  `sales_orders_created_at`             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `sales_orders_updated_at`             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`sales_orders_client_id`)         REFERENCES `clients`(`clients_id`) ON DELETE SET NULL,
  FOREIGN KEY (`sales_orders_representative_id`) REFERENCES `users`(`users_id`) ON DELETE SET NULL,
  FOREIGN KEY (`sales_orders_warehouse_id`)      REFERENCES `warehouse`(`warehouse_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_order_items` (
  `sales_order_items_id`                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sales_order_items_sales_order_id`      INT UNSIGNED NOT NULL,
  `sales_order_items_variant_id`          INT UNSIGNED,
  `sales_order_items_packaging_type_id`   INT UNSIGNED,
  `sales_order_items_quantity`            INT DEFAULT 0,
  `sales_order_items_unit_price`          DECIMAL(15,2) DEFAULT 0,
  `sales_order_items_subtotal`            DECIMAL(15,2) DEFAULT 0,
  `sales_order_items_discount_amount`     DECIMAL(15,2) DEFAULT 0,
  `sales_order_items_tax_amount`          DECIMAL(15,2) DEFAULT 0,
  `sales_order_items_tax_rate`            DECIMAL(5,2) DEFAULT 0,
  `sales_order_items_has_tax`             TINYINT(1) DEFAULT 0,
  `sales_order_items_total_price`         DECIMAL(15,2) DEFAULT 0,
  `sales_order_items_notes`              TEXT,
  FOREIGN KEY (`sales_order_items_sales_order_id`) REFERENCES `sales_orders`(`sales_orders_id`) ON DELETE CASCADE,
  FOREIGN KEY (`sales_order_items_variant_id`)     REFERENCES `product_variants`(`variant_id`) ON DELETE SET NULL,
  FOREIGN KEY (`sales_order_items_packaging_type_id`) REFERENCES `packaging_types`(`packaging_types_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 28. SALES DELIVERIES
-- =========================
CREATE TABLE IF NOT EXISTS `sales_deliveries` (
  `sales_deliveries_id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sales_deliveries_sales_order_id`  INT UNSIGNED,
  `sales_deliveries_delivery_status` VARCHAR(50) DEFAULT 'Preparing',
  `sales_deliveries_delivered_by`    INT UNSIGNED,
  `sales_deliveries_date`            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `sales_deliveries_notes`           TEXT,
  FOREIGN KEY (`sales_deliveries_sales_order_id`) REFERENCES `sales_orders`(`sales_orders_id`) ON DELETE SET NULL,
  FOREIGN KEY (`sales_deliveries_delivered_by`)   REFERENCES `users`(`users_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_delivery_items` (
  `sales_delivery_items_id`                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sales_delivery_items_sales_delivery_id`      INT UNSIGNED,
  `sales_delivery_items_sales_order_item_id`    INT UNSIGNED,
  `sales_delivery_items_quantity_delivered`      INT DEFAULT 0,
  FOREIGN KEY (`sales_delivery_items_sales_delivery_id`)   REFERENCES `sales_deliveries`(`sales_deliveries_id`) ON DELETE CASCADE,
  FOREIGN KEY (`sales_delivery_items_sales_order_item_id`) REFERENCES `sales_order_items`(`sales_order_items_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 29. SALES RETURNS
-- =========================
CREATE TABLE IF NOT EXISTS `sales_returns` (
  `returns_id`                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `returns_client_id`         INT UNSIGNED,
  `returns_created_by_user_id` INT UNSIGNED,
  `returns_sales_order_id`    INT UNSIGNED,
  `returns_date`              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `returns_reason`            TEXT,
  `returns_total_amount`      DECIMAL(15,2) DEFAULT 0,
  `returns_status`            VARCHAR(50) DEFAULT 'Pending',
  `returns_notes`             TEXT,
  `returns_odoo_picking_id`   INT,
  `manual_discount`           DECIMAL(15,2) DEFAULT 0,
  `sales_returns_visit_id`    INT UNSIGNED,
  `returns_created_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `returns_updated_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`returns_client_id`)         REFERENCES `clients`(`clients_id`) ON DELETE SET NULL,
  FOREIGN KEY (`returns_created_by_user_id`) REFERENCES `users`(`users_id`) ON DELETE SET NULL,
  FOREIGN KEY (`returns_sales_order_id`)    REFERENCES `sales_orders`(`sales_orders_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_return_items` (
  `return_items_id`                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `return_items_return_id`            INT UNSIGNED NOT NULL,
  `return_items_sales_order_item_id`  INT UNSIGNED,
  `return_items_quantity`             INT DEFAULT 0,
  `return_items_unit_price`           DECIMAL(15,2) DEFAULT 0,
  `return_items_total_price`          DECIMAL(15,2) DEFAULT 0,
  `return_items_notes`                TEXT,
  `return_items_tax_amount`           DECIMAL(15,2) DEFAULT 0,
  `return_items_tax_rate`             DECIMAL(5,2) DEFAULT 0,
  `return_items_has_tax`              TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`return_items_return_id`)           REFERENCES `sales_returns`(`returns_id`) ON DELETE CASCADE,
  FOREIGN KEY (`return_items_sales_order_item_id`) REFERENCES `sales_order_items`(`sales_order_items_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 30. GOODS RECEIPTS
-- =========================
CREATE TABLE IF NOT EXISTS `goods_receipts` (
  `goods_receipt_id`                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `goods_receipt_warehouse_id`         INT UNSIGNED,
  `goods_receipt_date`                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `goods_receipt_notes`                TEXT,
  `goods_receipt_received_by_user_id`  INT UNSIGNED,
  `goods_receipt_odoo_picking_id`      VARCHAR(100),
  `goods_receipt_purchase_order_id`    INT UNSIGNED,
  FOREIGN KEY (`goods_receipt_warehouse_id`)        REFERENCES `warehouse`(`warehouse_id`) ON DELETE SET NULL,
  FOREIGN KEY (`goods_receipt_received_by_user_id`) REFERENCES `users`(`users_id`) ON DELETE SET NULL,
  FOREIGN KEY (`goods_receipt_purchase_order_id`)   REFERENCES `purchase_orders`(`purchase_orders_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `goods_receipt_items` (
  `goods_receipt_items_id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `goods_receipt_items_goods_receipt_id` INT UNSIGNED,
  `goods_receipt_items_variant_id`      INT UNSIGNED,
  `goods_receipt_items_packaging_type_id` INT UNSIGNED,
  `quantity_received`                   INT DEFAULT 0,
  `goods_receipt_items_production_date` DATE,
  FOREIGN KEY (`goods_receipt_items_goods_receipt_id`) REFERENCES `goods_receipts`(`goods_receipt_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 31. VISIT PLANS
-- =========================
CREATE TABLE IF NOT EXISTS `visit_plans` (
  `visit_plan_id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `visit_plan_name`            VARCHAR(300),
  `visit_plan_description`     TEXT,
  `user_id`                    INT UNSIGNED,
  `visit_plan_status`          VARCHAR(50) DEFAULT 'active',
  `visit_plan_start_date`      DATE,
  `visit_plan_end_date`        DATE,
  `visit_plan_recurrence_type` VARCHAR(50),
  `visit_plan_selected_days`   VARCHAR(200),
  `visit_plan_repeat_every`    INT DEFAULT 1,
  `visit_plan_created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `visit_plan_updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`users_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `visit_plan_clients` (
  `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `visit_plan_id`  INT UNSIGNED NOT NULL,
  `client_id`      INT UNSIGNED NOT NULL,
  `visit_order`    INT DEFAULT 0,
  FOREIGN KEY (`visit_plan_id`) REFERENCES `visit_plans`(`visit_plan_id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`)     REFERENCES `clients`(`clients_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 31b. VISITS (actual rep visit records)
-- =========================
CREATE TABLE IF NOT EXISTS `visits` (
  `visits_id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `visits_client_id`       INT UNSIGNED NOT NULL,
  `visits_rep_user_id`     INT UNSIGNED NOT NULL,
  `visits_start_time`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `visits_end_time`        DATETIME NULL,
  `visits_start_latitude`  DECIMAL(10,7),
  `visits_start_longitude` DECIMAL(10,7),
  `visits_end_latitude`    DECIMAL(10,7),
  `visits_end_longitude`   DECIMAL(10,7),
  `visits_purpose`         VARCHAR(500),
  `visits_outcome`         VARCHAR(500),
  `visits_notes`           TEXT,
  `visits_status`          VARCHAR(50) DEFAULT 'Started',
  `visits_created_at`      DATETIME DEFAULT CURRENT_TIMESTAMP,
  `visits_updated_at`      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`visits_client_id`)   REFERENCES `clients`(`clients_id`) ON DELETE CASCADE,
  FOREIGN KEY (`visits_rep_user_id`) REFERENCES `users`(`users_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `visit_activities` (
  `activity_id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `activity_visit_id`     INT UNSIGNED NOT NULL,
  `activity_user_id`      INT UNSIGNED NOT NULL,
  `activity_type`         VARCHAR(50) NOT NULL,
  `activity_reference_id` INT UNSIGNED,
  `activity_description`  TEXT,
  `activity_timestamp`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`activity_visit_id`) REFERENCES `visits`(`visits_id`) ON DELETE CASCADE,
  FOREIGN KEY (`activity_user_id`)  REFERENCES `users`(`users_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 32. NOTIFICATIONS
-- =========================
CREATE TABLE IF NOT EXISTS `notifications` (
  `notifications_id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `notifications_title`           VARCHAR(500),
  `notifications_body`            TEXT,
  `notifications_data`            JSON,
  `notifications_channel`         VARCHAR(100),
  `notifications_priority`        VARCHAR(50) DEFAULT 'normal',
  `notifications_is_read`         TINYINT(1) DEFAULT 0,
  `notifications_read_at`         TIMESTAMP NULL,
  `notifications_sent_at`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `notifications_reference_table` VARCHAR(100),
  `notifications_reference_id`    INT UNSIGNED,
  `notifications_created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `notifications_role`            VARCHAR(50),
  `notifications_user_id`         INT UNSIGNED,
  FOREIGN KEY (`notifications_user_id`) REFERENCES `users`(`users_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 33. TRANSFER REQUESTS & TRANSFERS  (inventory)
-- =========================
CREATE TABLE IF NOT EXISTS `transfer_requests` (
  `request_id`       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `request_status`   VARCHAR(50) DEFAULT 'Pending',
  `request_date`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `request_notes`    TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transfers` (
  `transfer_id`      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `transfer_status`  VARCHAR(50) DEFAULT 'Pending',
  `transfer_date`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `transfer_notes`   TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- 34. FINANCIAL TRANSACTIONS
-- =========================
CREATE TABLE IF NOT EXISTS `financial_transactions` (
  `financial_transactions_id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `financial_transactions_type`        VARCHAR(50),
  `financial_transactions_amount`      DECIMAL(15,2) DEFAULT 0,
  `financial_transactions_date`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `financial_transactions_notes`       TEXT,
  `financial_transactions_safe_id`     INT UNSIGNED,
  `financial_transactions_user_id`     INT UNSIGNED,
  `financial_transactions_reference`   VARCHAR(200),
  `financial_transactions_created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- REP LOCATION TRACKING
-- =========================
CREATE TABLE IF NOT EXISTS `rep_location_tracking` (
  `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`        INT UNSIGNED NOT NULL,
  `latitude`       DECIMAL(10,7) NOT NULL,
  `longitude`      DECIMAL(10,7) NOT NULL,
  `tracking_time`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `battery_level`  TINYINT UNSIGNED DEFAULT NULL,
  `phone_info`     VARCHAR(255) DEFAULT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_tracking_time (tracking_time),
  INDEX idx_user_time (user_id, tracking_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
