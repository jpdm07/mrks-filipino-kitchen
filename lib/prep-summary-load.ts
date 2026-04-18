import { ORDER_STATUSES_COUNTING_TOWARD_CAPACITY } from "@/lib/menu-capacity-catalog";
import { prisma } from "@/lib/prisma";
import {
  aggregatePrepForWeek,
  mergePrepWithOverrides,
  parsePrepOverrideState,
  weekSunToSatFromThursday,
} from "@/lib/prep-summary";

export async function loadPrepSummaryPayload(weekThursdayYmd: string) {
  const { sun, sat: weekEndSat } = weekSunToSatFromThursday(weekThursdayYmd);

  const orders = await prisma.order.findMany({
    where: {
      isDemo: false,
      pickupDate: { gte: sun, lte: weekEndSat },
      status: { in: [...ORDER_STATUSES_COUNTING_TOWARD_CAPACITY] },
    },
    select: {
      pickupDate: true,
      items: true,
      status: true,
      isDemo: true,
    },
  });

  const computed = aggregatePrepForWeek(orders, weekThursdayYmd);
  const row = await prisma.prepSummaryWeekState.findUnique({
    where: { weekThursdayYmd },
  });
  const state = parsePrepOverrideState(row?.stateJson);
  const merged = mergePrepWithOverrides(computed, state);
  const emailLog = await prisma.prepSummaryEmailLog.findUnique({
    where: { weekThursdayYmd },
  });

  return {
    computed,
    merged,
    state,
    meta: computed.meta,
    emailSentAt: emailLog?.sentAt ?? null,
  };
}
