INSERT INTO "Governorates" ("GovernoratesNameAr","GovernoratesNameEn","GovernoratesCountryId","GovernoratesSortOrder")
SELECT name_ar, name_en, 1, sort_order FROM (VALUES
  (6,'أسوان','Aswan'),
  (7,'أسيوط','Asyut'),
  (8,'البحر الأحمر','Red Sea'),
  (9,'البحيرة','Beheira'),
  (10,'بني سويف','Beni Suef'),
  (11,'بورسعيد','Port Said'),
  (12,'الدقهلية','Dakahlia'),
  (13,'دمياط','Damietta'),
  (14,'الفيوم','Faiyum'),
  (15,'الغربية','Gharbia'),
  (16,'الإسماعيلية','Ismailia'),
  (17,'جنوب سيناء','South Sinai'),
  (18,'كفر الشيخ','Kafr el-Sheikh'),
  (19,'الأقصر','Luxor'),
  (20,'مطروح','Matrouh'),
  (21,'المنيا','Minya'),
  (22,'المنوفية','Monufia'),
  (23,'القليوبية','Qalyubia'),
  (24,'قنا','Qena'),
  (25,'شمال سيناء','North Sinai'),
  (26,'سوهاج','Sohag'),
  (27,'السويس','Suez'),
  (28,'الوادي الجديد','New Valley')
) AS t(sort_order, name_ar, name_en)
WHERE sort_order NOT IN (SELECT "GovernoratesSortOrder" FROM "Governorates" WHERE "GovernoratesCountryId" = 1);
