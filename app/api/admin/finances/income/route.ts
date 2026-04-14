import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const startYmd = req.nextUrl.searchParams.get("startDate")?.trim();
  const endYmd = req.nextUrl.searchParams.get("endDate")?.trim();
  if (
    !startYmd ||
    !endYmd ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startYmd) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endYmd)
  ) {
    return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
  }
  const start = new Date(`${startYmd}T00:00:00.000Z`);
  const end = new Date(`${endYmd}T23:59:59.999Z`);
  const orders = await prisma.order.findMany({
    where: {
      status: "Confirmed",
      createdAt: { gte: start, lte: end },
    },
    orderBy: { createdAt: "desc" },
    select: {
      orderNumber: true,
      createdAt: true,
      customerName: true,
      items: true,
      total: true,
      pickupDate: true,
      status: true,
    },
  });
  const rows = orders.map((o) => {
    let summary = "";
    try {
      const arr = JSON.parse(o.items) as { name?: string; quantity?: number }[];
      if (Array.isArray(arr)) {
        summary = arr
          .map((i) => `${i.name ?? "?"} ×${i.quantity ?? 0}`)
          .join(" | ");
      }
    } catch {
      summary = "";
    }
    return {
      orderNumber: o.orderNumber,
      date: o.createdAt.toISOString(),
      customerName: o.customerName,
      itemsSummary: summary,
      total: o.total,
      pickupDate: o.pickupDate,
      status: o.status,
    };
  });
  return NextResponse.json({ orders: rows });
}
