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
import { isFlanTueThuPickupYmdBookableAt } from "@/lib/flan-weekday-unlock";
import type { InventoryCartLineHint } from "@/lib/inventory-cart-line-hints";
import {
  cartEligibleForSameDayPickup,
  getSameDayOpenDatesForBannerCart,
  getSameDaySlotLabelsForBannerCart,
} from "@/lib/same-day-pickup";

export const FLAN_ONLY_DAY_NOTE =
  "Dessert pickups only — other items available Friday and Saturday";

export const ALL_ITEMS_DAY_NOTE = "All items available for pickup";

/** True when the kitchen/API note marks this day as dessert-only pickup (calendar badge). */
export function isFlanPickupOnlyNote(note: string | null | undefined): boolean {
  const n = (note ?? "").trim();
  return (
    n.includes("Dessert pickups only") || n.includes("Flan pickup only")
  );
}

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

export type KitchenDayKind =
  | "sunday"
  | "monday"
  | "tue_thu"
  | "friday"
  | "saturday";

export function kitchenDayKind(ymd: string): KitchenDayKind {
  const d = ymdUtcWeekday(ymd);
  if (d === 0) return "sunday";
  if (d === 1) return "monday";
  if (d >= 2 && d <= 4) return "tue_thu";
  if (d === 5) return "friday";
  return "saturday";
}

export function isFridayOrSaturdayKind(kind: KitchenDayKind): boolean {
  return kind === "friday" || kind === "saturday";
}

/**
 * Mon–Thu (and Sun): automatic schedule is closed or dessert-only. When you save a
 * date as open in admin, mixed carts (any menu items) may use that day at checkout.
 */
export function isWeekdayEligibleForAdminMixedCartOverride(
  kind: KitchenDayKind
): boolean {
  return !isFridayOrSaturdayKind(kind);
}

/**
 * Fri/Sat use existing lead rules; Tue–Thu is for dessert-only carts (flan and/or
 * yema) when before the weekly Saturday cutoff.
 */
export function isPickupYmdAllowedForOrderCart(
  ymd: string,
  /** True for dessert-only cart (flan and/or yema; legacy name `cartFlanOnly`). */
  cartFlanOnly: boolean,
  now = new Date()
): boolean {
  const kind = kitchenDayKind(ymd);
  if (kind === "sunday" || kind === "monday") return false;
  if (kind === "tue_thu") {
    if (!cartFlanOnly) return false;
    return isFlanTueThuPickupYmdBookableAt(ymd, now);
  }
  return isPickupYmdAllowed(ymd, now);
}

/**
 * Server-side: mixed carts may pick up on any future date you saved open in admin
 * (Mon–Thu full-menu override, inventory weekdays, etc.) without the Fri/Sat lead window.
 */
export async function isPickupYmdAllowedForOrderCartAsync(
  ymd: string,
  cartFlanOnly: boolean,
  now = new Date()
): Promise<boolean> {
  if (isPickupYmdAllowedForOrderCart(ymd, cartFlanOnly, now)) return true;
  if (cartFlanOnly) return false;
  const row = await prisma.availability.findUnique({
    where: { date: ymd.trim() },
  });
  if (!row?.isOpen) return false;
  const today = getTodayInPickupTimezoneYMD(now);
  return ymd.trim() >= today;
}

export async function isPickupYmdAllowedForCheckout(
  ymd: string,
  cartFlanOnly: boolean,
  cartMenuItemIds?: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null,
  now = new Date()
): Promise<boolean> {
  if (await isPickupYmdAllowedForOrderCartAsync(ymd, cartFlanOnly, now)) {
    return true;
  }
  if (cartFlanOnly) return false;
  const hasCart =
    (cartMenuItemIds?.length ?? 0) > 0 ||
    (cartInventoryHints?.length ?? 0) > 0;
  if (!hasCart) return false;
  const eligible = await cartEligibleForSameDayPickup(
    cartMenuItemIds ?? [],
    cartInventoryHints
  );
  if (!eligible) return false;
  const sameDay = await getSameDayOpenDatesForBannerCart(
    ymd.trim(),
    ymd.trim(),
    cartMenuItemIds ?? [],
    cartInventoryHints
  );
  return sameDay.includes(ymd.trim());
}

async function getWeeklyAdvanceSlotsForDate(
  dateTrim: string,
  cartFlanOnly: boolean,
  taken: Set<string>
): Promise<string[]> {
  const row = await prisma.availability.findUnique({
    where: { date: dateTrim },
  });

  if (row?.isOpen) {
    let raw = effectiveSlotsForOpenDay(slotsJsonFromDb(row.slots));
    if (raw.length === 0) raw = [...ALL_SLOTS];
    return sortPickupSlotLabels(raw.filter((s) => !taken.has(s.trim())));
  }
  if (row && !row.isOpen) return [];

  const kind = kitchenDayKind(dateTrim);
  const evening = eveningPickupSlots1800to2000();

  if (kind === "sunday" || kind === "monday") return [];

  if (kind === "tue_thu") {
    if (!cartFlanOnly) return [];
    if (!isFlanTueThuPickupYmdBookableAt(dateTrim, new Date())) return [];
    return sortPickupSlotLabels(
      evening.filter((s) => !taken.has(s.trim()))
    );
  }

  if (kind === "friday") {
    return sortPickupSlotLabels(
      evening.filter((s) => !taken.has(s.trim()))
    );
  }

  return [];
}

export async function getKitchenSlotsForDate(
  dateYmd: string,
  /** Dessert-only cart (flan and/or yema) — not strictly flan. */
  cartFlanOnly: boolean,
  /** When set, same-day banner pickup windows may apply on non-weekly dates. */
  cartMenuItemIds?: string[],
  /** Rich cart lines (cooked/frozen) — preferred over ids-only for same-day matching. */
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<string[]> {
  const dateTrim = dateYmd.trim();
  const taken = await getTakenPickupTimeLabelsForDate(dateTrim);

  const hasCartContext =
    (cartInventoryHints?.length ?? 0) > 0 || (cartMenuItemIds?.length ?? 0) > 0;
  let sameDaySlots: string[] = [];
  if (hasCartContext && !cartFlanOnly) {
    const eligible = await cartEligibleForSameDayPickup(
      cartMenuItemIds ?? [],
      cartInventoryHints
    );
    if (eligible) {
      sameDaySlots = await getSameDaySlotLabelsForBannerCart(
        dateTrim,
        cartMenuItemIds ?? [],
        cartInventoryHints
      );
    }
  }

  if (sameDaySlots.length > 0) {
    return sortPickupSlotLabels(
      sameDaySlots.filter((s) => !taken.has(s.trim()))
    );
  }

  return getWeeklyAdvanceSlotsForDate(dateTrim, cartFlanOnly, taken);
}
