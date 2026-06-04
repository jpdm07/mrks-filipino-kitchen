import type { Prisma } from "@prisma/client";
import type { Order } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pickupTimeSlotLabels, sortPickupSlotLabels } from "@/lib/pickup-time-slots";
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

export function parseSlotLabelsJson(raw: string | null | undefined): string[] {
  if (raw == null || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortPickupSlotLabels(
      parsed.filter((x): x is string => typeof x === "string" && SLOT_ORDER.has(x.trim()))
    );
  } catch {
    return [];
  }
}

/** First and last label in a stored same-day window (for admin edit forms). */
export function slotWindowFromLabelsJson(
  raw: string | null | undefined
): { startLabel: string; endLabel: string } | null {
  const labels = parseSlotLabelsJson(raw);
  if (labels.length === 0) return null;
  return { startLabel: labels[0]!, endLabel: labels[labels.length - 1]! };
}

function slotLabelsJsonForWindow(startLabel: string, endLabel: string): string {
  const labels = slotLabelsInWindow(startLabel, endLabel);
  if (labels.length === 0) {
    throw new Error(
      "No pickup slots in that time range — use labels like 11:00 AM and 2:00 PM from the standard grid."
    );
  }
  return JSON.stringify(labels);
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
  const json = slotLabelsJsonForWindow(params.startLabel, params.endLabel);
  const maxOrders = Math.max(1, params.maxOrders);

  for (const dateYmd of params.datesYmd) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) continue;
    const existing = await tx.inventoryPickupSlot.findFirst({
      where: { inventoryItemId: params.inventoryItemId, dateYmd },
    });
    if (existing) {
      await tx.inventoryPickupSlot.update({
        where: { id: existing.id },
        data: {
          slotLabelsJson: json,
          maxOrders,
          autoCloseWhenZero: params.autoCloseWhenZero,
          closed: false,
        },
      });
    } else {
      await tx.inventoryPickupSlot.create({
        data: {
          inventoryItemId: params.inventoryItemId,
          dateYmd,
          slotLabelsJson: json,
          maxOrders,
          ordersFilled: 0,
          autoCloseWhenZero: params.autoCloseWhenZero,
          closed: false,
        },
      });
    }
  }
}

export async function updateInventoryPickupSlotInTx(
  tx: Prisma.TransactionClient,
  params: {
    slotId: number;
    inventoryItemId: number;
    dateYmd: string;
    startLabel: string;
    endLabel: string;
    maxOrders: number;
    autoCloseWhenZero: boolean;
    closed: boolean;
  }
): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.dateYmd.trim())) {
    throw new Error("dateYmd must be YYYY-MM-DD");
  }
  const json = slotLabelsJsonForWindow(params.startLabel, params.endLabel);
  const maxOrders = Math.max(1, params.maxOrders);

  const slot = await tx.inventoryPickupSlot.findFirst({
    where: { id: params.slotId, inventoryItemId: params.inventoryItemId },
  });
  if (!slot) {
    throw new Error("Pickup slot not found for this inventory item.");
  }

  const duplicate = await tx.inventoryPickupSlot.findFirst({
    where: {
      inventoryItemId: params.inventoryItemId,
      dateYmd: params.dateYmd.trim(),
      NOT: { id: params.slotId },
    },
  });
  if (duplicate) {
    throw new Error(
      "Another pickup slot already exists for that date — edit that row or delete it first."
    );
  }

  await tx.inventoryPickupSlot.update({
    where: { id: params.slotId },
    data: {
      dateYmd: params.dateYmd.trim(),
      slotLabelsJson: json,
      maxOrders,
      autoCloseWhenZero: params.autoCloseWhenZero,
      closed: params.closed,
    },
  });
}

export async function deleteInventoryPickupSlotInTx(
  tx: Prisma.TransactionClient,
  slotId: number,
  inventoryItemId: number
): Promise<void> {
  const slot = await tx.inventoryPickupSlot.findFirst({
    where: { id: slotId, inventoryItemId },
  });
  if (!slot) {
    throw new Error("Pickup slot not found for this inventory item.");
  }
  await tx.inventoryPickupSlot.delete({ where: { id: slotId } });
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
