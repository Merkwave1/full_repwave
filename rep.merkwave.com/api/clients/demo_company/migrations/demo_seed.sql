-- ================================================================
--  RepWave FULL Demo Seed — ALL modules
--  Nile Foods Ltd, Cairo, Egypt
--  Re-run HOURLY by reset_demo.sh (idempotent via ON DUPLICATE KEY)
--
--  ⚠️  TRIAL DURATION NOTE:
--      When TRIAL_DAYS changes in auth/register_trial.php, also update
--      the 'demo_trial_days' row in the Settings section at the bottom
--      of THIS file.  Both must be kept in sync.
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── Countries ────────────────────────────────────────────────────
INSERT INTO countries (countries_id, countries_name_ar, countries_name_en, countries_sort_order) VALUES
  (1, 'مصر',           'Egypt',          1),
  (2, 'السعودية',       'Saudi Arabia',   2),
  (3, 'الإمارات',       'UAE',            3),
  (4, 'الأردن',         'Jordan',         4),
  (5, 'لبنان',          'Lebanon',        5)
ON DUPLICATE KEY UPDATE countries_name_en = VALUES(countries_name_en);

-- ── Governorates ─────────────────────────────────────────────────
INSERT INTO governorates (governorates_id, governorates_name_ar, governorates_name_en, governorates_country_id, governorates_sort_order) VALUES
  (1,  'القاهرة',       'Cairo',          1, 1),
  (2,  'الجيزة',        'Giza',           1, 2),
  (3,  'الإسكندرية',    'Alexandria',     1, 3),
  (4,  'القليوبية',     'Qalyubia',       1, 4),
  (5,  'الشرقية',       'Sharqia',        1, 5),
  (6,  'المنوفية',      'Monufia',        1, 6),
  (7,  'الدقهلية',      'Dakahlia',       1, 7),
  (8,  'البحيرة',       'Beheira',        1, 8),
  (9,  'بورسعيد',       'Port Said',      1, 9),
  (10, 'السويس',        'Suez',           1, 10)
ON DUPLICATE KEY UPDATE governorates_name_en = VALUES(governorates_name_en);

-- ── Client Types ─────────────────────────────────────────────────
INSERT INTO client_types (client_type_id, client_type_name, client_type_sort_order) VALUES
  (1, 'Retailer',       1),
  (2, 'Wholesaler',     2),
  (3, 'Supermarket',    3),
  (4, 'Kiosk',          4),
  (5, 'Restaurant',     5),
  (6, 'Hypermarket',    6)
ON DUPLICATE KEY UPDATE client_type_name = VALUES(client_type_name);

-- ── Client Industries ────────────────────────────────────────────
INSERT INTO client_industries (client_industries_id, client_industries_name, client_industries_sort_order) VALUES
  (1, 'Food & Beverage',   1),
  (2, 'General Retail',    2),
  (3, 'Hospitality',       3),
  (4, 'Convenience',       4)
ON DUPLICATE KEY UPDATE client_industries_name = VALUES(client_industries_name);

-- ── Client Area Tags ─────────────────────────────────────────────
INSERT INTO client_area_tags (client_area_tag_id, client_area_tag_name, client_area_tag_sort_order) VALUES
  (1, 'Downtown Cairo',    1),
  (2, 'Nasr City',         2),
  (3, 'Heliopolis',        3),
  (4, 'Giza / Haram',      4),
  (5, 'Maadi / Zamalek',   5),
  (6, 'New Cairo',         6),
  (7, '6th October',       7),
  (8, 'Shubra / Abbassia', 8)
ON DUPLICATE KEY UPDATE client_area_tag_name = VALUES(client_area_tag_name);

-- ── Client Document Types ────────────────────────────────────────
INSERT INTO client_document_types (document_type_id, document_type_name) VALUES
  (1, 'Tax Card'),
  (2, 'Commercial Register'),
  (3, 'Contract'),
  (4, 'ID Copy'),
  (5, 'Other')
ON DUPLICATE KEY UPDATE document_type_name = VALUES(document_type_name);

-- ── Payment Methods ──────────────────────────────────────────────
INSERT INTO payment_methods (payment_methods_id, payment_methods_name, payment_methods_type, payment_methods_is_active) VALUES
  (1, 'Cash',          'cash',   1),
  (2, 'Bank Transfer', 'bank',   1),
  (3, 'Credit Card',   'card',   1),
  (4, 'Cheque',        'cheque', 1)
ON DUPLICATE KEY UPDATE payment_methods_name = VALUES(payment_methods_name),
  payment_methods_type = VALUES(payment_methods_type),
  payment_methods_is_active = VALUES(payment_methods_is_active);

-- ── Categories ───────────────────────────────────────────────────
INSERT INTO categories (categories_id, categories_name) VALUES
  (1, 'Beverages'), (2, 'Snacks'), (3, 'Dairy'),
  (4, 'Bakery'), (5, 'Cleaning'), (6, 'Personal Care')
ON DUPLICATE KEY UPDATE categories_name = VALUES(categories_name);

-- ── Base Units ───────────────────────────────────────────────────
INSERT INTO base_units (base_units_id, base_units_name) VALUES
  (1, 'Piece'), (2, 'Box'), (3, 'Carton'), (4, 'Kg'), (5, 'Liter')
ON DUPLICATE KEY UPDATE base_units_name = VALUES(base_units_name);

-- ── Packaging Types ──────────────────────────────────────────────
INSERT INTO packaging_types (packaging_types_id, packaging_types_name, packaging_types_compatible_base_unit_id) VALUES
  (1, 'Single', 1), (2, '6-Pack', 1), (3, '12-Pack', 1), (4, 'Carton (24)', 1), (5, 'Pallet', 1)
ON DUPLICATE KEY UPDATE packaging_types_name = VALUES(packaging_types_name),
  packaging_types_compatible_base_unit_id = VALUES(packaging_types_compatible_base_unit_id);

-- ── Warehouses ───────────────────────────────────────────────────
INSERT INTO warehouse (warehouse_id, warehouse_name, warehouse_type, warehouse_code, warehouse_address, warehouse_contact_person, warehouse_phone, warehouse_status, warehouse_representative_user_id) VALUES
  (1, 'Main Warehouse - Cairo',  'Main', 'WH-MAIN-001', '15 Industrial Zone, Obour City, Cairo', 'Omar Store', '+20225550100', 'Active', 4),
  (2, 'Rep Van - Ahmed',         'Van',  'WH-VAN-001',  'Mobile - Cairo North Route',             'Ahmed Mahmoud', '+20225550101', 'Active', 2),
  (3, 'Rep Van - Sara',          'Van',  'WH-VAN-002',  'Mobile - Giza Route',                    'Sara Khaled',   '+20225550102', 'Active', 3)
ON DUPLICATE KEY UPDATE warehouse_name = VALUES(warehouse_name), warehouse_type = VALUES(warehouse_type),
  warehouse_code = VALUES(warehouse_code), warehouse_address = VALUES(warehouse_address),
  warehouse_contact_person = VALUES(warehouse_contact_person), warehouse_phone = VALUES(warehouse_phone),
  warehouse_status = VALUES(warehouse_status), warehouse_representative_user_id = VALUES(warehouse_representative_user_id);

-- ── Safes ────────────────────────────────────────────────────────
INSERT INTO safes (safes_id, safes_name, safes_balance, safes_type, safes_is_active) VALUES
  (1, 'Main Cash Safe',    50000.00, 'main',   1),
  (2, 'Ahmed Mobile Safe',  5000.00, 'mobile', 1),
  (3, 'Sara Mobile Safe',   5000.00, 'mobile', 1)
ON DUPLICATE KEY UPDATE safes_name = VALUES(safes_name), safes_balance = VALUES(safes_balance);

-- ── Users (permanent demo users + admin) ─────────────────────────
-- Password: DemoPass123
INSERT INTO users (users_id, users_name, users_email, users_password, users_role, users_status, users_uuid, users_phone, users_is_demo) VALUES
  (1, 'Demo Admin',    'admin@demo.repwave.local',
   '$2y$10$6yDpjNP6qETeU79qi32aMuW71bS2DLszzGyJkdlEAhwCA9XOTJgWW', 'admin', 1, 'demo-uuid-admin-1111111111111111', '+201000000001', 0),
  (2, 'Ahmed Mahmoud', 'ahmed@demo.repwave.local',
   '$2y$10$6yDpjNP6qETeU79qi32aMuW71bS2DLszzGyJkdlEAhwCA9XOTJgWW', 'rep', 1, 'demo-uuid-ahmed-2222222222222222', '+201000000002', 0),
  (3, 'Sara Khaled',   'sara@demo.repwave.local',
   '$2y$10$6yDpjNP6qETeU79qi32aMuW71bS2DLszzGyJkdlEAhwCA9XOTJgWW', 'rep', 1, 'demo-uuid-sara-33333333333333333', '+201000000003', 0),
  (4, 'Omar Store',    'omar@demo.repwave.local',
   '$2y$10$6yDpjNP6qETeU79qi32aMuW71bS2DLszzGyJkdlEAhwCA9XOTJgWW', 'store_keeper', 1, 'demo-uuid-omar-44444444444444444', '+201000000004', 0)
ON DUPLICATE KEY UPDATE users_name = VALUES(users_name), users_phone = VALUES(users_phone);

-- ── Suppliers ────────────────────────────────────────────────────
INSERT INTO suppliers (supplier_id, supplier_name, supplier_email, supplier_phone) VALUES
  (1, 'Nile Beverages Co.',     'orders@nilebev.eg',    '+20225551001'),
  (2, 'Cairo Snacks Factory',   'sales@cairosnacks.eg', '+20225551002'),
  (3, 'Fresh Dairy Farm',       'info@freshdairy.eg',   '+20225551003'),
  (4, 'CleanPro Chemicals',     'supply@cleanpro.eg',   '+20225551004'),
  (5, 'Pharaoh Personal Care',  'b2b@pharaohpc.eg',     '+20225551005')
ON DUPLICATE KEY UPDATE supplier_name = VALUES(supplier_name);

-- ── Products ─────────────────────────────────────────────────────
INSERT INTO products (products_id, products_name, products_category_id, products_unit_of_measure_id, products_is_active, products_supplier_id) VALUES
  (1,  'Mineral Water 500ml',     1, 1, 1, 1),
  (2,  'Orange Juice 1L',         1, 5, 1, 1),
  (3,  'Potato Chips 100g',       2, 1, 1, 2),
  (4,  'Cheese Slices 200g',      3, 1, 1, 3),
  (5,  'Croissant Pack x4',       4, 1, 1, 2),
  (6,  'Energy Drink 250ml',      1, 1, 1, 1),
  (7,  'Biscuits Assorted 250g',  2, 1, 1, 2),
  (8,  'Yoghurt 500g',            3, 1, 1, 3),
  (9,  'Dish Soap 750ml',         5, 1, 1, 4),
  (10, 'Shampoo 400ml',           6, 1, 1, 5),
  (11, 'Mango Juice 1L',          1, 5, 1, 1),
  (12, 'Toast Bread Loaf',        4, 1, 1, 2),
  (13, 'Labneh 250g',             3, 1, 1, 3),
  (14, 'Peanut Butter 340g',      2, 1, 1, 2),
  (15, 'Floor Cleaner 1L',        5, 1, 1, 4)
ON DUPLICATE KEY UPDATE products_name = VALUES(products_name);

-- ── Product Attributes ───────────────────────────────────────────
INSERT INTO product_attributes (attribute_id, attribute_name, attribute_description) VALUES
  (1, 'Size',    'Product size / volume'),
  (2, 'Flavour', 'Flavour variant'),
  (3, 'Scent',   'Fragrance type')
ON DUPLICATE KEY UPDATE attribute_name = VALUES(attribute_name);

-- ── Product Attribute Values ─────────────────────────────────────
INSERT INTO product_attribute_values (attribute_value_id, attribute_value_attribute_id, attribute_value_value) VALUES
  (1, 1, 'Small'),  (2, 1, 'Medium'), (3, 1, 'Large'),
  (4, 2, 'Original'), (5, 2, 'Strawberry'), (6, 2, 'Mango'),
  (7, 3, 'Lavender'), (8, 3, 'Fresh Lemon')
ON DUPLICATE KEY UPDATE attribute_value_value = VALUES(attribute_value_value);

-- ── Product Variants ─────────────────────────────────────────────
INSERT INTO product_variants (variant_id, variant_products_id, variant_name, variant_sku, variant_unit_price, variant_cost_price, variant_status) VALUES
  (1,  1,  'Water 500ml Standard',            'WAT-500',   2.50,   1.50, 'active'),
  (2,  2,  'Orange Juice 1L Standard',        'OJ-1L',    15.00,   9.00, 'active'),
  (3,  3,  'Chips 100g Original',             'CHP-100',   8.75,   5.00, 'active'),
  (4,  4,  'Cheese Slices 200g',              'CHS-200',  22.00,  14.00, 'active'),
  (5,  5,  'Croissant x4 Pack',              'CRO-4PK',  18.50,  11.00, 'active'),
  (6,  6,  'Energy Drink 250ml',              'ENG-250',  12.00,   7.00, 'active'),
  (7,  7,  'Biscuits Assorted 250g',          'BIS-250',   9.00,   5.50, 'active'),
  (8,  8,  'Yoghurt 500g Plain',             'YOG-500',  16.00,  10.00, 'active'),
  (9,  9,  'Dish Soap 750ml Lemon',          'DSP-750',  25.00,  15.00, 'active'),
  (10, 10, 'Shampoo 400ml Lavender',          'SHP-400',  35.00,  22.00, 'active'),
  (11, 11, 'Mango Juice 1L',                  'MJ-1L',   16.00,   9.50, 'active'),
  (12, 12, 'Toast Bread Loaf',                'TBR-1',    10.00,   6.00, 'active'),
  (13, 13, 'Labneh 250g',                     'LBN-250',  14.00,   8.50, 'active'),
  (14, 14, 'Peanut Butter 340g',              'PNB-340',  28.00,  17.00, 'active'),
  (15, 15, 'Floor Cleaner 1L Fresh',          'FLC-1L',   20.00,  12.00, 'active'),
  (16, 3,  'Chips 100g Cheese Flavour',       'CHP-100C',  9.50,   5.50, 'active'),
  (17, 8,  'Yoghurt 500g Strawberry',         'YOG-500S', 17.00,  10.50, 'active'),
  (18, 10, 'Shampoo 400ml Fresh Lemon',       'SHP-400L', 35.00,  22.00, 'active')
ON DUPLICATE KEY UPDATE variant_name = VALUES(variant_name), variant_unit_price = VALUES(variant_unit_price);

-- ── Product Variant Attribute Map ────────────────────────────────
INSERT INTO product_variant_attribute_map (variant_attribute_map_variant_id, variant_attribute_map_attribute_value_id) VALUES
  (3,  4), -- Chips Original
  (16, 5), -- Chips Cheese (using Strawberry slot — reusing)
  (8,  4), -- Yoghurt Original
  (17, 5), -- Yoghurt Strawberry
  (9,  8), -- Dish Soap Fresh Lemon
  (10, 7), -- Shampoo Lavender
  (18, 8)  -- Shampoo Fresh Lemon
ON DUPLICATE KEY UPDATE variant_attribute_map_attribute_value_id = VALUES(variant_attribute_map_attribute_value_id);

-- ── Product Preferred Packaging ──────────────────────────────────
INSERT INTO product_preferred_packaging (products_id, packaging_type_id) VALUES
  (1,1),(1,2),(1,3),(2,1),(2,2),(3,1),(3,2),(4,1),(5,1),(6,1),(6,2),
  (7,1),(7,3),(8,1),(9,1),(10,1),(11,1),(11,2),(12,1),(13,1),(14,1),(15,1)
ON DUPLICATE KEY UPDATE packaging_type_id = VALUES(packaging_type_id);

-- ── Clients (50 — enriched with client_type, industry, area_tag, country, governorate) ──
INSERT INTO clients (clients_id, clients_company_name, clients_contact_name, clients_email,
                     clients_contact_phone_1, clients_credit_limit, clients_credit_balance,
                     clients_status, clients_rep_user_id, clients_client_type_id,
                     clients_industry_id, clients_area_tag_id, clients_country_id,
                     clients_governorate_id, clients_city, clients_address,
                     clients_payment_terms) VALUES
  (1,  'Cairo Supermarket',       'Hassan Ali',       'hassan@cairosm.eg',    '+201100000001', 10000, 0,    'active', 2, 3, 1, 1, 1, 1, 'Cairo',    'Tahrir Square area, Downtown', 'Net 15'),
  (2,  'Nile Grocery',            'Fatma Mohamed',    'fatma@nilegrocery.eg', '+201100000002', 5000,  250,  'active', 2, 1, 1, 2, 1, 1, 'Cairo',    'Makram Ebeid St, Nasr City',   'Net 7'),
  (3,  'Delta Mini Mart',         'Youssef Ibrahim',  'youssef@deltamm.eg',   '+201100000003', 8000,  0,    'active', 2, 1, 2, 8, 1, 1, 'Cairo',    'Shubra El Kheima',             'COD'),
  (4,  'Giza Wholesale',          'Amr Saeed',        'amr@gizawholesale.eg', '+201100000004', 25000, 1200, 'active', 2, 2, 1, 4, 1, 2, 'Giza',     'Faisal St, Giza',              'Net 30'),
  (5,  'Heliopolis Kiosk',        'Mona Gamal',       'mona@heliokiosk.eg',   '+201100000005', 3000,  0,    'active', 2, 4, 4, 3, 1, 1, 'Cairo',    'Korba, Heliopolis',            'COD'),
  (6,  'Zamalek Fresh Market',    'Tarek Nour',       'tarek@zamalekfm.eg',   '+201100000006', 15000, 500,  'active', 3, 3, 1, 5, 1, 1, 'Cairo',    '26 July St, Zamalek',          'Net 15'),
  (7,  'Maadi Corner Store',      'Laila Hassan',     'laila@maadistore.eg',  '+201100000007', 4000,  0,    'active', 3, 1, 2, 5, 1, 1, 'Cairo',    'Street 9, Maadi',              'COD'),
  (8,  'Nasr City Provisions',    'Khaled Omar',      'khaled@nasrcity.eg',   '+201100000008', 12000, 800,  'active', 3, 1, 1, 2, 1, 1, 'Cairo',    'Abbas El Akkad St',            'Net 15'),
  (9,  'Dokki Food Center',       'Samia Ahmed',      'samia@dokkifc.eg',     '+201100000009', 7000,  0,    'active', 3, 3, 1, 4, 1, 2, 'Giza',     'Dokki, Giza',                  'Net 7'),
  (10, '6th October Hypermarket', 'Nabil Fouad',      'nabil@6octhyper.eg',   '+201100000010', 30000, 3500, 'active', 3, 6, 1, 7, 1, 2, 'Giza',     '6th October City',             'Net 30'),
  (11, 'New Cairo Bazaar',        'Dina Magdy',       'dina@ncbazaar.eg',     '+201100000011', 6000,  0,    'active', 2, 1, 2, 6, 1, 1, 'Cairo',    'New Cairo, 1st Settlement',    'COD'),
  (12, 'Shubra Market',           'Mostafa Reda',     'mostafa@shubram.eg',   '+201100000012', 5500,  150,  'active', 2, 1, 1, 8, 1, 1, 'Cairo',    'Shubra, Cairo',                'Net 7'),
  (13, 'Mohandiseen Deli',        'Rania Kamal',      'rania@mohdeli.eg',     '+201100000013', 9000,  0,    'active', 2, 5, 3, 4, 1, 2, 'Giza',     'Gameat El Dowal St',           'Net 15'),
  (14, 'Agouza Express',          'Sherif Adel',      'sherif@agouza.eg',     '+201100000014', 4500,  0,    'active', 3, 1, 4, 4, 1, 2, 'Giza',     'Agouza, Giza',                 'COD'),
  (15, 'Ain Shams Grocers',       'Asmaa Nasser',     'asmaa@ainshams.eg',    '+201100000015', 3500,  200,  'active', 3, 1, 1, 8, 1, 1, 'Cairo',    'Ain Shams, Cairo',             'COD'),
  (16, 'Abbassia Quick Mart',     'Fadi Michel',      'fadi@abbassia.eg',     '+201100000016', 5000,  0,    'active', 2, 4, 4, 8, 1, 1, 'Cairo',    'Abbassia Square',              'COD'),
  (17, 'Rod El Farag Trading',    'Heba Sayed',       'heba@rodelfarag.eg',   '+201100000017', 8500,  600,  'active', 2, 2, 1, 8, 1, 1, 'Cairo',    'Rod El Farag',                 'Net 15'),
  (18, 'Sayeda Zeinab Shop',      'Ali Mahmoud',      'ali@szshop.eg',        '+201100000018', 2000,  0,    'active', 3, 4, 4, 1, 1, 1, 'Cairo',    'Sayeda Zeinab',                'COD'),
  (19, 'Manial Fine Foods',       'Noha Tamer',       'noha@manialff.eg',     '+201100000019', 11000, 0,    'active', 3, 3, 1, 5, 1, 1, 'Cairo',    'El Manial',                    'Net 15'),
  (20, 'Rawda Super',             'Mohamed Fathy',    'mfathy@rawdas.eg',     '+201100000020', 6500,  300,  'active', 2, 1, 2, 5, 1, 1, 'Cairo',    'Rawda, Cairo',                 'Net 7'),
  (21, 'El Marg Center',          'Aya Mahmoud',      'aya@elmarg.eg',        '+201100000021', 4000,  0,    'active', 2, 1, 2, 8, 1, 1, 'Cairo',    'El Marg',                      'COD'),
  (22, 'Hadayek Helwan Store',    'Bassem Adly',      'bassem@hhstore.eg',    '+201100000022', 3000,  0,    'active', 3, 1, 4, 1, 1, 1, 'Cairo',    'Hadayek Helwan',               'COD'),
  (23, 'Obour City Market',       'Wael Gamal',       'wael@obourm.eg',       '+201100000023', 7500,  400,  'active', 2, 3, 1, 6, 1, 4, 'Qalyubia', 'Obour City',                    'Net 7'),
  (24, 'Shorouk Provisions',      'Salma Hossam',     'salma@shoroukp.eg',    '+201100000024', 5000,  0,    'active', 3, 1, 2, 6, 1, 4, 'Qalyubia', 'Shorouk City',                  'COD'),
  (25, 'Sheikh Zayed Fresh',      'Karim Ashraf',     'karim@szfresh.eg',     '+201100000025', 20000, 1500, 'active', 2, 3, 1, 7, 1, 2, 'Giza',     'Sheikh Zayed City',            'Net 30'),
  (26, 'Badr City Corner',        'Mariam Essam',     'mariam@badrc.eg',      '+201100000026', 3500,  0,    'active', 3, 4, 4, 6, 1, 1, 'Cairo',    'Badr City',                    'COD'),
  (27, 'Faisal Street Mart',      'Ayman Saad',       'ayman@faisalm.eg',     '+201100000027', 6000,  0,    'active', 2, 1, 2, 4, 1, 2, 'Giza',     'Faisal St',                    'Net 7'),
  (28, 'Haram Boulevard Shop',    'Reem Youssef',     'reem@harambshop.eg',   '+201100000028', 4500,  100,  'active', 2, 1, 4, 4, 1, 2, 'Giza',     'Haram St',                     'COD'),
  (29, 'Imbaba Trading',          'Waleed Nabil',     'waleed@imbabat.eg',    '+201100000029', 5500,  0,    'active', 3, 2, 1, 4, 1, 2, 'Giza',     'Imbaba, Giza',                 'Net 15'),
  (30, 'Boulaq Dakrour Store',    'Sahar Magdi',      'sahar@boulaqd.eg',     '+201100000030', 3000,  0,    'active', 3, 1, 4, 4, 1, 2, 'Giza',     'Boulaq Dakrour',               'COD'),
  (31, 'Ramses Square Kiosk',     'Ehab Rizk',        'ehab@ramseskiosk.eg',  '+201100000031', 2000,  0,    'active', 2, 4, 4, 1, 1, 1, 'Cairo',    'Ramses Square',                'COD'),
  (32, 'Tahrir Grocery',          'Ghada Ibrahim',    'ghada@tahrirg.eg',     '+201100000032', 8000,  700,  'active', 2, 1, 1, 1, 1, 1, 'Cairo',    'Tahrir St',                    'Net 7'),
  (33, 'Garden City Mini Market', 'Hesham Kamal',     'hesham@gcmm.eg',       '+201100000033', 10000, 0,    'active', 3, 3, 1, 5, 1, 1, 'Cairo',    'Garden City',                  'Net 15'),
  (34, 'Madinet Nasr Quick Buy',  'Amira Salem',      'amira@mnqb.eg',        '+201100000034', 4000,  0,    'active', 2, 4, 4, 2, 1, 1, 'Cairo',    'Madinet Nasr',                 'COD'),
  (35, 'El Rehab Center',         'Tamer Adel',       'tamer@rehab.eg',       '+201100000035', 9500,  200,  'active', 3, 3, 1, 6, 1, 1, 'Cairo',    'El Rehab City',                'Net 15'),
  (36, 'Fifth Settlement Shop',   'Yasmin Fouad',     'yasmin@5thsettle.eg',  '+201100000036', 7000,  0,    'active', 2, 1, 2, 6, 1, 1, 'Cairo',    '5th Settlement',               'Net 7'),
  (37, 'El Tagamoa Market',       'Hany Ramadan',     'hany@tagamoam.eg',     '+201100000037', 12000, 900,  'active', 3, 3, 1, 6, 1, 1, 'Cairo',    'Tagamoa 5',                    'Net 15'),
  (38, 'Madinaty Express',        'Ola Mohamed',      'ola@madinatye.eg',     '+201100000038', 6000,  0,    'active', 2, 1, 4, 6, 1, 1, 'Cairo',    'Madinaty',                     'COD'),
  (39, 'Al Mokattam Store',       'Adel Hassan',      'adel@mokattam.eg',     '+201100000039', 3500,  0,    'active', 3, 1, 4, 1, 1, 1, 'Cairo',    'Mokattam',                     'COD'),
  (40, 'Helwan Mini Market',      'Neveen Yasser',    'neveen@helwanmm.eg',   '+201100000040', 4000,  150,  'active', 2, 1, 2, 1, 1, 1, 'Cairo',    'Helwan',                       'COD'),
  (41, 'El Maadi Organics',       'Ziad Tawfik',      'ziad@maadio.eg',       '+201100000041', 15000, 0,    'active', 3, 3, 1, 5, 1, 1, 'Cairo',    'Maadi',                        'Net 15'),
  (42, 'Korba Deli & More',       'Farida Nour',      'farida@korbadeli.eg',  '+201100000042', 5000,  400,  'active', 2, 5, 3, 3, 1, 1, 'Cairo',    'Korba, Heliopolis',            'Net 7'),
  (43, 'Almaza Pantry',           'Osama Wagdy',      'osama@almazap.eg',     '+201100000043', 6500,  0,    'active', 2, 1, 2, 3, 1, 1, 'Cairo',    'Almaza',                       'Net 7'),
  (44, 'Triumph Square Shop',     'Maha Samir',       'maha@triumphs.eg',     '+201100000044', 3000,  0,    'active', 3, 4, 4, 3, 1, 1, 'Cairo',    'Triumph Square',               'COD'),
  (45, 'Zeitoun Family Store',    'Yasser Sobhy',     'yasser@zeitounfs.eg',  '+201100000045', 4500,  250,  'active', 3, 1, 1, 8, 1, 1, 'Cairo',    'Zeitoun',                      'COD'),
  (46, 'El Matariyya Center',     'Hoda Emad',        'hoda@matariyya.eg',    '+201100000046', 5000,  0,    'active', 2, 1, 2, 8, 1, 1, 'Cairo',    'El Matariyya',                 'Net 7'),
  (47, 'El Daher Trading',        'Samir Habib',      'samir@dahertr.eg',     '+201100000047', 7000,  300,  'active', 2, 2, 1, 1, 1, 1, 'Cairo',    'El Daher',                     'Net 15'),
  (48, 'Masr El Gedeeda Stores',  'Amal Rashad',      'amal@masrgm.eg',       '+201100000048', 8000,  0,    'active', 3, 3, 1, 3, 1, 1, 'Cairo',    'Heliopolis',                   'Net 7'),
  (49, 'El Geish Street Shop',    'Mahmoud Ezzat',    'mahmoud@geishs.eg',    '+201100000049', 2500,  0,    'active', 2, 4, 4, 8, 1, 1, 'Cairo',    'El Geish St',                  'COD'),
  (50, 'Salam City Supermarket',  'Rasha Othman',     'rasha@salamcs.eg',     '+201100000050', 10000, 500,  'active', 3, 3, 1, 6, 1, 1, 'Cairo',    'Salam City',                   'Net 15')
ON DUPLICATE KEY UPDATE clients_company_name = VALUES(clients_company_name);

-- ── Client Interested Products (sample links) ───────────────────
INSERT INTO client_interested_products (client_id, products_id) VALUES
  (1,1),(1,2),(1,3),(2,1),(2,6),(3,3),(3,7),(4,1),(4,2),(4,3),(4,4),(4,5),
  (5,1),(5,6),(6,2),(6,4),(6,8),(7,1),(7,3),(8,1),(8,2),(8,5),(9,4),(9,8),
  (10,1),(10,2),(10,3),(10,4),(10,5),(10,6),(10,7),(10,8),(10,9),(10,10),
  (25,1),(25,2),(25,9),(25,10),(33,4),(33,8),(33,13),(42,5),(42,12),(42,13)
ON DUPLICATE KEY UPDATE products_id = VALUES(products_id);

-- ── Inventory ────────────────────────────────────────────────────
-- Truncate and re-insert clean data with production dates (no duplicates)
TRUNCATE TABLE inventory;
INSERT INTO inventory (variant_id, warehouse_id, packaging_type_id, inventory_quantity, inventory_status, inventory_production_date) VALUES
  -- Main Warehouse (all 18 variants)
  (1,1,1,2000,'available','2025-01-15'),
  (2,1,1,500,'available','2025-01-15'),
  (3,1,1,800,'available','2025-01-15'),
  (4,1,1,300,'available','2025-01-15'),
  (5,1,1,400,'available','2025-01-15'),
  (6,1,1,1000,'available','2025-01-15'),
  (7,1,1,600,'available','2025-01-15'),
  (8,1,1,350,'available','2025-01-15'),
  (9,1,1,200,'available','2025-01-15'),
  (10,1,1,150,'available','2025-01-15'),
  (11,1,1,450,'available','2025-01-15'),
  (12,1,1,300,'available','2025-01-15'),
  (13,1,1,250,'available','2025-01-15'),
  (14,1,1,180,'available','2025-01-15'),
  (15,1,1,220,'available','2025-01-15'),
  (16,1,1,400,'available','2025-01-15'),
  (17,1,1,200,'available','2025-01-15'),
  (18,1,1,120,'available','2025-01-15'),
  -- Ahmed Truck (warehouse 2)
  (1,2,1,200,'available','2025-01-15'),
  (2,2,1,80,'available','2025-01-15'),
  (3,2,1,120,'available','2025-01-15'),
  (4,2,1,50,'available','2025-01-15'),
  (5,2,1,60,'available','2025-01-15'),
  (6,2,1,100,'available','2025-01-15'),
  (7,2,1,80,'available','2025-01-15'),
  (8,2,1,40,'available','2025-01-15'),
  (11,2,1,60,'available','2025-01-15'),
  (12,2,1,30,'available','2025-01-15'),
  (16,2,1,50,'available','2025-01-15'),
  -- Sara Truck (warehouse 3)
  (1,3,1,180,'available','2025-01-15'),
  (2,3,1,70,'available','2025-01-15'),
  (3,3,1,100,'available','2025-01-15'),
  (4,3,1,45,'available','2025-01-15'),
  (5,3,1,55,'available','2025-01-15'),
  (6,3,1,90,'available','2025-01-15'),
  (7,3,1,70,'available','2025-01-15'),
  (8,3,1,35,'available','2025-01-15'),
  (13,3,1,40,'available','2025-01-15'),
  (14,3,1,25,'available','2025-01-15'),
  (17,3,1,30,'available','2025-01-15');

-- ── Purchase Orders ──────────────────────────────────────────────
INSERT INTO purchase_orders (purchase_orders_id, purchase_orders_supplier_id, purchase_orders_warehouse_id,
  purchase_orders_expected_delivery_date, purchase_orders_total_amount, purchase_orders_order_discount,
  purchase_orders_status, purchase_orders_notes) VALUES
  (1, 1, 1, DATE_ADD(CURDATE(), INTERVAL 3 DAY),  8500.00, 0.00, 'Delivered', 'Monthly beverages restock'),
  (2, 2, 1, DATE_ADD(CURDATE(), INTERVAL 5 DAY),  4200.00, 0.00, 'Delivered', 'Snacks and bakery restock'),
  (3, 3, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY),  3100.00, 0.00, 'Ordered',   'Dairy fresh delivery'),
  (4, 4, 1, DATE_ADD(CURDATE(), INTERVAL 7 DAY),  2800.00, 0.00, 'Ordered',   'Cleaning supplies Q2'),
  (5, 5, 1, DATE_ADD(CURDATE(), INTERVAL 4 DAY),  1600.00, 0.00, 'Ordered',   'Personal care restock')
ON DUPLICATE KEY UPDATE purchase_orders_total_amount = VALUES(purchase_orders_total_amount),
  purchase_orders_order_discount = VALUES(purchase_orders_order_discount);

-- ── Purchase Order Items ─────────────────────────────────────────
INSERT INTO purchase_order_items (purchase_order_items_id, purchase_order_items_purchase_order_id,
  purchase_order_items_variant_id, purchase_order_items_packaging_type_id,
  purchase_order_items_quantity_ordered, purchase_order_items_quantity_received,
  purchase_order_items_unit_cost, purchase_order_items_discount_amount,
  purchase_order_items_tax_rate, purchase_order_items_has_tax,
  purchase_order_items_total_cost) VALUES
  (1,  1, 1,  NULL, 500, 500, 1.50, 0.00, 0.00, 0, 750.00),
  (2,  1, 2,  NULL, 200, 200, 9.00, 0.00, 0.00, 0, 1800.00),
  (3,  1, 6,  NULL, 300, 300, 7.00, 0.00, 0.00, 0, 2100.00),
  (4,  1, 11, NULL, 250, 250, 9.50, 0.00, 0.00, 0, 2375.00),
  (5,  2, 3,  NULL, 300, 300, 5.00, 0.00, 0.00, 0, 1500.00),
  (6,  2, 7,  NULL, 200, 200, 5.50, 0.00, 0.00, 0, 1100.00),
  (7,  2, 5,  NULL, 100, 100, 11.00, 0.00, 0.00, 0, 1100.00),
  (8,  2, 14, NULL, 30,  0,   17.00, 0.00, 0.00, 0, 510.00),
  (9,  3, 4,  NULL, 100, 0,   14.00, 0.00, 0.00, 0, 1400.00),
  (10, 3, 8,  NULL, 80,  0,   10.00, 0.00, 0.00, 0, 800.00),
  (11, 3, 13, NULL, 60,  0,   8.50,  0.00, 0.00, 0, 510.00),
  (12, 4, 9,  NULL, 100, 0,   15.00, 0.00, 0.00, 0, 1500.00),
  (13, 4, 15, NULL, 100, 0,   12.00, 0.00, 0.00, 0, 1200.00),
  (14, 5, 10, NULL, 50,  0,   22.00, 0.00, 0.00, 0, 1100.00),
  (15, 5, 18, NULL, 30,  0,   22.00, 0.00, 0.00, 0, 660.00)
ON DUPLICATE KEY UPDATE purchase_order_items_total_cost = VALUES(purchase_order_items_total_cost);

-- ── Goods Receipts (for delivered POs) ───────────────────────────
INSERT INTO goods_receipts (goods_receipt_id, goods_receipt_warehouse_id, goods_receipt_received_by_user_id,
  goods_receipt_purchase_order_id, goods_receipt_notes) VALUES
  (1, 1, 4, 1, 'Beverages PO#1 received in full'),
  (2, 1, 4, 2, 'Snacks PO#2 received in full')
ON DUPLICATE KEY UPDATE goods_receipt_notes = VALUES(goods_receipt_notes);

INSERT INTO goods_receipt_items (goods_receipt_item_id, goods_receipt_id,
  variant_id, goods_receipt_items_packaging_type_id, quantity_received) VALUES
  (1, 1, 1,  NULL, 500), (2, 1, 2,  NULL, 200), (3, 1, 6,  NULL, 300), (4, 1, 11, NULL, 250),
  (5, 2, 3,  NULL, 300), (6, 2, 7,  NULL, 200), (7, 2, 5,  NULL, 100)
ON DUPLICATE KEY UPDATE quantity_received = VALUES(quantity_received);

-- ── Sales Orders (20 — last 30 days) ────────────────────────────
INSERT INTO sales_orders (sales_orders_id, sales_orders_client_id, sales_orders_representative_id,
  sales_orders_warehouse_id, sales_orders_status, sales_orders_delivery_status,
  sales_orders_total_amount, sales_orders_subtotal, sales_orders_order_date) VALUES
  (1,  1,  2, 2, 'Delivered',  'Delivered',     450.00,  450.00,  DATE_SUB(NOW(), INTERVAL 28 DAY)),
  (2,  2,  2, 2, 'Delivered',  'Delivered',     320.00,  320.00,  DATE_SUB(NOW(), INTERVAL 25 DAY)),
  (3,  4,  2, 2, 'Delivered',  'Delivered',    1800.00, 1800.00,  DATE_SUB(NOW(), INTERVAL 22 DAY)),
  (4,  6,  3, 3, 'Invoiced',   'Delivered',     650.00,  650.00,  DATE_SUB(NOW(), INTERVAL 20 DAY)),
  (5,  3,  2, 2, 'Delivered',  'Delivered',     280.00,  280.00,  DATE_SUB(NOW(), INTERVAL 18 DAY)),
  (6,  10, 3, 3, 'Delivered',  'Delivered',    2200.00, 2200.00,  DATE_SUB(NOW(), INTERVAL 16 DAY)),
  (7,  5,  2, 2, 'Invoiced',   'Delivered',     175.00,  175.00,  DATE_SUB(NOW(), INTERVAL 14 DAY)),
  (8,  8,  3, 3, 'Delivered',  'Delivered',     900.00,  900.00,  DATE_SUB(NOW(), INTERVAL 12 DAY)),
  (9,  1,  2, 2, 'Invoiced',  'Not Delivered', 520.00,  520.00,  DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (10, 7,  3, 3, 'Delivered',  'Delivered',     380.00,  380.00,  DATE_SUB(NOW(), INTERVAL 9 DAY)),
  (11, 11, 2, 2, 'Delivered',  'Delivered',     200.00,  200.00,  DATE_SUB(NOW(), INTERVAL 8 DAY)),
  (12, 12, 2, 2, 'Invoiced',   'Delivered',     440.00,  440.00,  DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (13, 14, 3, 3, 'Invoiced',  'Not Delivered', 660.00,  660.00,  DATE_SUB(NOW(), INTERVAL 6 DAY)),
  (14, 25, 2, 2, 'Delivered',  'Delivered',    1500.00, 1500.00,  DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (15, 20, 2, 2, 'Delivered',  'Delivered',     310.00,  310.00,  DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (16, 30, 3, 3, 'Invoiced',  'Not Delivered', 480.00,  480.00,  DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (17, 33, 3, 3, 'Pending',    'Not Delivered', 750.00,  750.00,  DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (18, 15, 3, 3, 'Confirmed',  'Preparing',     290.00,  290.00,  DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (19, 40, 2, 2, 'Pending',    'Not Delivered', 410.00,  410.00,  NOW()),
  (20, 42, 2, 2, 'Pending',    'Not Delivered', 560.00,  560.00,  NOW())
ON DUPLICATE KEY UPDATE sales_orders_total_amount = VALUES(sales_orders_total_amount);

-- ── Sales Order Items ────────────────────────────────────────────
-- packaging_type_id=1 (Single); quantity_delivered set for delivered orders
INSERT INTO sales_order_items (sales_order_items_id, sales_order_items_sales_order_id,
  sales_order_items_variant_id, sales_order_items_packaging_type_id,
  sales_order_items_quantity, sales_order_items_unit_price,
  sales_order_items_subtotal, sales_order_items_total_price,
  sales_order_items_quantity_delivered, sales_order_items_quantity_returned) VALUES
  -- SO#1 Delivered (delivery 1)
  (1,  1,  1, 1,   100, 2.50,  250.00,  250.00, 100, 5),
  (2,  1,  3, 1,   20,  8.75,  175.00,  175.00,  20, 0),
  (3,  1,  6, 1,   5,  12.00,   60.00,   60.00,   5, 0),
  -- SO#2 Delivered (delivery 2)
  (4,  2,  1, 1,   80,  2.50,  200.00,  200.00,  80, 0),
  (5,  2,  6, 1,   10, 12.00,  120.00,  120.00,  10, 0),
  -- SO#3 Delivered (delivery 3)
  (6,  3,  1, 1,   200, 2.50,  500.00,  500.00, 200, 0),
  (7,  3,  2, 1,   50, 15.00,  750.00,  750.00,  50, 0),
  (8,  3,  3, 1,   60,  8.75,  525.00,  525.00,  60, 0),
  -- SO#4 Delivered (delivery 4)
  (9,  4,  4, 1,   15, 22.00,  330.00,  330.00,  15, 0),
  (10, 4,  8, 1,   20, 16.00,  320.00,  320.00,  20, 0),
  -- SO#5 Delivered (delivery 5)
  (11, 5,  7, 1,   30,  9.00,  270.00,  270.00,  30, 0),
  -- SO#6 Delivered (delivery 6)
  (12, 6,  1, 1,   300, 2.50,  750.00,  750.00, 300, 0),
  (13, 6,  2, 1,   60, 15.00,  900.00,  900.00,  60, 0),
  (14, 6,  5, 1,   30, 18.50,  555.00,  555.00,  30, 0),
  -- SO#7 Delivered (delivery 7)
  (15, 7,  1, 1,   50,  2.50,  125.00,  125.00,  50, 0),
  (16, 7,  6, 1,   5,  12.00,   60.00,   60.00,   5, 0),
  -- SO#8 Delivered (delivery 8)
  (17, 8,  4, 1,   20, 22.00,  440.00,  440.00,  20, 3),
  (18, 8,  8, 1,   25, 16.00,  400.00,  400.00,  25, 0),
  -- SO#9 Invoiced, Not Delivered
  (19, 9,  2, 1,   20, 15.00,  300.00,  300.00,   0, 0),
  (20, 9,  3, 1,   25,  8.75,  218.75,  218.75,   0, 0),
  -- SO#10 Delivered (delivery 9)
  (21, 10, 1, 1,   100, 2.50,  250.00,  250.00, 100, 0),
  (22, 10, 7, 1,   15,  9.00,  135.00,  135.00,  15, 0),
  -- SO#11 Delivered (delivery 10)
  (23, 11, 6, 1,   15, 12.00,  180.00,  180.00,  15, 0),
  -- SO#12 Delivered (delivery 11)
  (24, 12, 1, 1,   100, 2.50,  250.00,  250.00, 100, 0),
  (25, 12, 3, 1,   20,  8.75,  175.00,  175.00,  20, 0),
  -- SO#13 Invoiced, Not Delivered
  (26, 13, 4, 1,   10, 22.00,  220.00,  220.00,   0, 0),
  (27, 13, 2, 1,   30, 15.00,  450.00,  450.00,   0, 0),
  -- SO#14 Delivered (delivery 12)
  (28, 14, 1, 1,   200, 2.50,  500.00,  500.00, 200, 0),
  (29, 14, 2, 1,   40, 15.00,  600.00,  600.00,  40, 0),
  (30, 14, 9, 1,   16, 25.00,  400.00,  400.00,  16, 0),
  -- SO#15 Delivered (delivery 13)
  (31, 15, 1, 1,   80,  2.50,  200.00,  200.00,  80, 0),
  (32, 15, 12, 1,   10, 10.00,  100.00,  100.00,  10, 0),
  -- SO#16 Invoiced, Not Delivered
  (33, 16, 3, 1,   30,  8.75,  262.50,  262.50,   0, 0),
  (34, 16, 7, 1,   25,  9.00,  225.00,  225.00,   0, 0),
  -- SO#17 Pending
  (35, 17, 4, 1,   15, 22.00,  330.00,  330.00,   0, 0),
  (36, 17, 13, 1,   30, 14.00,  420.00,  420.00,   0, 0),
  -- SO#18 Confirmed, Preparing
  (37, 18, 1, 1,   60,  2.50,  150.00,  150.00,   0, 0),
  (38, 18, 6, 1,   12, 12.00,  144.00,  144.00,   0, 0),
  -- SO#19 Pending
  (39, 19, 11, 1,   15, 16.00,  240.00,  240.00,   0, 0),
  (40, 19, 14, 1,   6,  28.00,  168.00,  168.00,   0, 0),
  -- SO#20 Pending
  (41, 20, 5, 1,   20, 18.50,  370.00,  370.00,   0, 0),
  (42, 20, 12, 1,   20, 10.00,  200.00,  200.00,   0, 0)
ON DUPLICATE KEY UPDATE sales_order_items_total_price = VALUES(sales_order_items_total_price),
  sales_order_items_quantity_delivered = VALUES(sales_order_items_quantity_delivered),
  sales_order_items_quantity_returned = VALUES(sales_order_items_quantity_returned);

-- ── Sales Deliveries (for delivered orders) ──────────────────────
INSERT INTO sales_deliveries (sales_deliveries_id, sales_deliveries_sales_order_id,
  sales_deliveries_warehouse_id, sales_deliveries_delivery_status,
  sales_deliveries_delivered_by_user_id, sales_deliveries_delivery_notes) VALUES
  (1,  1,  2, 'Delivered', 2, 'Delivered on time'),
  (2,  2,  2, 'Delivered', 2, 'All items OK'),
  (3,  3,  2, 'Delivered', 2, 'Wholesale order delivered'),
  (4,  4,  3, 'Delivered', 3, 'Fresh delivery'),
  (5,  5,  2, 'Delivered', 2, 'Complete'),
  (6,  6,  3, 'Delivered', 3, 'Large order — hypermarket'),
  (7,  7,  2, 'Delivered', 2, NULL),
  (8,  8,  3, 'Delivered', 3, NULL),
  (9,  10, 3, 'Delivered', 3, NULL),
  (10, 11, 2, 'Delivered', 2, NULL),
  (11, 12, 2, 'Delivered', 2, NULL),
  (12, 14, 2, 'Delivered', 2, 'Sheikh Zayed delivery'),
  (13, 15, 2, 'Delivered', 2, NULL)
ON DUPLICATE KEY UPDATE sales_deliveries_delivery_status = VALUES(sales_deliveries_delivery_status),
  sales_deliveries_warehouse_id = VALUES(sales_deliveries_warehouse_id);

-- ── Sales Delivery Items ─────────────────────────────────────────
INSERT INTO sales_delivery_items (sales_delivery_items_id, sales_delivery_items_delivery_id,
  sales_delivery_items_sales_order_item_id, sales_delivery_items_quantity_delivered) VALUES
  (1,1,1,100),(2,1,2,20),(3,1,3,5),
  (4,2,4,80),(5,2,5,10),
  (6,3,6,200),(7,3,7,50),(8,3,8,60),
  (9,4,9,15),(10,4,10,20),
  (11,5,11,30),
  (12,6,12,300),(13,6,13,60),(14,6,14,30),
  (15,7,15,50),(16,7,16,5),
  (17,8,17,20),(18,8,18,25),
  (19,9,21,100),(20,9,22,15),
  (21,10,23,15),
  (22,11,24,100),(23,11,25,20),
  (24,12,28,200),(25,12,29,40),(26,12,30,16),
  (27,13,31,80),(28,13,32,10)
ON DUPLICATE KEY UPDATE sales_delivery_items_quantity_delivered = VALUES(sales_delivery_items_quantity_delivered);

-- ── Sales Returns ────────────────────────────────────────────────
INSERT INTO sales_returns (returns_id, returns_client_id, returns_created_by_user_id,
  returns_sales_order_id, returns_reason, returns_total_amount, returns_status, returns_notes) VALUES
  (1, 1, 2, 1, 'Damaged packaging on 5 water bottles',  12.50, 'Approved', 'Credited to client'),
  (2, 8, 3, 8, 'Wrong cheese variant delivered',        66.00, 'Pending',  'Awaiting warehouse check')
ON DUPLICATE KEY UPDATE returns_total_amount = VALUES(returns_total_amount);

INSERT INTO sales_return_items (return_items_id, return_items_return_id,
  return_items_sales_order_item_id, return_items_quantity, return_items_unit_price, return_items_total_price) VALUES
  (1, 1, 1, 5, 2.50, 12.50),
  (2, 2, 17, 3, 22.00, 66.00)
ON DUPLICATE KEY UPDATE return_items_total_price = VALUES(return_items_total_price);

-- ── Invoices ─────────────────────────────────────────────────────
INSERT INTO invoices (invoices_id, invoices_client_id, invoices_total_amount, invoices_status,
  invoices_due_date, invoices_notes) VALUES
  (1, 6,  650.00,  'issued',  DATE_ADD(NOW(), INTERVAL 15 DAY), 'Invoice for SO#4'),
  (2, 5,  175.00,  'issued',  DATE_ADD(NOW(), INTERVAL 7 DAY),  'Invoice for SO#7'),
  (3, 12, 440.00,  'issued',  DATE_ADD(NOW(), INTERVAL 7 DAY),  'Invoice for SO#12'),
  (4, 4, 1800.00,  'paid',    DATE_SUB(NOW(), INTERVAL 5 DAY),  'Paid invoice for SO#3')
ON DUPLICATE KEY UPDATE invoices_total_amount = VALUES(invoices_total_amount);

-- ── Visits (20 — with GPS coords around Cairo) ──────────────────
INSERT INTO visits (visits_id, visits_client_id, visits_rep_user_id, visits_status,
  visits_start_time, visits_end_time, visits_purpose, visits_outcome,
  visits_start_latitude, visits_start_longitude) VALUES
  (1,  1,  2, 'Completed', DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY) + INTERVAL 45 MINUTE, 'Sales call',   'Order placed',          30.0444, 31.2357),
  (2,  4,  2, 'Completed', DATE_SUB(NOW(), INTERVAL 13 DAY), DATE_SUB(NOW(), INTERVAL 13 DAY) + INTERVAL 30 MINUTE, 'Collection',   'Payment collected',     30.0131, 31.2089),
  (3,  6,  3, 'Completed', DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 60 MINUTE, 'New client',   'Contract signed',       30.0588, 31.2247),
  (4,  10, 3, 'Completed', DATE_SUB(NOW(), INTERVAL 11 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY) + INTERVAL 50 MINUTE, 'Sales call',   'Large order placed',    30.0074, 31.0112),
  (5,  2,  2, 'Completed', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY) + INTERVAL 20 MINUTE, 'Follow-up',    'Committed to order',    30.0519, 31.3400),
  (6,  8,  3, 'Completed', DATE_SUB(NOW(), INTERVAL 9 DAY),  DATE_SUB(NOW(), INTERVAL 9 DAY) + INTERVAL 35 MINUTE,  'Sales call',   'Order placed',          30.0525, 31.3478),
  (7,  12, 2, 'Completed', DATE_SUB(NOW(), INTERVAL 8 DAY),  DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 25 MINUTE,  'Collection',   'Partial payment',       30.1006, 31.2449),
  (8,  25, 2, 'Completed', DATE_SUB(NOW(), INTERVAL 7 DAY),  DATE_SUB(NOW(), INTERVAL 7 DAY) + INTERVAL 45 MINUTE,  'Sales call',   'Order placed',          30.0370, 31.0116),
  (9,  7,  3, 'Completed', DATE_SUB(NOW(), INTERVAL 6 DAY),  DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 30 MINUTE,  'Follow-up',    'No purchase',           29.9601, 31.2575),
  (10, 33, 3, 'Completed', DATE_SUB(NOW(), INTERVAL 5 DAY),  DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 40 MINUTE,  'Sales call',   'Small order',           30.0392, 31.2330),
  (11, 15, 3, 'Completed', DATE_SUB(NOW(), INTERVAL 4 DAY),  DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 20 MINUTE,  'Collection',   'Payment received',      30.1018, 31.3300),
  (12, 40, 2, 'Completed', DATE_SUB(NOW(), INTERVAL 3 DAY),  DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 35 MINUTE,  'Follow-up',    'Placed small order',    29.8495, 31.3339),
  (13, 20, 2, 'Completed', DATE_SUB(NOW(), INTERVAL 2 DAY),  DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 25 MINUTE,  'Sales call',   'Reorder placed',        30.0301, 31.2275),
  (14, 42, 2, 'Completed', DATE_SUB(NOW(), INTERVAL 2 DAY),  DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 40 MINUTE,  'Sales call',   'New products pitched',  30.0900, 31.3300),
  (15, 48, 3, 'Completed', DATE_SUB(NOW(), INTERVAL 1 DAY),  DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 30 MINUTE,  'Follow-up',    'Will order next week',  30.0870, 31.3400),
  (16, 35, 3, 'Completed', DATE_SUB(NOW(), INTERVAL 1 DAY),  DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 50 MINUTE,  'Sales call',   'Large order incoming',  30.0577, 31.4560),
  (17, 11, 2, 'Started',   NOW(),                             NULL,                                                   'Sales call',   NULL,                    30.0280, 31.4720),
  (18, 37, 3, 'Started',   NOW(),                             NULL,                                                   'Collection',   NULL,                    30.0285, 31.4730),
  (19, 47, 2, 'Planned',   DATE_ADD(NOW(), INTERVAL 1 DAY),  NULL,                                                   'Sales call',   NULL,                    30.0590, 31.2430),
  (20, 41, 3, 'Planned',   DATE_ADD(NOW(), INTERVAL 1 DAY),  NULL,                                                   'Follow-up',    NULL,                    29.9601, 31.2575)
ON DUPLICATE KEY UPDATE visits_status = VALUES(visits_status);

-- ── Visit Activities ─────────────────────────────────────────────
INSERT INTO visit_activities (activity_id, activity_visit_id, activity_user_id,
  activity_type, activity_reference_id, activity_description) VALUES
  (1,  1, 2, 'sales_order',   1,  'Created SO#1 — Water + Chips'),
  (2,  2, 2, 'payment',       1,  'Collected EGP 1,200 cash'),
  (3,  3, 3, 'sales_order',   4,  'Created SO#4 — Cheese + Yoghurt'),
  (4,  4, 3, 'sales_order',   6,  'Created SO#6 — Hypermarket large order'),
  (5,  6, 3, 'sales_order',   8,  'Created SO#8'),
  (6,  7, 2, 'payment',       7,  'Collected partial EGP 150'),
  (7,  8, 2, 'sales_order',   14, 'Created SO#14 — Sheikh Zayed'),
  (8,  12, 2, 'sales_order',  19, 'Created SO#19'),
  (9,  13, 2, 'sales_order',  15, 'Created SO#15'),
  (10, 14, 2, 'sales_order',  20, 'Created SO#20 — Korba deli')
ON DUPLICATE KEY UPDATE activity_description = VALUES(activity_description);

-- ── Visit Plans ──────────────────────────────────────────────────
INSERT INTO visit_plans (visit_plan_id, visit_plan_name, visit_plan_description, user_id,
  visit_plan_status, visit_plan_start_date, visit_plan_end_date,
  visit_plan_recurrence_type, visit_plan_selected_days, visit_plan_repeat_every) VALUES
  (1, 'Ahmed Weekly Route - Downtown',  'Downtown Cairo and Shubra route',             2, 'Active', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY), 'Weekly', '[7,2]',    1),
  (2, 'Ahmed Weekly Route - New Cairo',  'New Cairo, Rehab, Tagamoa clients',          2, 'Active', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY), 'Weekly', '[1,3]',    1),
  (3, 'Sara Weekly Route - Giza',        'Giza, Haram, Dokki, 6th October clients',   3, 'Active', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY), 'Weekly', '[7,2]',    1),
  (4, 'Sara Weekly Route - Heliopolis',   'Heliopolis, Ain Shams, Matariyya clients',  3, 'Active', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 90 DAY), 'Weekly', '[1,4]',    1)
ON DUPLICATE KEY UPDATE visit_plan_name = VALUES(visit_plan_name);

-- ── Visit Plan Clients ───────────────────────────────────────────
INSERT INTO visit_plan_clients (visit_plan_id, client_id, visit_order) VALUES
  (1, 1, 1),(1, 32, 2),(1, 31, 3),(1, 3, 4),(1, 12, 5),(1, 17, 6),(1, 47, 7),
  (2, 11, 1),(2, 36, 2),(2, 38, 3),(2, 23, 4),(2, 34, 5),(2, 40, 6),
  (3, 4, 1),(3, 27, 2),(3, 28, 3),(3, 9, 4),(3, 13, 5),(3, 29, 6),(3, 10, 7),(3, 25, 8),
  (4, 5, 1),(4, 42, 2),(4, 43, 3),(4, 48, 4),(4, 15, 5),(4, 45, 6),(4, 46, 7)
ON DUPLICATE KEY UPDATE visit_order = VALUES(visit_order);

-- ── Payments ─────────────────────────────────────────────────────
INSERT INTO payments (payments_id, payments_client_id, payments_method_id, payments_amount,
  payments_date, payments_rep_user_id, payments_safe_id, payments_notes) VALUES
  (1, 4,  1, 1200.00, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 2, 1, 'Partial settlement'),
  (2, 2,  1,  250.00, DATE_SUB(CURDATE(), INTERVAL 18 DAY), 2, 2, 'Cash collection'),
  (3, 10, 2, 3500.00, DATE_SUB(CURDATE(), INTERVAL 15 DAY), 3, 1, 'Bank transfer received'),
  (4, 8,  1,  800.00, DATE_SUB(CURDATE(), INTERVAL 12 DAY), 3, 3, 'Cash collection'),
  (5, 6,  2,  500.00, DATE_SUB(CURDATE(), INTERVAL 8 DAY),  3, 1, 'Bank transfer'),
  (6, 25, 1, 1500.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY),  2, 2, 'Cash collection visit'),
  (7, 12, 1,  150.00, DATE_SUB(CURDATE(), INTERVAL 3 DAY),  2, 2, 'Small cash payment'),
  (8, 1,  1,  450.00, DATE_SUB(CURDATE(), INTERVAL 1 DAY),  2, 2, 'Full SO#1 payment'),
  (9, 33, 3, 1000.00, CURDATE(),                              3, 3, 'Advance — pending delivery')
ON DUPLICATE KEY UPDATE payments_amount = VALUES(payments_amount);

-- ── Refunds ──────────────────────────────────────────────────────
INSERT INTO refunds (refunds_id, refunds_client_id, refunds_method_id, refunds_amount,
  refunds_date, refunds_safe_id, refunds_rep_user_id, refunds_notes) VALUES
  (1, 1, 1, 12.50, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 2, 2, 'Refund for damaged water bottles (return #1)')
ON DUPLICATE KEY UPDATE refunds_amount = VALUES(refunds_amount);

-- ── Safe Transactions ────────────────────────────────────────────
INSERT INTO safe_transactions (safe_transactions_id, safe_transactions_safe_id,
  safe_transactions_type, safe_transactions_amount, safe_transactions_balance_before,
  safe_transactions_balance_after, safe_transactions_description, safe_transactions_reference,
  safe_transactions_created_by, safe_transactions_status, safe_transactions_related_table) VALUES
  (1,  1, 'credit', 1200.00, 48800.00, 50000.00, 'Payment from Giza Wholesale',   'PAY-1',  2, 'approved', 'payments'),
  (2,  2, 'credit',  250.00,  4750.00,  5000.00, 'Payment from Nile Grocery',     'PAY-2',  2, 'approved', 'payments'),
  (3,  1, 'credit', 3500.00, 46500.00, 50000.00, 'Bank transfer from 6th Oct',    'PAY-3',  3, 'approved', 'payments'),
  (4,  3, 'credit',  800.00,  4200.00,  5000.00, 'Payment from Nasr City',        'PAY-4',  3, 'approved', 'payments'),
  (5,  1, 'credit',  500.00, 49500.00, 50000.00, 'Bank transfer from Zamalek',    'PAY-5',  3, 'approved', 'payments'),
  (6,  2, 'credit', 1500.00,  3500.00,  5000.00, 'Payment from Sheikh Zayed',     'PAY-6',  2, 'approved', 'payments'),
  (7,  2, 'credit',  150.00,  4850.00,  5000.00, 'Payment from Shubra Market',    'PAY-7',  2, 'approved', 'payments'),
  (8,  2, 'credit',  450.00,  4550.00,  5000.00, 'Payment from Cairo Supermarket','PAY-8',  2, 'approved', 'payments'),
  (9,  3, 'credit', 1000.00,  4000.00,  5000.00, 'Advance from Garden City',      'PAY-9',  3, 'approved', 'payments'),
  (10, 2, 'debit',   12.50,   5012.50,  5000.00, 'Refund for return #1',          'REF-1',  2, 'approved', 'refunds'),
  (11, 1, 'debit',  2500.00, 52500.00, 50000.00, 'Vehicle fuel and maintenance',  'EXP-1',  1, 'approved', NULL),
  (12, 1, 'debit',  1200.00, 51200.00, 50000.00, 'Office expenses',              'EXP-2',  1, 'approved', NULL)
ON DUPLICATE KEY UPDATE safe_transactions_amount = VALUES(safe_transactions_amount);

-- ── Financial Transactions ───────────────────────────────────────
INSERT INTO financial_transactions (financial_transactions_id, financial_transactions_type,
  financial_transactions_amount, financial_transactions_notes,
  financial_transactions_safe_id, financial_transactions_user_id) VALUES
  (1, 'income',  15000.00, 'Weekly sales revenue deposit',       1, 1),
  (2, 'expense',  2500.00, 'Vehicle fuel and maintenance',       1, 1),
  (3, 'income',   8750.00, 'Client collections - Ahmed route',   2, 2),
  (4, 'income',   6300.00, 'Client collections - Sara route',    3, 3),
  (5, 'expense',  1200.00, 'Office expenses',                    1, 1),
  (6, 'income',   4800.00, 'Settlement of overdue accounts',     1, 1)
ON DUPLICATE KEY UPDATE financial_transactions_amount = VALUES(financial_transactions_amount);

-- ── Notifications ────────────────────────────────────────────────
INSERT INTO notifications (notifications_id, notifications_title, notifications_body, notifications_channel,
  notifications_priority, notifications_is_read, notifications_reference_table,
  notifications_reference_id, notifications_role, notifications_user_id) VALUES
  (1,  'New Sales Order #17',         'Garden City Mini Market placed order for EGP 750',       'orders',    'normal',  0, 'sales_orders',    17, 'admin', NULL),
  (2,  'New Sales Order #19',         'Helwan Mini Market placed order for EGP 410',            'orders',    'normal',  0, 'sales_orders',    19, 'admin', NULL),
  (3,  'New Sales Order #20',         'Korba Deli placed order for EGP 560',                    'orders',    'normal',  0, 'sales_orders',    20, 'admin', NULL),
  (4,  'Payment Received',            'EGP 1,200 received from Giza Wholesale',                 'payments',  'normal',  1, 'payments',        1,  'admin', NULL),
  (5,  'Return Request #2',           'Nasr City Provisions returned cheese slices',            'returns',   'high',    0, 'sales_returns',   2,  'admin', NULL),
  (6,  'Low Stock Alert',             'Shampoo 400ml Lavender below 50 units in main warehouse','inventory', 'high',    0, 'inventory',       NULL,'admin', NULL),
  (7,  'Visit Plan Reminder',         'Your Downtown Cairo route starts tomorrow',              'visits',    'normal',  0, 'visit_plans',     1,  'rep',   2),
  (8,  'New Order Assigned',          'SO#19 assigned to you for delivery',                     'orders',    'normal',  0, 'sales_orders',    19, 'rep',   2),
  (9,  'Payment Collection Due',      'Collect EGP 900 from El Tagamoa Market',                 'payments',  'normal',  0, 'clients',         37, 'rep',   3),
  (10, 'Visit Plan Reminder',         'Your Giza route starts tomorrow',                        'visits',    'normal',  0, 'visit_plans',     3,  'rep',   3),
  (11, 'Purchase Order Ready',        'PO#3 - Dairy delivery expected in 2 days',               'purchase',  'normal',  0, 'purchase_orders', 3,  'admin', NULL),
  (12, 'Weekly Sales Summary',        'Total sales this week: EGP 12,350. Top rep: Ahmed.',     'reports',   'low',     1, NULL,              NULL,'admin', NULL)
ON DUPLICATE KEY UPDATE notifications_title = VALUES(notifications_title), notifications_user_id = VALUES(notifications_user_id), notifications_reference_table = VALUES(notifications_reference_table);

-- ── Versions (entity sync tracking) ──────────────────────────────
INSERT INTO versions (versions_id, entity, version) VALUES
  (1,  'products',         3),
  (2,  'product_variants', 3),
  (3,  'clients',          5),
  (4,  'categories',       1),
  (5,  'base_units',       1),
  (6,  'packaging_types',  1),
  (7,  'suppliers',        2),
  (8,  'warehouses',       1),
  (9,  'safes',            2),
  (10, 'users',            4),
  (11, 'payment_methods',  1),
  (12, 'sales_orders',     8),
  (13, 'visits',           6),
  (14, 'visit_plans',      2),
  (15, 'inventory',        5),
  (16, 'payments',         4),
  (17, 'settings',         1),
  (18, 'notifications',    3),
  (19, 'countries',        1),
  (20, 'governorates',     1),
  (21, 'purchase_orders',  3),
  (22, 'invoices',         2),
  (23, 'client_types',     1),
  (24, 'client_industries',1),
  (25, 'client_area_tags', 1)
ON DUPLICATE KEY UPDATE version = VALUES(version);

-- ── Settings ─────────────────────────────────────────────────────
INSERT INTO settings (settings_key, settings_value, settings_description, settings_type, settings_label) VALUES
  ('expiration_date',   '2099-12-31',          'Demo tenant system expiry',       'text', 'تاريخ الانتهاء'),
  ('users_limits',      '9999',                'Max users allowed',               'text', 'حد المستخدمين'),
  ('demo_trial_days',   '7',                   'Trial duration in days',          'text', 'أيام التجربة'),  -- ⚠️ Keep in sync with TRIAL_DAYS in auth/register_trial.php
  ('demo_max_per_ip',   '3',                   'Max signups per IP per day',      'text', 'حد التسجيل'),
  ('company_name',      'Nile Foods Demo Co.', 'Company display name',            'text', 'اسم الشركة'),
  ('company_currency',  'EGP',                 'Default currency',                'text', 'العملة'),
  ('tax_rate',          '14',                  'VAT percentage',                  'text', 'نسبة الضريبة'),
  ('tax_enabled',       '0',                   'Tax calculation enabled',         'text', 'تفعيل الضريبة'),
  ('invoice_prefix',    'INV-',                'Invoice number prefix',           'text', 'بادئة الفاتورة'),
  ('default_credit_limit', '5000',             'Default new client credit limit', 'text', 'حد الائتمان'),
  -- Company settings
  ('company_description', 'شركة متخصصة في توزيع المنتجات الغذائية والاستهلاكية', 'وصف مختصر عن نشاط الشركة', 'string', 'وصف الشركة'),
  ('company_address', 'القاهرة، مصر - مدينة نصر، 8 ش الثورة', 'العنوان البريدي الرئيسي', 'string', 'عنوان الشركة'),
  ('company_phone', '01000000000', 'رقم الهاتف الرئيسي', 'string', 'هاتف الشركة'),
  ('company_email', 'info@repwave.com', 'البريد الإلكتروني الرسمي', 'string', 'بريد الشركة'),
  ('company_website', 'https://www.repwave.com', 'رابط الموقع الإلكتروني', 'string', 'موقع الشركة'),
  ('company_vat_number', '300000000000003', 'رقم ضريبة القيمة المضافة', 'string', 'رقم الضريبة'),
  ('company_commercial_register', '123456789', 'رقم السجل التجاري', 'string', 'السجل التجاري'),
  ('company_country', 'EG', 'البلد الافتراضي', 'string', 'البلد'),
  ('company_lat', '30.0444', 'خط عرض موقع الشركة', 'string', 'خط العرض'),
  ('company_lng', '31.2357', 'خط طول موقع الشركة', 'string', 'خط الطول'),
  ('company_logo', '', 'شعار الشركة', 'string', 'الشعار'),
  -- Financial settings
  ('default_currency', 'جنيه مصري', 'العملة الافتراضية للعرض', 'string', 'العملة'),
  ('currency_symbol', 'ج.م', 'رمز العملة', 'string', 'رمز العملة'),
  ('decimal_places', '2', 'عدد الخانات العشرية', 'integer', 'الخانات العشرية'),
  ('defult_client_credit_limit', '50000', 'الحد الائتماني الافتراضي', 'integer', 'حد الائتمان'),
  ('payment_terms_days', '30', 'شروط الدفع الافتراضية', 'integer', 'أيام الدفع'),
  ('order_prefix', 'ORD-', 'بادئة رقم الطلب', 'string', 'بادئة الطلب'),
  ('purchase_order_prefix', 'PO-', 'بادئة أمر الشراء', 'string', 'بادئة الشراء'),
  ('return_prefix', 'RET-', 'بادئة المرتجع', 'string', 'بادئة المرتجع'),
  ('max_discount_percentage', '25', 'أقصى نسبة خصم مسموحة', 'decimal', 'أقصى خصم'),
  ('auto_approve_orders', 'false', 'الموافقة التلقائية على الطلبات', 'boolean', 'موافقة تلقائية'),
  ('auto_approve_threshold', '5000', 'حد الموافقة التلقائية', 'integer', 'حد الموافقة'),
  ('return_approval_required', 'true', 'إلزام موافقة المرتجعات', 'boolean', 'موافقة المرتجعات'),
  ('credit_limit_check', 'true', 'فحص حد الائتمان', 'boolean', 'فحص الائتمان'),
  ('fiscal_year_start', '01-01', 'بداية السنة المالية', 'string', 'بداية السنة المالية'),
  ('safe_balance_alert_threshold', '1000', 'الحد الأدنى لتنبيه رصيد الخزينة', 'integer', 'تنبيه الخزينة'),
  -- Inventory settings
  ('low_stock_threshold', '10', 'تنبيه المخزون المنخفض', 'integer', 'حد المخزون المنخفض'),
  ('out_of_stock_threshold', '0', 'حد نفاد المخزون', 'integer', 'حد النفاد'),
  ('allow_negative_inventory', 'false', 'السماح بالبيع عند نفاد المخزون', 'boolean', 'مخزون سالب'),
  ('require_batch_tracking', 'true', 'إلزام تتبع الدفعات', 'boolean', 'تتبع الدفعات'),
  ('auto_reorder_enabled', 'false', 'إعادة الطلب التلقائي', 'boolean', 'إعادة طلب تلقائي'),
  ('reorder_point_default', '20', 'نقطة إعادة الطلب الافتراضية', 'integer', 'نقطة إعادة الطلب'),
  ('max_expiry_days_threshold', '30', 'إنذار انتهاء الصلاحية', 'integer', 'أيام إنذار الصلاحية'),
  ('transfer_approval_required', 'true', 'موافقة تحويلات المخزون', 'boolean', 'موافقة التحويلات'),
  ('goods_receipt_approval', 'true', 'موافقة استلام البضائع', 'boolean', 'موافقة الاستلام'),
  ('gps_tracking_enabled', 'true', 'تتبع موقع المندوب', 'boolean', 'تتبع الموقع'),
  ('visit_radius_meters', '200', 'نطاق التحقق من الزيارة', 'integer', 'نطاق الزيارة'),
  ('daily_visit_limit', '15', 'حد الزيارات اليومية', 'integer', 'حد زيارات يومي'),
  ('session_timeout_minutes', '60', 'مدة الجلسة', 'integer', 'مهلة الجلسة'),
  ('items_per_page', '25', 'عدد العناصر في الصفحة', 'integer', 'عناصر بالصفحة')
ON DUPLICATE KEY UPDATE settings_value = VALUES(settings_value);

SET FOREIGN_KEY_CHECKS = 1;

-- ════════════════════════════════════════════════════════════════
-- ── Accounts (chart of accounts — type: asset/liability/equity/income/expense)
-- ════════════════════════════════════════════════════════════════
INSERT INTO accounts (code, name, type, sortid) VALUES
  ('1001', 'Cash in Hand',             'asset',    1),
  ('1002', 'Accounts Receivable',      'asset',    2),
  ('1003', 'Inventory Asset',          'asset',    3),
  ('1004', 'Main Bank Account',        'asset',    4),
  ('2001', 'Accounts Payable',         'liability',1),
  ('2002', 'Sales Tax Payable',        'liability',2),
  ('3001', 'Owner Equity',             'equity',   1),
  ('4001', 'Sales Revenue',            'income',   1),
  ('4002', 'Other Income',             'income',   2),
  ('5001', 'Cost of Goods Sold',       'expense',  1),
  ('5002', 'Vehicle & Fuel Expenses',  'expense',  2),
  ('5003', 'Office & Admin Expenses',  'expense',  3),
  ('5004', 'Salaries',                 'expense',  4)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ── Representative Settings ──────────────────────────────────────
INSERT INTO representative_settings
  (user_id, work_start_latitude, work_start_longitude,
   work_end_latitude, work_end_longitude,
   gps_min_acceptable_accuracy_m, gps_tracking_interval_sec,
   gps_tracking_enabled, allow_out_of_plan_visits,
   allow_start_work_from_anywhere, allow_end_work_from_anywhere,
   allow_start_visit_from_anywhere, allow_end_visit_from_anywhere)
VALUES
  (2, 30.0444, 31.2357, 30.0444, 31.2357, 100, 300, 1, 1, 1, 1, 1, 1), -- Ahmed
  (3, 30.0131, 31.2089, 30.0131, 31.2089, 100, 300, 1, 1, 1, 1, 1, 1)  -- Sara
ON DUPLICATE KEY UPDATE gps_tracking_enabled = VALUES(gps_tracking_enabled);

-- ── User Safes (which safe belongs to which rep) ─────────────────
INSERT INTO user_safes (user_id, safe_id) VALUES
  (1, 1), -- Admin → Main Safe
  (2, 2), -- Ahmed → Ahmed Mobile Safe
  (3, 3)  -- Sara  → Sara Mobile Safe
ON DUPLICATE KEY UPDATE safe_id = VALUES(safe_id);

-- ── User Warehouses ───────────────────────────────────────────────
INSERT INTO user_warehouses (user_id, warehouse_id) VALUES
  (1, 1), -- Admin → Main Warehouse
  (2, 2), -- Ahmed → Ahmed Truck
  (3, 3), -- Sara  → Sara Truck
  (4, 1)  -- Omar (store_keeper) → Main Warehouse
ON DUPLICATE KEY UPDATE warehouse_id = VALUES(warehouse_id);

-- ── Supplier Payments ─────────────────────────────────────────────
INSERT INTO supplier_payments
  (supplier_payments_id, supplier_payments_supplier_id, supplier_payments_method_id,
   supplier_payments_amount, supplier_payments_date, supplier_payments_safe_id,
   supplier_payments_purchase_order_id, supplier_payments_notes, supplier_payments_status)
VALUES
  (1, 1, 2, 8500.00, DATE_SUB(CURDATE(), INTERVAL 25 DAY), 1, 1, 'Full payment for PO#1 — beverages',  'paid'),
  (2, 2, 2, 4200.00, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 1, 2, 'Full payment for PO#2 — snacks',     'paid'),
  (3, 3, 1,  500.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY),  1, 3, 'Advance deposit for dairy PO#3',     'partial'),
  (4, 4, 2, 1800.00, DATE_SUB(CURDATE(), INTERVAL 3 DAY),  1, 4, 'Partial payment for cleaning PO#4', 'partial')
ON DUPLICATE KEY UPDATE supplier_payments_amount = VALUES(supplier_payments_amount);

-- ── Purchase Returns ──────────────────────────────────────────────
INSERT INTO purchase_returns
  (purchase_returns_id, purchase_returns_supplier_id, purchase_returns_purchase_order_id,
   purchase_returns_date, purchase_returns_total_amount,
   purchase_returns_status, purchase_returns_notes,
   purchase_returns_created_by_user_id, purchase_returns_warehouse_id)
VALUES
  (1, 1, 1, DATE_SUB(CURDATE(), INTERVAL 23 DAY),
   75.00, 'Approved', 'Damaged packaging on 50 water bottle cases — Supplier issued credit note', 1, 1),
  (2, 3, 3, DATE_SUB(CURDATE(), INTERVAL 1 DAY),
   51.00, 'Pending', 'Wrong SKU delivered — Labneh 500g instead of 250g — Awaiting supplier response', 1, 1)
ON DUPLICATE KEY UPDATE purchase_returns_total_amount = VALUES(purchase_returns_total_amount),
  purchase_returns_created_by_user_id = VALUES(purchase_returns_created_by_user_id),
  purchase_returns_warehouse_id = VALUES(purchase_returns_warehouse_id);

-- ── Purchase Return Items ─────────────────────────────────────────
INSERT INTO purchase_return_items
  (purchase_return_items_id, purchase_return_items_return_id, purchase_return_items_purchase_order_item_id,
   purchase_return_items_quantity, purchase_return_items_unit_cost, purchase_return_items_total_cost, purchase_return_items_notes)
VALUES
  (1, 1, 1, 50, 1.50, 75.00, 'Damaged packaging — 50 water bottle units'),
  (2, 2, 11, 6, 8.50, 51.00, 'Wrong SKU — Labneh 500g instead of 250g')
ON DUPLICATE KEY UPDATE purchase_return_items_quantity = VALUES(purchase_return_items_quantity);

-- ── Transfers (warehouse-to-warehouse stock movements) ────────────
INSERT INTO transfers (transfer_id, transfer_status, transfer_notes,
  transfer_source_warehouse_id, transfer_destination_warehouse_id,
  transfer_initiated_by_user_id, transfer_created_at, transfer_updated_at) VALUES
  (1, 'Completed',  'Weekly restock — beverages',           1, 2, 4, DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY)),
  (2, 'Completed',  'Weekly restock — dairy & snacks',      1, 3, 4, DATE_SUB(NOW(), INTERVAL 6 DAY),  DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (3, 'In Transit', 'Approved request #4 dispatch',         1, 2, 4, DATE_SUB(NOW(), INTERVAL 1 DAY),  DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (4, 'Cancelled',  'Pending dispatch for request #2',      1, 3, 4, NOW(), NOW())
ON DUPLICATE KEY UPDATE transfer_status = VALUES(transfer_status);

-- ── Transfer Items ────────────────────────────────────────────────
-- inventory_id references: warehouse 1 inventory IDs 1-18 (variant 1-18 in order)
INSERT INTO transfer_items (transfer_item_id, transfer_id, inventory_id, transfer_item_quantity) VALUES
  (1, 1, 1,  100),  -- 100x Water 500ml from Main → Ahmed
  (2, 1, 6,   50),  -- 50x Energy Drink from Main → Ahmed
  (3, 2, 3,   80),  -- 80x Chips 100g from Main → Sara
  (4, 2, 11,  40),  -- 40x Mango Juice from Main → Sara
  (5, 3, 5,   60),  -- 60x Croissant from Main → Ahmed (in transit)
  (6, 3, 12,  25),  -- 25x Toast Bread from Main → Ahmed (in transit)
  (7, 4, 11,  40)   -- 40x Mango Juice from Main → Sara (cancelled)
ON DUPLICATE KEY UPDATE transfer_item_quantity = VALUES(transfer_item_quantity);

-- ── Transfer Requests ─────────────────────────────────────────────
INSERT INTO transfer_requests (request_id, request_status, request_notes,
  request_source_warehouse_id, request_destination_warehouse_id,
  request_created_by_user_id, request_created_at) VALUES
  (1, 'Pending',  'Restock Ahmed van — beverages low',             1, 2, 4, DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (2, 'Approved', 'Restock Sara van — dairy and snacks',           1, 3, 4, DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (3, 'Rejected', 'Return excess stock to main warehouse',         2, 1, 2, DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (4, 'Approved', 'Weekly van restock — cleaning supplies',        1, 2, 4, DATE_SUB(NOW(), INTERVAL 10 DAY))
ON DUPLICATE KEY UPDATE request_status = VALUES(request_status);

-- ── Transfer Request Items ────────────────────────────────────────
INSERT INTO transfer_request_items (request_item_id, request_id, variant_id,
  packaging_type_id, requested_quantity, request_item_note) VALUES
  (1, 1, 1,  NULL, 100, NULL),
  (2, 1, 6,  NULL, 50,  'Low stock on van'),
  (3, 2, 3,  NULL, 80,  NULL),
  (4, 2, 11, NULL, 40,  NULL),
  (5, 3, 7,  NULL, 20,  'Excess stock return'),
  (6, 4, 5,  NULL, 60,  NULL),
  (7, 4, 12, NULL, 25,  NULL)
ON DUPLICATE KEY UPDATE requested_quantity = VALUES(requested_quantity);

-- ── Representative Attendance (last 7 days) ───────────────────────
INSERT INTO representative_attendance
  (user_id, attendance_date, shift_start_time, shift_end_time,
   start_latitude, start_longitude, end_latitude, end_longitude,
   total_work_duration_sec, attendance_status)
VALUES
  -- Ahmed — completed days
  (2, DATE_SUB(CURDATE(),INTERVAL 6 DAY), DATE_SUB(CURDATE(),INTERVAL 6 DAY) + INTERVAL 8 HOUR,
      DATE_SUB(CURDATE(),INTERVAL 6 DAY) + INTERVAL 17 HOUR,
      30.0444,31.2357,30.0444,31.2357, 32400,'ClockedOut'),
  (2, DATE_SUB(CURDATE(),INTERVAL 5 DAY), DATE_SUB(CURDATE(),INTERVAL 5 DAY) + INTERVAL 8 HOUR,
      DATE_SUB(CURDATE(),INTERVAL 5 DAY) + INTERVAL 16 HOUR + INTERVAL 30 MINUTE,
      30.0444,31.2357,30.0444,31.2357, 30600,'ClockedOut'),
  (2, DATE_SUB(CURDATE(),INTERVAL 4 DAY), DATE_SUB(CURDATE(),INTERVAL 4 DAY) + INTERVAL 8 HOUR,
      DATE_SUB(CURDATE(),INTERVAL 4 DAY) + INTERVAL 17 HOUR + INTERVAL 15 MINUTE,
      30.0444,31.2357,30.0444,31.2357, 33300,'ClockedOut'),
  (2, DATE_SUB(CURDATE(),INTERVAL 3 DAY), DATE_SUB(CURDATE(),INTERVAL 3 DAY) + INTERVAL 8 HOUR,
      DATE_SUB(CURDATE(),INTERVAL 3 DAY) + INTERVAL 17 HOUR,
      30.0444,31.2357,30.0444,31.2357, 32400,'ClockedOut'),
  (2, DATE_SUB(CURDATE(),INTERVAL 2 DAY), DATE_SUB(CURDATE(),INTERVAL 2 DAY) + INTERVAL 8 HOUR,
      DATE_SUB(CURDATE(),INTERVAL 2 DAY) + INTERVAL 18 HOUR,
      30.0444,31.2357,30.0444,31.2357, 36000,'ClockedOut'),
  (2, DATE_SUB(CURDATE(),INTERVAL 1 DAY), DATE_SUB(CURDATE(),INTERVAL 1 DAY) + INTERVAL 8 HOUR,
      DATE_SUB(CURDATE(),INTERVAL 1 DAY) + INTERVAL 16 HOUR,
      30.0444,31.2357,30.0444,31.2357, 28800,'ClockedOut'),
  -- Sara — completed days
  (3, DATE_SUB(CURDATE(),INTERVAL 6 DAY), DATE_SUB(CURDATE(),INTERVAL 6 DAY) + INTERVAL 8 HOUR,
      DATE_SUB(CURDATE(),INTERVAL 6 DAY) + INTERVAL 17 HOUR + INTERVAL 30 MINUTE,
      30.0131,31.2089,30.0131,31.2089, 34200,'ClockedOut'),
  (3, DATE_SUB(CURDATE(),INTERVAL 5 DAY), DATE_SUB(CURDATE(),INTERVAL 5 DAY) + INTERVAL 8 HOUR,
      DATE_SUB(CURDATE(),INTERVAL 5 DAY) + INTERVAL 16 HOUR + INTERVAL 45 MINUTE,
      30.0131,31.2089,30.0131,31.2089, 31500,'ClockedOut'),
  (3, DATE_SUB(CURDATE(),INTERVAL 4 DAY), DATE_SUB(CURDATE(),INTERVAL 4 DAY) + INTERVAL 8 HOUR,
      DATE_SUB(CURDATE(),INTERVAL 4 DAY) + INTERVAL 18 HOUR,
      30.0131,31.2089,30.0131,31.2089, 36000,'ClockedOut'),
  (3, DATE_SUB(CURDATE(),INTERVAL 3 DAY), DATE_SUB(CURDATE(),INTERVAL 3 DAY) + INTERVAL 8 HOUR,
      DATE_SUB(CURDATE(),INTERVAL 3 DAY) + INTERVAL 17 HOUR,
      30.0131,31.2089,30.0131,31.2089, 32400,'ClockedOut'),
  (3, DATE_SUB(CURDATE(),INTERVAL 2 DAY), DATE_SUB(CURDATE(),INTERVAL 2 DAY) + INTERVAL 7 HOUR + INTERVAL 30 MINUTE,
      DATE_SUB(CURDATE(),INTERVAL 2 DAY) + INTERVAL 17 HOUR,
      30.0131,31.2089,30.0131,31.2089, 34200,'ClockedOut'),
  (3, DATE_SUB(CURDATE(),INTERVAL 1 DAY), DATE_SUB(CURDATE(),INTERVAL 1 DAY) + INTERVAL 8 HOUR,
      DATE_SUB(CURDATE(),INTERVAL 1 DAY) + INTERVAL 17 HOUR + INTERVAL 15 MINUTE,
      30.0131,31.2089,30.0131,31.2089, 33300,'ClockedOut')
ON DUPLICATE KEY UPDATE attendance_status = VALUES(attendance_status),
                        total_work_duration_sec = VALUES(total_work_duration_sec);

-- ── Client Payments (client_payments table — same data as payments but explicit alias) ─
-- The system uses the 'payments' table directly through client_payments endpoints.
-- No separate client_payments table inserts needed if backed by same table.

-- ── Safe Transfers (transfer between safes) ───────────────────────
INSERT INTO safe_transactions
  (safe_transactions_id, safe_transactions_safe_id, safe_transactions_type,
   safe_transactions_amount, safe_transactions_balance_before, safe_transactions_balance_after,
   safe_transactions_description, safe_transactions_reference,
   safe_transactions_created_by, safe_transactions_status, safe_transactions_related_table)
VALUES
  (13, 2, 'transfer_out',  2000.00, 5000.00, 3000.00,
   'Transfer to Main Safe — daily collection', 'TRANSFER_OUT_TO_1', 1, 'approved', 'safe_transfers'),
  (14, 1, 'transfer_in',   2000.00, 50000.00, 52000.00,
   'Transfer from Ahmed Mobile Safe',          'TRANSFER_IN_FROM_2', 1, 'approved', 'safe_transfers'),
  (15, 3, 'transfer_out',  1500.00,  5000.00,  3500.00,
   'Transfer to Main Safe — daily collection', 'TRANSFER_OUT_TO_1', 1, 'approved', 'safe_transfers'),
  (16, 1, 'transfer_in',   1500.00, 52000.00, 53500.00,
   'Transfer from Sara Mobile Safe',           'TRANSFER_IN_FROM_3', 1, 'approved', 'safe_transfers')
ON DUPLICATE KEY UPDATE safe_transactions_amount = VALUES(safe_transactions_amount);

-- ── Transfer Requests ─────────────────────────────────────────────
INSERT INTO transfer_requests
  (request_id, request_source_warehouse_id, request_destination_warehouse_id,
   request_status, request_created_by_user_id, request_notes, request_created_at)
VALUES
  (1, 1, 2, 'Pending',  4, 'Restock Ahmed van — beverages low',         DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (2, 1, 3, 'Approved', 4, 'Restock Sara van — dairy and snacks',       DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (3, 2, 1, 'Rejected', 2, 'Return excess stock to main warehouse',     DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (4, 1, 2, 'Approved', 4, 'Weekly van restock — cleaning supplies',    DATE_SUB(NOW(), INTERVAL 10 DAY))
ON DUPLICATE KEY UPDATE request_status = VALUES(request_status);

-- ── Transfer Request Items ────────────────────────────────────────
INSERT INTO transfer_request_items
  (request_item_id, request_id, variant_id, packaging_type_id, requested_quantity, request_item_note)
VALUES
  (1,  1,  1, NULL, 100, NULL),
  (2,  1,  6, NULL,  50, 'Low stock on van'),
  (3,  2,  3, NULL,  80, NULL),
  (4,  2, 11, NULL,  40, NULL),
  (5,  3,  7, NULL,  20, 'Excess stock return'),
  (6,  4,  5, NULL,  60, NULL),
  (7,  4, 12, NULL,  25, NULL)
ON DUPLICATE KEY UPDATE requested_quantity = VALUES(requested_quantity);

-- ── Transfers ─────────────────────────────────────────────────────
INSERT INTO transfers
  (transfer_id, transfer_source_warehouse_id, transfer_destination_warehouse_id,
   transfer_status, transfer_initiated_by_user_id, transfer_notes,
   transfer_created_at, transfer_updated_at)
VALUES
  (1, 1, 2, 'Completed', 4, 'Weekly restock — beverages',     DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY)),
  (2, 1, 3, 'Completed', 4, 'Weekly restock — dairy & snacks',DATE_SUB(NOW(), INTERVAL 6 DAY),  DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (3, 1, 2, 'In Transit', 4, 'Approved request #4 dispatch',  DATE_SUB(NOW(), INTERVAL 1 DAY),  DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (4, 1, 3, 'Pending',   4, 'Pending dispatch for request #2',NOW(),                            NOW())
ON DUPLICATE KEY UPDATE transfer_status = VALUES(transfer_status);

-- ── Transfer Items ────────────────────────────────────────────────
-- inventory_id references: WH1 rows inserted in order (variant 1..18 → id 1..18)
--                          WH2 rows: variant 1→19, 2→20 ...  WH3 rows: variant 1→30 ...
INSERT INTO transfer_items
  (transfer_id, inventory_id, transfer_item_quantity)
VALUES
  (1, 1,  100),
  (1, 6,   50),
  (2, 3,   80),
  (2, 11,  40),
  (3, 5,   60),
  (3, 12,  25),
  (4, 3,   80),
  (4, 11,  40)
ON DUPLICATE KEY UPDATE transfer_item_quantity = VALUES(transfer_item_quantity);

-- ================================================================
-- FULL seed complete — all modules populated.
-- ================================================================
