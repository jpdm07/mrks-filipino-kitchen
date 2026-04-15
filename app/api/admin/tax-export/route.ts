import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import {
  buildTaxReportHtml,
  computeTaxSummary,
  expensesToCsv,
  mileageToCsv,
  ordersToCsv,
  summaryText,
  supportingToCsv,
} from "@/lib/tax-export";

export async function GET(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const startYmd = sp.get("startDate")?.trim() ?? "";
  const endYmd = sp.get("endDate")?.trim() ?? "";
  const format = (sp.get("format") ?? "zip").trim().toLowerCase();

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

  const [orders, expenses, mileage, supporting] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { date: { gte: startYmd, lte: endYmd } },
      orderBy: { date: "asc" },
    }),
    prisma.taxMileageLog.findMany({
      where: { date: { gte: startYmd, lte: endYmd } },
      orderBy: { date: "asc" },
    }),
    prisma.taxSupportingEntry.findMany({
      where: { date: { gte: startYmd, lte: endYmd } },
      orderBy: { date: "asc" },
    }),
  ]);

  const summary = computeTaxSummary(
    orders,
    expenses,
    mileage,
    supporting,
    startYmd,
    endYmd
  );

  if (format === "html") {
    const html = buildTaxReportHtml({
      summary,
      orders,
      expenses,
      mileage,
      supporting,
    });
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="mrks-tax-${startYmd}_${endYmd}.html"`,
      },
    });
  }

  if (format === "zip") {
    const zip = new JSZip();
    zip.file("00_README_AND_SUMMARY.txt", summaryText(summary));
    const bom = "\uFEFF";
    zip.file("01_orders_all.csv", bom + ordersToCsv(orders));
    zip.file("02_expenses.csv", bom + expensesToCsv(expenses));
    zip.file("03_mileage_log.csv", bom + mileageToCsv(mileage));
    zip.file("04_supporting_entries.csv", bom + supportingToCsv(supporting));
    zip.file(
      "05_full_report.html",
      buildTaxReportHtml({ summary, orders, expenses, mileage, supporting })
    );

    const buf = await zip.generateAsync({ type: "nodebuffer" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="mrks-tax-export_${startYmd}_${endYmd}.zip"`,
      },
    });
  }

  return NextResponse.json(
    { error: "format must be zip or html" },
    { status: 400 }
  );
}
