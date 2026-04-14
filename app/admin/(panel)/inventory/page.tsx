import { requireAdmin } from "@/lib/admin-auth";
import { InventoryClient } from "@/components/admin/InventoryClient";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  await requireAdmin();
  const items = await prisma.menuItem.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Inventory
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Mark items sold out for the public menu. Inactive items are hidden
        entirely.
      </p>
      <InventoryClient initialItems={items} />
    </div>
  );
}
