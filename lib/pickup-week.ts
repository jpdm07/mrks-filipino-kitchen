import { addCalendarDaysYMD, ymdUtcWeekday } from "@/lib/pickup-lead-time";

/** Monday YYYY-MM-DD of the ISO-style week containing `ymd` (week = Mon–Sun date parts). */
export function mondayOfCalendarWeekContaining(ymd: string): string {
  const dow = ymdUtcWeekday(ymd);
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  return addCalendarDaysYMD(ymd, -daysFromMonday);
}

/** Saturday of the Mon–Sat pickup window that starts on `weekMondayYmd`. */
export function saturdayOfPickupWindow(weekMondayYmd: string): string {
  return addCalendarDaysYMD(weekMondayYmd, 5);
}
