import { prisma } from "@/lib/prisma";
import { ORDER_STATUSES_COUNTING_TOWARD_CAPACITY } from "@/lib/menu-capacity-catalog";
import { totalCookContribution } from "@/lib/menu-cook-capacity";
import type { OrderItemLine } from "@/lib/order-types";
import { kitchenDayKind } from "@/lib/kitchen-schedule";
import { mondayOfCalendarWeekContaining } from "@/lib/pickup-week";
import { addCalendarDaysYMD } from "@/lib/pickup-lead-time";
import { instantSundayAfterPickupSaturday } from "@/lib/pickup-tz-instants";

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
 * pickup Tue–Thu, flan ramekins &gt; 0, and order placed at or before Saturday 11:59:59 PM Central
 * (i.e. strictly before Sunday 12:00 AM Central after the Saturday before that week).
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
    if (kitchenDayKind(pd) !== "tue_thu") continue;
    const t = totalCookContribution(parseItemsJson(o.items));
    if (t.flanRamekins <= 0) continue;
    const weekMon = mondayOfCalendarWeekContaining(pd);
    const satBefore = addCalendarDaysYMD(weekMon, -2);
    const sundayStart = instantSundayAfterPickupSaturday(satBefore);
    const placed = new Date(o.createdAt).getTime();
    if (placed >= sundayStart.getTime()) continue;
    unlock.add(weekMon);
  }
  return unlock;
}

/**
 * True = do not offer Tue–Thu flan-only pickup for this week (deadline passed, no unlock).
 * Weekly rule: lock after Saturday 11:59:59 PM Central — enforced as `now` ≥ Sunday 12:00 AM Central.
 */
export function isTueThuFlanSuppressedAfterSaturdayCutoff(
  weekMondayYmd: string,
  now: Date,
  unlockWeekMondays: Set<string>
): boolean {
  const satBefore = addCalendarDaysYMD(weekMondayYmd, -2);
  const sundayStart = instantSundayAfterPickupSaturday(satBefore);
  if (now.getTime() < sundayStart.getTime()) return false;
  return !unlockWeekMondays.has(weekMondayYmd);
}
