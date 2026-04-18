import type { Expense, Order, TaxMileageLog, TaxSupportingEntry } from "@prisma/client";
import { ORDER_STATUS_CONFIRMED } from "@/lib/order-payment";

export function csvEscape(
  value: string | number | null | undefined
): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

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

/** Same basis as Finances “income”: confirmed, non-demo website revenue. */
export function filterConfirmedIncomeOrders(orders: Order[]): Order[] {
  return orders.filter(
    (o) => !o.isDemo && o.status === ORDER_STATUS_CONFIRMED
  );
}

/**
 * One row per confirmed order — columns useful for Schedule C / sales records (open in Excel & filter).
 */
export function ordersToConfirmedRevenueTaxCsv(orders: Order[]): string {
  const rows = filterConfirmedIncomeOrders(orders);
  const header = [
    "order_number",
    "date_order_placed_utc",
    "pickup_date",
    "pickup_time",
    "description_line_items_sold",
    "customer_name",
    "customer_email",
    "customer_phone",
    "subtotal_usd",
    "sales_tax_collected_usd",
    "total_usd",
    "payment_method",
    "payment_status",
    "order_status",
    "order_source",
    "customer_notes",
    "custom_inquiry",
    "admin_notes",
    "utensil_sets",
    "utensil_charge_usd",
    "printed_receipt_requested",
    "newsletter_opt_in",
    "has_refund_log",
  ];
  const lines = [header.join(",")];
  for (const o of rows) {
    const hasRefund = Boolean(o.refundLog?.trim());
    lines.push(
      [
        csvEscape(o.orderNumber),
        csvEscape(o.createdAt.toISOString()),
        csvEscape(o.pickupDate),
        csvEscape(o.pickupTime),
        csvEscape(orderItemsSummary(o.items)),
        csvEscape(o.customerName),
        csvEscape(o.email),
        csvEscape(o.phone),
        csvEscape(o.subtotal),
        csvEscape(o.tax),
        csvEscape(o.total),
        csvEscape(o.paymentMethod),
        csvEscape(o.paymentStatus),
        csvEscape(o.status),
        csvEscape(o.manualEntry ? "Manual entry (walk-in / phone)" : "Website order"),
        csvEscape(o.notes),
        csvEscape(o.customInquiry),
        csvEscape(o.adminNotes),
        csvEscape(o.utensilSets),
        csvEscape(o.utensilCharge),
        csvEscape(o.wantsPrintedReceipt ? "yes" : "no"),
        csvEscape(o.subscribeUpdates ? "yes" : "no"),
        csvEscape(hasRefund ? "yes" : "no"),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}

export function ordersToCsv(orders: Order[]): string {
  const header = [
    "orderNumber",
    "createdAt_utc",
    "status",
    "customerName",
    "email",
    "phone",
    "subtotal",
    "tax",
    "total",
    "pickupDate",
    "pickupTime",
    "paymentMethod",
    "paymentStatus",
    "isDemo",
    "itemsSummary",
  ];
  const lines = [header.join(",")];
  for (const o of orders) {
    lines.push(
      [
        csvEscape(o.orderNumber),
        csvEscape(o.createdAt.toISOString()),
        csvEscape(o.status),
        csvEscape(o.customerName),
        csvEscape(o.email),
        csvEscape(o.phone),
        csvEscape(o.subtotal),
        csvEscape(o.tax),
        csvEscape(o.total),
        csvEscape(o.pickupDate),
        csvEscape(o.pickupTime),
        csvEscape(o.paymentMethod),
        csvEscape(o.paymentStatus),
        csvEscape(o.isDemo),
        csvEscape(orderItemsSummary(o.items)),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}

export function expensesToCsv(rows: Expense[]): string {
  const header = [
    "date",
    "store",
    "category",
    "description",
    "amount",
    "notes",
    "receiptUrl",
    "isEdited",
  ];
  const lines = [header.join(",")];
  for (const e of rows) {
    lines.push(
      [
        csvEscape(e.date),
        csvEscape(e.store),
        csvEscape(e.category),
        csvEscape(e.description),
        csvEscape(e.amount),
        csvEscape(e.notes),
        csvEscape(e.receiptUrl),
        csvEscape(e.isEdited),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}

export function mileageToCsv(rows: TaxMileageLog[]): string {
  const header = [
    "date",
    "miles",
    "purpose",
    "routeFrom",
    "routeTo",
    "notes",
    "createdAt_utc",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.date),
        csvEscape(r.miles),
        csvEscape(r.purpose),
        csvEscape(r.routeFrom),
        csvEscape(r.routeTo),
        csvEscape(r.notes),
        csvEscape(r.createdAt.toISOString()),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}

export function supportingToCsv(rows: TaxSupportingEntry[]): string {
  const header = [
    "date",
    "category",
    "title",
    "description",
    "amount",
    "notes",
    "createdAt_utc",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.date),
        csvEscape(r.category),
        csvEscape(r.title),
        csvEscape(r.description),
        r.amount == null ? "" : csvEscape(r.amount),
        csvEscape(r.notes),
        csvEscape(r.createdAt.toISOString()),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}

export type TaxExportSummary = {
  startDate: string;
  endDate: string;
  generatedAtIso: string;
  orderCount: number;
  confirmedOrderCount: number;
  cancelledOrderCount: number;
  demoOrderCount: number;
  grossSalesAllNonDemo: number;
  confirmedRevenue: number;
  subtotalSumNonDemoNonCancelled: number;
  taxCollectedSum: number;
  expenseCount: number;
  totalExpenses: number;
  mileageTripCount: number;
  totalMiles: number;
  supportingEntryCount: number;
};

export function computeTaxSummary(
  orders: Order[],
  expenses: Expense[],
  mileage: TaxMileageLog[],
  supporting: TaxSupportingEntry[],
  startYmd: string,
  endYmd: string
): TaxExportSummary {
  const nonDemo = orders.filter((o) => !o.isDemo);
  const confirmed = nonDemo.filter((o) => o.status === "Confirmed");
  const cancelled = nonDemo.filter((o) => o.status === "Cancelled");
  const active = nonDemo.filter((o) => o.status !== "Cancelled");

  const grossSalesAllNonDemo = active.reduce((s, o) => s + o.total, 0);
  const confirmedRevenue = confirmed.reduce((s, o) => s + o.total, 0);
  const subtotalSumNonDemoNonCancelled = active.reduce((s, o) => s + o.subtotal, 0);
  const taxCollectedSum = active.reduce((s, o) => s + o.tax, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalMiles = mileage.reduce((s, m) => s + m.miles, 0);

  return {
    startDate: startYmd,
    endDate: endYmd,
    generatedAtIso: new Date().toISOString(),
    orderCount: orders.length,
    confirmedOrderCount: confirmed.length,
    cancelledOrderCount: cancelled.length,
    demoOrderCount: orders.filter((o) => o.isDemo).length,
    grossSalesAllNonDemo: Math.round(grossSalesAllNonDemo * 100) / 100,
    confirmedRevenue: Math.round(confirmedRevenue * 100) / 100,
    subtotalSumNonDemoNonCancelled:
      Math.round(subtotalSumNonDemoNonCancelled * 100) / 100,
    taxCollectedSum: Math.round(taxCollectedSum * 100) / 100,
    expenseCount: expenses.length,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    mileageTripCount: mileage.length,
    totalMiles: Math.round(totalMiles * 100) / 100,
    supportingEntryCount: supporting.length,
  };
}

export function summaryText(s: TaxExportSummary): string {
  return [
    "Mr. K's Filipino Kitchen — tax documentation export",
    "===============================================",
    "",
    `Date range: ${s.startDate} through ${s.endDate}`,
    `Generated (UTC): ${s.generatedAtIso}`,
    "",
    "ORDERS (all rows in 01_orders_all.csv; filters noted below)",
    `- Total order rows in export: ${s.orderCount}`,
    `- Demo / test orders (excluded from revenue lines below): ${s.demoOrderCount}`,
    `- Cancelled orders: ${s.cancelledOrderCount}`,
    `- Confirmed orders (matches Finances “income” view): ${s.confirmedOrderCount}`,
    "",
    "CONFIRMED REVENUE (06_confirmed_revenue_tax.csv)",
    "- One row per confirmed, non-demo order — same basis as Finances income + Tax page report.",
    "- Open in Excel / Google Sheets; filter by date, payment, etc.",
    "",
    "REVENUE (non-demo, not Cancelled — gross order totals)",
    `- Sum of order totals: $${s.grossSalesAllNonDemo.toFixed(2)}`,
    `- Sum of subtotals (pre-tax): $${s.subtotalSumNonDemoNonCancelled.toFixed(2)}`,
    `- Sum of tax line on orders: $${s.taxCollectedSum.toFixed(2)}`,
    "",
    "CONFIRMED-ONLY revenue (same basis as dashboard Finances summary)",
    `- Sum of totals where status = Confirmed: $${s.confirmedRevenue.toFixed(2)}`,
    "",
    "EXPENSES (Finances / receipt log)",
    `- Line count: ${s.expenseCount}`,
    `- Sum of amounts: $${s.totalExpenses.toFixed(2)}`,
    "",
    "MILEAGE LOG (manual entries in admin)",
    `- Trips logged: ${s.mileageTripCount}`,
    `- Total miles: ${s.totalMiles}`,
    "",
    "SUPPORTING ENTRIES (equipment, fees, other notes)",
    `- Row count: ${s.supportingEntryCount}`,
    "",
    "DISCLAIMER",
    "- This export is for your records only. It is not tax or legal advice.",
    "- Consult a qualified tax professional (CPA/EA) for IRS rules, mileage rates,",
    "  and how to treat sales tax, home kitchen, and Schedule C / Texas filings.",
    "- Standard mileage rate changes yearly; see IRS Publication 463.",
    "",
  ].join("\r\n");
}

export function buildTaxReportHtml(params: {
  summary: TaxExportSummary;
  orders: Order[];
  expenses: Expense[];
  mileage: TaxMileageLog[];
  supporting: TaxSupportingEntry[];
}): string {
  const { summary, orders, expenses, mileage, supporting } = params;
  const esc = (t: string) =>
    t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const orderRows = orders
    .map(
      (o) =>
        `<tr><td>${esc(o.orderNumber)}</td><td>${esc(o.createdAt.toISOString().slice(0, 10))}</td><td>${esc(o.status)}</td><td>${esc(o.customerName)}</td><td>${o.subtotal.toFixed(2)}</td><td>${o.tax.toFixed(2)}</td><td>${o.total.toFixed(2)}</td><td>${o.isDemo ? "yes" : ""}</td></tr>`
    )
    .join("");

  const expRows = expenses
    .map(
      (e) =>
        `<tr><td>${esc(e.date)}</td><td>${esc(e.store)}</td><td>${esc(e.category)}</td><td>${esc(e.description)}</td><td>${e.amount.toFixed(2)}</td></tr>`
    )
    .join("");

  const mileRows = mileage
    .map(
      (m) =>
        `<tr><td>${esc(m.date)}</td><td>${m.miles}</td><td>${esc(m.purpose)}</td><td>${esc(m.routeFrom ?? "")}</td><td>${esc(m.routeTo ?? "")}</td><td>${esc(m.notes ?? "")}</td></tr>`
    )
    .join("");

  const supRows = supporting
    .map(
      (x) =>
        `<tr><td>${esc(x.date)}</td><td>${esc(x.category)}</td><td>${esc(x.title)}</td><td>${esc(x.description ?? "")}</td><td>${x.amount != null ? x.amount.toFixed(2) : ""}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Tax documentation ${summary.startDate} – ${summary.endDate}</title>
<style>
body{font-family:system-ui,Segoe UI,sans-serif;margin:24px;color:#111;background:#fff;}
h1{color:#0038A8;}
h2{margin-top:2rem;border-bottom:2px solid #0038A8;padding-bottom:4px;}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13px;}
th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;}
th{background:#f0f4ff;}
pre{white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:8px;font-size:12px;}
@media print{body{margin:12px;}h2{page-break-after:avoid;}table{page-break-inside:auto;}tr{page-break-inside:avoid;}}
</style>
</head>
<body>
<h1>Mr. K's Filipino Kitchen — tax documentation</h1>
<p><strong>Range:</strong> ${esc(summary.startDate)} through ${esc(summary.endDate)}<br/>
<strong>Generated:</strong> ${esc(summary.generatedAtIso)} (UTC)</p>
<pre>${esc(summaryText(summary))}</pre>

<h2>Orders (detail)</h2>
<table><thead><tr><th>Order #</th><th>Date</th><th>Status</th><th>Customer</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Demo</th></tr></thead><tbody>${orderRows}</tbody></table>

<h2>Expenses</h2>
<table><thead><tr><th>Date</th><th>Store</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>${expRows}</tbody></table>

<h2>Mileage log</h2>
<table><thead><tr><th>Date</th><th>Miles</th><th>Purpose</th><th>From</th><th>To</th><th>Notes</th></tr></thead><tbody>${mileRows}</tbody></table>

<h2>Supporting entries</h2>
<table><thead><tr><th>Date</th><th>Category</th><th>Title</th><th>Description</th><th>Amount</th></tr></thead><tbody>${supRows}</tbody></table>

<p style="margin-top:3rem;font-size:12px;color:#555;">Disclaimer: For your records only; not tax or legal advice. Consult a qualified tax professional.</p>
</body>
</html>`;
}
