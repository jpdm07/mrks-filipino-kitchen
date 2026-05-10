-- Inventory tracking, deduction audit, and inventory-linked pickup windows.

CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "menuItemId" TEXT,
    "itemName" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "quantityInStock" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "showBanner" BOOLEAN NOT NULL DEFAULT false,
    "bannerMessage" TEXT,
    "lowStockThreshold" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryPickupSlot" (
    "id" SERIAL NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "dateYmd" TEXT NOT NULL,
    "slotLabelsJson" TEXT NOT NULL DEFAULT '[]',
    "maxOrders" INTEGER NOT NULL,
    "ordersFilled" INTEGER NOT NULL DEFAULT 0,
    "autoCloseWhenZero" BOOLEAN NOT NULL DEFAULT true,
    "closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InventoryPickupSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryDeductionLog" (
    "id" SERIAL NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "quantityDeducted" INTEGER NOT NULL,
    "wasManualEntry" BOOLEAN NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryDeductionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryPickupSlot_dateYmd_idx" ON "InventoryPickupSlot"("dateYmd");
CREATE INDEX "InventoryPickupSlot_inventoryItemId_idx" ON "InventoryPickupSlot"("inventoryItemId");
CREATE INDEX "InventoryDeductionLog_inventoryItemId_idx" ON "InventoryDeductionLog"("inventoryItemId");
CREATE INDEX "InventoryDeductionLog_orderId_idx" ON "InventoryDeductionLog"("orderId");

ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryPickupSlot" ADD CONSTRAINT "InventoryPickupSlot_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryDeductionLog" ADD CONSTRAINT "InventoryDeductionLog_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryDeductionLog" ADD CONSTRAINT "InventoryDeductionLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
