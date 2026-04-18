import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { ORDER_STATUS_CONFIRMED } from "@/lib/order-payment";
import { ordersToConfirmedRevenueTaxCsv } from "@/lib/tax-export";

function orderItemsSummary(itemsJson: string): string {
  try {
    const arr = JSON.parse(itemsJson) as { name?: string; quantity?: number }[];
    if (!Array.isArray(arr)) return "";
    return arr
      .map((i) => `${i.name ?? "?"} ×${i.quantity ?? 0}`)
      .join(" | ");
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const startYmd = sp.get("startDate")?.trim() ?? "";
  const endYmd = sp.get("endDate")?.trim() ?? "";
  const format = (sp.get("format") ?? "json").trim().toLowerCase();

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
    orderBy: { createdAt: "asc" },
  });

  if (format === "csv") {
    const csv = ordersToConfirmedRevenueTaxCsv(orders);
    const bom = "\uFEFF";
    return new NextResponse(bom + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mrks-confirmed-revenue_${startYmd}_${endYmd}.csv"`,
      },
    });
  }

  const totalSubtotal = Math.round(orders.reduce((s, o) => s + o.subtotal, 0) * 100) / 100;
  const totalTax = Math.round(orders.reduce((s, o) => s + o.tax, 0) * 100) / 100;
  const totalRevenue = Math.round(orders.reduce((s, o) => s + o.total, 0) * 100) / 100;

  const transactions = orders.map((o) => ({
    orderNumber: o.orderNumber,
    dateOrderPlacedUtc: o.createdAt.toISOString(),
    pickupDate: o.pickupDate,
    pickupTime: o.pickupTime,
    descriptionLineItems: orderItemsSummary(o.items),
    customerName: o.customerName,
    customerEmail: o.email,
    customerPhone: o.phone,
    subtotal: o.subtotal,
    salesTax: o.tax,
    total: o.total,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    orderStatus: o.status,
    orderSource: o.manualEntry ? "Manual entry" : "Website order",
    customerNotes: o.notes,
    customInquiry: o.customInquiry,
    adminNotes: o.adminNotes,
    utensilSets: o.utensilSets,
    utensilCharge: o.utensilCharge,
    printedReceiptRequested: o.wantsPrintedReceipt,
    newsletterOptIn: o.subscribeUpdates,
    hasRefundLog: Boolean(o.refundLog?.trim()),
  }));

  return NextResponse.json({
    range: { startDate: startYmd, endDate: endYmd },
    totals: {
      count: orders.length,
      totalSubtotal,
      totalSalesTaxCollected: totalTax,
      totalRevenue,
    },
    transactions,
  });
}
