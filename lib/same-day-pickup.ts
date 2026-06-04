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
export const SAME_DAY_ORDER_LEAD_MINUTES = 30;

/**
 * Same-day only: earliest slot is max(window start, order time + lead).
 * Never before the admin window or after the window end.
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

/** Menu SKUs in cart that match banner same-day inventory rows. */
export async function bannerMenuIdsInCart(
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<string[]> {
  const fromHints = [
    ...new Set(
      (cartInventoryHints ?? [])
        .map((h) => h.menuItemId?.trim())
        .filter(Boolean) as string[]
    ),
  ];
  const ids = fromHints.length
    ? fromHints
    : [...new Set(cartMenuItemIds.map((s) => s.trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  const rows = await prisma.inventoryItem.findMany({
    where: { menuItemId: { in: ids } },
  });
  const bannerIds = new Set(
    rows.filter(isBannerSameDayInventoryRow).map((r) => r.menuItemId!.trim())
  );
  return ids.filter((id) => bannerIds.has(id));
}

export async function cartEligibleForSameDayPickup(
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<boolean> {
  const matched = await bannerMenuIdsInCart(cartMenuItemIds, cartInventoryHints);
  return matched.length > 0;
}

async function bannerInventoryForCart(
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<InventoryItem[]> {
  const menuIds = await bannerMenuIdsInCart(cartMenuItemIds, cartInventoryHints);
  if (!menuIds.length) return [];
  return prisma.inventoryItem.findMany({
    where: { menuItemId: { in: menuIds } },
  });
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

    const hints = cartInventoryHints?.filter((h) => h.menuItemId?.trim()) ?? [];
    const menuIds =
      hints.length > 0
        ? [...new Set(hints.map((h) => h.menuItemId.trim()))]
        : cartMenuItemIds;

    let hasActive = false;
    for (const mid of menuIds) {
      const invForSku = invRows.filter((i) => i.menuItemId?.trim() === mid);
      if (!invForSku.length) continue;
      const invIdSet = new Set(invForSku.map((i) => i.id));
      for (const slot of daySlots) {
        if (!invIdSet.has(slot.inventoryItemId)) continue;
        if (hints.length) {
          const pseudo = hintToPseudoOrderLine(
            hints.find((h) => h.menuItemId.trim() === mid) ?? {
              menuItemId: mid,
            }
          );
          if (!lineMatchesInventory(slot.inventoryItem, pseudo)) continue;
        }
        const active = applySameDayOrderLeadFilter(
          [...activeLabelsFromSlotRow(slot as SlotRow)],
          ymd
        );
        if (active.length > 0) {
          hasActive = true;
          break;
        }
      }
      if (hasActive) break;
    }
    if (hasActive) open.add(ymd);
  }

  return [...open].sort();
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

  const hints = cartInventoryHints?.filter((h) => h.menuItemId?.trim()) ?? [];
  const menuIds =
    hints.length > 0
      ? [...new Set(hints.map((h) => h.menuItemId.trim()))]
      : cartMenuItemIds;

  const labelSets: Set<string>[] = [];

  for (const mid of menuIds) {
    const invForSku = invRows.filter((i) => i.menuItemId?.trim() === mid);
    if (!invForSku.length) continue;
    const invIdSet = new Set(invForSku.map((i) => i.id));
    const union = new Set<string>();
    for (const slot of slotRows) {
      if (!invIdSet.has(slot.inventoryItemId)) continue;
      if (hints.length) {
        const hint = hints.find((h) => h.menuItemId.trim() === mid);
        if (hint) {
          const pseudo = hintToPseudoOrderLine(hint);
          if (!lineMatchesInventory(slot.inventoryItem, pseudo)) continue;
        }
      }
      for (const lab of activeLabelsFromSlotRow(slot as SlotRow)) {
        union.add(lab);
      }
    }
    if (union.size > 0) labelSets.push(union);
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

/** Banner rows that should appear on the site banner (stock + open slot today). */
export async function bannerInventoryRowsForSiteBanner(
  rows: InventoryItem[]
): Promise<InventoryItem[]> {
  const today = getTodayInPickupTimezoneYMD();
  const qualifying = rows.filter(isBannerSameDayInventoryRow);
  if (!qualifying.length) return [];

  const invIds = qualifying.map((r) => r.id);
  const todaySlots = await prisma.inventoryPickupSlot.findMany({
    where: {
      inventoryItemId: { in: invIds },
      dateYmd: today,
      closed: false,
    },
    include: { inventoryItem: true },
  });

  const invWithSlotToday = new Set<number>();
  for (const slot of todaySlots) {
    const available = applySameDayOrderLeadFilter(
      [...activeLabelsFromSlotRow(slot as SlotRow)],
      today
    );
    if (available.length > 0) {
      invWithSlotToday.add(slot.inventoryItemId);
    }
  }

  return qualifying.filter((r) => invWithSlotToday.has(r.id));
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
  /** Pieces ordered (pickup in range). */
  piecesOrdered: number;
  /** Pieces remaining in inventory now. */
  piecesInStock: number;
  dozenOrdered: number;
  dozenRemaining: number;
};

const PROTEIN_LABEL: Record<LumpiaProtein, string> = {
  beef: "Beef",
  pork: "Pork",
  turkey: "Turkey",
};

/** Per-flavor lumpia workload + remaining stock for admin dashboard. */
export async function loadLumpiaFlavorWorkload(
  pickupFromYmd: string,
  pickupToYmd: string
): Promise<LumpiaFlavorWorkload[]> {
  const invRows = await prisma.inventoryItem.findMany({
    where: { menuItemId: { in: ["seed-1", "seed-2", "seed-3"] } },
  });
  const stockByProtein = { beef: 0, pork: 0, turkey: 0 } as Record<
    LumpiaProtein,
    number
  >;
  for (const row of invRows) {
    const p = lumpiaProteinFromMenuItemId(row.menuItemId);
    if (p) stockByProtein[p] += inventoryQuantityAsPieces(row);
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
    select: { items: true },
  });

  const ordered = { beef: 0, pork: 0, turkey: 0 } as Record<LumpiaProtein, number>;
  for (const o of orders) {
    let lines: OrderItemLine[];
    try {
      lines = JSON.parse(o.items) as OrderItemLine[];
      if (!Array.isArray(lines)) continue;
    } catch {
      continue;
    }
    for (const line of lines) {
      const mid = line.menuItemId?.trim();
      if (mid && isLumpiaMenuItemId(mid)) {
        const p = lumpiaProteinFromMenuItemId(mid)!;
        ordered[p] += lumpiaPiecesForOrderLine(line);
        continue;
      }
      if (line.isSample && /lumpia/i.test(line.name)) {
        const p =
          lumpiaProteinFromMenuItemId(line.menuItemId) ??
          (line.name.toLowerCase().includes("beef")
            ? "beef"
            : line.name.toLowerCase().includes("turkey")
              ? "turkey"
              : "pork");
        ordered[p] += lumpiaPiecesForOrderLine(line);
      }
    }
  }

  return (["beef", "pork", "turkey"] as const).map((protein) => ({
    protein,
    label: PROTEIN_LABEL[protein],
    piecesOrdered: ordered[protein],
    piecesInStock: stockByProtein[protein],
    dozenOrdered: Math.round((ordered[protein] / 12) * 10) / 10,
    dozenRemaining: lumpiaWholeDozensAvailable(stockByProtein[protein]),
  }));
}

export function formatLumpiaWorkloadLine(w: LumpiaFlavorWorkload): string {
  const ord =
    w.dozenOrdered >= 1
      ? `${w.dozenOrdered} dozen ordered`
      : w.piecesOrdered > 0
        ? `${w.piecesOrdered} pcs ordered (samples/partial)`
        : "0 orders";
  const rem =
    w.dozenRemaining >= 1
      ? `${w.dozenRemaining} dozen remaining`
      : w.piecesInStock >= 4
        ? "sample size remaining"
        : "none in stock";
  return `${w.label} lumpia: ${ord}, ${rem}`;
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

  const sameDaySlots = await getSameDaySlotLabelsForBannerCart(
    pickupDateYmd,
    menuIds,
    hints
  );
  const isSameDayDate = sameDaySlots.length > 0;
  const cartHasBanner = (await bannerMenuIdsInCart(menuIds, hints)).length > 0;

  if (isSameDayDate && !cartHasBanner) {
    return {
      ok: false,
      message:
        "That pickup time is for same-day banner items only. Remove non-banner items or choose a regular advance pickup date.",
    };
  }

  if (isSameDayDate && cartHasBanner) {
    const t = pickupTimeLabel.trim();
    if (!sameDaySlots.includes(t)) {
      return {
        ok: false,
        message:
          "That pickup time is not available for same-day banner pickup. Choose another time or date.",
      };
    }
    return { ok: true };
  }

  if (!weeklyDateAllowed) {
    return {
      ok: false,
      message:
        "That pickup date is not available. Choose an open date on the calendar.",
    };
  }

  return { ok: true };
}
