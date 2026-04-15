import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class PickupSlotTakenError extends Error {
  constructor() {
    super("PICKUP_SLOT_TAKEN");
    this.name = "PickupSlotTakenError";
  }
}

/** Pickup time labels (canonical strings) already taken on this date by active orders. */
export async function getTakenPickupTimeLabelsForDate(
  dateYmd: string
): Promise<Set<string>> {
  const rows = await prisma.order.findMany({
    where: {
      pickupDate: dateYmd.trim(),
      isDemo: false,
      pickupTime: { not: null },
      NOT: {
        status: { contains: "cancel", mode: "insensitive" },
      },
    },
    select: { pickupTime: true },
  });
  const set = new Set<string>();
  for (const r of rows) {
    const t = r.pickupTime?.trim();
    if (t) set.add(t);
  }
  return set;
}

export async function assertPickupSlotFreeInTx(
  tx: Prisma.TransactionClient,
  dateYmd: string,
  timeLabel: string
): Promise<void> {
  const t = timeLabel.trim();
  if (!t) return;
  const conflict = await tx.order.findFirst({
    where: {
      pickupDate: dateYmd.trim(),
      pickupTime: t,
      isDemo: false,
      NOT: {
        status: { contains: "cancel", mode: "insensitive" },
      },
    },
    select: { id: true },
  });
  if (conflict) throw new PickupSlotTakenError();
}
