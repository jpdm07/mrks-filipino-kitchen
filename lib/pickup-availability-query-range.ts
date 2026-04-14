import {
  addCalendarDaysYMD,
  getTodayInPickupTimezoneYMD,
} from "@/lib/pickup-lead-time";

/** Must match storefront expectations: homepage + Pick Up Dates + checkout all use this horizon. */
export const CUSTOMER_AVAILABILITY_LOOKAHEAD_DAYS = 150;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function ymdFromParts(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Month 1 = January (same as UI state). */
export function daysInCalendarMonth(year: number, month1to12: number) {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function ymdMin(a: string, b: string) {
  return a <= b ? a : b;
}

function ymdMax(a: string, b: string) {
  return a >= b ? a : b;
}

/**
 * Single range for `/api/availability` so every calendar on the site loads the same
 * whitelist (today → horizon, always including the month on screen and optional
 * deep-linked date month).
 */
export function customerAvailabilityQueryRange(
  visibleYear: number,
  visibleMonth: number,
  extraYmd?: string | null
): { from: string; to: string; todayYmd: string } {
  const todayYmd = getTodayInPickupTimezoneYMD();
  const horizon = addCalendarDaysYMD(
    todayYmd,
    CUSTOMER_AVAILABILITY_LOOKAHEAD_DAYS
  );
  const monthStart = ymdFromParts(visibleYear, visibleMonth, 1);
  const monthEnd = ymdFromParts(
    visibleYear,
    visibleMonth,
    daysInCalendarMonth(visibleYear, visibleMonth)
  );

  let from = ymdMin(todayYmd, monthStart);
  let to = ymdMax(horizon, monthEnd);

  if (extraYmd && /^\d{4}-\d{2}-\d{2}$/.test(extraYmd.trim())) {
    const t = extraYmd.trim();
    const [vy, vm] = t.split("-").map(Number);
    if (
      Number.isFinite(vy) &&
      Number.isFinite(vm) &&
      vm >= 1 &&
      vm <= 12
    ) {
      const vf = ymdFromParts(vy, vm, 1);
      const vt = ymdFromParts(vy, vm, daysInCalendarMonth(vy, vm));
      from = ymdMin(from, vf);
      to = ymdMax(to, vt);
    }
  }

  return { from, to, todayYmd };
}
