import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPublicLumpiaStockPayload } from "@/lib/lumpia-inventory-banners";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

/** Public: per-flavor lumpia piece counts (cooked + frozen share one pool). */
export async function GET() {
  try {
    const rows = await prisma.inventoryItem.findMany({
      orderBy: { id: "asc" },
    });
    const payload = buildPublicLumpiaStockPayload(rows);
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch {
    return NextResponse.json(
      {
        stock: { beef: 0, pork: 0, turkey: 0 },
        managed: { beef: false, pork: false, turkey: false },
      },
      { headers: NO_STORE }
    );
  }
}
