-- Additive: per-row deduction strategy so flan/yema/etc. use real units, not lumpia-dozen math.

ALTER TABLE "InventoryItem" ADD COLUMN "deductionMode" TEXT NOT NULL DEFAULT 'order_line_qty';

UPDATE "InventoryItem"
SET "deductionMode" = 'lumpia_frozen_dozen'
WHERE "itemName" = 'Lumpia (Frozen)';
