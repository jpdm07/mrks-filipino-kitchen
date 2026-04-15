import { fromZonedTime } from "date-fns-tz";
import { ORDER_FULFILLMENT } from "@/lib/config";
import { addCalendarDaysYMD } from "@/lib/pickup-lead-time";

const TZ = ORDER_FULFILLMENT.PICKUP_TIMEZONE;

/**
 * First instant of calendar day `ymd` in pickup TZ (America/Chicago), as a UTC Date.
 */
export function startOfPickupCalendarDayUtc(ymd: string): Date {
  return fromZonedTime(`${ymd.trim()}T00:00:00`, TZ);
}

/**
 * Sunday 12:00:00 AM Central — first instant after Saturday 11:59:59 PM for that Saturday week.
 * `saturdayYmd` must be the Saturday before the target pickup week’s Monday.
 */
export function instantSundayAfterPickupSaturday(saturdayYmd: string): Date {
  const sun = addCalendarDaysYMD(saturdayYmd.trim(), 1);
  return startOfPickupCalendarDayUtc(sun);
}
