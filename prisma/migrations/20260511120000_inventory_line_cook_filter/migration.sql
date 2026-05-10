-- Distinguish cooked vs frozen for inventory rows that share one menu SKU (e.g. lumpia).
ALTER TABLE "InventoryItem" ADD COLUMN "lineCookFilter" TEXT NOT NULL DEFAULT 'any';
