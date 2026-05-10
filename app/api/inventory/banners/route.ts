import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvedInventoryBannerMessage } from "@/lib/inventory-banner-copy";

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
    const items = rows.map((r) => ({
      id: r.id,
      message: resolvedInventoryBannerMessage(r),
    }));
    return NextResponse.json({ items }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ items: [] }, { headers: NO_STORE });
  }
}
