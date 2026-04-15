import { ORDER_FULFILLMENT } from "@/lib/config";

/** Today's calendar date in the pickup timezone, as YYYY-MM-DD. */
export function getTodayInPickupTimezoneYMD(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ORDER_FULFILLMENT.PICKUP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addCalendarDaysYMD(ymd: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd.trim();
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const u = Date.UTC(y, mo - 1, d + days);
  const dt = new Date(u);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** 0 = Sunday … 6 = Saturday (calendar weekday of YYYY-MM-DD in UTC date parts). */
export function ymdUtcWeekday(ymd: string): number {
  const t = ymd.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return 0;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

/**
 * Earliest YYYY-MM-DD customers may pick: first Friday or Saturday on or after
 * (today + MIN_NOTICE_CALENDAR_DAYS) in PICKUP_TIMEZONE.
 */
export function getEarliestPickupDateMinYMD(): string {
  const today = getTodayInPickupTimezoneYMD();
  const threshold = addCalendarDaysYMD(
    today,
    ORDER_FULFILLMENT.MIN_NOTICE_CALENDAR_DAYS
  );
  let ymd = threshold;
  for (let i = 0; i < 7; i++) {
    const dow = ymdUtcWeekday(ymd);
    if (dow === 5 || dow === 6) return ymd;
    ymd = addCalendarDaysYMD(ymd, 1);
  }
  return threshold;
}

export function isWellFormedPickupYMD(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

export function isPickupYmdAllowed(pickupYmd: string): boolean {
  if (!isWellFormedPickupYMD(pickupYmd)) return false;
  return pickupYmd.trim() >= getEarliestPickupDateMinYMD();
}

/** User-facing error when date is not allowed (form + API). */
export function pickupDateRejectedMessage(): string {
  return "That pickup date isn’t available. Please choose an open date on the calendar.";
}

/** Long label for a pickup calendar day (matches YYYY-MM-DD literally). */
export function formatPickupYmdLong(ymd: string): string {
  const t = ymd.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return t;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const utc = Date.UTC(y, mo - 1, d);
  return new Date(utc).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
