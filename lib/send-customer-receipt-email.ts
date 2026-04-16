import type { AdminOrderClientRow } from "@/lib/admin-order-client";
import {
  buildAdminReceiptEmailHtml,
  buildAdminReceiptPlainText,
} from "@/lib/admin-receipt-html";
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

  return sendMail({
    to,
    subject: `Receipt #${order.orderNumber} — Mr. K's Filipino Kitchen`,
    html: buildAdminReceiptEmailHtml(order),
    text: buildAdminReceiptPlainText(order),
    bcc: bcc || undefined,
  });
}
