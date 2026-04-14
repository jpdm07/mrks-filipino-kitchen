import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { OrderItemLine } from "@/lib/order-types";
import { verifyAdminToken, getAdminTokenFromRequest } from "@/lib/admin-auth";
import { sendOwnerSms, sendCustomerSms } from "@/lib/twilio";
import { formatItemsForSms, formatSamplesForSms } from "@/lib/order-types";
import { syncOrderStatusToSheets } from "@/lib/sheets";
import { formatPickupDisplay } from "@/lib/format-pickup";
import { totalSauceCupsForItems } from "@/lib/menu-item-unit-costs";
import {
  createPickupEvent,
  updatePickupEvent,
} from "@/lib/googleCalendar";
import {
  ORDER_STATUS_AWAITING_PAYMENT,
  ORDER_STATUS_CONFIRMED,
  PAYMENT_METHOD_UNVERIFIED,
  PAYMENT_METHOD_VERIFIED_LABEL,
  PAYMENT_STATUS_NOT_RECEIVED,
  PAYMENT_STATUS_VERIFIED,
} from "@/lib/order-payment";

function venmoDisplay(): string {
  return process.env.NEXT_PUBLIC_VENMO_HANDLE ?? "@jpdm07";
}

function parseItems(raw: string): OrderItemLine[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as OrderItemLine[]) : [];
  } catch {
    return [];
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const order = await prisma.order.findFirst({
    where: { OR: [{ orderNumber: id }, { id }] },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    ...order,
    items: parseItems(order.items),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getAdminTokenFromRequest(req.headers.get("cookie"));
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = params;
  const body = (await req.json()) as {
    status?: string;
    adminNotes?: string;
    paymentAction?: "verify" | "not_received";
  };
  if (
    body.paymentAction != null &&
    body.paymentAction !== "verify" &&
    body.paymentAction !== "not_received"
  ) {
    return NextResponse.json({ error: "Invalid payment action" }, { status: 400 });
  }
  const order = await prisma.order.findFirst({
    where: { OR: [{ orderNumber: id }, { id }] },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Prisma.OrderUpdateInput = {};

  if (body.adminNotes !== undefined) {
    data.adminNotes = body.adminNotes;
  }

  if (body.paymentAction === "verify") {
    data.status = ORDER_STATUS_CONFIRMED;
    data.paymentMethod = PAYMENT_METHOD_VERIFIED_LABEL;
    data.paymentStatus = PAYMENT_STATUS_VERIFIED;
  } else if (body.paymentAction === "not_received") {
    data.status = ORDER_STATUS_AWAITING_PAYMENT;
    data.paymentStatus = PAYMENT_STATUS_NOT_RECEIVED;
    data.paymentMethod =
      order.paymentMethod && order.paymentMethod !== PAYMENT_METHOD_VERIFIED_LABEL
        ? order.paymentMethod
        : PAYMENT_METHOD_UNVERIFIED;
  } else if (body.status !== undefined) {
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data,
  });

  const shouldSyncSheets =
    body.paymentAction === "verify" ||
    body.paymentAction === "not_received" ||
    body.status !== undefined;

  if (shouldSyncSheets) {
    await syncOrderStatusToSheets({
      orderNumber: updated.orderNumber,
      orderStatus: updated.status,
      paymentStatus: updated.paymentStatus ?? "",
      paymentMethod: updated.paymentMethod ?? "",
    });
  }

  if (body.paymentAction === "verify") {
    const pd = updated.pickupDate ?? "";
    const pt = updated.pickupTime ?? "";
    const msg = `✅ Hi ${updated.customerName}! Mr. K has confirmed your payment. Your order #${updated.orderNumber} is confirmed for pickup on ${pd} around ${pt}. We'll see you then! Questions? Call or text 979-703-3827.`;
    await sendCustomerSms(updated.phone, msg).catch(() => {});

    const lines = parseItems(updated.items);
    const sauceTotal = totalSauceCupsForItems(lines);
    const itemLines = lines.map((i) => {
      const lt = (i.quantity * i.unitPrice).toFixed(2);
      return `${i.name} ×${i.quantity} — $${lt}`;
    });
    const ut =
      updated.utensilSets > 0
        ? `${updated.utensilSets} sets — $${updated.utensilCharge.toFixed(2)}`
        : "None";
    const ownerConfirm = [
      `✅ CONFIRMED ORDER #${updated.orderNumber}`,
      `Customer: ${updated.customerName}`,
      `Phone: ${updated.phone}`,
      "",
      "Items:",
      ...itemLines,
      "",
      `Sauce cups to pack: ${sauceTotal}`,
      "",
      `Utensils: ${ut}`,
      `Subtotal: $${updated.subtotal.toFixed(2)}`,
      `Tax: $${updated.tax.toFixed(2)}`,
      `TOTAL: $${updated.total.toFixed(2)}`,
      "",
      `📅 Pickup: ${formatPickupDisplay(pd, pt)}`,
      `💰 Payment: Verified`,
      "",
      `Notes: ${updated.notes?.trim() || "None"}`,
    ].join("\n");
    await sendOwnerSms(ownerConfirm);
    void createPickupEvent(updated);
  }

  if (body.paymentAction === "not_received") {
    const msg = `Hi ${updated.customerName}, we haven't received your payment yet for order #${updated.orderNumber}. Total due: $${updated.total.toFixed(2)}. Please send to Zelle: 979-703-3827 or Venmo: ${venmoDisplay()}. Questions? Call or text 979-703-3827.`;
    await sendCustomerSms(updated.phone, msg).catch(() => {});
  }

  if (
    body.status !== undefined &&
    body.paymentAction == null &&
    updated.status.toLowerCase().includes("cancel")
  ) {
    void updatePickupEvent(updated.orderNumber, "Cancelled");
  }

  return NextResponse.json(updated);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getAdminTokenFromRequest(req.headers.get("cookie"));
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = params;
  const action = req.nextUrl.searchParams.get("action");
  if (action !== "resend-sms") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const order = await prisma.order.findFirst({
    where: { OR: [{ orderNumber: id }, { id }] },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const items = parseItems(order.items);
  const itemsSms = formatItemsForSms(items);
  const samplesSms = formatSamplesForSms(items);
  const lines = [
    `🍽️ ORDER #${order.orderNumber} (resent)`,
    `Customer: ${order.customerName} | ${order.phone}`,
    `Items: ${itemsSms}`,
  ];
  if (samplesSms) lines.push(`Samples: ${samplesSms}`);
  lines.push(
    `Utensils: ${order.utensilSets > 0 ? `${order.utensilSets} sets ($${order.utensilCharge.toFixed(2)})` : "None"}`,
    `Total: $${order.total.toFixed(2)}`,
    order.pickupDate && order.pickupTime
      ? `Pickup pref: ${order.pickupDate} @ ${order.pickupTime}`
      : "",
    order.notes ? `Notes: ${order.notes.slice(0, 200)}` : ""
  );
  const sent = await sendOwnerSms(lines.filter(Boolean).join("\n"));
  return NextResponse.json({ ok: true, ownerSmsSent: sent });
}
