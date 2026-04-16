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
  const ok = await sendCustomerReceiptEmail(row);
  if (!ok) {
    return NextResponse.json(
      {
        error:
          "Could not send email. On the server, set RESEND_API_KEY + RESEND_FROM_EMAIL, or EMAIL_USER + EMAIL_PASSWORD (see Vercel → Environment Variables).",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, emailedTo: row.email });
}
