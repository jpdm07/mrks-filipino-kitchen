import type { Order } from "@prisma/client";
import { buildEmailBrandBannerHtml } from "@/lib/email-brand-header";
import {
  buildCustomerReplyFooterHtml,
  buildCustomerReplyFooterPlainText,
} from "@/lib/mail-reply-routing";
import { getOwnerOrderNotificationEmail } from "@/lib/mail-env-status";
import { sendMail, type MailSendResult } from "@/lib/mailer";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import type { RefundLedgerEntry } from "@/lib/refund-log";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sentViaLabel(v: RefundLedgerEntry["sentVia"]): string {
  switch (v) {
    case "venmo":
      return "Venmo";
    case "zelle":
      return "Zelle";
    case "cash":
      return "Cash";
    default:
      return "Other";
  }
}

function refundBodyHtml(orderNumber: string, entry: RefundLedgerEntry): string {
  const lines = entry.lineChanges
    .map(
      (c) =>
        `<li>${escapeHtml(c.name)} — refunded ${c.qtyRemoved} × <strong>$${c.lineRefundUsd.toFixed(2)}</strong></li>`
    )
    .join("");
  const ut =
    entry.utensilRefundUsd > 0.005
      ? `<p class="mt-2">Utensils adjusted — <strong>$${entry.utensilRefundUsd.toFixed(2)}</strong> of prior utensil fees reversed.</p>`
      : "";
  const note = entry.customerNote?.trim()
    ? `<p class="mt-3"><strong>Note from the kitchen:</strong> ${escapeHtml(entry.customerNote.trim())}</p>`
    : "";
  return `
    <p>We recorded a refund of <strong>$${entry.refundTotalUsd.toFixed(2)}</strong> sent back via <strong>${sentViaLabel(entry.sentVia)}</strong> for order <strong>#${escapeHtml(orderNumber)}</strong>.</p>
    <ul class="mt-2 list-disc pl-5 text-sm">${lines || "<li>(utensils / fee adjustment only)</li>"}</ul>
    ${ut}
    <p class="mt-3">Your order&apos;s new balance is <strong>$${entry.newTotalUsd.toFixed(2)}</strong> (was $${entry.priorTotalUsd.toFixed(2)}).</p>
    ${note}
    <p class="mt-4 text-sm text-gray-600">If you have questions, reply to this email or call/text 979-703-3827.</p>
  `;
}

function refundBodyPlain(orderNumber: string, entry: RefundLedgerEntry): string {
  const parts = [
    `Refund recorded for order #${orderNumber}: $${entry.refundTotalUsd.toFixed(2)} via ${sentViaLabel(entry.sentVia)}.`,
    "",
    ...entry.lineChanges.map(
      (c) =>
        `- ${c.name}: refunded ${c.qtyRemoved} unit(s) ($${c.lineRefundUsd.toFixed(2)})`
    ),
  ];
  if (entry.utensilRefundUsd > 0.005) {
    parts.push("", `Utensil fee adjustment: $${entry.utensilRefundUsd.toFixed(2)}`);
  }
  parts.push(
    "",
    `New order balance: $${entry.newTotalUsd.toFixed(2)} (was $${entry.priorTotalUsd.toFixed(2)}).`
  );
  if (entry.customerNote?.trim()) {
    parts.push("", `Note: ${entry.customerNote.trim()}`);
  }
  parts.push("", "Questions? Reply to this email or call/text 979-703-3827.");
  return parts.filter(Boolean).join("\n");
}

export async function sendCustomerRefundConfirmationEmail(params: {
  order: Pick<Order, "customerName" | "email" | "orderNumber">;
  entry: RefundLedgerEntry;
}): Promise<MailSendResult> {
  const to = params.order.email?.trim();
  if (!to) {
    return { ok: false, error: "No customer email on file." };
  }
  const origin = getPublicSiteOrigin();
  const inner = refundBodyHtml(params.order.orderNumber, params.entry);
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,serif;color:#111;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
<tr><td style="padding:0;">${buildEmailBrandBannerHtml({ subtitle: "Refund confirmation" })}</td></tr>
<tr><td style="padding:20px;font-size:15px;line-height:1.5;">${inner}</td></tr>
<tr><td style="padding:0 20px 24px;">${buildCustomerReplyFooterHtml()}</td></tr>
</table>
<p style="margin:16px;font-size:11px;color:#888;text-align:center;"><a href="${escapeHtml(origin)}" style="color:#64748b;">${escapeHtml(origin)}</a></p>
</td></tr></table>
</body></html>`;
  const text = [
    `Refund confirmation — Mr. K's Filipino Kitchen`,
    "",
    refundBodyPlain(params.order.orderNumber, params.entry),
    "",
    buildCustomerReplyFooterPlainText(),
  ].join("\n");
  return sendMail({
    to,
    subject: `Refund $${params.entry.refundTotalUsd.toFixed(2)} — Order #${params.order.orderNumber}`,
    html,
    text,
  });
}

export async function sendOwnerRefundConfirmationEmail(params: {
  order: Pick<
    Order,
    | "orderNumber"
    | "customerName"
    | "email"
    | "phone"
    | "total"
    | "subtotal"
    | "tax"
  >;
  entry: RefundLedgerEntry;
}): Promise<MailSendResult> {
  const to = getOwnerOrderNotificationEmail();
  if (!to) {
    return { ok: false, error: "OWNER_ORDER_EMAIL / EMAIL_USER not set." };
  }
  const inner = `
    <p><strong>Refund recorded</strong> for order <strong>#${escapeHtml(params.order.orderNumber)}</strong></p>
    <p>Customer: ${escapeHtml(params.order.customerName)} · ${escapeHtml(params.order.phone)} · ${escapeHtml(params.order.email)}</p>
    <p>Refund: <strong>$${params.entry.refundTotalUsd.toFixed(2)}</strong> via ${sentViaLabel(params.entry.sentVia)} · New total <strong>$${params.entry.newTotalUsd.toFixed(2)}</strong></p>
    ${refundBodyHtml(params.order.orderNumber, params.entry)}
  `;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:16px;font-family:system-ui,sans-serif;font-size:14px;">
${buildEmailBrandBannerHtml({ subtitle: "Owner copy — refund" })}
<div style="max-width:560px;margin:0 auto;">${inner}</div>
</body></html>`;
  const text = [
    `OWNER COPY: Refund order #${params.order.orderNumber}`,
    refundBodyPlain(params.order.orderNumber, params.entry),
    "",
    `Customer: ${params.order.customerName} | ${params.order.phone} | ${params.order.email}`,
  ].join("\n");
  return sendMail({
    to,
    subject: `[Refund] #$${params.order.orderNumber} −$${params.entry.refundTotalUsd.toFixed(2)} (${sentViaLabel(params.entry.sentVia)})`,
    html,
    text,
  });
}

export function buildRefundSmsCustomer(
  customerName: string,
  orderNumber: string,
  entry: RefundLedgerEntry
): string {
  const first = customerName.split(/\s+/)[0] || customerName;
  return `Hi ${first}! We recorded a $${entry.refundTotalUsd.toFixed(2)} refund for order #${orderNumber} (sent via ${sentViaLabel(entry.sentVia)}). New balance: $${entry.newTotalUsd.toFixed(2)}. Mr. K's Filipino Kitchen — 979-703-3827`;
}

export function buildRefundSmsOwner(
  orderNumber: string,
  entry: RefundLedgerEntry,
  customerName: string
): string {
  return `💸 REFUND #$${orderNumber} −$${entry.refundTotalUsd.toFixed(2)} via ${sentViaLabel(entry.sentVia)} · ${customerName} · New total $${entry.newTotalUsd.toFixed(2)}`;
}
