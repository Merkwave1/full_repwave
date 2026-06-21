-- RepWave Nassar Tenant Seed Data
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

INSERT INTO "ClientAreaTags" ("ClientAreaTagId","ClientAreaTagName","ClientAreaTagSortOrder")
VALUES
(1,'القاهرة الجديدة',1),
(2,'مدينة نصر',2),
(3,'الزمالك',3),
(4,'المعادي',4),
(5,'الدقي',5),
(6,'الإسكندرية الشرقية',6)
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

-- ─── Settings (extend existing) ──────────────────────────────────────────────

INSERT INTO "Settings" ("SettingsId","SettingsKey","SettingsValue","SettingsLabel","SettingsCategory","SettingsType")
VALUES
(3,'company_phone','01000000000','هاتف الشركة','general','string'),
(4,'company_lat','30.0444','خط العرض','location','number'),
(5,'company_lng','31.2357','خط الطول','location','number'),
(6,'user_limit','50','الحد الأقصى للمستخدمين','users','number'),
(7,'currency','EGP','العملة','general','string')
ON CONFLICT DO NOTHING;

-- ─── Users (IDs 4-8, existing: 1=admin nassar khaled, 3=rep nassar) ───────────

INSERT INTO "Users" ("UsersId","UsersName","UsersEmail","UsersPassword","UsersRole","UsersPhone","UsersNationalId","UsersStatus","UsersUuid","CreatedAt","UpdatedAt")
VALUES
(4,'أحمد ناصر','ahmed.nassar@nassar.com','$2a$11$agd0ydDTG.YuucBIX3YjMeIQIzRSvD5mmTRu.C0gGTuiw7egckP7W','rep','01111111101','29901011234001',true,gen_random_uuid()::text,NOW(),NOW()),
(5,'محمد ناصر','mohamed.nassar@nassar.com','$2a$11$agd0ydDTG.YuucBIX3YjMeIQIzRSvD5mmTRu.C0gGTuiw7egckP7W','rep','01111111102','30001021234002',true,gen_random_uuid()::text,NOW(),NOW()),
(6,'فاطمة ناصر','fatma.nassar@nassar.com','$2a$11$agd0ydDTG.YuucBIX3YjMeIQIzRSvD5mmTRu.C0gGTuiw7egckP7W','store_keeper','01111111103','29803031234003',true,gen_random_uuid()::text,NOW(),NOW()),
(7,'خالد ناصر','khaled.nassar@nassar.com','$2a$11$agd0ydDTG.YuucBIX3YjMeIQIzRSvD5mmTRu.C0gGTuiw7egckP7W','cash','01111111104','29605041234004',true,gen_random_uuid()::text,NOW(),NOW()),
(8,'سارة ناصر','sara.nassar@nassar.com','$2a$11$agd0ydDTG.YuucBIX3YjMeIQIzRSvD5mmTRu.C0gGTuiw7egckP7W','rep','01111111105','30507051234005',false,gen_random_uuid()::text,NOW(),NOW())
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Users"','UsersId'), (SELECT MAX("UsersId") FROM "Users"));

-- ─── Warehouses ──────────────────────────────────────────────────────────────

INSERT INTO "Warehouses" ("WarehouseId","WarehouseName","WarehouseType","WarehouseCode","WarehouseAddress","WarehouseContactPerson","WarehousePhone","WarehouseStatus","WarehouseRepresentativeUserId")
VALUES
(1,'مستودع ناصر الرئيسي','main','NWH-001','مدينة نصر - القاهرة','أحمد ناصر','01111111101','active',4),
(2,'مستودع ناصر الجيزة','branch','NWH-002','الجيزة - الهرم','محمد ناصر','01111111102','active',5)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Warehouses"','WarehouseId'), (SELECT MAX("WarehouseId") FROM "Warehouses"));

-- ─── Safes ───────────────────────────────────────────────────────────────────

INSERT INTO "Safes" ("SafesId","SafesName","SafesDescription","SafesBalance","SafesType","SafesRepUserId","SafesPaymentMethodId","SafesIsActive","SafesColor","SafesCreatedAt","SafesUpdatedAt")
VALUES
(1,'خزنة ناصر الرئيسية','خزنة المقر الرئيسي مدينة نصر',75000,'main',7,1,true,'#F59E0B',NOW(),NOW()),
(2,'خزنة ناصر الجيزة','خزنة فرع الجيزة',30000,'branch',7,1,true,'#8B5CF6',NOW(),NOW())
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Safes"','SafesId'), (SELECT MAX("SafesId") FROM "Safes"));

-- ─── Categories ──────────────────────────────────────────────────────────────

INSERT INTO "Categories" ("CategoriesId","CategoriesName","CategoriesDescription")
VALUES
(1,'مشروبات','مياه وعصائر ومشروبات غازية'),
(2,'مواد غذائية','حبوب وزيوت وسكر وملح'),
(3,'منتجات الألبان','جبن وزبادي وألبان'),
(4,'منظفات','صابون وسوائل تنظيف'),
(5,'وجبات خفيفة','بسكويت وشيبس ومكسرات'),
(6,'مستحضرات العناية','كريمات وشامبو ومنتجات العناية الشخصية')
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Categories"','CategoriesId'), (SELECT MAX("CategoriesId") FROM "Categories"));

-- ─── Suppliers ───────────────────────────────────────────────────────────────

INSERT INTO "Suppliers" ("SupplierId","SupplierName","SupplierContactPerson","SupplierPhone","SupplierEmail","SupplierAddress","SupplierBalance","SupplierCreatedAt")
VALUES
(1,'شركة النهر للتوزيع','كريم النهر','01099001001','nahr@dist.com','القاهرة - شبرا',0,NOW()),
(2,'مصنع الفجر الجديد للأغذية','تامر الفجر','01099001002','fajr2@food.com','الجيزة - العياط',0,NOW()),
(3,'شركة الدلتا للمستلزمات','هشام الدلتا','01099001003','delta@supply.com','الإسكندرية - محرم بك',0,NOW()),
(4,'شركة ناصر للاستيراد','يوسف ناصر','01099001004','nassar@import.com','مدينة نصر - القاهرة',0,NOW())
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Suppliers"','SupplierId'), (SELECT MAX("SupplierId") FROM "Suppliers"));

-- ─── Products ────────────────────────────────────────────────────────────────

INSERT INTO "Products" ("ProductsId","ProductsName","ProductsCategoryId","ProductsUnitOfMeasureId","ProductsBrand","ProductsDescription","ProductsIsActive","ProductsSupplierId","ProductsHasTax","ProductsTaxRate","ProductsCreatedAt","ProductsUpdatedAt")
VALUES
(1,'مياه نصر 1.5 لتر',1,5,'نصر ووتر','مياه معدنية ناصر النقية',true,1,false,0,NOW(),NOW()),
(2,'عصير مانجو 250 مل',1,5,'فريش','عصير مانجو طبيعي',true,1,false,0,NOW(),NOW()),
(3,'أرز بسمتي 1 كجم',2,4,'تيلدا','أرز بسمتي فاخر',true,2,false,0,NOW(),NOW()),
(4,'زيت زيتون 750 مل',2,5,'حصاد','زيت زيتون بكر ممتاز',true,2,true,14,NOW(),NOW()),
(5,'جبن ريكفيلد 200 جرام',3,1,'ريكفيلد','جبن مطبوخ شرائح',true,2,false,0,NOW(),NOW()),
(6,'شامبو هيد آند شولدرز',6,1,'P&G','شامبو ضد القشرة',true,4,true,14,NOW(),NOW()),
(7,'صابون ديتول 100 جرام',4,1,'ديتول','صابون مضاد للبكتيريا',true,3,false,0,NOW(),NOW()),
(8,'شيبس ليز حجم وسط',5,1,'ليز','شيبس محلية الصنع',true,1,false,0,NOW(),NOW())
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Products"','ProductsId'), (SELECT MAX("ProductsId") FROM "Products"));

-- ─── Product Variants ────────────────────────────────────────────────────────

INSERT INTO "ProductVariants" ("VariantId","VariantProductsId","VariantName","VariantSku","VariantUnitPrice","VariantCostPrice","VariantStatus","VariantHasTax","VariantTaxRate")
VALUES
(1, 1,'مياه نصر 1.5 لتر - قطعة','NWR-001',4.00,2.80,'active',false,0),
(2, 1,'مياه نصر 1.5 لتر - كرتونة (12)','NWR-002',44.00,32.00,'active',false,0),
(3, 2,'عصير مانجو 250 مل - قطعة','MNG-001',7.50,5.00,'active',false,0),
(4, 2,'عصير مانجو 250 مل - علبة (12)','MNG-002',82.00,55.00,'active',false,0),
(5, 3,'أرز بسمتي 1 كجم - قطعة','RCE-001',55.00,42.00,'active',false,0),
(6, 3,'أرز بسمتي 1 كجم - كرتونة (24)','RCE-002',1250.00,980.00,'active',false,0),
(7, 4,'زيت زيتون 750 مل - قطعة','OLV-001',120.00,88.00,'active',true,14),
(8, 5,'جبن ريكفيلد 200 جرام - قطعة','CHE-001',35.00,25.00,'active',false,0),
(9, 6,'شامبو هيد آند شولدرز - قطعة','SHP-001',65.00,45.00,'active',true,14),
(10,7,'صابون ديتول 100 جرام - قطعة','DET-001',22.00,14.00,'active',false,0),
(11,7,'صابون ديتول 100 جرام - علبة (12)','DET-002',240.00,158.00,'active',false,0),
(12,8,'شيبس ليز حجم وسط - قطعة','CHI-001',18.00,11.00,'active',false,0)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"ProductVariants"','VariantId'), (SELECT MAX("VariantId") FROM "ProductVariants"));

-- ─── Clients ─────────────────────────────────────────────────────────────────

INSERT INTO "Clients" ("ClientsId","ClientsCompanyName","ClientsContactName","ClientsContactPhone1","ClientsEmail","ClientsAddress","ClientsCity","ClientsCountryId","ClientsGovernorateId","ClientsAreaTagId","ClientsClientTypeId","ClientsIndustryId","ClientsRepUserId","ClientsCreditLimit","ClientsCreditBalance","ClientsStatus","ClientsType","ClientsLatitude","ClientsLongitude","ClientsCreatedAt","ClientsUpdatedAt")
VALUES
(1,'سوبر ماركت الوطن','حمدي الوطن','01011110001','watan@market.com','شارع عباس العقاد - مدينة نصر','القاهرة',1,1,2,3,1,4,15000,0,'active','customer',30.0626,31.3383,NOW(),NOW()),
(2,'بقالة الأمل','صلاح الأمل','01011110002','amal@store.com','شارع فيصل - الجيزة','الجيزة',1,2,5,1,1,4,4000,500,'active','customer',30.0100,31.2100,NOW(),NOW()),
(3,'صيدلية الشفاء الجديدة','دكتورة هند','01011110003','shifa2@pharma.com','شارع قصر النيل - القاهرة','القاهرة',1,1,3,4,2,3,25000,0,'active','customer',30.0456,31.2372,NOW(),NOW()),
(4,'هايبر ناصر','مدير هايبر ناصر','01011110004','hypernassar@hyper.com','مدينة نصر - خلف الكليات','القاهرة',1,1,2,2,1,5,80000,0,'active','customer',30.0650,31.3450,NOW(),NOW()),
(5,'مطعم البيت','محمود البيت','01011110005','bayt@restaurant.com','الزقازيق - الشرقية','الزقازيق',1,4,1,1,1,4,2000,0,'active','customer',30.5877,31.5022,NOW(),NOW()),
(6,'سوبر مارت القاهرة الجديدة','رامي القاهرة','01011110006','newcairo@mart.com','القاهرة الجديدة - التجمع الخامس','القاهرة',1,1,1,3,1,5,30000,0,'active','customer',30.0271,31.4814,NOW(),NOW()),
(7,'عطارة الحكمة','أبو الحكمة','01011110007','hikma@herbs.com','الزمالك - القاهرة','القاهرة',1,1,3,1,3,3,5000,1200,'active','customer',30.0616,31.2174,NOW(),NOW())
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Clients"','ClientsId'), (SELECT MAX("ClientsId") FROM "Clients"));

-- ─── Visit Plans ─────────────────────────────────────────────────────────────

INSERT INTO "VisitPlans" ("VisitPlanId","VisitPlanName","VisitPlanDescription","UserId","VisitPlanStatus","VisitPlanStartDate","VisitPlanEndDate","VisitPlanRecurrenceType","VisitPlanRepeatEvery","VisitPlanCreatedAt","VisitPlanUpdatedAt")
VALUES
(1,'خطة زيارة ناصر مدينة نصر - مايو 2026','زيارة عملاء مدينة نصر الأسبوعية',4,'active','2026-05-01','2026-05-31','weekly',1,NOW(),NOW()),
(2,'خطة زيارة ناصر الجيزة - مايو 2026','زيارة عملاء الجيزة والمحافظات',5,'active','2026-05-01','2026-05-31','weekly',1,NOW(),NOW()),
(3,'خطة زيارة القاهرة الجديدة - يونيو 2026','عملاء القاهرة الجديدة والتجمع',3,'draft','2026-06-01','2026-06-30','weekly',1,NOW(),NOW())
ON CONFLICT DO NOTHING;

INSERT INTO "VisitPlanClients" ("VisitPlanId","ClientId","VisitOrder")
VALUES
(1,1,1),(1,3,2),(1,7,3),
(2,2,1),(2,5,2),
(3,4,1),(3,6,2)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"VisitPlans"','VisitPlanId'), (SELECT MAX("VisitPlanId") FROM "VisitPlans"));

-- ─── Visits ──────────────────────────────────────────────────────────────────

INSERT INTO "Visits" ("VisitsId","VisitsClientId","VisitsRepUserId","VisitsStartTime","VisitsEndTime","VisitsStartLatitude","VisitsStartLongitude","VisitsEndLatitude","VisitsEndLongitude","VisitsPurpose","VisitsOutcome","VisitsStatus","VisitsCreatedAt","VisitsUpdatedAt")
VALUES
(1,1,4,NOW()-INTERVAL '5 days',NOW()-INTERVAL '5 days'+INTERVAL '1 hour',30.0626,31.3383,30.0626,31.3383,'زيارة دورية وعرض منتجات جديدة','تم التوقيع على طلب توريد','completed',NOW()-INTERVAL '5 days',NOW()-INTERVAL '5 days'),
(2,2,4,NOW()-INTERVAL '3 days',NOW()-INTERVAL '3 days'+INTERVAL '45 minutes',30.0100,31.2100,30.0100,31.2100,'متابعة الطلب السابق وتحصيل مستحق','تم التحصيل جزئياً','completed',NOW()-INTERVAL '3 days',NOW()-INTERVAL '3 days'),
(3,3,5,NOW()-INTERVAL '2 days',NOW()-INTERVAL '2 days'+INTERVAL '30 minutes',30.0456,31.2372,30.0456,31.2372,'عرض منتجات العناية الجديدة','مهتم بالشامبو والصابون','completed',NOW()-INTERVAL '2 days',NOW()-INTERVAL '2 days'),
(4,4,5,NOW()-INTERVAL '1 day',NULL,30.0650,31.3450,NULL,NULL,'زيارة مقرر لعرض العروض الترويجية',NULL,'in_progress',NOW()-INTERVAL '1 day',NOW()-INTERVAL '1 day')
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Visits"','VisitsId'), (SELECT MAX("VisitsId") FROM "Visits"));

-- ─── Sales Orders ────────────────────────────────────────────────────────────

INSERT INTO "SalesOrders" ("SalesOrdersId","SalesOrdersClientId","SalesOrdersRepresentativeId","SalesOrdersWarehouseId","SalesOrdersStatus","SalesOrdersDeliveryStatus","SalesOrdersOrderDate","SalesOrdersSubtotal","SalesOrdersDiscountAmount","SalesOrdersTaxAmount","SalesOrdersTotalAmount","SalesOrdersCreatedAt","SalesOrdersUpdatedAt")
VALUES
(1,1,4,1,'confirmed','delivered',NOW()-INTERVAL '12 days',558,0,0,558,NOW()-INTERVAL '12 days',NOW()-INTERVAL '12 days'),
(2,2,4,1,'confirmed','pending',NOW()-INTERVAL '8 days',275,20,0,255,NOW()-INTERVAL '8 days',NOW()-INTERVAL '8 days'),
(3,3,5,2,'confirmed','pending',NOW()-INTERVAL '5 days',924,0,129.36,1053.36,NOW()-INTERVAL '5 days',NOW()-INTERVAL '5 days'),
(4,4,5,2,'draft','pending',NOW()-INTERVAL '2 days',660,0,0,660,NOW()-INTERVAL '2 days',NOW()-INTERVAL '2 days'),
(5,5,4,1,'confirmed','delivered',NOW()-INTERVAL '6 days',162,0,0,162,NOW()-INTERVAL '6 days',NOW()-INTERVAL '6 days'),
(6,6,3,1,'cancelled','pending',NOW()-INTERVAL '10 days',440,40,0,400,NOW()-INTERVAL '10 days',NOW()-INTERVAL '10 days'),
(7,7,3,2,'confirmed','pending',NOW()-INTERVAL '1 day',330,0,46.2,376.2,NOW()-INTERVAL '1 day',NOW()-INTERVAL '1 day')
ON CONFLICT DO NOTHING;

INSERT INTO "SalesOrderItems" ("SalesOrderItemsId","SalesOrderItemsSalesOrderId","SalesOrderItemsVariantId","SalesOrderItemsQuantity","SalesOrderItemsUnitPrice","SalesOrderItemsSubtotal","SalesOrderItemsDiscountAmount","SalesOrderItemsTaxAmount","SalesOrderItemsTaxRate","SalesOrderItemsHasTax","SalesOrderItemsTotalPrice")
VALUES
(1, 1,2,6,44,264,0,0,0,false,264),
(2, 1,3,10,7.5,75,0,0,0,false,75),
(3, 1,10,9,22,198,0,0,0,false,198),
(4, 1,12,1,18,18,0,0,0,false,18),
(5, 2,5,5,55,275,20,0,0,false,255),
(6, 3,7,6,120,720,0,100.8,14,true,820.8),
(7, 3,9,3,65,195,0,27.3,14,true,222.3),
(8, 4,6,1,1250,1250,0,0,0,false,1250),
(9, 4,5,8,55,440,0,0,0,false,440),
(10,5,1,20,4,80,0,0,0,false,80),
(11,5,12,5,18,90,0,0,0,false,90),
(12,6,8,4,35,140,20,0,0,false,120),
(13,6,3,20,7.5,150,20,0,0,false,130),
(14,7,7,2,120,240,0,33.6,14,true,273.6),
(15,7,9,1,65,65,0,9.1,14,true,74.1)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"SalesOrders"','SalesOrdersId'), (SELECT MAX("SalesOrdersId") FROM "SalesOrders"));
SELECT setval(pg_get_serial_sequence('"SalesOrderItems"','SalesOrderItemsId'), (SELECT MAX("SalesOrderItemsId") FROM "SalesOrderItems"));

-- ─── Purchase Orders ─────────────────────────────────────────────────────────

INSERT INTO "PurchaseOrders" ("PurchaseOrdersId","PurchaseOrdersSupplierId","PurchaseOrdersWarehouseId","PurchaseOrdersOrderDate","PurchaseOrdersTotalAmount","PurchaseOrdersStatus","PurchaseOrdersCreatedAt","PurchaseOrdersUpdatedAt")
VALUES
(1,1,1,NOW()-INTERVAL '20 days',2200,'received',NOW()-INTERVAL '20 days',NOW()-INTERVAL '20 days'),
(2,2,1,NOW()-INTERVAL '14 days',3960,'received',NOW()-INTERVAL '14 days',NOW()-INTERVAL '14 days'),
(3,4,2,NOW()-INTERVAL '6 days',1560,'partial',NOW()-INTERVAL '6 days',NOW()-INTERVAL '6 days'),
(4,3,2,NOW()-INTERVAL '3 days',2640,'pending',NOW()-INTERVAL '3 days',NOW()-INTERVAL '3 days')
ON CONFLICT DO NOTHING;

INSERT INTO "PurchaseOrderItems" ("PurchaseOrderItemsId","PurchaseOrderItemsPurchaseOrderId","PurchaseOrderItemsVariantId","PurchaseOrderItemsQuantityOrdered","PurchaseOrderItemsQuantityReceived","PurchaseOrderItemsQuantityReturned","PurchaseOrderItemsUnitCost","PurchaseOrderItemsTotalCost")
VALUES
(1, 1,2,50,50,0,32,1600),
(2, 1,4,10,10,0,55,550),
(3, 1,12,5,5,0,11,55),
(4, 2,5,60,60,0,42,2520),
(5, 2,6,2,2,0,980,1960),
(6, 3,7,10,5,0,88,880),
(7, 3,9,8,4,0,45,360),
(8, 4,10,100,0,0,14,1400),
(9, 4,11,10,0,0,158,1580)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"PurchaseOrders"','PurchaseOrdersId'), (SELECT MAX("PurchaseOrdersId") FROM "PurchaseOrders"));
SELECT setval(pg_get_serial_sequence('"PurchaseOrderItems"','PurchaseOrderItemsId'), (SELECT MAX("PurchaseOrderItemsId") FROM "PurchaseOrderItems"));

-- ─── Inventories ─────────────────────────────────────────────────────────────

INSERT INTO "Inventories" ("VariantId","PackagingTypeId","WarehouseId","InventoryQuantity","InventoryStatus")
SELECT v."VariantId", 1, w."WarehouseId",
  CASE WHEN v."VariantId" % 4 = 0 THEN 30
       WHEN v."VariantId" % 3 = 0 THEN 75
       ELSE 120 END,
  'available'
FROM "ProductVariants" v
CROSS JOIN "Warehouses" w
ON CONFLICT DO NOTHING;

-- ─── User Warehouse & Safe Assignments ───────────────────────────────────────

INSERT INTO "UserWarehouses" ("UserId","WarehouseId","AssignedAt")
VALUES (6,1,NOW()),(6,2,NOW())
ON CONFLICT DO NOTHING;

INSERT INTO "UserSafes" ("UserId","SafeId","AssignedAt")
VALUES (7,1,NOW()),(7,2,NOW())
ON CONFLICT DO NOTHING;

-- Done
SELECT 'Nassar tenant seed completed successfully!' AS status;
