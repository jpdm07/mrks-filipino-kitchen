import { revalidatePath } from "next/cache";

/**
 * Admin routes that should see fresh data after any order is created, updated, or removed.
 * Includes tax documentation (confirmed revenue + export ZIP/HTML pull orders at request time;
 * this keeps any server-rendered shell/nav in sync).
 * Call from API route handlers after a successful order mutation.
 */
export function revalidateAdminOrderDerivedViews(): void {
  const paths = [
    "/admin",
    "/admin/dashboard",
    "/admin/finances",
    "/admin/earnings-planner",
    "/admin/analytics",
    "/admin/prep-summary",
    "/admin/orders/manual",
    "/admin/tax-documentation",
  ] as const;
  for (const p of paths) {
    revalidatePath(p);
  }
}
