import type { AdminOrderClientRow } from "@/lib/admin-order-client";
import {
  buildAdminReceiptEmailHtml,
  buildAdminReceiptPlainText,
} from "@/lib/admin-receipt-html";
import {
  buildCustomerReplyFooterHtml,
  buildCustomerReplyFooterPlainText,
} from "@/lib/mail-reply-routing";
import { sendMail, type MailSendResult } from "@/lib/mailer";

export async function sendCustomerReceiptEmail(
  order: AdminOrderClientRow
): Promise<MailSendResult> {
  const to = order.email?.trim();
  if (!to) {
    return {
      ok: false,
      error: "This order has no customer email on file, so nothing can be sent.",
    };
  }

  const bcc = process.env.RECEIPT_EMAIL_BCC?.trim();
  const footerHtml = buildCustomerReplyFooterHtml();
  const baseHtml = buildAdminReceiptEmailHtml(order);
  const html = footerHtml
    ? baseHtml.replace("</body>", `${footerHtml}</body>`)
    : baseHtml;

  return sendMail({
    to,
    subject: `Receipt #${order.orderNumber} — Mr. K's Filipino Kitchen`,
    html,
    text: buildAdminReceiptPlainText(order) + buildCustomerReplyFooterPlainText(),
    bcc: bcc || undefined,
  });
}
