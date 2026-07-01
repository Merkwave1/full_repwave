CREATE TABLE IF NOT EXISTS "InventoryMovements" (
    "MovementId" serial PRIMARY KEY,
    "ProductVariantId" integer,
    "WarehouseId" integer,
    "Quantity" numeric(15,2) NOT NULL DEFAULT 0,
    "MovementType" text,
    "ReferenceId" integer,
    "MovementDate" timestamp with time zone,
    "Notes" text,
    "CreatedBy" integer,
    "CreatedAt" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "InvoiceItems" (
    "InvoiceItemId" serial PRIMARY KEY,
    "InvoiceItemInvoiceId" integer NOT NULL,
    "InvoiceItemProductId" integer,
    "InvoiceItemQuantity" integer NOT NULL DEFAULT 0,
    "InvoiceItemUnitPrice" numeric(15,2) NOT NULL DEFAULT 0,
    "InvoiceItemTotalPrice" numeric(15,2) NOT NULL DEFAULT 0,
    "InvoiceItemCreatedAt" timestamp with time zone,
    "InvoiceItemUpdatedAt" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "PurchaseReturnItems" (
    "PurchaseReturnItemsId" serial PRIMARY KEY,
    "PurchaseReturnItemsReturnId" integer NOT NULL,
    "PurchaseReturnItemsPurchaseOrderItemId" integer,
    "PurchaseReturnItemsQuantity" integer NOT NULL DEFAULT 0,
    "PurchaseReturnItemsUnitCost" numeric(15,2) NOT NULL DEFAULT 0,
    "PurchaseReturnItemsTotalCost" numeric(15,2) NOT NULL DEFAULT 0,
    "PurchaseReturnItemsNotes" text
);
CREATE TABLE IF NOT EXISTS "TransferItems" (
    "TransferItemsId" serial PRIMARY KEY,
    "TransferItemsTransferId" integer NOT NULL,
    "TransferItemsVariantId" integer,
    "TransferItemsPackagingTypeId" integer,
    "TransferItemsQuantity" integer NOT NULL DEFAULT 0
);
