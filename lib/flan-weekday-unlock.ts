import { mondayOfCalendarWeekContaining } from "@/lib/pickup-week";
import {
  addCalendarDaysYMD,
  getTodayInPickupTimezoneYMD,
  ymdUtcWeekday,
} from "@/lib/pickup-lead-time";
import { instantSundayAfterPickupSaturday } from "@/lib/pickup-tz-instants";

/**
 * First instant (Central) of the Sunday after the Saturday that falls two calendar
 * days before `weekMondayYmd`. New flan orders for Tue–Thu pickup in that Mon–Sun
 * week must be placed strictly before this instant (i.e. by Saturday 11:59:59 PM
 * Central of the prior week).
 */
export function flanOrderCutoffInstantUtcForWeekMonday(
  weekMondayYmd: string
): Date {
  const satBefore = addCalendarDaysYMD(weekMondayYmd.trim(), -2);
  return instantSundayAfterPickupSaturday(satBefore);
}

/**
 * True once it is Sunday 12:00:00 AM Central or later for the cutoff that applies
 * to Tue–Thu pickup in the week starting `weekMondayYmd`.
 */
export function isPastFlanOrderDeadlineForPickupWeekMonday(
  weekMondayYmd: string,
  now: Date
): boolean {
  return now.getTime() >= flanOrderCutoffInstantUtcForWeekMonday(weekMondayYmd).getTime();
}

/**
 * Tue–Thu pickup dates for a flan-only cart: pickup must be on or after “today”
 * (Central) and the customer must still be before the weekly flan order deadline
 * (Saturday 11:59 PM Central the week before that pickup week).
 */
export function isFlanTueThuPickupYmdBookableAt(
  pickupYmd: string,
  now: Date = new Date()
): boolean {
  const t = pickupYmd.trim();
  const dow = ymdUtcWeekday(t);
  if (dow < 2 || dow > 4) return false;
  const today = getTodayInPickupTimezoneYMD(now);
  if (t < today) return false;
  const weekMon = mondayOfCalendarWeekContaining(t);
  return !isPastFlanOrderDeadlineForPickupWeekMonday(weekMon, now);
}
