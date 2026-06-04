-- Separate advance prep planning pool from same-day on-hand stock (lumpia per flavor).
ALTER TABLE "InventoryItem" ADD COLUMN "advanceWorkloadPieces" INTEGER NOT NULL DEFAULT 0;
