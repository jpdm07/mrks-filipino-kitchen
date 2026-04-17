import { PAYMENT_INSTRUCTIONS } from "@/lib/config";
import { buildEmailBrandBannerHtml } from "@/lib/email-brand-header";
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

export type CustomerOrderPlacedEmailParams = {
  customerName: string;
  email: string;
  orderNumber: string;
  pickupDate: string;
  pickupTime: string;
  total: number;
};

/**
 * Sent immediately after checkout so the customer gets the same “order confirmation”
 * the thank-you page refers to (separate from post-payment receipt emails).
 */
export async function sendCustomerOrderPlacedEmail(
  params: CustomerOrderPlacedEmailParams
): Promise<MailSendResult> {
  const to = params.email?.trim();
  if (!to) {
    return {
      ok: false,
      error: "No customer email on file.",
    };
  }

  const when = formatPickupDisplay(params.pickupDate, params.pickupTime);
  const origin = getPublicSiteOrigin();
  const summaryUrl = `${origin}/order-confirmation/${encodeURIComponent(params.orderNumber)}`;
  const { zellePhone, venmoHandle } = PAYMENT_INSTRUCTIONS;

  const subj = `We received your order #${params.orderNumber}`;

  const text = [
    `Hi ${params.customerName},`,
    "",
    `Thanks for ordering from Mr. K's Filipino Kitchen. We saved your order as #${params.orderNumber}.`,
    "",
    `Pickup (requested): ${when}`,
    `Total due: $${params.total.toFixed(2)}`,
    "",
    "Your order is not final until we receive payment.",
    "",
    "Pay with Zelle or Venmo:",
    `- Zelle: ${zellePhone}`,
    `- Venmo: ${venmoHandle}`,
    "",
    `Please put order #${params.orderNumber} in the payment memo when you send.`,
    "Mr. K will match that order number with you at pickup.",
    "",
    `Open your order summary anytime:`,
    summaryUrl,
    "",
    "Questions? Call or text 979-703-3827.",
    "",
    "— Mr. K's Filipino Kitchen",
  ].join("\n") + buildCustomerReplyFooterPlainText();

  const name = escapeHtml(params.customerName);
  const num = escapeHtml(params.orderNumber);
  const whenH = escapeHtml(when);
  const urlH = escapeHtml(summaryUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:24px 12px;font-family:system-ui,Segoe UI,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;background:#fafafa;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e8e8e8;">
    ${buildEmailBrandBannerHtml()}
    <div style="background:#fff;padding:24px 28px;">
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">Thanks for ordering from Mr. K&apos;s Filipino Kitchen. We saved your order as <strong>#${num}</strong>.</p>
    <p style="margin:0 0 8px;"><strong>Pickup (requested)</strong><br/>${whenH}</p>
    <p style="margin:0 0 16px;"><strong>Total due</strong> — $${params.total.toFixed(2)}</p>
    <p style="margin:0 0 16px;padding:12px 14px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;font-size:15px;">Your order is <strong>not final</strong> until we receive payment.</p>
    <p style="margin:0 0 8px;"><strong>Pay with Zelle or Venmo</strong></p>
    <ul style="margin:0 0 16px;padding-left:1.25rem;">
      <li>Zelle: <strong>${escapeHtml(zellePhone)}</strong></li>
      <li>Venmo: <strong>${escapeHtml(venmoHandle)}</strong></li>
    </ul>
    <p style="margin:0 0 16px;">Put order <strong>#${num}</strong> in the payment memo when you send. We&apos;ll match that number with you at pickup.</p>
    <p style="margin:0 0 8px;"><a href="${urlH}" style="color:#0d6efd;">View your order summary</a></p>
    <p style="margin:24px 0 0;font-size:14px;color:#555;">Questions? Call or text <a href="tel:+19797033827" style="color:#0d6efd;">979-703-3827</a>.</p>
    <p style="margin:16px 0 0;font-size:14px;color:#888;">— Mr. K&apos;s Filipino Kitchen</p>
    ${buildCustomerReplyFooterHtml()}
    </div>
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
