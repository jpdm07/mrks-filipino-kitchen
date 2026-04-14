import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { MenuManagerClient } from "@/components/admin/MenuManagerClient";

export default async function MenuManagerPage() {
  await requireAdmin();
  const itemsRaw = await prisma.menuItem.findMany({
    orderBy: { sortOrder: "asc" },
  });
  const items = JSON.parse(JSON.stringify(itemsRaw));
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Menu manager
      </h1>
      <MenuManagerClient initialItems={items} />
    </div>
  );
}
