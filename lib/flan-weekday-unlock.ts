import { prisma } from "@/lib/prisma";
import { ORDER_STATUSES_COUNTING_TOWARD_CAPACITY } from "@/lib/menu-capacity-catalog";
import { totalCookContribution } from "@/lib/menu-cook-capacity";
import type { OrderItemLine } from "@/lib/order-types";
import { kitchenDayKind } from "@/lib/kitchen-schedule";
import { mondayOfCalendarWeekContaining } from "@/lib/pickup-week";
import {
  addCalendarDaysYMD,
  getYmdInPickupTimezoneForInstant,
} from "@/lib/pickup-lead-time";

function parseItemsJson(raw: string): OrderItemLine[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as OrderItemLine[]) : [];
  } catch {
    return [];
  }
}

/**
 * Weeks (Monday YYYY-MM-DD) where at least one qualifying flan order exists:
 * pickup Mon–Thu, flan ramekins &gt; 0, and order placed on or before the Saturday
 * before that week (Central calendar date). Used to keep Mon–Thu flan-only slots
 * off the calendar after that Saturday unless someone committed earlier.
 */
export async function fetchFlanWeekdayUnlockWeekMondays(
  pickupRangeFromYmd: string,
  pickupRangeToYmd: string
): Promise<Set<string>> {
  const orders = await prisma.order.findMany({
    where: {
      isDemo: false,
      status: { in: [...ORDER_STATUSES_COUNTING_TOWARD_CAPACITY] },
      pickupDate: {
        not: null,
        gte: pickupRangeFromYmd,
        lte: pickupRangeToYmd,
      },
    },
    select: { createdAt: true, pickupDate: true, items: true },
  });

  const unlock = new Set<string>();
  for (const o of orders) {
    const pd = o.pickupDate?.trim();
    if (!pd) continue;
    if (kitchenDayKind(pd) !== "mon_thu") continue;
    const t = totalCookContribution(parseItemsJson(o.items));
    if (t.flanRamekins <= 0) continue;
    const weekMon = mondayOfCalendarWeekContaining(pd);
    const satBefore = addCalendarDaysYMD(weekMon, -2);
    const createdYmd = getYmdInPickupTimezoneForInstant(new Date(o.createdAt));
    if (createdYmd > satBefore) continue;
    unlock.add(weekMon);
  }
  return unlock;
}

/** True = do not offer Mon–Thu flan-only pickup for this week (deadline passed, no unlock). */
export function isMonThuFlanSuppressedAfterSaturdayCutoff(
  weekMondayYmd: string,
  todayYmd: string,
  unlockWeekMondays: Set<string>
): boolean {
  const satBefore = addCalendarDaysYMD(weekMondayYmd, -2);
  const sundayAfterSaturday = addCalendarDaysYMD(satBefore, 1);
  if (todayYmd < sundayAfterSaturday) return false;
  return !unlockWeekMondays.has(weekMondayYmd);
}
