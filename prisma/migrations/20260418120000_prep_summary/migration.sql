-- CreateTable
CREATE TABLE "PrepSummaryWeekState" (
    "id" TEXT NOT NULL,
    "weekThursdayYmd" TEXT NOT NULL,
    "stateJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepSummaryWeekState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepSummaryEmailLog" (
    "id" TEXT NOT NULL,
    "weekThursdayYmd" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrepSummaryEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrepSummaryWeekState_weekThursdayYmd_key" ON "PrepSummaryWeekState"("weekThursdayYmd");

-- CreateIndex
CREATE UNIQUE INDEX "PrepSummaryEmailLog_weekThursdayYmd_key" ON "PrepSummaryEmailLog"("weekThursdayYmd");
