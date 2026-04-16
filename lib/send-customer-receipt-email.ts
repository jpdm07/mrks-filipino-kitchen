import type { AdminOrderClientRow } from "@/lib/admin-order-client";
import {
  buildAdminReceiptEmailHtml,
  buildAdminReceiptPlainText,
} from "@/lib/admin-receipt-html";
import { sendMail } from "@/lib/mailer";

export async function sendCustomerReceiptEmail(
  order: AdminOrderClientRow
): Promise<boolean> {
  const to = order.email?.trim();
  if (!to) return false;

  return sendMail({
    to,
    subject: `Receipt #${order.orderNumber} — Mr. K's Filipino Kitchen`,
    html: buildAdminReceiptEmailHtml(order),
    text: buildAdminReceiptPlainText(order),
  });
}
