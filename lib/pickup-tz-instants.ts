import { ORDER_FULFILLMENT } from "@/lib/config";
import { addCalendarDaysYMD } from "@/lib/pickup-lead-time";

const TZ = ORDER_FULFILLMENT.PICKUP_TIMEZONE;

function calendarDayYmdInTz(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * First instant of calendar day `ymd` in `timeZone` (IANA), as a UTC Date.
 * Binary search — no extra deps (reliable on Vercel vs some date-fns-tz bundles).
 */
function startOfCalendarDayUtcInTz(ymd: string, timeZone: string): Date {
  const t = ymd.trim();
  const [y, mo, d] = t.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return new Date(NaN);
  }
  const anchor = Date.UTC(y, mo - 1, d, 0, 0, 0, 0);
  let lo = anchor - 40 * 3600000;
  let hi = anchor + 40 * 3600000;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const ds = calendarDayYmdInTz(new Date(mid), timeZone);
    if (ds < t) lo = mid + 1;
    else hi = mid;
  }

  const candidate = new Date(lo);
  if (calendarDayYmdInTz(candidate, timeZone) !== t) {
    throw new RangeError(`Invalid calendar day ${ymd} in ${timeZone}`);
  }
  return candidate;
}

/**
 * First instant of calendar day `ymd` in pickup TZ (America/Chicago), as a UTC Date.
 */
export function startOfPickupCalendarDayUtc(ymd: string): Date {
  return startOfCalendarDayUtcInTz(ymd, TZ);
}

/**
 * Sunday 12:00:00 AM Central — first instant after Saturday 11:59:59 PM for that Saturday week.
 * `saturdayYmd` must be the Saturday before the target pickup week’s Monday.
 */
export function instantSundayAfterPickupSaturday(saturdayYmd: string): Date {
  const sun = addCalendarDaysYMD(saturdayYmd.trim(), 1);
  return startOfPickupCalendarDayUtc(sun);
}
