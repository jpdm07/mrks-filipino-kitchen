import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import type { OrderItemLine } from "@/lib/order-types";

function summarize(raw: string): string {
  try {
    const items = JSON.parse(raw) as OrderItemLine[];
    if (!Array.isArray(items)) return "";
    return items
      .map((i) => `${i.name}${i.size ? ` (${i.size})` : ""} ×${i.quantity}`)
      .join(", ");
  } catch {
    return "";
  }
}

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  const rows = orders.map((o) => ({
    ...JSON.parse(JSON.stringify(o)),
    itemsSummary: summarize(o.items),
  }));
  return NextResponse.json({ orders: rows });
}
