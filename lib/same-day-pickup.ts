import type { InventoryItem, InventoryPickupSlot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { eachYmdInRangeInclusive } from "@/lib/availability-range";
import {
  getPickupTimezoneHm,
  getTodayInPickupTimezoneYMD,
} from "@/lib/pickup-lead-time";
import {
  pickupLabelToMinutesSinceMidnight,
  sortPickupSlotLabels,
} from "@/lib/pickup-time-slots";
import type { InventoryCartLineHint } from "@/lib/inventory-cart-line-hints";
import {
  hintToPseudoOrderLine,
  orderLinesToInventoryCartHints,
} from "@/lib/inventory-cart-line-hints";
import { isExtraDipOrderLine } from "@/lib/extra-dip-sauce";
import { lineMatchesInventory } from "@/lib/inventory-deduction";
import {
  inventoryQuantityAsPieces,
  isLumpiaMenuItemId,
  lumpiaPiecesForOrderLine,
  lumpiaProteinFromMenuItemId,
  lumpiaWholeDozensAvailable,
  type LumpiaProtein,
} from "@/lib/lumpia-inventory";
import type { OrderItemLine } from "@/lib/order-types";

export const SAME_DAY_PICKUP_NOTE =
  "Same-day pickup — in-stock banner items only";

/** Minimum minutes after order placement before first same-day pickup slot. */
export const SAME_DAY_ORDER_LEAD_MINUTES = 60;

/**
 * Same-day only: drop times earlier than now + lead (1 hour).
 * Past calendar days are excluded by callers; if every slot for today is too soon,
 * this returns [] so today disappears from the calendar until a later window opens.
 */
export function applySameDayOrderLeadFilter(
  labels: string[],
  pickupDateYmd: string,
  now: Date = new Date()
): string[] {
  if (labels.length === 0) return [];

  const sorted = sortPickupSlotLabels(labels);
  const minuteValues = sorted
    .map((l) => ({ label: l, mins: pickupLabelToMinutesSinceMidnight(l) }))
    .filter((x): x is { label: string; mins: number } => x.mins !== null);
  if (minuteValues.length === 0) return [];

  const windowStart = Math.min(...minuteValues.map((x) => x.mins));
  const windowEnd = Math.max(...minuteValues.map((x) => x.mins));

  const today = getTodayInPickupTimezoneYMD(now);
  let earliestMins = windowStart;
  if (pickupDateYmd.trim() === today) {
    const { h, m } = getPickupTimezoneHm(now);
    earliestMins = Math.max(
      windowStart,
      h * 60 + m + SAME_DAY_ORDER_LEAD_MINUTES
    );
  }

  return minuteValues
    .filter((x) => x.mins >= earliestMins && x.mins <= windowEnd)
    .map((x) => x.label);
}

type SlotRow = InventoryPickupSlot & { inventoryItem: InventoryItem };

/** Inventory rows eligible for the same-day banner (not yet requiring open slots). */
export function isBannerSameDayInventoryRow(row: InventoryItem): boolean {
  return (
    row.showBanner === true &&
    row.isAvailable === true &&
    inventoryQuantityAsPieces(row) > 0
  );
}

function activeLabelsFromSlotRow(row: SlotRow): Set<string> {
  const inv = row.inventoryItem;
  const full = row.ordersFilled >= row.maxOrders;
  const stockOut = inv.quantityInStock <= 0 || !inv.isAvailable;
  const closeForStock = stockOut && row.autoCloseWhenZero;
  if (full || closeForStock || row.closed) return new Set();
  let labels: string[] = [];
  try {
    labels = JSON.parse(row.slotLabelsJson) as string[];
    if (!Array.isArray(labels)) labels = [];
  } catch {
    return new Set();
  }
  return new Set(labels.map((l) => l.trim()).filter(Boolean));
}

function isExemptFromSameDayInventoryCoverage(
  hint: InventoryCartLineHint
): boolean {
  return isExtraDipOrderLine({
    menuItemId: hint.menuItemId,
    sizeKey: hint.sizeKey ?? undefined,
  });
}

type CoverageHint = InventoryCartLineHint & {
  /**
   * Menu-ID-only fallback (invCart omitted a flavor that `menuItemIds` still lists).
   * Try cooked and frozen so we don't drop a real frozen-only pork-only cart when
   * cook type is unknown — still fails if that SKU has no on-hand banner row.
   */
  tryEitherCook?: boolean;
};

/** Cart lines that must each have matching same-day inventory (flavor + cooked/frozen). */
export function sameDayCoverageHints(
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): InventoryCartLineHint[] {
  return mergeSameDayCoverageHints(cartMenuItemIds, cartInventoryHints);
}

function mergeSameDayCoverageHints(
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): CoverageHint[] {
  const hints = (cartInventoryHints ?? []).filter((h) => h.menuItemId?.trim());
  const fromHints: CoverageHint[] = hints.filter(
    (h) => !isExemptFromSameDayInventoryCoverage(h)
  );
  const idsInHints = new Set(fromHints.map((h) => h.menuItemId.trim()));
  const out: CoverageHint[] = [...fromHints];
  for (const id of [
    ...new Set(cartMenuItemIds.map((s) => s.trim()).filter(Boolean)),
  ]) {
    if (isExtraDipOrderLine({ menuItemId: id })) continue;
    if (idsInHints.has(id)) continue;
    out.push({ menuItemId: id, tryEitherCook: true });
  }
  return out;
}

function bannerRowsMatchingLine(
  rows: InventoryItem[],
  line: ReturnType<typeof hintToPseudoOrderLine>
): InventoryItem[] {
  return rows.filter(
    (r) => isBannerSameDayInventoryRow(r) && lineMatchesInventory(r, line)
  );
}

function bannerRowsMatchingCoverageHint(
  rows: InventoryItem[],
  hint: CoverageHint
): InventoryItem[] {
  const direct = bannerRowsMatchingLine(rows, hintToPseudoOrderLine(hint));
  if (direct.length > 0) return direct;
  if (!hint.tryEitherCook || hint.cookedOrFrozen) return [];
  const seen = new Set<number>();
  const out: InventoryItem[] = [];
  for (const cookedOrFrozen of ["frozen", "cooked"] as const) {
    const matched = bannerRowsMatchingLine(
      rows,
      hintToPseudoOrderLine({ ...hint, cookedOrFrozen })
    );
    for (const row of matched) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
  }
  return out;
}

async function loadInventoryForCoverageHints(
  hints: InventoryCartLineHint[]
): Promise<InventoryItem[]> {
  const ids = [
    ...new Set(hints.map((h) => h.menuItemId.trim()).filter(Boolean)),
  ];
  if (!ids.length) return [];
  return prisma.inventoryItem.findMany({
    where: { menuItemId: { in: ids } },
  });
}

/** Menu SKUs in cart that match banner same-day inventory rows. */
export async function bannerMenuIdsInCart(
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<string[]> {
  const hints = mergeSameDayCoverageHints(cartMenuItemIds, cartInventoryHints);
  if (hints.length === 0) return [];
  const rows = await loadInventoryForCoverageHints(hints);
  const matched = new Set<string>();
  for (const hint of hints) {
    const covering = bannerRowsMatchingCoverageHint(rows, hint);
    if (covering.length > 0) matched.add(hint.menuItemId.trim());
  }
  return [...matched];
}

/**
 * Same-day inventory windows only when **every** cart food line is on-hand
 * (matching flavor / cooked-vs-frozen). Extra dip is ignored.
 */
export async function cartEligibleForSameDayPickup(
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<boolean> {
  const hints = mergeSameDayCoverageHints(cartMenuItemIds, cartInventoryHints);
  if (hints.length === 0) return false;
  const rows = await loadInventoryForCoverageHints(hints);
  return hints.every(
    (hint) => bannerRowsMatchingCoverageHint(rows, hint).length > 0
  );
}

async function bannerInventoryForCart(
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<InventoryItem[]> {
  if (!(await cartEligibleForSameDayPickup(cartMenuItemIds, cartInventoryHints))) {
    return [];
  }
  const hints = mergeSameDayCoverageHints(cartMenuItemIds, cartInventoryHints);
  const rows = await loadInventoryForCoverageHints(hints);
  const coveringIds = new Set<number>();
  for (const hint of hints) {
    for (const row of bannerRowsMatchingCoverageHint(rows, hint)) {
      coveringIds.add(row.id);
    }
  }
  return rows.filter((r) => coveringIds.has(r.id));
}

/**
 * Same-day dates from inventory pickup slots only (never touches weekly availability).
 */
export async function getSameDayOpenDatesForBannerCart(
  fromYmd: string,
  toYmd: string,
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<string[]> {
  const invRows = await bannerInventoryForCart(
    cartMenuItemIds,
    cartInventoryHints
  );
  if (!invRows.length) return [];

  const invIds = invRows.map((r) => r.id);
  const slotRows = await prisma.inventoryPickupSlot.findMany({
    where: {
      inventoryItemId: { in: invIds },
      dateYmd: { gte: fromYmd, lte: toYmd },
      closed: false,
    },
    include: { inventoryItem: true },
  });

  const today = getTodayInPickupTimezoneYMD();
  const open = new Set<string>();

  for (const ymd of eachYmdInRangeInclusive(fromYmd, toYmd)) {
    if (ymd < today) continue;
    const daySlots = slotRows.filter((s) => s.dateYmd === ymd);
    if (!daySlots.length) continue;

    const hints = mergeSameDayCoverageHints(cartMenuItemIds, cartInventoryHints);
    if (!hints.length) continue;

    let hasActiveForEveryLine = true;
    for (const hint of hints) {
      const covering = bannerRowsMatchingCoverageHint(invRows, hint);
      if (!covering.length) {
        hasActiveForEveryLine = false;
        break;
      }
      const invIdSet = new Set(covering.map((i) => i.id));
      let lineHasSlot = false;
      for (const slot of daySlots) {
        if (!invIdSet.has(slot.inventoryItemId)) continue;
        const active = applySameDayOrderLeadFilter(
          [...activeLabelsFromSlotRow(slot as SlotRow)],
          ymd
        );
        if (active.length > 0) {
          lineHasSlot = true;
          break;
        }
      }
      if (!lineHasSlot) {
        hasActiveForEveryLine = false;
        break;
      }
    }
    if (hasActiveForEveryLine) open.add(ymd);
  }

  return [...open].sort();
}

export async function isSameDayBannerPickupOrder(
  pickupDateYmd: string,
  pickupTimeLabel: string,
  lines: OrderItemLine[]
): Promise<boolean> {
  const menuIds = [
    ...new Set(
      lines
        .map((l) => l.menuItemId?.trim())
        .filter(Boolean) as string[]
    ),
  ];
  const hints = orderLinesToInventoryCartHints(lines);
  if (!(await cartEligibleForSameDayPickup(menuIds, hints))) return false;
  const slots = await getSameDaySlotLabelsForBannerCart(
    pickupDateYmd.trim(),
    menuIds,
    hints
  );
  return slots.includes(pickupTimeLabel.trim());
}

/** Pickup time labels for a same-day date (banner cart only). Empty = no same-day window. */
export async function getSameDaySlotLabelsForBannerCart(
  dateYmd: string,
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<string[]> {
  const invRows = await bannerInventoryForCart(
    cartMenuItemIds,
    cartInventoryHints
  );
  if (!invRows.length) return [];

  const invIds = invRows.map((r) => r.id);
  const slotRows = await prisma.inventoryPickupSlot.findMany({
    where: {
      inventoryItemId: { in: invIds },
      dateYmd: dateYmd.trim(),
      closed: false,
    },
    include: { inventoryItem: true },
  });
  if (!slotRows.length) return [];

  const hints = mergeSameDayCoverageHints(cartMenuItemIds, cartInventoryHints);
  if (!hints.length) return [];

  const labelSets: Set<string>[] = [];

  for (const hint of hints) {
    const covering = bannerRowsMatchingCoverageHint(invRows, hint);
    if (!covering.length) return [];
    const invIdSet = new Set(covering.map((i) => i.id));
    const union = new Set<string>();
    for (const slot of slotRows) {
      if (!invIdSet.has(slot.inventoryItemId)) continue;
      for (const lab of activeLabelsFromSlotRow(slot as SlotRow)) {
        union.add(lab);
      }
    }
    if (union.size === 0) return [];
    labelSets.push(union);
  }

  if (!labelSets.length) return [];

  let inter = labelSets[0]!;
  for (let i = 1; i < labelSets.length; i++) {
    inter = new Set([...inter].filter((x) => labelSets[i]!.has(x)));
  }
  return applySameDayOrderLeadFilter(
    sortPickupSlotLabels([...inter]),
    dateYmd.trim()
  );
}

/** True when this date has active same-day slots for the banner cart (independent of weekly). */
export async function isSameDayPickupDateForBannerCart(
  dateYmd: string,
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<boolean> {
  const slots = await getSameDaySlotLabelsForBannerCart(
    dateYmd,
    cartMenuItemIds,
    cartInventoryHints
  );
  return slots.length > 0;
}

/**
 * In-stock banner rows for the public site strip.
 * Pickup-slot dates only control checkout times, not whether stock is announced.
 */
export async function bannerInventoryRowsForSiteBanner(
  rows: InventoryItem[]
): Promise<InventoryItem[]> {
  return rows.filter(isBannerSameDayInventoryRow);
}

/** Count of inventory rows that would show on the public same-day banner. */
export async function countQualifyingSameDayBannerItems(): Promise<number> {
  const rows = await prisma.inventoryItem.findMany({
    where: {
      showBanner: true,
      isAvailable: true,
      quantityInStock: { gt: 0 },
    },
  });
  const filtered = await bannerInventoryRowsForSiteBanner(rows);
  return filtered.length;
}

export type LumpiaFlavorWorkload = {
  protein: LumpiaProtein;
  label: string;
  sameDayPiecesInStock: number;
  advanceWorkloadPieces: number;
  sameDayPiecesOrdered: number;
  advancePiecesOrdered: number;
};

const PROTEIN_LABEL: Record<LumpiaProtein, string> = {
  beef: "Beef",
  pork: "Pork",
  turkey: "Turkey",
};

function lumpiaPiecesFromLine(line: OrderItemLine): number {
  const mid = line.menuItemId?.trim();
  if (mid && isLumpiaMenuItemId(mid)) {
    return lumpiaPiecesForOrderLine(line);
  }
  if (line.isSample && /lumpia/i.test(line.name)) {
    return lumpiaPiecesForOrderLine(line);
  }
  return 0;
}

/** Per-flavor same-day stock + advance prep plan vs orders in pickup range. */
export async function loadLumpiaFlavorWorkload(
  pickupFromYmd: string,
  pickupToYmd: string
): Promise<LumpiaFlavorWorkload[]> {
  const invRows = await prisma.inventoryItem.findMany({
    where: { menuItemId: { in: ["seed-1", "seed-2", "seed-3"] } },
  });
  const sameDayStock = { beef: 0, pork: 0, turkey: 0 } as Record<
    LumpiaProtein,
    number
  >;
  const advancePlan = { beef: 0, pork: 0, turkey: 0 } as Record<
    LumpiaProtein,
    number
  >;
  for (const row of invRows) {
    const p = lumpiaProteinFromMenuItemId(row.menuItemId);
    if (!p) continue;
    sameDayStock[p] += inventoryQuantityAsPieces(row);
    advancePlan[p] += Math.max(
      0,
      Math.floor(Number(row.advanceWorkloadPieces)) || 0
    );
  }

  const orders = await prisma.order.findMany({
    where: {
      isDemo: false,
      pickupDate: { gte: pickupFromYmd, lte: pickupToYmd },
      status: {
        in: [
          "Pending Payment Verification",
          "Payment Confirmed",
          "Ready for Pickup",
          "Completed",
        ],
      },
    },
    select: { items: true, pickupDate: true, pickupTime: true },
  });

  const sameDayOrdered = { beef: 0, pork: 0, turkey: 0 } as Record<
    LumpiaProtein,
    number
  >;
  const advanceOrdered = { beef: 0, pork: 0, turkey: 0 } as Record<
    LumpiaProtein,
    number
  >;

  for (const o of orders) {
    let lines: OrderItemLine[];
    try {
      lines = JSON.parse(o.items) as OrderItemLine[];
      if (!Array.isArray(lines)) continue;
    } catch {
      continue;
    }
    const pd = o.pickupDate?.trim() ?? "";
    const pt = o.pickupTime?.trim() ?? "";
    const sameDay =
      pd && pt
        ? await isSameDayBannerPickupOrder(pd, pt, lines)
        : false;
    const bucket = sameDay ? sameDayOrdered : advanceOrdered;
    for (const line of lines) {
      const pieces = lumpiaPiecesFromLine(line);
      if (pieces <= 0) continue;
      const p =
        lumpiaProteinFromMenuItemId(line.menuItemId) ??
        (line.name.toLowerCase().includes("beef")
          ? "beef"
          : line.name.toLowerCase().includes("turkey")
            ? "turkey"
            : "pork");
      bucket[p] += pieces;
    }
  }

  return (["beef", "pork", "turkey"] as const).map((protein) => ({
    protein,
    label: PROTEIN_LABEL[protein],
    sameDayPiecesInStock: sameDayStock[protein],
    advanceWorkloadPieces: advancePlan[protein],
    sameDayPiecesOrdered: sameDayOrdered[protein],
    advancePiecesOrdered: advanceOrdered[protein],
  }));
}

function dozenLabel(pieces: number): string {
  const d = lumpiaWholeDozensAvailable(pieces);
  if (d >= 1) return d === 1 ? "1 dozen" : `${d} dozen`;
  if (pieces >= 4) return "sample size";
  if (pieces > 0) return `${pieces} pcs`;
  return "0";
}

export function formatLumpiaWorkloadLine(w: LumpiaFlavorWorkload): string {
  const sameDayRem = dozenLabel(w.sameDayPiecesInStock);
  const advanceRem = dozenLabel(w.advanceWorkloadPieces);
  const advOrd = dozenLabel(w.advancePiecesOrdered);
  const sdOrd =
    w.sameDayPiecesOrdered > 0 ? dozenLabel(w.sameDayPiecesOrdered) : "0";
  return `${w.label} lumpia — Same-day: ${sdOrd} ordered, ${sameDayRem} on hand · Advance: ${advOrd} ordered, ${advanceRem} prep plan remaining`;
}

export async function assertSameDayPickupOrderValid(
  pickupDateYmd: string,
  pickupTimeLabel: string,
  lines: OrderItemLine[],
  weeklyDateAllowed: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const menuIds = [
    ...new Set(
      lines
        .map((l) => l.menuItemId?.trim())
        .filter(Boolean) as string[]
    ),
  ];
  const hints = orderLinesToInventoryCartHints(lines);
  const cartFullyCovered = await cartEligibleForSameDayPickup(menuIds, hints);
  const sameDaySlots = cartFullyCovered
    ? await getSameDaySlotLabelsForBannerCart(
        pickupDateYmd,
        menuIds,
        hints
      )
    : [];
  const t = pickupTimeLabel.trim();

  if (cartFullyCovered && sameDaySlots.length > 0) {
    if (!sameDaySlots.includes(t)) {
      if (weeklyDateAllowed) return { ok: true };
      return {
        ok: false,
        message:
          "That pickup time needs at least 1 hour notice for same-day pickup. Choose a later time or another date.",
      };
    }
    return { ok: true };
  }

  if (!weeklyDateAllowed) {
    return {
      ok: false,
      message:
        "That pickup time is for on-hand items only. Remove flavors or dishes that are not in today’s inventory, or choose a regular Friday/Saturday pickup.",
    };
  }

  return { ok: true };
}
