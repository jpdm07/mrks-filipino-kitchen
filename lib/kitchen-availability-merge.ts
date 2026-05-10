import { prisma } from "@/lib/prisma";
import { eachYmdInRangeInclusive } from "@/lib/availability-range";
import { isFlanTueThuPickupYmdBookableAt } from "@/lib/flan-weekday-unlock";
import {
  getWeekCapacitySnapshot,
  type WeekCapacitySnapshot,
} from "@/lib/capacity-service";
import {
  ALL_ITEMS_DAY_NOTE,
  FLAN_ONLY_DAY_NOTE,
  kitchenDayKind,
} from "@/lib/kitchen-schedule";
import { mondayOfCalendarWeekContaining } from "@/lib/pickup-week";
import {
  getTodayInPickupTimezoneYMD,
  isPickupYmdAllowed,
} from "@/lib/pickup-lead-time";
import { filterOpenDatesByInventoryCart } from "@/lib/inventory-cart-pickup-sync";
import type { InventoryCartLineHint } from "@/lib/inventory-cart-line-hints";

export type KitchenCalendarOptions = {
  /** True when the cart is dessert-only (flan and/or yema) — same as legacy `cartMode=flan`. */
  cartFlanOnly: boolean;
  /** When set, Fri/Sat require at least this many main minutes free in the week. */
  mainMinutesNeeded?: number;
  /** When set, week must have enough flan ramekins left (ignored for yema-only need). */
  flanRamekinsNeeded?: number;
  /** Checkout: menu item IDs in cart — narrows open dates to inventory same-day slot windows. */
  cartMenuItemIds?: string[];
  /** Cooked/frozen per line — when set, narrows inventory rows to match cart (same as deduction). */
  cartInventoryHints?: InventoryCartLineHint[];
};

async function snapshotsByWeek(
  fromYmd: string,
  toYmd: string
): Promise<Map<string, WeekCapacitySnapshot>> {
  const settings = await prisma.kitchenCapacitySettings.findUnique({
    where: { id: "default" },
  });
  const manual = settings?.manualSoldOutWeekStart ?? null;

  const mondays = new Set<string>();
  for (const ymd of eachYmdInRangeInclusive(fromYmd, toYmd)) {
    mondays.add(mondayOfCalendarWeekContaining(ymd));
  }

  const map = new Map<string, WeekCapacitySnapshot>();
  for (const m of mondays) {
    map.set(
      m,
      await getWeekCapacitySnapshot(m, { manualSoldOutWeekStart: manual })
    );
  }
  return map;
}

/**
 * Kitchen schedule + capacity + Saturday DB — replaces pure DB whitelist for checkout.
 */
export async function buildKitchenOpenDatesPayload(
  fromYmd: string,
  toYmd: string,
  opts: KitchenCalendarOptions
): Promise<{ openDates: string[]; notes: Record<string, string> }> {
  const today = getTodayInPickupTimezoneYMD();
  const nowClock = new Date();
  const snapMap = await snapshotsByWeek(fromYmd, toYmd);
  const allDates = [...eachYmdInRangeInclusive(fromYmd, toYmd)];
  const dbRows = await prisma.availability.findMany({
    where: { date: { in: allDates } },
    select: { date: true, isOpen: true, note: true },
  });
  const dbOpen = new Map(dbRows.map((r) => [r.date, r.isOpen === true]));
  const dbExplicitClosed = new Set(
    dbRows.filter((r) => r.isOpen === false).map((r) => r.date)
  );
  const dbNoteByDate = new Map(
    dbRows.map((r) => [r.date, r.note?.trim() || ""])
  );

  const mainNeed = opts.mainMinutesNeeded ?? 0;
  const flanNeed = opts.flanRamekinsNeeded ?? 0;

  const openDates: string[] = [];
  const notes: Record<string, string> = {};

  for (const ymd of allDates) {
    if (ymd < today) continue;

    const kind = kitchenDayKind(ymd);
    const weekMon = mondayOfCalendarWeekContaining(ymd);
    const snap = snapMap.get(weekMon);
    if (!snap) continue;

    if (kind === "sunday" || kind === "monday") continue;

    if (kind === "tue_thu") {
      if (!opts.cartFlanOnly) continue;
      if (!isFlanTueThuPickupYmdBookableAt(ymd, nowClock)) continue;
      if (flanNeed > 0) {
        if (snap.flanSoldOut) continue;
        if (flanNeed > snap.flanRemaining) continue;
      }
      openDates.push(ymd);
      notes[ymd] = FLAN_ONLY_DAY_NOTE;
      continue;
    }

    if (kind === "friday" || kind === "saturday") {
      if (!isPickupYmdAllowed(ymd, new Date())) continue;

      if (kind === "saturday" && !dbOpen.get(ymd)) continue;

      if (opts.cartFlanOnly) {
        if (flanNeed > 0) {
          if (snap.flanSoldOut) continue;
          if (flanNeed > snap.flanRemaining) continue;
        }
      } else {
        if (snap.mainSoldOut) continue;
        if (mainNeed > snap.mainCookRemaining) continue;
        if (flanNeed > snap.flanRemaining) continue;
      }

      openDates.push(ymd);
      notes[ymd] = ALL_ITEMS_DAY_NOTE;
    }
  }

  const filtered = openDates.filter((ymd) => !dbExplicitClosed.has(ymd));
  const prunedNotes: Record<string, string> = {};
  for (const ymd of filtered) {
    prunedNotes[ymd] = notes[ymd] ?? "";
  }
  for (const ymd of filtered) {
    const custom = dbNoteByDate.get(ymd);
    if (custom) prunedNotes[ymd] = custom;
  }

  let finalDates = filtered;
  if (opts.cartMenuItemIds?.length || opts.cartInventoryHints?.length) {
    finalDates = await filterOpenDatesByInventoryCart(
      filtered,
      opts.cartMenuItemIds ?? [],
      opts.cartInventoryHints
    );
  }

  const finalNotes: Record<string, string> = {};
  for (const ymd of finalDates) {
    finalNotes[ymd] = prunedNotes[ymd] ?? "";
  }

  return { openDates: finalDates, notes: finalNotes };
}

/**
 * View-only: union of mixed + flan-only payloads so the public calendar shows both
 * full-menu Fri/Sat and Tue–Thu flan days (matches what the admin panel saves for flan template).
 * Checkout still uses `cartMode=mixed` or `flan` only.
 */
export async function buildUnifiedDisplayOpenDatesPayload(
  fromYmd: string,
  toYmd: string,
  opts: { mainMinutesNeeded: number; flanRamekinsNeeded: number }
): Promise<{ openDates: string[]; notes: Record<string, string> }> {
  const mixed = await buildKitchenOpenDatesPayload(fromYmd, toYmd, {
    cartFlanOnly: false,
    mainMinutesNeeded: opts.mainMinutesNeeded,
    flanRamekinsNeeded: opts.flanRamekinsNeeded,
  });
  const flan = await buildKitchenOpenDatesPayload(fromYmd, toYmd, {
    cartFlanOnly: true,
    mainMinutesNeeded: opts.mainMinutesNeeded,
    flanRamekinsNeeded: opts.flanRamekinsNeeded,
  });
  const openSet = new Set([...mixed.openDates, ...flan.openDates]);
  const notes: Record<string, string> = { ...mixed.notes };
  for (const ymd of flan.openDates) {
    const kd = kitchenDayKind(ymd);
    if (kd === "tue_thu") {
      notes[ymd] = flan.notes[ymd] ?? notes[ymd] ?? "";
    } else if (!notes[ymd]) {
      notes[ymd] = flan.notes[ymd] ?? "";
    }
  }
  return {
    openDates: [...openSet].sort(),
    notes,
  };
}
