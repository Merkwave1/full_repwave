-- RepWave Demo Seed Data
-- All test users have password: Admin123!
-- Hash: $2a$11$agd0ydDTG.YuucBIX3YjMeIQIzRSvD5mmTRu.C0gGTuiw7egckP7W

-- ─── Lookup Tables ───────────────────────────────────────────────────────────

INSERT INTO "Countries" ("CountriesId","CountriesNameAr","CountriesNameEn","CountriesSortOrder")
VALUES (1,'مصر','Egypt',1)
ON CONFLICT DO NOTHING;

INSERT INTO "Governorates" ("GovernoratesId","GovernoratesNameAr","GovernoratesNameEn","GovernoratesCountryId","GovernoratesSortOrder")
VALUES
(1,'القاهرة','Cairo',1,1),
(2,'الجيزة','Giza',1,2),
(3,'الإسكندرية','Alexandria',1,3),
(4,'الشرقية','Sharqia',1,4),
(5,'المنوفية','Monufia',1,5)
ON CONFLICT DO NOTHING;

INSERT INTO "ClientTypes" ("ClientTypeId","ClientTypeName","ClientTypeSortOrder")
VALUES
(1,'تجزئة',1),
(2,'جملة',2),
(3,'سوبر ماركت',3),
(4,'صيدلية',4)
ON CONFLICT DO NOTHING;

INSERT INTO "ClientIndustries" ("ClientIndustriesId","ClientIndustriesName","ClientIndustriesSortOrder")
VALUES
(1,'غذاء ومشروبات',1),
(2,'أدوية',2),
(3,'منتجات العناية',3),
(4,'مستلزمات منزلية',4)
ON CONFLICT DO NOTHING;

INSERT INTO "BaseUnits" ("BaseUnitsId","BaseUnitsName","BaseUnitsDescription")
VALUES
(1,'قطعة','وحدة أساسية مفردة'),
(2,'علبة','عبوة صغيرة'),
(3,'كرتونة','كرتونة كبيرة'),
(4,'كيلوجرام','وزن بالكيلو'),
(5,'لتر','سعة بالليتر')
ON CONFLICT DO NOTHING;

INSERT INTO "PaymentMethods" ("PaymentMethodsId","PaymentMethodsName","PaymentMethodsType")
VALUES
(1,'نقدي','cash'),
(2,'بطاقة ائتمان','card'),
(3,'تحويل بنكي','bank_transfer'),
(4,'شيك','cheque')
ON CONFLICT DO NOTHING;

INSERT INTO "PackagingTypes" ("PackagingTypesId","PackagingTypesName","PackagingTypesDefaultConversionFactor")
VALUES
(1,'قطعة',1),
(2,'علبة',12),
(3,'كرتونة',24)
ON CONFLICT DO NOTHING;

-- ─── Settings ────────────────────────────────────────────────────────────────

INSERT INTO "Settings" ("SettingsId","SettingsKey","SettingsValue","SettingsLabel","SettingsCategory","SettingsType")
VALUES
(1,'company_name','RepWave Demo','اسم الشركة','general','string'),
(2,'company_phone','01000000000','هاتف الشركة','general','string'),
(3,'company_lat','30.0444','خط العرض','location','number'),
(4,'company_lng','31.2357','خط الطول','location','number'),
(5,'user_limit','50','الحد الأقصى للمستخدمين','users','number'),
(6,'currency','EGP','العملة','general','string')
ON CONFLICT DO NOTHING;

-- ─── Users ───────────────────────────────────────────────────────────────────

INSERT INTO "Users" ("UsersId","UsersName","UsersEmail","UsersPassword","UsersRole","UsersPhone","UsersNationalId","UsersStatus","UsersUuid","CreatedAt","UpdatedAt")
VALUES
(2,'أحمد السيد','ahmed@demo.com','$2a$11$agd0ydDTG.YuucBIX3YjMeIQIzRSvD5mmTRu.C0gGTuiw7egckP7W','rep','01011111111','29901011234567',true,gen_random_uuid()::text,NOW(),NOW()),
(3,'محمد عبدالله','mohamed@demo.com','$2a$11$agd0ydDTG.YuucBIX3YjMeIQIzRSvD5mmTRu.C0gGTuiw7egckP7W','rep','01022222222','30001021234568',true,gen_random_uuid()::text,NOW(),NOW()),
(4,'فاطمة حسن','fatma@demo.com','$2a$11$agd0ydDTG.YuucBIX3YjMeIQIzRSvD5mmTRu.C0gGTuiw7egckP7W','store_keeper','01033333333','29803031234569',true,gen_random_uuid()::text,NOW(),NOW()),
(5,'خالد إبراهيم','khaled@demo.com','$2a$11$agd0ydDTG.YuucBIX3YjMeIQIzRSvD5mmTRu.C0gGTuiw7egckP7W','cash','01044444444','29605041234570',true,gen_random_uuid()::text,NOW(),NOW()),
(6,'سارة محمود','sara@demo.com','$2a$11$agd0ydDTG.YuucBIX3YjMeIQIzRSvD5mmTRu.C0gGTuiw7egckP7W','rep','01055555555','30507051234571',false,gen_random_uuid()::text,NOW(),NOW())
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Users"','UsersId'), (SELECT MAX("UsersId") FROM "Users"));

-- ─── Warehouses ──────────────────────────────────────────────────────────────

INSERT INTO "Warehouses" ("WarehouseId","WarehouseName","WarehouseType","WarehouseCode","WarehouseAddress","WarehouseContactPerson","WarehousePhone","WarehouseStatus","WarehouseRepresentativeUserId")
VALUES
(1,'المستودع الرئيسي','main','WH-001','القاهرة - مدينة نصر','أحمد السيد','01011111111','active',2),
(2,'مستودع الإسكندرية','branch','WH-002','الإسكندرية - محرم بك','محمد عبدالله','01022222222','active',3)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Warehouses"','WarehouseId'), (SELECT MAX("WarehouseId") FROM "Warehouses"));

-- ─── Safes ───────────────────────────────────────────────────────────────────

INSERT INTO "Safes" ("SafesId","SafesName","SafesDescription","SafesBalance","SafesType","SafesRepUserId","SafesPaymentMethodId","SafesIsActive","SafesColor","SafesCreatedAt","SafesUpdatedAt")
VALUES
(1,'الخزنة الرئيسية','خزنة المقر الرئيسي',50000,'main',5,1,true,'#10B981',NOW(),NOW()),
(2,'خزنة الإسكندرية','خزنة فرع الإسكندرية',20000,'branch',5,1,true,'#3B82F6',NOW(),NOW())
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Safes"','SafesId'), (SELECT MAX("SafesId") FROM "Safes"));

-- ─── Categories ──────────────────────────────────────────────────────────────

INSERT INTO "Categories" ("CategoriesId","CategoriesName","CategoriesDescription")
VALUES
(1,'مشروبات','مياه وعصائر ومشروبات غازية'),
(2,'مواد غذائية','حبوب وزيوت وسكر وملح'),
(3,'منتجات الألبان','جبن وزبادي وألبان'),
(4,'منظفات','صابون وسوائل تنظيف'),
(5,'وجبات خفيفة','بسكويت وشيبس ومكسرات')
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Categories"','CategoriesId'), (SELECT MAX("CategoriesId") FROM "Categories"));

-- ─── Suppliers ───────────────────────────────────────────────────────────────

INSERT INTO "Suppliers" ("SupplierId","SupplierName","SupplierContactPerson","SupplierPhone","SupplierEmail","SupplierAddress","SupplierBalance","SupplierCreatedAt")
VALUES
(1,'شركة النيل للتوزيع','سامي النيل','01099999001','nile@dist.com','القاهرة - المعادي',0,NOW()),
(2,'مصنع الفجر للأغذية','رامي الفجر','01099999002','fajr@food.com','الجيزة - أكتوبر',0,NOW()),
(3,'شركة الخليج للمستلزمات','هاني الخليج','01099999003','gulf@supply.com','الإسكندرية',0,NOW())
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Suppliers"','SupplierId'), (SELECT MAX("SupplierId") FROM "Suppliers"));

-- ─── Products ────────────────────────────────────────────────────────────────

INSERT INTO "Products" ("ProductsId","ProductsName","ProductsCategoryId","ProductsUnitOfMeasureId","ProductsBrand","ProductsDescription","ProductsIsActive","ProductsSupplierId","ProductsHasTax","ProductsTaxRate","ProductsCreatedAt","ProductsUpdatedAt")
VALUES
(1,'مياه معدنية 1.5 لتر',1,5,'سافولا','مياه معدنية طبيعية',true,1,false,0,NOW(),NOW()),
(2,'زيت ذرة 1 لتر',2,5,'شمس','زيت طهي نباتي',true,2,false,0,NOW(),NOW()),
(3,'جبن أبيض 500 جرام',3,1,'العرابي','جبن أبيض طازج',true,2,false,0,NOW(),NOW()),
(4,'صابون الأطباق',4,1,'فيري','سائل تنظيف الأطباق',true,3,true,14,NOW(),NOW()),
(5,'بسكويت شوكولاتة',5,1,'بولو','بسكويت بالشوكولاتة',true,1,false,0,NOW(),NOW())
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Products"','ProductsId'), (SELECT MAX("ProductsId") FROM "Products"));

-- ─── Product Variants ────────────────────────────────────────────────────────

INSERT INTO "ProductVariants" ("VariantId","VariantProductsId","VariantName","VariantSku","VariantUnitPrice","VariantCostPrice","VariantStatus","VariantHasTax","VariantTaxRate")
VALUES
(1,1,'مياه معدنية 1.5 لتر - قطعة','WAT-001',3.50,2.50,'active',false,0),
(2,1,'مياه معدنية 1.5 لتر - كرتونة (12)','WAT-002',38.00,28.00,'active',false,0),
(3,2,'زيت ذرة 1 لتر - قطعة','OIL-001',45.00,35.00,'active',false,0),
(4,2,'زيت ذرة 1 لتر - كرتونة (12)','OIL-002',500.00,400.00,'active',false,0),
(5,3,'جبن أبيض 500 جرام - قطعة','CHE-001',55.00,40.00,'active',false,0),
(6,4,'صابون الأطباق - قطعة','SOA-001',25.00,15.00,'active',true,14),
(7,5,'بسكويت شوكولاتة - قطعة','BIS-001',12.00,8.00,'active',false,0),
(8,5,'بسكويت شوكولاتة - علبة (12)','BIS-002',130.00,90.00,'active',false,0)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"ProductVariants"','VariantId'), (SELECT MAX("VariantId") FROM "ProductVariants"));

-- ─── Clients ─────────────────────────────────────────────────────────────────

INSERT INTO "Clients" ("ClientsId","ClientsCompanyName","ClientsContactName","ClientsContactPhone1","ClientsEmail","ClientsAddress","ClientsCity","ClientsCountryId","ClientsGovernorateId","ClientsClientTypeId","ClientsIndustryId","ClientsRepUserId","ClientsCreditLimit","ClientsCreditBalance","ClientsStatus","ClientsType","ClientsCreatedAt","ClientsUpdatedAt")
VALUES
(1,'سوبر ماركت النور','سيد النور','01011110001','nour@market.com','شارع التحرير - القاهرة','القاهرة',1,1,3,1,2,10000,0,'active','customer',NOW(),NOW()),
(2,'بقالة الأمانة','حسام الأمانة','01011110002','amana@store.com','شارع فيصل - الجيزة','الجيزة',1,2,1,1,2,5000,0,'active','customer',NOW(),NOW()),
(3,'صيدلية الشفاء','دكتور شفاء','01011110003','shifa@pharma.com','شارع سعد زغلول - الإسكندرية','الإسكندرية',1,3,4,2,3,20000,0,'active','customer',NOW(),NOW()),
(4,'هايبر ون','مدير هايبر','01011110004','hyperone@hyper.com','مدينة نصر - القاهرة','القاهرة',1,1,2,1,3,50000,0,'active','customer',NOW(),NOW()),
(5,'متجر الحياة','محمود الحياة','01011110005','life@store.com','الشرقية - الزقازيق','الزقازيق',1,4,1,4,2,3000,0,'active','customer',NOW(),NOW())
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Clients"','ClientsId'), (SELECT MAX("ClientsId") FROM "Clients"));

-- ─── Visit Plans ─────────────────────────────────────────────────────────────

INSERT INTO "VisitPlans" ("VisitPlanId","VisitPlanName","VisitPlanDescription","UserId","VisitPlanStatus","VisitPlanStartDate","VisitPlanEndDate","VisitPlanRecurrenceType","VisitPlanRepeatEvery","VisitPlanCreatedAt","VisitPlanUpdatedAt")
VALUES
(1,'خطة زيارة القاهرة - يونيو 2025','زيارة عملاء القاهرة الأسبوعية',2,'active','2025-06-01','2025-06-30','weekly',1,NOW(),NOW()),
(2,'خطة زيارة الإسكندرية - يونيو 2025','زيارة عملاء الإسكندرية الأسبوعية',3,'active','2025-06-01','2025-06-30','weekly',1,NOW(),NOW())
ON CONFLICT DO NOTHING;

INSERT INTO "VisitPlanClients" ("VisitPlanId","ClientId","VisitOrder")
VALUES
(1,1,1),(1,2,2),(1,5,3),
(2,3,1),(2,4,2)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"VisitPlans"','VisitPlanId'), (SELECT MAX("VisitPlanId") FROM "VisitPlans"));

-- ─── Sales Orders ────────────────────────────────────────────────────────────

INSERT INTO "SalesOrders" ("SalesOrdersId","SalesOrdersClientId","SalesOrdersRepresentativeId","SalesOrdersWarehouseId","SalesOrdersStatus","SalesOrdersDeliveryStatus","SalesOrdersOrderDate","SalesOrdersSubtotal","SalesOrdersDiscountAmount","SalesOrdersTaxAmount","SalesOrdersTotalAmount","SalesOrdersCreatedAt","SalesOrdersUpdatedAt")
VALUES
(1,1,2,1,'confirmed','pending',NOW() - INTERVAL '10 days',350,0,0,350,NOW() - INTERVAL '10 days',NOW() - INTERVAL '10 days'),
(2,2,2,1,'confirmed','delivered',NOW() - INTERVAL '7 days',180,10,0,170,NOW() - INTERVAL '7 days',NOW() - INTERVAL '7 days'),
(3,3,3,2,'draft','pending',NOW() - INTERVAL '3 days',660,0,92.4,752.4,NOW() - INTERVAL '3 days',NOW() - INTERVAL '3 days'),
(4,4,3,2,'confirmed','pending',NOW() - INTERVAL '1 day',455,0,0,455,NOW() - INTERVAL '1 day',NOW() - INTERVAL '1 day'),
(5,5,2,1,'cancelled','pending',NOW() - INTERVAL '5 days',96,0,0,96,NOW() - INTERVAL '5 days',NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

INSERT INTO "SalesOrderItems" ("SalesOrderItemsId","SalesOrderItemsSalesOrderId","SalesOrderItemsVariantId","SalesOrderItemsQuantity","SalesOrderItemsUnitPrice","SalesOrderItemsSubtotal","SalesOrderItemsDiscountAmount","SalesOrderItemsTaxAmount","SalesOrderItemsTaxRate","SalesOrderItemsHasTax","SalesOrderItemsTotalPrice")
VALUES
(1,1,2,5,38,190,0,0,0,false,190),
(2,1,3,2,45,90,0,0,0,false,90),
(3,1,7,6,12,72,0,0,0,false,72),
(4,2,1,20,3.5,70,0,0,0,false,70),
(5,2,7,10,12,120,10,0,0,false,110),
(6,3,6,12,25,300,0,42,14,true,342),
(7,3,5,2,55,110,0,0,0,false,110),
(8,4,4,1,500,500,0,0,0,false,500),
(9,4,8,2,130,260,0,0,0,false,260),
(10,5,1,8,3.5,28,0,0,0,false,28)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"SalesOrders"','SalesOrdersId'), (SELECT MAX("SalesOrdersId") FROM "SalesOrders"));
SELECT setval(pg_get_serial_sequence('"SalesOrderItems"','SalesOrderItemsId'), (SELECT MAX("SalesOrderItemsId") FROM "SalesOrderItems"));

-- ─── Purchase Orders ─────────────────────────────────────────────────────────

INSERT INTO "PurchaseOrders" ("PurchaseOrdersId","PurchaseOrdersSupplierId","PurchaseOrdersWarehouseId","PurchaseOrdersOrderDate","PurchaseOrdersTotalAmount","PurchaseOrdersStatus","PurchaseOrdersCreatedAt","PurchaseOrdersUpdatedAt")
VALUES
(1,1,1,NOW() - INTERVAL '15 days',1140,'received',NOW() - INTERVAL '15 days',NOW() - INTERVAL '15 days'),
(2,2,1,NOW() - INTERVAL '8 days',2200,'partial',NOW() - INTERVAL '8 days',NOW() - INTERVAL '8 days'),
(3,3,2,NOW() - INTERVAL '2 days',750,'pending',NOW() - INTERVAL '2 days',NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

INSERT INTO "PurchaseOrderItems" ("PurchaseOrderItemsId","PurchaseOrderItemsPurchaseOrderId","PurchaseOrderItemsVariantId","PurchaseOrderItemsQuantityOrdered","PurchaseOrderItemsQuantityReceived","PurchaseOrderItemsQuantityReturned","PurchaseOrderItemsUnitCost","PurchaseOrderItemsTotalCost")
VALUES
(1,1,2,30,30,0,28,840),
(2,1,7,30,30,0,8,240),
(3,1,8,15,15,0,4,60),
(4,2,3,50,25,0,35,1750),
(5,2,4,5,2,0,400,2000),
(6,3,6,50,0,0,15,750)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"PurchaseOrders"','PurchaseOrdersId'), (SELECT MAX("PurchaseOrdersId") FROM "PurchaseOrders"));
SELECT setval(pg_get_serial_sequence('"PurchaseOrderItems"','PurchaseOrderItemsId'), (SELECT MAX("PurchaseOrderItemsId") FROM "PurchaseOrderItems"));

-- ─── Inventories ─────────────────────────────────────────────────────────────

INSERT INTO "Inventories" ("VariantId","PackagingTypeId","WarehouseId","InventoryQuantity","InventoryStatus")
SELECT v."VariantId", 1, w."WarehouseId",
  CASE WHEN v."VariantId" % 3 = 0 THEN 50 ELSE 100 END,
  'available'
FROM "ProductVariants" v
CROSS JOIN "Warehouses" w
ON CONFLICT DO NOTHING;

-- Done
SELECT 'Seed completed successfully!' AS status;
