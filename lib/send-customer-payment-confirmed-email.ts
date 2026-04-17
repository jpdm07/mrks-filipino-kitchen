import type { Order } from "@prisma/client";
import {
  buildCustomerReplyFooterHtml,
  buildCustomerReplyFooterPlainText,
} from "@/lib/mail-reply-routing";
import { formatPickupDisplay } from "@/lib/format-pickup";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { sendMail, type MailSendResult } from "@/lib/mailer";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Short “payment received” note to the customer (separate from the line-item receipt).
 * Sent when admin verifies payment; uses same mail stack as receipts.
 */
export async function sendCustomerPaymentConfirmedEmail(
  order: Pick<
    Order,
    "customerName" | "email" | "orderNumber" | "pickupDate" | "pickupTime" | "total"
  >
): Promise<MailSendResult> {
  const to = order.email?.trim();
  if (!to) {
    return {
      ok: false,
      error: "This order has no customer email on file, so nothing can be sent.",
    };
  }

  const pd = order.pickupDate ?? "";
  const pt = order.pickupTime ?? "";
  const when = formatPickupDisplay(pd, pt);
  const origin = getPublicSiteOrigin();
  const summaryUrl = `${origin}/order-confirmation/${encodeURIComponent(order.orderNumber)}`;
  const subj = `Payment received — order #${order.orderNumber} confirmed`;

  const text = [
    `Hi ${order.customerName},`,
    "",
    `We've received your payment for order #${order.orderNumber}. Thank you!`,
    "",
    `Pickup: ${when}`,
    "",
    `Order total: $${order.total.toFixed(2)}`,
    "",
    `Order summary (bookmark or show at pickup):`,
    summaryUrl,
    "",
    "A separate email with your full receipt and line items is on the way as well.",
    "",
    "Questions? Call or text 979-703-3827.",
    "",
    "— Mr. K's Filipino Kitchen",
  ].join("\n") + buildCustomerReplyFooterPlainText();

  const name = escapeHtml(order.customerName);
  const num = escapeHtml(order.orderNumber);
  const whenH = escapeHtml(when);
  const urlH = escapeHtml(summaryUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:24px;font-family:system-ui,Segoe UI,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;background:#fafafa;">
  <div style="max-width:520px;margin:0 auto;background:#fff;padding:24px 28px;border-radius:12px;border:1px solid #e8e8e8;">
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">We&apos;ve received your payment for order <strong>#${num}</strong>. Thank you!</p>
    <p style="margin:0 0 8px;"><strong>Pickup</strong><br/>${whenH}</p>
    <p style="margin:0 0 16px;"><strong>Order total</strong> — $${order.total.toFixed(2)}</p>
    <p style="margin:0 0 8px;"><a href="${urlH}" style="color:#0d6efd;">View your order summary</a> (bookmark or show at pickup).</p>
    <p style="margin:16px 0 0;font-size:14px;color:#555;">You&apos;ll also get a separate email with your full receipt and line items.</p>
    <p style="margin:24px 0 0;font-size:14px;color:#555;">Questions? Call or text <a href="tel:+19797033827" style="color:#0d6efd;">979-703-3827</a>.</p>
    <p style="margin:16px 0 0;font-size:14px;color:#888;">— Mr. K&apos;s Filipino Kitchen</p>
    ${buildCustomerReplyFooterHtml()}
  </div>
</body>
</html>`;

  const bcc = process.env.RECEIPT_EMAIL_BCC?.trim();
  return sendMail({
    to,
    subject: subj,
    html,
    text,
    bcc: bcc || undefined,
  });
}
