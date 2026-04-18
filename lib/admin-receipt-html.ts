import { buildEmailBrandBannerHtml } from "@/lib/email-brand-header";
import { formatPaymentDisplayLine } from "@/lib/order-payment";
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

/** Item line left column (HTML receipts / print — total is shown in its own column). */
function formatItemLeftColumn(i: OrderItemLine): string {
  const sz = i.size ? ` (${i.size})` : "";
  const cf =
    i.cookedOrFrozen === "cooked" || i.cookedOrFrozen === "frozen"
      ? ` [${i.cookedOrFrozen}]`
      : "";
  const samp = i.isSample ? " · sample" : "";
  return `${i.name}${sz}${cf}${samp} ×${i.quantity} @ $${i.unitPrice.toFixed(2)}`;
}

function formatItemLineTotal(i: OrderItemLine): string {
  return `$${(i.unitPrice * i.quantity).toFixed(2)}`;
}

/**
 * Standalone print document for admin “store receipt” (open in new window + print).
 * Includes dashed cut guides for trimming.
 */
export function buildAdminReceiptHtml(order: AdminOrderClientRow): string {
  const items = parseItems(order.items);
  const taxLabel = salesTaxPercentLabel();
  const created = new Date(order.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const itemsBlock = items.length
    ? items
        .map(
          (i) =>
            `<div class="row line-item"><span class="item-desc">${escapeHtml(formatItemLeftColumn(i))}</span><span class="item-price">${formatItemLineTotal(i)}</span></div>`
        )
        .join("")
    : `<div class="row line-item"><span class="item-desc">(no line items)</span><span class="item-price"></span></div>`;

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
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin: 3px 0; font-size: 11px; }
  .row strong { font-weight: 700; }
  .row.line-item { margin: 5px 0; font-size: 10px; }
  .item-desc { flex: 1; min-width: 0; text-align: left; word-break: break-word; padding-right: 6px; }
  .item-price { flex: 0 0 4.75em; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .hr { border: 0; border-top: 1px dashed #ccc; margin: 10px 0; }
  .lines { margin: 8px 0; }
  .line-note { margin: 6px 0; font-size: 10px; word-break: break-word; }
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
    padding: 14px 24px;
    min-height: 48px;
    min-width: min(100%, 280px);
    font: 600 15px system-ui, sans-serif;
    cursor: pointer;
    border-radius: 8px;
    border: 2px solid #0038a8;
    background: #0038a8;
    color: #fff;
    touch-action: manipulation;
    -webkit-tap-highlight-color: rgba(0, 56, 168, 0.15);
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
      <p class="sub">Pickup · Cypress, TX</p>
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
      <div class="row"><span>Payment</span><span>${escapeHtml(
        formatPaymentDisplayLine(order.paymentMethod, order.paymentStatus)
      )}</span></div>
      <div class="row"><span>Order status</span><span>${escapeHtml(order.status)}</span></div>
      ${
        order.notes
          ? `<div class="hr"></div><div class="line-note"><strong>Notes:</strong> ${escapeHtml(order.notes)}</div>`
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
 * Opens a short-lived window and prints from it (works on mobile Safari where
 * print() from a zero-size iframe often fails). Falls back to the iframe path
 * if pop-ups are blocked. Call only synchronously from a click/tap handler.
 */
export function openAdminReceiptPrintWindow(order: AdminOrderClientRow): void {
  if (typeof document === "undefined") return;

  const html = buildAdminReceiptHtml(order);

  const printFromChildWindow = (child: Window): void => {
    const runPrint = () => {
      try {
        child.focus();
        child.print();
      } catch {
        window.alert("Could not open the print dialog. Try “Save receipt”, open the file, then print.");
      }
    };
    if (child.document.readyState === "complete") {
      requestAnimationFrame(runPrint);
    } else {
      child.addEventListener("load", () => requestAnimationFrame(runPrint), {
        once: true,
      });
    }
  };

  const tryNewWindow = (): Window | null => {
    try {
      const child = window.open("", "_blank", "noopener,noreferrer");
      if (!child) return null;
      child.opener = null;
      child.document.open();
      child.document.write(html);
      child.document.close();
      return child;
    } catch {
      return null;
    }
  };

  const tryBlobWindow = (): Window | null => {
    try {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const child = window.open(url, "_blank", "noopener,noreferrer");
      if (!child) {
        URL.revokeObjectURL(url);
        return null;
      }
      child.opener = null;
      child.addEventListener(
        "load",
        () => {
          window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
        },
        { once: true }
      );
      return child;
    } catch {
      return null;
    }
  };

  const child = tryNewWindow() ?? tryBlobWindow();
  if (child) {
    printFromChildWindow(child);
    return;
  }

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
    window.alert(
      "Could not open the print window. Allow pop-ups for this site, or use “Save receipt” and print from the file."
    );
    return;
  }

  const runPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
      window.alert("Could not open the print dialog. Try “Save receipt” and print from the file.");
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

/** Save the same printable HTML as a file (share or open in a browser / print to PDF). */
export function downloadAdminReceiptHtmlFile(order: AdminOrderClientRow): void {
  if (typeof document === "undefined") return;
  const html = buildAdminReceiptHtml(order);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeNum = String(order.orderNumber).replace(/[^\w.-]+/g, "_");
  a.href = url;
  a.download = `receipt-${safeNum}.html`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Email-friendly HTML (tables + inline styles). Mirrors the print receipt content.
 */
export function buildAdminReceiptEmailHtml(order: AdminOrderClientRow): string {
  const items = parseItems(order.items);
  const taxLabel = salesTaxPercentLabel();
  const created = new Date(order.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const itemsBlock = items.length
    ? items
        .map(
          (i) =>
            `<tr><td style="padding:5px 10px 5px 0;font-size:13px;line-height:1.4;color:#111;vertical-align:top;">${escapeHtml(formatItemLeftColumn(i))}</td><td style="padding:5px 0;font-size:13px;font-weight:700;text-align:right;white-space:nowrap;vertical-align:top;font-variant-numeric:tabular-nums;">${formatItemLineTotal(i)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="2" style="padding:8px 0;font-size:13px;color:#555;">(no line items)</td></tr>`;

  const demoBanner = order.isDemo
    ? `<tr><td colspan="2" style="padding:10px;background:#fef3c7;border-radius:6px;text-align:center;font-size:12px;font-weight:800;color:#92400e;">DEMO / TEST ORDER — not for production books</td></tr>`
    : "";

  const notesRow = order.notes
    ? `<tr><td colspan="2" style="padding-top:12px;border-top:1px solid #e5e7eb;font-size:13px;"><strong>Notes:</strong> ${escapeHtml(order.notes)}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;color:#111;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #0038A8;border-radius:10px;overflow:hidden;box-shadow:0 2px 14px rgba(0,56,168,0.18);">
<tr><td style="padding:0;border-bottom:3px solid #FFC200;">
${buildEmailBrandBannerHtml({ variant: "blue", subtitle: "Receipt" })}
</td></tr>
<tr><td style="padding:20px;">
${demoBanner}
<p style="margin:0 0 16px;font-size:13px;color:#444;text-align:center;">Pickup · Cypress, TX</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
<tr><td style="padding:4px 0;color:#555;">Receipt #</td><td style="padding:4px 0;text-align:right;font-weight:700;">${escapeHtml(order.orderNumber)}</td></tr>
<tr><td style="padding:4px 0;color:#555;">Date</td><td style="padding:4px 0;text-align:right;">${escapeHtml(created)}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;padding-top:16px;border-top:1px dashed #cbd5e1;font-size:14px;">
<tr><td style="padding:4px 0;color:#555;">Customer</td><td style="padding:4px 0;text-align:right;">${escapeHtml(order.customerName)}</td></tr>
<tr><td style="padding:4px 0;color:#555;">Phone</td><td style="padding:4px 0;text-align:right;">${escapeHtml(order.phone)}</td></tr>
<tr><td style="padding:4px 0;color:#555;vertical-align:top;">Email</td><td style="padding:4px 0;text-align:right;word-break:break-all;">${escapeHtml(order.email)}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;padding-top:16px;border-top:1px dashed #cbd5e1;">
${itemsBlock}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;padding-top:12px;border-top:1px dashed #cbd5e1;font-size:14px;">
<tr><td style="padding:4px 0;">Utensils</td><td style="padding:4px 0;text-align:right;">${
    order.utensilSets > 0
      ? `${order.utensilSets} sets · $${order.utensilCharge.toFixed(2)}`
      : "None"
  }</td></tr>
<tr><td style="padding:4px 0;">Subtotal</td><td style="padding:4px 0;text-align:right;">$${order.subtotal.toFixed(2)}</td></tr>
<tr><td style="padding:4px 0;">Tax (${escapeHtml(taxLabel)})</td><td style="padding:4px 0;text-align:right;">$${order.tax.toFixed(2)}</td></tr>
<tr><td style="padding:8px 0 4px;font-size:17px;font-weight:800;">TOTAL</td><td style="padding:8px 0 4px;text-align:right;font-size:17px;font-weight:800;">$${order.total.toFixed(2)}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;padding-top:12px;border-top:1px dashed #cbd5e1;font-size:14px;">
<tr><td style="padding:4px 0;color:#555;">Pickup</td><td style="padding:4px 0;text-align:right;">${escapeHtml(order.pickupDate ?? "—")} @ ${escapeHtml(order.pickupTime ?? "—")}</td></tr>
<tr><td style="padding:4px 0;color:#555;">Payment</td><td style="padding:4px 0;text-align:right;">${escapeHtml(
    formatPaymentDisplayLine(order.paymentMethod, order.paymentStatus)
  )}</td></tr>
<tr><td style="padding:4px 0;color:#555;">Order status</td><td style="padding:4px 0;text-align:right;">${escapeHtml(order.status)}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${notesRow}</table>
<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#555;text-align:center;">This receipt documents the order total and payment record for your files.<br/>Thank you for supporting Mr. K&apos;s Filipino Kitchen.</p>
</td></tr>
</table>
<p style="margin:16px;font-size:11px;color:#888;text-align:center;">Sent from Mr. K&apos;s Filipino Kitchen · Cypress, TX</p>
</td></tr></table>
</body></html>`;
}

export function buildAdminReceiptPlainText(order: AdminOrderClientRow): string {
  const items = parseItems(order.items);
  const lines = items.map((i) => formatLine(i));
  const taxLabel = salesTaxPercentLabel();
  const created = new Date(order.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const itemBlock = lines.length ? lines.join("\n") : "(no line items)";
  const parts: string[] = [
    "Mr. K's Filipino Kitchen",
    `Receipt #${order.orderNumber}`,
  ];
  if (order.isDemo) parts.push("[DEMO / TEST ORDER]");
  parts.push(
    `Date: ${created}`,
    "",
    `Customer: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Email: ${order.email}`,
    "",
    "Items:",
    itemBlock,
    "",
    `Utensils: ${
      order.utensilSets > 0
        ? `${order.utensilSets} sets · $${order.utensilCharge.toFixed(2)}`
        : "None"
    }`,
    `Subtotal: $${order.subtotal.toFixed(2)}`,
    `Tax (${taxLabel}): $${order.tax.toFixed(2)}`,
    `TOTAL: $${order.total.toFixed(2)}`,
    "",
    `Pickup: ${order.pickupDate ?? "—"} @ ${order.pickupTime ?? "—"}`,
    `Payment: ${formatPaymentDisplayLine(order.paymentMethod, order.paymentStatus)}`,
    `Order status: ${order.status}`
  );
  if (order.notes?.trim()) parts.push("", `Notes: ${order.notes}`);
  parts.push("", "Thank you for supporting Mr. K's Filipino Kitchen.");
  return parts.join("\n");
}
