import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSiteBannerEntries } from "@/lib/lumpia-inventory-banners";
import { bannerInventoryRowsForSiteBanner } from "@/lib/same-day-pickup";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

/** Public: active stock banners (must stay in sync with server-rendered banners). */
export async function GET() {
  try {
    const rows = await prisma.inventoryItem.findMany({
      where: {
        showBanner: true,
        isAvailable: true,
        quantityInStock: { gt: 0 },
      },
      orderBy: { id: "asc" },
    });
    const bannerRows = await bannerInventoryRowsForSiteBanner(rows);
    const items = buildSiteBannerEntries(bannerRows).map((entry) => ({
      id: entry.key,
      message: entry.message,
    }));
    return NextResponse.json({ items }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ items: [] }, { headers: NO_STORE });
  }
}
