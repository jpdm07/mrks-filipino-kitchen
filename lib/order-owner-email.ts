import { sendMail } from "@/lib/mailer";
import type { OrderItemLine } from "@/lib/order-types";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLine(i: OrderItemLine): string {
  const sz = i.size ? ` (${i.size})` : "";
  const cf =
    i.cookedOrFrozen === "cooked" || i.cookedOrFrozen === "frozen"
      ? ` [${i.cookedOrFrozen}]`
      : "";
  const sample = i.isSample ? " (sample)" : "";
  return `${i.name}${sz}${cf}${sample} × ${i.quantity} @ $${i.unitPrice.toFixed(2)} = $${(i.unitPrice * i.quantity).toFixed(2)}`;
}

/**
 * Email the shop owner a full copy of the new order (Resend or SMTP; see lib/mailer.ts).
 * Uses OWNER_ORDER_EMAIL if set, otherwise EMAIL_USER (same inbox you send from).
 * Independent of Twilio; failures are logged and do not block the order.
 */
export async function sendNewOrderEmailToOwner(params: {
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string;
  items: OrderItemLine[];
  subtotal: number;
  tax: number;
  total: number;
  pickupDate: string;
  pickupTime: string;
  notes: string | null;
  wantsUtensils: boolean;
  utensilSets: number;
  utensilCharge: number;
  customInquiry: string | null;
  subscribeUpdates: boolean;
  wantsPrintedReceipt?: boolean;
  isDemo?: boolean;
}): Promise<boolean> {
  const to =
    process.env.OWNER_ORDER_EMAIL?.trim() ||
    process.env.EMAIL_USER?.trim() ||
    "";
  if (!to) {
    console.warn(
      "[orders] Owner notification email skipped: set EMAIL_USER (and EMAIL_PASSWORD) or OWNER_ORDER_EMAIL."
    );
    return false;
  }

  const base = getPublicSiteOrigin();
  const adminUrl = `${base}/admin`;

  const linesText = params.items.map(formatLine).join("\n");
  const linesRows = params.items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(i.name)}${i.size ? ` <small>(${escapeHtml(i.size)})</small>` : ""}${i.cookedOrFrozen ? ` <small>[${escapeHtml(i.cookedOrFrozen)}]</small>` : ""}${i.isSample ? " <em>sample</em>" : ""}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${i.unitPrice.toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${(i.unitPrice * i.quantity).toFixed(2)}</td></tr>`
    )
    .join("");

  const text = [
    `New order #${params.orderNumber}`,
    ``,
    `Customer: ${params.customerName}`,
    `Phone: ${params.phone}`,
    `Email: ${params.email}`,
    `Pickup: ${params.pickupDate} at ${params.pickupTime}`,
    ``,
    `Items:`,
    linesText,
    ``,
    `Subtotal: $${params.subtotal.toFixed(2)}`,
    `Tax: $${params.tax.toFixed(2)}`,
    `Total: $${params.total.toFixed(2)}`,
    ``,
    params.wantsUtensils && params.utensilSets > 0
      ? `Utensils: ${params.utensilSets} set(s) (+$${params.utensilCharge.toFixed(2)})`
      : null,
    params.notes ? `Notes: ${params.notes}` : null,
    params.customInquiry ? `Custom dish inquiry: ${params.customInquiry}` : null,
    params.subscribeUpdates ? `Newsletter opt-in: yes` : null,
    params.wantsPrintedReceipt
      ? `Printed receipt: yes — include with pickup bag`
      : null,
    ``,
    `Customer should put order #${params.orderNumber} in Venmo/Zelle memo and text you after paying.`,
    `Admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;color:#1a1a1a;background:#f5f5f5;padding:16px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e5e5;">
    <h1 style="margin:0 0 8px;font-size:22px;color:#0038a8;">New order #${escapeHtml(params.orderNumber)}</h1>
    <p style="margin:0 0 20px;color:#666;font-size:14px;">${escapeHtml(params.customerName)} · ${escapeHtml(params.phone)}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:6px 0;color:#666;">Email</td><td style="padding:6px 0;font-weight:600;"><a href="mailto:${encodeURIComponent(params.email)}">${escapeHtml(params.email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#666;">Pickup</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(params.pickupDate)} at ${escapeHtml(params.pickupTime)}</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead><tr style="background:#f0f4ff;"><th style="text-align:left;padding:10px;border-bottom:2px solid #0038a8;">Item</th><th style="padding:10px;border-bottom:2px solid #0038a8;">Qty</th><th style="text-align:right;padding:10px;border-bottom:2px solid #0038a8;">Each</th><th style="text-align:right;padding:10px;border-bottom:2px solid #0038a8;">Line</th></tr></thead>
      <tbody>${linesRows}</tbody>
    </table>
    <p style="margin:16px 0 0;text-align:right;font-size:16px;"><strong>Subtotal</strong> $${params.subtotal.toFixed(2)}<br/><span style="color:#666;">Tax</span> $${params.tax.toFixed(2)}<br/><strong style="color:#0038a8;font-size:18px;">Total $${params.total.toFixed(2)}</strong></p>
    ${params.wantsUtensils && params.utensilSets > 0 ? `<p style="margin:12px 0 0;font-size:14px;">Utensils: ${params.utensilSets} set(s) — $${params.utensilCharge.toFixed(2)}</p>` : ""}
    ${params.notes ? `<p style="margin:16px 0 0;padding:12px;background:#fffbeb;border-radius:8px;border:1px solid #fcd34d;"><strong>Instructions</strong><br/>${escapeHtml(params.notes)}</p>` : ""}
    ${params.customInquiry ? `<p style="margin:12px 0 0;padding:12px;background:#f5f3ff;border-radius:8px;"><strong>Custom dish</strong><br/>${escapeHtml(params.customInquiry)}</p>` : ""}
    <p style="margin:20px 0 0;font-size:13px;color:#666;">
      ${params.subscribeUpdates ? "• Opted in to menu updates<br/>" : ""}
      ${params.wantsPrintedReceipt ? "• <strong>Printed receipt</strong> requested with pickup<br/>" : ""}
      • Ask them to use order #${escapeHtml(params.orderNumber)} in Venmo/Zelle memo and text after payment.
    </p>
    <p style="margin:20px 0 0;"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#0038a8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Open admin</a></p>
  </div>
</body></html>`;

  const demoTag = params.isDemo ? "[DEMO] " : "";
  try {
    const r = await sendMail({
      to,
      subject: `${demoTag}New order #${params.orderNumber} — ${params.customerName} ($${params.total.toFixed(2)})`,
      html,
      text,
    });
    return r.ok;
  } catch (e) {
    console.error("[orders] Owner notification email failed:", e);
    return false;
  }
}
