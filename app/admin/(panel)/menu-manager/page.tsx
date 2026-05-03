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
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
        List prices and sizes for catalog dishes are defined in{" "}
        <code className="rounded bg-[var(--bg-section)] px-1.5 py-0.5 font-mono text-xs">
          lib/menu-catalog.ts
        </code>
        ; the live site overlays that catalog onto DB rows. After changing the catalog, run{" "}
        <kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-0.5 font-mono text-xs">
          npx prisma db seed
        </kbd>{" "}
        so stored sizes/JSON match — especially if an old row still lists removed options (for example
        Yema per dozen).
      </p>
      <MenuManagerClient initialItems={items} />
    </div>
  );
}
