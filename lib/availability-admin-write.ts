import { prisma } from "@/lib/prisma";
import { pickupTimeSlotLabels } from "@/lib/pickup-time-slots";
import {
  createAvailabilityEvent,
  removeAvailabilityEvent,
} from "@/lib/googleCalendar";

const ALL_SLOT_LABELS = pickupTimeSlotLabels();

export function slotsToDb(slots: string[] | undefined | null, isOpen: boolean): string {
  if (!isOpen) return "[]";
  if (!slots || slots.length === 0) return JSON.stringify(ALL_SLOT_LABELS);
  const set = new Set(ALL_SLOT_LABELS);
  const filtered = slots.filter((s) => set.has(s));
  return JSON.stringify(filtered.length > 0 ? filtered : ALL_SLOT_LABELS);
}

export function parseSlotsInput(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((x): x is string => typeof x === "string");
}

export type AvailabilityUpsertEntry = {
  date: string;
  isOpen: boolean;
  note?: string | null;
  slots?: string[] | null;
};

export async function upsertAvailabilityEntries(
  entries: AvailabilityUpsertEntry[]
): Promise<void> {
  for (const e of entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue;
    const slotsJson = slotsToDb(parseSlotsInput(e.slots), e.isOpen);
    await prisma.availability.upsert({
      where: { date: e.date },
      create: {
        date: e.date,
        isOpen: e.isOpen,
        note: e.note?.trim() || null,
        slots: slotsJson,
      },
      update: {
        isOpen: e.isOpen,
        note: e.note?.trim() || null,
        slots: slotsJson,
      },
    });
    if (e.isOpen) {
      const slots = JSON.parse(slotsJson) as string[];
      void createAvailabilityEvent(e.date, slots, e.note?.trim() ?? null);
    } else {
      void removeAvailabilityEvent(e.date);
    }
  }
}
