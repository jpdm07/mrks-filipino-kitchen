-- CreateTable
CREATE TABLE "TaxMileageLog" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "miles" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT NOT NULL,
    "routeFrom" TEXT,
    "routeTo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxMileageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxSupportingEntry" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxSupportingEntry_pkey" PRIMARY KEY ("id")
);
