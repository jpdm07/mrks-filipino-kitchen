import type { Prisma } from "@prisma/client";
import type { Order } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pickupTimeSlotLabels } from "@/lib/pickup-time-slots";
import type { OrderItemLine } from "@/lib/order-types";
import {
  computeInventoryStockUnits,
  deductInventoryForOrderInTx,
} from "@/lib/inventory-deduction";
import { isSameDayBannerPickupOrder } from "@/lib/same-day-pickup";

const ALL_SLOTS = pickupTimeSlotLabels();
const SLOT_ORDER = new Map(ALL_SLOTS.map((l, i) => [l.trim(), i]));

/** Parse "11:00 AM" / "2:30 PM" style labels matching `pickupTimeSlotLabels` entries. */
export function slotLabelsInWindow(startLabel: string, endLabel: string): string[] {
  const a = SLOT_ORDER.get(startLabel.trim());
  const b = SLOT_ORDER.get(endLabel.trim());
  if (a === undefined || b === undefined) return [];
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return ALL_SLOTS.filter((_, i) => i >= lo && i <= hi);
}

export async function createInventoryPickupSlotsInTx(
  tx: Prisma.TransactionClient,
  params: {
    inventoryItemId: number;
    datesYmd: string[];
    startLabel: string;
    endLabel: string;
    maxOrders: number;
    autoCloseWhenZero: boolean;
  }
): Promise<void> {
  const labels = slotLabelsInWindow(params.startLabel, params.endLabel);
  if (labels.length === 0) {
    throw new Error(
      "No pickup slots in that time range — use labels like 11:00 AM and 2:00 PM from the standard grid."
    );
  }
  const json = JSON.stringify(labels);

  for (const dateYmd of params.datesYmd) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) continue;
    await tx.inventoryPickupSlot.create({
      data: {
        inventoryItemId: params.inventoryItemId,
        dateYmd,
        slotLabelsJson: json,
        maxOrders: Math.max(1, params.maxOrders),
        ordersFilled: 0,
        autoCloseWhenZero: params.autoCloseWhenZero,
        closed: false,
      },
    });
  }
}

/** Remove slot labels from customer view when capacity or stock rules block them. */
export async function getBlockedInventorySlotLabels(
  dateYmd: string
): Promise<Set<string>> {
  const rows = await prisma.inventoryPickupSlot.findMany({
    where: { dateYmd: dateYmd.trim(), closed: false },
    include: { inventoryItem: true },
  });
  const blocked = new Set<string>();
  for (const row of rows) {
    let labels: string[] = [];
    try {
      labels = JSON.parse(row.slotLabelsJson) as string[];
      if (!Array.isArray(labels)) labels = [];
    } catch {
      continue;
    }
    const inv = row.inventoryItem;
    const stockOut = inv.quantityInStock <= 0 || !inv.isAvailable;
    const full = row.ordersFilled >= row.maxOrders;
    const closeForStock = stockOut && row.autoCloseWhenZero;
    if (full || closeForStock) {
      for (const l of labels) blocked.add(l.trim());
    }
  }
  return blocked;
}

export async function incrementInventoryPickupSlotFillInTx(
  tx: Prisma.TransactionClient,
  order: Pick<Order, "id" | "pickupDate" | "pickupTime" | "items" | "isDemo">
): Promise<void> {
  if (order.isDemo) return;
  const pt = order.pickupTime?.trim();
  const pd = order.pickupDate?.trim();
  if (!pt || !pd) return;

  let lines: OrderItemLine[];
  try {
    lines = JSON.parse(order.items) as OrderItemLine[];
    if (!Array.isArray(lines)) return;
  } catch {
    return;
  }

  if (!(await isSameDayBannerPickupOrder(pd, pt, lines))) return;

  const slots = await tx.inventoryPickupSlot.findMany({
    where: { dateYmd: pd, closed: false },
    include: { inventoryItem: true },
  });

  for (const slot of slots) {
    let labels: string[] = [];
    try {
      labels = JSON.parse(slot.slotLabelsJson) as string[];
      if (!Array.isArray(labels)) labels = [];
    } catch {
      continue;
    }
    if (!labels.includes(pt)) continue;
    const units = computeInventoryStockUnits(slot.inventoryItem, lines);
    if (units <= 0) continue;

    const nextFill = slot.ordersFilled + 1;
    const closed = nextFill >= slot.maxOrders;
    await tx.inventoryPickupSlot.update({
      where: { id: slot.id },
      data: {
        ordersFilled: nextFill,
        closed: closed || slot.closed,
      },
    });
  }
}

/** Full post-order inventory pipeline inside an existing transaction (caller supplies tx). */
export async function runInventoryHooksForNewOrderInTx(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    items: string;
    manualEntry: boolean;
    isDemo: boolean;
    pickupDate: string | null;
    pickupTime: string | null;
  }
): Promise<void> {
  await deductInventoryForOrderInTx(tx, order);
  await incrementInventoryPickupSlotFillInTx(tx, {
    id: order.id,
    pickupDate: order.pickupDate,
    pickupTime: order.pickupTime,
    items: order.items,
    isDemo: order.isDemo,
  });
}
