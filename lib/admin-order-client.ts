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
  // JSON round-trip strips Prisma client prototypes / non-JSON fields so React Flight
  // can serialize props to DashboardOrders (spread alone can still fail in production).
  const base = JSON.parse(JSON.stringify(order)) as Omit<
    AdminOrderClientRow,
    "itemsSummary"
  >;
  return { ...base, itemsSummary };
}
