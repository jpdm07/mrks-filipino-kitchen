import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { sendCustomerOrderPlacedEmail } from "@/lib/send-customer-order-placed-email";

const MANUAL_PLACEHOLDER_EMAIL = "manual-order@placeholder.invalid";

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

  const to = order.email?.trim();
  if (!to || to === MANUAL_PLACEHOLDER_EMAIL) {
    return NextResponse.json(
      {
        error:
          "This manual order does not have a real customer email address on file.",
      },
      { status: 400 }
    );
  }

  const result = await sendCustomerOrderPlacedEmail({
    customerName: order.customerName,
    email: to,
    orderNumber: order.orderNumber,
    pickupDate: order.pickupDate ?? null,
    pickupTime: order.pickupTime ?? null,
    total: order.total,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    success: true,
    emailedTo: to,
    message:
      "Order confirmation email sent. Check spam/junk if it doesn’t arrive.",
  });
}

