-- Fix TransferRequests schema and seed demo load requests
-- Run against repwave_demo (or any tenant missing warehouse columns)

ALTER TABLE "TransferRequests"
  ADD COLUMN IF NOT EXISTS "RequestSourceWarehouseId" integer,
  ADD COLUMN IF NOT EXISTS "RequestDestinationWarehouseId" integer,
  ADD COLUMN IF NOT EXISTS "RequestCreatedByUserId" integer;

CREATE TABLE IF NOT EXISTS "TransferRequestItems" (
  "RequestItemId" serial PRIMARY KEY,
  "RequestId" integer NOT NULL REFERENCES "TransferRequests"("RequestId") ON DELETE CASCADE,
  "VariantId" integer,
  "PackagingTypeId" integer,
  "RequestedQuantity" numeric(10,2) DEFAULT 0,
  "RequestItemNote" text
);

DO $$
DECLARE
  r1 int; r2 int; r3 int; r4 int; r5 int;
BEGIN
  IF (SELECT COUNT(*) FROM "TransferRequests") = 0 THEN
    INSERT INTO "TransferRequests"
      ("RequestStatus", "RequestDate", "RequestNotes",
       "RequestSourceWarehouseId", "RequestDestinationWarehouseId", "RequestCreatedByUserId")
    VALUES ('Pending', NOW() - INTERVAL '2 days', 'Restock van — beverages low', 1, 2, 1)
    RETURNING "RequestId" INTO r1;

    INSERT INTO "TransferRequests"
      ("RequestStatus", "RequestDate", "RequestNotes",
       "RequestSourceWarehouseId", "RequestDestinationWarehouseId", "RequestCreatedByUserId")
    VALUES ('Approved', NOW() - INTERVAL '5 days', 'Restock van — dairy and snacks', 1, 2, 1)
    RETURNING "RequestId" INTO r2;

    INSERT INTO "TransferRequests"
      ("RequestStatus", "RequestDate", "RequestNotes",
       "RequestSourceWarehouseId", "RequestDestinationWarehouseId", "RequestCreatedByUserId")
    VALUES ('Rejected', NOW() - INTERVAL '7 days', 'Return excess stock to main warehouse', 2, 1, 1)
    RETURNING "RequestId" INTO r3;

    INSERT INTO "TransferRequests"
      ("RequestStatus", "RequestDate", "RequestNotes",
       "RequestSourceWarehouseId", "RequestDestinationWarehouseId", "RequestCreatedByUserId")
    VALUES ('Pending', NOW() - INTERVAL '1 day', 'Weekly van restock — cleaning supplies', 1, 2, 1)
    RETURNING "RequestId" INTO r4;

    INSERT INTO "TransferRequests"
      ("RequestStatus", "RequestDate", "RequestNotes",
       "RequestSourceWarehouseId", "RequestDestinationWarehouseId", "RequestCreatedByUserId")
    VALUES ('Approved', NOW() - INTERVAL '10 days', 'Urgent transfer — low stock items', 1, 2, 1)
    RETURNING "RequestId" INTO r5;

    INSERT INTO "TransferRequestItems"
      ("RequestId", "VariantId", "PackagingTypeId", "RequestedQuantity", "RequestItemNote")
    VALUES
      (r1, 1, 1, 100, NULL),
      (r1, 6, 1,  50, 'Low stock on van'),
      (r2, 3, 1,  80, NULL),
      (r2, 11, 1, 40, NULL),
      (r3, 7, 1,  20, 'Excess stock return'),
      (r4, 5, 1,  60, NULL),
      (r5, 12, 1, 25, NULL);
  END IF;
END $$;
