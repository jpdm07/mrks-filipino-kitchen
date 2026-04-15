import { salesTaxPercentLabel } from "@/lib/config";
import type { OrderItemLine } from "@/lib/order-types";
import type { AdminOrderClientRow } from "@/lib/admin-order-client";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseItems(raw: string): OrderItemLine[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as OrderItemLine[]) : [];
  } catch {
    return [];
  }
}

function formatLine(i: OrderItemLine): string {
  const line = i.unitPrice * i.quantity;
  const sz = i.size ? ` (${i.size})` : "";
  const cf =
    i.cookedOrFrozen === "cooked" || i.cookedOrFrozen === "frozen"
      ? ` [${i.cookedOrFrozen}]`
      : "";
  const samp = i.isSample ? " · sample" : "";
  return `${i.name}${sz}${cf}${samp} ×${i.quantity} @ $${i.unitPrice.toFixed(2)} = $${line.toFixed(2)}`;
}

/**
 * Standalone print document for admin “store receipt” (open in new window + print).
 * Includes dashed cut guides for trimming.
 */
export function buildAdminReceiptHtml(order: AdminOrderClientRow): string {
  const items = parseItems(order.items);
  const lines = items.map((i) => formatLine(i));
  const taxLabel = salesTaxPercentLabel();
  const created = new Date(order.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const itemsBlock = lines.length
    ? lines.map((l) => `<div class="line">${escapeHtml(l)}</div>`).join("")
    : `<div class="line">(no line items)</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Receipt #${escapeHtml(order.orderNumber)}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: auto; margin: 12mm; }
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  body {
    margin: 0;
    padding: 16px;
    font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    color: #111;
    background: #f4f4f5;
  }
  .outer-cut {
    border: 3px dashed #64748b;
    padding: 10px;
    max-width: 420px;
    margin: 0 auto 16px;
    background: #fff;
  }
  .inner-cut {
    border: 2px dashed #94a3b8;
    padding: 14px 12px;
  }
  .cut-hint {
    font-size: 9px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-align: center;
    color: #64748b;
    margin: 0 0 8px;
  }
  h1 {
    font-size: 15px;
    margin: 0 0 4px;
    text-align: center;
    letter-spacing: 0.04em;
  }
  .sub {
    text-align: center;
    font-size: 10px;
    color: #444;
    margin: 0 0 10px;
  }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; font-size: 11px; }
  .row strong { font-weight: 700; }
  .hr { border: 0; border-top: 1px dashed #ccc; margin: 10px 0; }
  .lines { margin: 8px 0; white-space: pre-wrap; word-break: break-word; }
  .line { margin: 4px 0; font-size: 10px; }
  .tot { font-size: 12px; margin-top: 6px; }
  .big { font-size: 14px; font-weight: 800; }
  .footer {
    margin-top: 12px;
    font-size: 9px;
    color: #555;
    text-align: center;
  }
  button.print {
    display: block;
    margin: 16px auto;
    padding: 10px 20px;
    font: 600 14px system-ui, sans-serif;
    cursor: pointer;
    border-radius: 8px;
    border: 2px solid #0038a8;
    background: #0038a8;
    color: #fff;
  }
</style>
</head>
<body>
  <button class="print no-print" type="button" onclick="window.print()">Print receipt</button>
  <div class="outer-cut">
    <p class="cut-hint">✂ Cut along outer dashed line</p>
    <div class="inner-cut">
      <p class="cut-hint" style="margin-top:0">✂ Fold / cut along inner line if needed</p>
      <h1>Mr. K&apos;s Filipino Kitchen</h1>
      ${
        order.isDemo
          ? `<p style="text-align:center;font-size:11px;font-weight:800;color:#92400e;background:#fef3c7;padding:6px;border-radius:6px;margin:0 0 10px;">DEMO / TEST ORDER — not for production books</p>`
          : ""
      }
      <p class="sub">Pickup · Cypress, TX · ${escapeHtml(taxLabel)} sales tax</p>
      <div class="row"><span>Receipt #</span><strong>${escapeHtml(order.orderNumber)}</strong></div>
      <div class="row"><span>Date</span><span>${escapeHtml(created)}</span></div>
      <div class="hr"></div>
      <div class="row"><span>Customer</span><span>${escapeHtml(order.customerName)}</span></div>
      <div class="row"><span>Phone</span><span>${escapeHtml(order.phone)}</span></div>
      <div class="row"><span>Email</span><span style="word-break:break-all">${escapeHtml(order.email)}</span></div>
      <div class="hr"></div>
      <div class="lines">${itemsBlock}</div>
      <div class="hr"></div>
      <div class="row"><span>Utensils</span><span>${
        order.utensilSets > 0
          ? `${order.utensilSets} sets · $${order.utensilCharge.toFixed(2)}`
          : "None"
      }</span></div>
      <div class="row"><span>Subtotal</span><span>$${order.subtotal.toFixed(2)}</span></div>
      <div class="row"><span>Tax (${escapeHtml(taxLabel)})</span><span>$${order.tax.toFixed(2)}</span></div>
      <div class="row tot big"><span>TOTAL</span><span>$${order.total.toFixed(2)}</span></div>
      <div class="hr"></div>
      <div class="row"><span>Pickup</span><span>${escapeHtml(order.pickupDate ?? "—")} @ ${escapeHtml(
        order.pickupTime ?? "—"
      )}</span></div>
      <div class="row"><span>Payment</span><span>${escapeHtml(order.paymentMethod ?? "—")} · ${escapeHtml(
        order.paymentStatus ?? "—"
      )}</span></div>
      <div class="row"><span>Order status</span><span>${escapeHtml(order.status)}</span></div>
      ${
        order.notes
          ? `<div class="hr"></div><div class="line"><strong>Notes:</strong> ${escapeHtml(order.notes)}</div>`
          : ""
      }
      <p class="footer">This receipt documents the order total and payment record for your files.<br/>Thank you for supporting Mr. K&apos;s Filipino Kitchen.</p>
    </div>
  </div>
  <script>window.onload=function(){ window.focus(); };</script>
</body>
</html>`;
}

/**
 * Prints the receipt without opening a new tab — avoids popup blockers and the
 * “blank tab” that `window.open` triggers in some browsers.
 */
export function openAdminReceiptPrintWindow(order: AdminOrderClientRow): void {
  if (typeof document === "undefined") return;

  const html = buildAdminReceiptHtml(order);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Receipt print");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;width:0;height:0;border:0;left:0;top:0;opacity:0;pointer-events:none";

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };

  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    cleanup();
    window.alert("Could not prepare the receipt for printing. Try again.");
    return;
  }

  const runPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
      window.alert("Could not open the print dialog. Try again.");
      return;
    }
    win.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(cleanup, 120_000);
  };

  iframe.onload = () => {
    requestAnimationFrame(runPrint);
  };

  try {
    iframe.srcdoc = html;
  } catch {
    cleanup();
    window.alert("Could not prepare the receipt for printing. Try again.");
  }
}
