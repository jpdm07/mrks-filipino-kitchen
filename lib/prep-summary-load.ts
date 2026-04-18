import { ORDER_STATUSES_COUNTING_TOWARD_CAPACITY } from "@/lib/menu-capacity-catalog";
import { prisma } from "@/lib/prisma";
import { addCalendarDaysYMD } from "@/lib/pickup-lead-time";
import {
  aggregatePrepForWeek,
  mergePrepWithOverrides,
  normalizePickupYmd,
  parsePrepOverrideState,
  weekSunToSatFromThursday,
} from "@/lib/prep-summary";

export async function loadPrepSummaryPayload(weekThursdayYmd: string) {
  const { sun, sat: weekEndSat } = weekSunToSatFromThursday(weekThursdayYmd);
  /** Widen Prisma string range slightly, then filter with {@link normalizePickupYmd}. */
  const rangeLo = addCalendarDaysYMD(sun, -7);
  const rangeHi = addCalendarDaysYMD(weekEndSat, 7);

  const ordersRaw = await prisma.order.findMany({
    where: {
      isDemo: false,
      pickupDate: { gte: rangeLo, lte: rangeHi },
      status: { in: [...ORDER_STATUSES_COUNTING_TOWARD_CAPACITY] },
    },
    select: {
      pickupDate: true,
      items: true,
      status: true,
      isDemo: true,
    },
  });

  const orders = ordersRaw.filter((o) => {
    const n = normalizePickupYmd(o.pickupDate);
    if (!n) return false;
    return n >= sun && n <= weekEndSat;
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
