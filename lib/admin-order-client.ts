import type { Order } from "@prisma/client";

/**
 * Shape safe to pass from Server Components → Client Components (no Date / Decimal / BigInt).
 */
export type AdminOrderClientRow = Omit<Order, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  itemsSummary: string;
};

export function toAdminOrderClientRow(
  order: Order,
  itemsSummary: string
): AdminOrderClientRow {
  return {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    itemsSummary,
  };
}
