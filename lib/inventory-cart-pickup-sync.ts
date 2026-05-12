import type { InventoryItem, InventoryPickupSlot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sortPickupSlotLabels } from "@/lib/pickup-time-slots";
import { lineMatchesInventory } from "@/lib/inventory-deduction";
import type { InventoryCartLineHint } from "@/lib/inventory-cart-line-hints";
import { hintToPseudoOrderLine } from "@/lib/inventory-cart-line-hints";

type SlotRow = InventoryPickupSlot & { inventoryItem: InventoryItem };

/** Labels still offered from one inventory pickup slot row (respects stock / capacity). */
function activeLabelsFromSlotRow(row: SlotRow): Set<string> {
  const inv = row.inventoryItem;
  const full = row.ordersFilled >= row.maxOrders;
  const stockOut = inv.quantityInStock <= 0 || !inv.isAvailable;
  const closeForStock = stockOut && row.autoCloseWhenZero;
  if (full || closeForStock) return new Set();
  let labels: string[] = [];
  try {
    labels = JSON.parse(row.slotLabelsJson) as string[];
    if (!Array.isArray(labels)) labels = [];
  } catch {
    return new Set();
  }
  return new Set(labels.map((l) => l.trim()).filter(Boolean));
}

/**
 * For checkout: when the cart includes menu SKUs linked to inventory rows that use
 * “Open pickup slots”, restrict times to the intersection of those windows for `dateYmd`.
 *
 * When `cartInventoryHints` is set, rows are matched with `lineMatchesInventory` so
 * cooked vs frozen inventory stays aligned with deduction.
 *
 * @returns `null` — no inventory-window narrowing for this cart/date.
 * @returns `[]` — narrowing applies but no valid window (hide day or no times).
 * @returns string[] — allowed slot labels (must still intersect with kitchen slots).
 */
export async function getCartInventorySlotLabelFilterForDate(
  dateYmd: string,
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<string[] | null> {
  try {
    return await computeCartInventorySlotLabelFilterForDate(
      dateYmd,
      cartMenuItemIds,
      cartInventoryHints
    );
  } catch (e) {
    console.warn(
      "[mrk] inventory pickup slot filter skipped — apply DB migrations if this persists:",
      e instanceof Error ? e.message : e
    );
    return null;
  }
}

async function computeCartInventorySlotLabelFilterForDate(
  dateYmd: string,
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<string[] | null> {
  const hints =
    cartInventoryHints?.filter((h) => h.menuItemId?.trim()) ?? [];

  if (hints.length > 0) {
    const menuIds = [...new Set(hints.map((h) => h.menuItemId.trim()))];
    const invItems = await prisma.inventoryItem.findMany({
      where: { menuItemId: { in: menuIds } },
    });
    if (invItems.length === 0) return null;

    const invIds = invItems.map((i) => i.id);
    const anySlotRows = await prisma.inventoryPickupSlot.findMany({
      where: { inventoryItemId: { in: invIds } },
      select: { inventoryItemId: true },
    });
    const managedInvId = new Set(anySlotRows.map((r) => r.inventoryItemId));

    const rows = await prisma.inventoryPickupSlot.findMany({
      where: {
        dateYmd: dateYmd.trim(),
        inventoryItemId: { in: invIds },
        closed: false,
      },
      include: { inventoryItem: true },
    });

    const labelSets: Set<string>[] = [];

    for (const hint of hints) {
      const pseudo = hintToPseudoOrderLine(hint);
      const matchingInv = invItems.filter((inv) =>
        lineMatchesInventory(inv, pseudo)
      );
      const slotManaged = matchingInv.filter((inv) =>
        managedInvId.has(inv.id)
      );
      if (slotManaged.length === 0) continue;

      const allowIds = new Set(slotManaged.map((i) => i.id));
      const union = new Set<string>();
      for (const row of rows) {
        if (!allowIds.has(row.inventoryItemId)) continue;
        for (const lab of activeLabelsFromSlotRow(row as SlotRow)) {
          union.add(lab);
        }
      }
      labelSets.push(union);
    }

    if (labelSets.length === 0) return null;

    let inter = labelSets[0]!;
    for (let i = 1; i < labelSets.length; i++) {
      inter = new Set([...inter].filter((x) => labelSets[i]!.has(x)));
    }

    if (inter.size === 0) return [];
    return sortPickupSlotLabels([...inter]);
  }

  const unique = [
    ...new Set(cartMenuItemIds.map((s) => s.trim()).filter(Boolean)),
  ];
  if (unique.length === 0) return null;

  const invItems = await prisma.inventoryItem.findMany({
    where: { menuItemId: { in: unique } },
  });
  if (invItems.length === 0) return null;

  const byMenu = new Map<string, InventoryItem[]>();
  for (const i of invItems) {
    if (!i.menuItemId) continue;
    const arr = byMenu.get(i.menuItemId) ?? [];
    arr.push(i);
    byMenu.set(i.menuItemId, arr);
  }
  const invIds = invItems.map((i) => i.id);

  const anySlotRows = await prisma.inventoryPickupSlot.findMany({
    where: { inventoryItemId: { in: invIds } },
    select: { inventoryItemId: true },
  });
  const managedInvId = new Set(anySlotRows.map((r) => r.inventoryItemId));

  const cartManagedMenuIds = unique.filter((mid) => {
    const rowsForSku = byMenu.get(mid);
    if (!rowsForSku?.length) return false;
    return rowsForSku.some((inv) => managedInvId.has(inv.id));
  });
  if (cartManagedMenuIds.length === 0) return null;

  const cartManagedInventoryIds = cartManagedMenuIds.flatMap((mid) =>
    (byMenu.get(mid) ?? []).map((i) => i.id)
  );

  const rows = await prisma.inventoryPickupSlot.findMany({
    where: {
      dateYmd: dateYmd.trim(),
      inventoryItemId: { in: cartManagedInventoryIds },
      closed: false,
    },
    include: { inventoryItem: true },
  });

  const labelSets: Set<string>[] = [];

  for (const mid of cartManagedMenuIds) {
    const invRowsForSku = byMenu.get(mid) ?? [];
    const idSet = new Set(invRowsForSku.map((i) => i.id));
    const union = new Set<string>();
    for (const row of rows) {
      if (!idSet.has(row.inventoryItemId)) continue;
      for (const lab of activeLabelsFromSlotRow(row as SlotRow)) {
        union.add(lab);
      }
    }
    labelSets.push(union);
  }

  if (labelSets.length === 0) return null;

  let inter = labelSets[0]!;
  for (let i = 1; i < labelSets.length; i++) {
    inter = new Set([...inter].filter((x) => labelSets[i]!.has(x)));
  }

  if (inter.size === 0) return [];
  return sortPickupSlotLabels([...inter]);
}

/** True when the cart references menu SKUs that use inventory pickup-slot rows (same-day windows). */
export async function cartHasManagedPickupSlotInventory(
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<boolean> {
  const hints = cartInventoryHints?.filter((h) => h.menuItemId?.trim()) ?? [];
  const menuIds =
    hints.length > 0
      ? [...new Set(hints.map((h) => h.menuItemId.trim()))]
      : [...new Set(cartMenuItemIds.map((s) => s.trim()).filter(Boolean))];
  if (menuIds.length === 0) return false;
  const invItems = await prisma.inventoryItem.findMany({
    where: { menuItemId: { in: menuIds } },
    select: { id: true },
  });
  if (invItems.length === 0) return false;
  const invIds = invItems.map((i) => i.id);
  const slotRow = await prisma.inventoryPickupSlot.findFirst({
    where: { inventoryItemId: { in: invIds } },
    select: { id: true },
  });
  return Boolean(slotRow);
}

/**
 * Drop calendar days where inventory-managed cart SKUs have no joint pickup window.
 */
export async function filterOpenDatesByInventoryCart(
  openDates: string[],
  cartMenuItemIds: string[],
  cartInventoryHints?: InventoryCartLineHint[] | null
): Promise<string[]> {
  if (openDates.length === 0) return openDates;
  const hasHints = cartInventoryHints && cartInventoryHints.length > 0;
  if (!hasHints && cartMenuItemIds.length === 0) return openDates;

  try {
    const filtered: string[] = [];
    for (const ymd of openDates) {
      const f = await getCartInventorySlotLabelFilterForDate(
        ymd,
        cartMenuItemIds,
        cartInventoryHints
      );
      if (f === null) {
        filtered.push(ymd);
        continue;
      }
      if (f.length > 0) filtered.push(ymd);
    }
    return filtered;
  } catch (e) {
    console.warn(
      "[mrk] filterOpenDatesByInventoryCart skipped — apply DB migrations if this persists:",
      e instanceof Error ? e.message : e
    );
    return openDates;
  }
}
