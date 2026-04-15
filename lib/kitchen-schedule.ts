import { prisma } from "@/lib/prisma";
import { getTakenPickupTimeLabelsForDate } from "@/lib/pickup-slot-holds";
import {
  isLegacyFullThirtyMinuteSlotGrid,
  pickupTimeSlotLabels,
  sortPickupSlotLabels,
} from "@/lib/pickup-time-slots";
import {
  getTodayInPickupTimezoneYMD,
  isPickupYmdAllowed,
  ymdUtcWeekday,
} from "@/lib/pickup-lead-time";

export const FLAN_ONLY_DAY_NOTE =
  "Flan pickup only — other items available Friday and Saturday";

export const ALL_ITEMS_DAY_NOTE = "All items available for pickup";

const ALL_SLOTS = pickupTimeSlotLabels();
const SLOT_SET = new Set(ALL_SLOTS);

function parseStoredSlots(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && SLOT_SET.has(x));
}

function slotsJsonFromDb(value: string | null | undefined): unknown {
  if (value == null || value.trim() === "") return [];
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return [];
  }
}

function effectiveSlotsForOpenDay(stored: unknown): string[] {
  const parsed = parseStoredSlots(stored);
  if (parsed.length === 0) return [...ALL_SLOTS];
  if (isLegacyFullThirtyMinuteSlotGrid(parsed)) return [...ALL_SLOTS];
  return parsed;
}

/** 6:00 PM – 8:00 PM inclusive, 15-minute steps. */
export function eveningPickupSlots1800to2000(): string[] {
  return ALL_SLOTS.filter((label) => {
    const m = /^(\d{1,2}):(\d{2})\s+(AM|PM)$/.exec(label.trim());
    if (!m) return false;
    let h = parseInt(m[1], 10);
    const ap = m[3];
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const mins = h * 60 + parseInt(m[2], 10);
    return mins >= 18 * 60 && mins <= 20 * 60;
  });
}

export type KitchenDayKind = "sunday" | "mon_thu" | "friday" | "saturday";

export function kitchenDayKind(ymd: string): KitchenDayKind {
  const d = ymdUtcWeekday(ymd);
  if (d === 0) return "sunday";
  if (d >= 1 && d <= 4) return "mon_thu";
  if (d === 5) return "friday";
  return "saturday";
}

export function calendarDaysFromToday(ymd: string, todayYmd?: string): number {
  const t = todayYmd ?? getTodayInPickupTimezoneYMD();
  const a = new Date(`${t}T12:00:00.000Z`).getTime();
  const b = new Date(`${ymd.trim()}T12:00:00.000Z`).getTime();
  return Math.round((b - a) / 86400000);
}

/** Mon–Thu flan pickup: minimum 3 calendar days lead (unchanged 3–4 day rule for weekdays). */
export function isFlanWeekdayLeadTimeOk(ymd: string, now = new Date()): boolean {
  if (kitchenDayKind(ymd) !== "mon_thu") return false;
  const today = getTodayInPickupTimezoneYMD(now);
  if (ymd < today) return false;
  return calendarDaysFromToday(ymd, today) >= 3;
}

/** Fri/Sat use existing lead rules; Mon–Thu only when cart is flan-only and lead time ok. */
export function isPickupYmdAllowedForOrderCart(
  ymd: string,
  cartFlanOnly: boolean,
  now = new Date()
): boolean {
  const kind = kitchenDayKind(ymd);
  if (kind === "sunday") return false;
  if (kind === "mon_thu") {
    if (!cartFlanOnly) return false;
    return isFlanWeekdayLeadTimeOk(ymd, now);
  }
  return isPickupYmdAllowed(ymd, now);
}

export async function getKitchenSlotsForDate(
  dateYmd: string,
  cartFlanOnly: boolean
): Promise<string[]> {
  const kind = kitchenDayKind(dateYmd);
  const evening = eveningPickupSlots1800to2000();

  if (kind === "sunday") return [];

  if (kind === "mon_thu") {
    if (!cartFlanOnly) return [];
    const taken = await getTakenPickupTimeLabelsForDate(dateYmd);
    return sortPickupSlotLabels(
      evening.filter((s) => !taken.has(s.trim()))
    );
  }

  if (kind === "friday") {
    const taken = await getTakenPickupTimeLabelsForDate(dateYmd);
    return sortPickupSlotLabels(
      evening.filter((s) => !taken.has(s.trim()))
    );
  }

  const row = await prisma.availability.findUnique({
    where: { date: dateYmd.trim() },
  });
  if (!row || !row.isOpen) return [];
  let raw = effectiveSlotsForOpenDay(slotsJsonFromDb(row.slots));
  if (raw.length === 0) raw = [...ALL_SLOTS];
  const taken = await getTakenPickupTimeLabelsForDate(dateYmd);
  return sortPickupSlotLabels(raw.filter((s) => !taken.has(s.trim())));
}
