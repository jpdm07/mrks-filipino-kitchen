import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { ORDER_STATUS_CONFIRMED } from "@/lib/order-payment";
import { computeSalesAnalytics } from "@/lib/sales-analytics";

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const startYmd = sp.get("startDate")?.trim() ?? "";
  const endYmd = sp.get("endDate")?.trim() ?? "";

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startYmd) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endYmd)
  ) {
    return NextResponse.json(
      { error: "startDate and endDate (YYYY-MM-DD) required" },
      { status: 400 }
    );
  }

  const start = new Date(`${startYmd}T00:00:00.000Z`);
  const end = new Date(`${endYmd}T23:59:59.999Z`);

  const orders = await prisma.order.findMany({
    where: {
      status: ORDER_STATUS_CONFIRMED,
      isDemo: false,
      createdAt: { gte: start, lte: end },
    },
    select: {
      orderNumber: true,
      items: true,
      createdAt: true,
      total: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const analytics = computeSalesAnalytics(orders, { topN: 30, monthlyTopK: 10 });

  return NextResponse.json({
    range: { startDate: startYmd, endDate: endYmd },
    ...analytics,
  });
}
