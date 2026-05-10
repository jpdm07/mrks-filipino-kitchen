import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolvedInventoryBannerMessage } from "@/lib/inventory-banner-copy";

/** Server-rendered — reflects DB on every request (with `dynamic` pages). */
export async function InventoryStockBanner() {
  let rows: Awaited<ReturnType<typeof prisma.inventoryItem.findMany>> = [];
  try {
    rows = await prisma.inventoryItem.findMany({
      where: {
        showBanner: true,
        isAvailable: true,
        quantityInStock: { gt: 0 },
      },
      orderBy: { id: "asc" },
    });
  } catch {
    return null;
  }

  if (rows.length === 0) return null;

  return (
    <div className="print:hidden">
      {rows.map((inv) => (
        <div
          key={inv.id}
          className="relative z-40 w-full border-b border-[color:var(--gold-muted)]/45 bg-[rgba(251,246,236,0.97)] text-[color:var(--primary)] shadow-[inset_0_-1px_0_rgba(6,15,31,0.06)]"
          role="status"
        >
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row sm:gap-4">
            <p className="text-center text-[13px] leading-snug sm:text-left sm:text-[15px]">
              {resolvedInventoryBannerMessage(inv)}
            </p>
            <Link
              href="/order"
              className="btn btn-primary btn-sm shrink-0 whitespace-nowrap"
            >
              Order for Pickup
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
