import { ORDER_FULFILLMENT } from "@/lib/config";

/** Today's calendar date in the pickup timezone, as YYYY-MM-DD. */
export function getTodayInPickupTimezoneYMD(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ORDER_FULFILLMENT.PICKUP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Calendar date of `instant` in the pickup timezone (e.g. order placed-at), YYYY-MM-DD. */
export function getYmdInPickupTimezoneForInstant(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ORDER_FULFILLMENT.PICKUP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Hour (0–23) and minute in PICKUP_TIMEZONE for an instant. */
function getPickupTzHm(now: Date): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ORDER_FULFILLMENT.PICKUP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const n = (t: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { h: n("hour"), m: n("minute") };
}

/**
 * The Thursday of the same Sun–Sat week as `anchorYmd` (calendar YMD in UTC parts,
 * consistent with `ymdUtcWeekday`).
 */
export function getThursdayYmdOfSameWeek(anchorYmd: string): string {
  const dow = ymdUtcWeekday(anchorYmd);
  if (dow <= 4) return addCalendarDaysYMD(anchorYmd, 4 - dow);
  return addCalendarDaysYMD(anchorYmd, -(dow - 4));
}

/** Friday and Saturday immediately following that week's Thursday. */
export function getThisWeeksFridaySaturdayAfterThursday(
  thursdayYmd: string
): { fri: string; sat: string } {
  return {
    fri: addCalendarDaysYMD(thursdayYmd, 1),
    sat: addCalendarDaysYMD(thursdayYmd, 2),
  };
}

/** True after 12:00 PM Central on the Thursday of the current pickup-tz week. */
export function isPastThisWeekThursdayNoonCentral(now: Date = new Date()): boolean {
  const todayYmd = getTodayInPickupTimezoneYMD(now);
  const thuYmd = getThursdayYmdOfSameWeek(todayYmd);
  if (todayYmd > thuYmd) return true;
  if (todayYmd < thuYmd) return false;
  const { h, m } = getPickupTzHm(now);
  return h * 60 + m >= 12 * 60;
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
 * today in PICKUP_TIMEZONE (includes “this Friday/Saturday” when you order mid-week).
 */
export function getEarliestPickupDateMinYMD(now: Date = new Date()): string {
  const today = getTodayInPickupTimezoneYMD(now);
  for (let i = 0; i < 7; i++) {
    const ymd = addCalendarDaysYMD(today, i);
    const dow = ymdUtcWeekday(ymd);
    if (dow === 5 || dow === 6) return ymd;
  }
  return today;
}

export function isWellFormedPickupYMD(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

/**
 * True when this pickup date is the current week's Fri/Sat and the Thursday-noon
 * cutoff has passed (would be allowed by lead date alone).
 */
export function isPickupLockedByThursdayNoonCutoff(
  pickupYmd: string,
  now: Date = new Date()
): boolean {
  if (!isWellFormedPickupYMD(pickupYmd)) return false;
  if (!isPastThisWeekThursdayNoonCentral(now)) return false;
  const t = pickupYmd.trim();
  if (t < getEarliestPickupDateMinYMD(now)) return false;
  const thuYmd = getThursdayYmdOfSameWeek(getTodayInPickupTimezoneYMD(now));
  const { fri, sat } = getThisWeeksFridaySaturdayAfterThursday(thuYmd);
  return t === fri || t === sat;
}

/**
 * True when pickup YYYY-MM-DD is allowed: first Fri/Sat on or after "today" (Central),
 * and not this week's Fri/Sat once it is past Thursday noon Central.
 */
export function isPickupYmdAllowed(
  pickupYmd: string,
  now: Date = new Date()
): boolean {
  if (!isWellFormedPickupYMD(pickupYmd)) return false;
  const t = pickupYmd.trim();
  if (t < getEarliestPickupDateMinYMD(now)) return false;
  if (isPastThisWeekThursdayNoonCentral(now)) {
    const thuYmd = getThursdayYmdOfSameWeek(getTodayInPickupTimezoneYMD(now));
    const { fri, sat } = getThisWeeksFridaySaturdayAfterThursday(thuYmd);
    if (t === fri || t === sat) return false;
  }
  return true;
}

/** User-facing error when date is not allowed (form + API). */
export function pickupDateRejectedMessage(): string {
  return "That pickup date isn’t available. Pickups start on the first open Friday or Saturday on or after today (Central Time). After Thursday at noon Central, that same weekend closes to new orders—choose a later open date or call the kitchen.";
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
