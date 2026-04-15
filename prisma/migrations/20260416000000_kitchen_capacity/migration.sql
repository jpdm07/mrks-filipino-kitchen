-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "cookMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MenuItem" ADD COLUMN "isFlanItem" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "KitchenCapacitySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "manualSoldOutWeekStart" TEXT,
    CONSTRAINT "KitchenCapacitySettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "KitchenCapacitySettings" ("id", "manualSoldOutWeekStart") VALUES ('default', NULL);
