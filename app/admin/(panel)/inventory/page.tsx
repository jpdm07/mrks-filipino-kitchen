import { requireAdmin } from "@/lib/admin-auth";
import {
  InventoryAnnouncementsClient,
  type InventoryRow,
} from "@/components/admin/InventoryAnnouncementsClient";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  await requireAdmin();

  const [inventoryRaw, menuRaw, pricing, qualifyingSameDayCount] =
    await Promise.all([
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
