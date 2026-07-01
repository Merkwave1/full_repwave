-- Remove duplicate المنوفية (the one with sort_order=22, keep the original sort_order=5)
DELETE FROM "Governorates" WHERE "GovernoratesNameAr" = 'المنوفية' AND "GovernoratesSortOrder" = 22;
SELECT COUNT(*) AS total_governorates FROM "Governorates";
