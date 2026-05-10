import { requireAdmin } from "@/lib/admin-auth";
import {
  InventoryAnnouncementsClient,
  type InventoryRow,
} from "@/components/admin/InventoryAnnouncementsClient";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  await requireAdmin();

  let inventoryRaw: Awaited<ReturnType<typeof prisma.inventoryItem.findMany>> =
    [];
  let menuRaw: Awaited<ReturnType<typeof prisma.menuItem.findMany>> = [];
  let pricing: Awaited<
    ReturnType<typeof prisma.pricingSettings.findUnique>
  > = null;
  let qualifyingSameDayCount = 0;
  let loadError: string | null = null;

  try {
    const result = await Promise.all([
      prisma.inventoryItem.findMany({
        orderBy: { id: "asc" },
        include: {
          deductionLogs: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      }),
      prisma.menuItem.findMany({
        orderBy: { sortOrder: "asc" },
      }),
      prisma.pricingSettings.findUnique({ where: { id: "default" } }),
      prisma.inventoryItem.count({
        where: {
          showBanner: true,
          isAvailable: true,
          quantityInStock: { gt: 0 },
        },
      }),
    ]);
    [inventoryRaw, menuRaw, pricing, qualifyingSameDayCount] = result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isSchema =
      /P2022|lineCookFilter|does not exist|column/i.test(msg) ||
      (e &&
        typeof e === "object" &&
        "code" in e &&
        (e as { code?: string }).code === "P2022");
    loadError = isSchema
      ? "Database is missing a recent column (often `lineCookFilter` on `InventoryItem`). Run: npm run db:migrate on production, or `npx prisma migrate deploy` with your production `DATABASE_URL`."
      : `Could not load inventory: ${msg}`;
    console.error("[admin/inventory page]", e);
  }

  const initialInventory = JSON.parse(
    JSON.stringify(inventoryRaw)
  ) as InventoryRow[];
  const menuItemsFull = JSON.parse(JSON.stringify(menuRaw));
  const menuItems = menuRaw.map((m) => ({ id: m.id, name: m.name }));

  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Inventory &amp; Announcements
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Track stock units, website banners, and inventory-linked pickup windows.
        Sold-out flags for individual menu SKUs remain below.
      </p>
      {loadError ? (
        <div
          className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950"
          role="alert"
        >
          {loadError}
        </div>
      ) : null}
      <InventoryAnnouncementsClient
        initialInventory={initialInventory}
        menuItems={menuItems}
        menuItemsFull={menuItemsFull}
        initialScheduling={{
          schedulingBannerForceStateA:
            pricing?.schedulingBannerForceStateA === true,
          qualifyingSameDayCount,
        }}
      />
    </div>
  );
}
