import type { InventoryItem, InventoryPickupSlot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sortPickupSlotLabels } from "@/lib/pickup-time-slots";

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
 * @returns `null` — no inventory-window narrowing for this cart/date.
 * @returns `[]` — narrowing applies but no valid window (hide day or no times).
 * @returns string[] — allowed slot labels (must still intersect with kitchen slots).
 */
export async function getCartInventorySlotLabelFilterForDate(
  dateYmd: string,
  cartMenuItemIds: string[]
): Promise<string[] | null> {
  const unique = [
    ...new Set(cartMenuItemIds.map((s) => s.trim()).filter(Boolean)),
  ];
  if (unique.length === 0) return null;

  const invItems = await prisma.inventoryItem.findMany({
    where: { menuItemId: { in: unique } },
  });
  if (invItems.length === 0) return null;

  const invByMenu = new Map(
    invItems.filter((i) => i.menuItemId).map((i) => [i.menuItemId!, i])
  );
  const invIds = invItems.map((i) => i.id);

  const anySlotRows = await prisma.inventoryPickupSlot.findMany({
    where: { inventoryItemId: { in: invIds } },
    select: { inventoryItemId: true },
  });
  const managedInvId = new Set(anySlotRows.map((r) => r.inventoryItemId));

  const cartManagedMenuIds = unique.filter((mid) => {
    const inv = invByMenu.get(mid);
    return inv && managedInvId.has(inv.id);
  });
  if (cartManagedMenuIds.length === 0) return null;

  const cartManagedInventoryIds = cartManagedMenuIds
    .map((mid) => invByMenu.get(mid)?.id)
    .filter((id): id is number => id != null);

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
    const inv = invByMenu.get(mid);
    if (!inv) continue;
    const union = new Set<string>();
    for (const row of rows) {
      if (row.inventoryItemId !== inv.id) continue;
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

/**
 * Drop calendar days where inventory-managed cart SKUs have no joint pickup window.
 */
export async function filterOpenDatesByInventoryCart(
  openDates: string[],
  cartMenuItemIds: string[]
): Promise<string[]> {
  if (openDates.length === 0 || cartMenuItemIds.length === 0) return openDates;

  const filtered: string[] = [];
  for (const ymd of openDates) {
    const f = await getCartInventorySlotLabelFilterForDate(ymd, cartMenuItemIds);
    if (f === null) {
      filtered.push(ymd);
      continue;
    }
    if (f.length > 0) filtered.push(ymd);
  }
  return filtered;
}
