-- Mark PO #2 as Partially Received (items already have partial received qty)
UPDATE "PurchaseOrders"
SET "PurchaseOrdersStatus" = 'Partially Received', "PurchaseOrdersUpdatedAt" = NOW()
WHERE "PurchaseOrdersId" = 2 AND "PurchaseOrdersStatus" = 'Ordered';

-- Add partial received qty on a few fully-pending items for richer testing
UPDATE "PurchaseOrderItems"
SET "PurchaseOrderItemsQuantityReceived" = 50
WHERE "PurchaseOrderItemsId" = 20 AND "PurchaseOrderItemsQuantityReceived" = 0;

UPDATE "PurchaseOrderItems"
SET "PurchaseOrderItemsQuantityReceived" = 30
WHERE "PurchaseOrderItemsId" = 21 AND "PurchaseOrderItemsQuantityReceived" = 0;

UPDATE "PurchaseOrders"
SET "PurchaseOrdersStatus" = 'Partially Received', "PurchaseOrdersUpdatedAt" = NOW()
WHERE "PurchaseOrdersId" = 10;

SELECT po."PurchaseOrdersId", po."PurchaseOrdersStatus", w."WarehouseName", COUNT(*) AS items,
       SUM(poi."PurchaseOrderItemsQuantityOrdered" - poi."PurchaseOrderItemsQuantityReceived" - poi."PurchaseOrderItemsQuantityReturned") AS total_pending
FROM "PurchaseOrders" po
JOIN "PurchaseOrderItems" poi ON poi."PurchaseOrderItemsPurchaseOrderId" = po."PurchaseOrdersId"
LEFT JOIN "Warehouses" w ON w."WarehouseId" = po."PurchaseOrdersWarehouseId"
WHERE po."PurchaseOrdersStatus" IN ('Ordered', 'Partially Received', 'Shipped')
GROUP BY po."PurchaseOrdersId", po."PurchaseOrdersStatus", w."WarehouseName"
ORDER BY po."PurchaseOrdersId" DESC;
