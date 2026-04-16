import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { GroceryShoppingListClient } from "@/components/admin/GroceryShoppingListClient";

export const dynamic = "force-dynamic";

export default async function GroceryListPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <p className="text-sm text-[var(--text-muted)]">
        <Link
          href="/admin/kitchen-guide"
          className="font-semibold text-[var(--primary)] underline"
        >
          Kitchen guide
        </Link>{" "}
        ·{" "}
        <Link
          href="/admin/dashboard"
          className="font-semibold text-[var(--primary)] underline"
        >
          Dashboard
        </Link>
      </p>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--primary)]">
        Grocery trip planner
      </h1>
      <p className="text-base text-[var(--text-muted)]">
        Build a printable shopping list with anticipated budgets per line and a
        trip total. Adjust numbers before you print; at the store, write actual
        prices in the blank column on the paper to see if you overspent.
      </p>
      <GroceryShoppingListClient />
    </div>
  );
}
