import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { toAdminOrderClientRow } from "@/lib/admin-order-client";
import { sendCustomerReceiptEmail } from "@/lib/send-customer-receipt-email";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = decodeURIComponent(params.id).trim();
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: raw }, { orderNumber: raw }] },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const row = toAdminOrderClientRow(order, "");
  const result = await sendCustomerReceiptEmail(row);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    success: true,
    emailedTo: row.email,
    message:
      "Receipt was sent to the customer email on this order. If you expected it in your own inbox, set RECEIPT_EMAIL_BCC in env or check the customer’s spam folder.",
  });
}
