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

/** Earliest date allowed for pickup (min on date input + server validation). */
export function getEarliestPickupDateMinYMD(): string {
  return addCalendarDaysYMD(
    getTodayInPickupTimezoneYMD(),
    ORDER_FULFILLMENT.MIN_LEAD_DAYS
  );
}

export function isWellFormedPickupYMD(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

export function isPickupYmdAllowed(pickupYmd: string): boolean {
  if (!isWellFormedPickupYMD(pickupYmd)) return false;
  return pickupYmd.trim() >= getEarliestPickupDateMinYMD();
}

/** User-facing error when date is too soon (form + API). */
export function pickupDateRejectedMessage(): string {
  const n = ORDER_FULFILLMENT.MIN_LEAD_DAYS;
  if (n <= 0) {
    return "Choose today or a future pickup date.";
  }
  if (n <= 1) {
    return "Pickup must be at least one full day after you order. Choose tomorrow or a later date.";
  }
  return `Pickup must be at least ${n} full days from today. Choose a later date.`;
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
