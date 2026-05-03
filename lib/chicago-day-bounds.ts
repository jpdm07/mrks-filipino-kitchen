import { ORDER_FULFILLMENT } from "@/lib/config";

const TZ = ORDER_FULFILLMENT.PICKUP_TIMEZONE;

function fmtYmd(ms: number): string {
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Calendar date (YYYY-MM-DD) in the kitchen timezone — “today” for pickup rules. */
export function chicagoCalendarYmd(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: TZ });
}

/**
 * UTC range covering that entire calendar day in America/Chicago (handles DST).
 * Scans a ±44h window around local noon so single-day ranges stay correct.
 */
export function utcBoundsForChicagoYmd(ymd: string): { start: Date; end: Date } {
  const parts = ymd.split("-").map(Number);
  const y = parts[0]!;
  const mo = parts[1]!;
  const d = parts[2]!;
  const anchor = Date.UTC(y, mo - 1, d, 18, 0, 0);
  let minMs = Infinity;
  let maxMs = -Infinity;
  for (let delta = -44 * 3600000; delta <= 44 * 3600000; delta += 60000) {
    const ms = anchor + delta;
    if (fmtYmd(ms) === ymd) {
      minMs = Math.min(minMs, ms);
      maxMs = Math.max(maxMs, ms);
    }
  }
  if (minMs === Infinity) {
    const fallback = Date.UTC(y, mo - 1, d, 12, 0, 0);
    return { start: new Date(fallback), end: new Date(fallback) };
  }
  return { start: new Date(minMs), end: new Date(maxMs) };
}

/** Next calendar day after `ymd` in the kitchen timezone. */
export function nextChicagoCalendarDay(ymd: string): string {
  const { end } = utcBoundsForChicagoYmd(ymd);
  return new Date(end.getTime() + 60000).toLocaleDateString("en-CA", {
    timeZone: TZ,
  });
}
