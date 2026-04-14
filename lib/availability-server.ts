import { prisma } from "@/lib/prisma";
import { eachYmdInRangeInclusive } from "@/lib/availability-range";
import {
  pickupTimeSlotLabels,
  sortPickupSlotLabels,
} from "@/lib/pickup-time-slots";

const ALL_SLOTS = pickupTimeSlotLabels();
const SLOT_SET = new Set(ALL_SLOTS);

export type DayAvailability = { isOpen: boolean; note: string; slots: string[] };

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

/**
 * Effective pickup slots for an open day. Empty stored array = all standard slots (convenience).
 */
export function effectiveSlotsForOpenDay(stored: unknown): string[] {
  const parsed = parseStoredSlots(stored);
  if (parsed.length === 0) return [...ALL_SLOTS];
  return parsed;
}

/**
 * Admin-only: dense month view. Whitelist model — a day is “open” only if the DB
 * has a row with isOpen === true; missing rows are closed.
 */
export async function getAvailabilityMapForRange(
  fromYmd: string,
  toYmd: string
): Promise<Record<string, DayAvailability>> {
  const rows = await prisma.availability.findMany({
    where: { date: { gte: fromYmd, lte: toYmd } },
  });
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const map: Record<string, DayAvailability> = {};
  for (const ymd of eachYmdInRangeInclusive(fromYmd, toYmd)) {
    const r = byDate.get(ymd);
    const isOpen = r ? r.isOpen === true : false;
    map[ymd] = {
      isOpen,
      note: r?.note?.trim() ?? "",
      slots: isOpen ? effectiveSlotsForOpenDay(slotsJsonFromDb(r?.slots)) : [],
    };
  }
  return map;
}

export type OpenPickupDate = { date: string; note: string };

/**
 * Customer whitelist: only dates explicitly saved as open in the database.
 */
export async function listExplicitOpenDatesInRange(
  fromYmd: string,
  toYmd: string
): Promise<OpenPickupDate[]> {
  const rows = await prisma.availability.findMany({
    where: {
      date: { gte: fromYmd, lte: toYmd },
      isOpen: true,
    },
    select: { date: true, note: true },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({
    date: r.date,
    note: r.note?.trim() ?? "",
  }));
}

/** Payload for GET /api/availability and SSE (database is the only source of truth). */
export async function getPublicAvailabilityWhitelistPayload(
  fromYmd: string,
  toYmd: string
): Promise<{ openDates: string[]; notes: Record<string, string> }> {
  const list = await listExplicitOpenDatesInRange(fromYmd, toYmd);
  const openDates = list.map((e) => e.date);
  const notes: Record<string, string> = {};
  for (const e of list) {
    if (e.note) notes[e.date] = e.note;
  }
  return { openDates, notes };
}

export async function isPickupDateOpenInDb(dateYmd: string): Promise<boolean> {
  const row = await prisma.availability.findUnique({
    where: { date: dateYmd.trim() },
  });
  return row != null && row.isOpen === true;
}

/** Slots customers may choose for an open date (subset of 30-min labels). */
export async function getPickupSlotsForDateYmd(dateYmd: string): Promise<string[]> {
  const row = await prisma.availability.findUnique({
    where: { date: dateYmd.trim() },
  });
  if (!row || !row.isOpen) return [];
  return effectiveSlotsForOpenDay(slotsJsonFromDb(row.slots));
}

export async function isPickupSlotValidForDate(
  dateYmd: string,
  timeLabel: string
): Promise<boolean> {
  const slots = await getPickupSlotsForDateYmd(dateYmd);
  return slots.includes(timeLabel.trim());
}
