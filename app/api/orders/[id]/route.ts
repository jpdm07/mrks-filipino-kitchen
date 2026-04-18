import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { OrderItemLine } from "@/lib/order-types";
import { verifyAdminToken, getAdminTokenFromRequest } from "@/lib/admin-auth";
import { toAdminOrderClientRow } from "@/lib/admin-order-client";
import { sendCustomerPaymentConfirmedEmail } from "@/lib/send-customer-payment-confirmed-email";
import { sendCustomerReceiptEmail } from "@/lib/send-customer-receipt-email";
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
  PAYMENT_STATUS_PARTIALLY_REFUNDED,
  PAYMENT_STATUS_REFUNDED,
  PAYMENT_STATUS_VERIFIED,
} from "@/lib/order-payment";
import { computeOrderRefund } from "@/lib/apply-order-refund";
import {
  parseRefundLog,
  stringifyRefundLog,
  type RefundLedgerEntry,
} from "@/lib/refund-log";
import {
  buildRefundSmsCustomer,
  buildRefundSmsOwner,
  sendCustomerRefundConfirmationEmail,
  sendOwnerRefundConfirmationEmail,
} from "@/lib/send-refund-confirmation";

function venmoDisplay(): string {
  return process.env.NEXT_PUBLIC_VENMO_HANDLE ?? "@jpdm07";
}

/** Dashboard + finances read orders from DB; invalidate after admin mutations. */
function revalidateAdminOrderViews() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/finances");
}

const REFUND_SENT_VIA = new Set(["venmo", "zelle", "cash", "other"]);

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
    isDemo?: boolean;
    refund?: {
      lineDecrements: { index: number; qty: number }[];
      decreaseUtensilSetsBy?: number;
      sentVia: string;
      customerNote?: string | null;
      notifyCustomerEmail?: boolean;
      notifyCustomerSms?: boolean;
      notifyOwnerEmail?: boolean;
      notifyOwnerSms?: boolean;
      revertPaymentVerification?: boolean;
      internalNote?: string | null;
    };
  };
  if (
    body.paymentAction != null &&
    body.paymentAction !== "verify" &&
    body.paymentAction !== "not_received"
  ) {
    return NextResponse.json({ error: "Invalid payment action" }, { status: 400 });
  }
  if (body.refund != null && body.paymentAction != null) {
    return NextResponse.json(
      { error: "Do not combine refund with payment verify in one request." },
      { status: 400 }
    );
  }
  const order = await prisma.order.findFirst({
    where: { OR: [{ orderNumber: id }, { id }] },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.refund != null) {
    const r = body.refund;
    if (!REFUND_SENT_VIA.has(r.sentVia)) {
      return NextResponse.json({ error: "Invalid refund sentVia." }, { status: 400 });
    }
    const items = parseItems(order.items);
    const decBy = Math.max(0, Math.floor(Number(r.decreaseUtensilSetsBy) || 0));
    const lineDecrements = Array.isArray(r.lineDecrements) ? r.lineDecrements : [];
    const computed = computeOrderRefund(
      items,
      order.wantsUtensils,
      order.utensilSets,
      order.total,
      lineDecrements,
      decBy
    );
    if (!computed.ok) {
      return NextResponse.json({ error: computed.error }, { status: 400 });
    }

    const priorTotal = order.total;
    const ledgerEntry: RefundLedgerEntry = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `rf-${Date.now()}`,
      at: new Date().toISOString(),
      sentVia: r.sentVia as RefundLedgerEntry["sentVia"],
      refundTotalUsd: computed.refundTotalUsd,
      priorTotalUsd: priorTotal,
      newTotalUsd: computed.total,
      lineChanges: computed.lineChanges,
      utensilSetsBefore: order.utensilSets,
      utensilSetsAfter: computed.utensilSets,
      utensilRefundUsd: computed.utensilRefundUsd,
      customerNote: r.customerNote?.trim() || undefined,
    };

    const prevLog = parseRefundLog(order.refundLog ?? null);
    const refundLog = stringifyRefundLog([...prevLog, ledgerEntry]);

    const auditLine = `[${ledgerEntry.at}] Refund $${computed.refundTotalUsd.toFixed(2)} via ${r.sentVia}${r.internalNote?.trim() ? ` — ${r.internalNote.trim()}` : ""}`;
    const adminNotesNext = order.adminNotes?.trim()
      ? `${order.adminNotes.trim()}\n${auditLine}`
      : auditLine;

    let nextStatus = order.status;
    let nextPaymentStatus = order.paymentStatus ?? "";
    let nextPaymentMethod = order.paymentMethod ?? "";

    if (computed.total <= 0.005) {
      nextStatus = "Cancelled";
      nextPaymentStatus = PAYMENT_STATUS_REFUNDED;
    } else if (r.revertPaymentVerification) {
      nextStatus = ORDER_STATUS_AWAITING_PAYMENT;
      nextPaymentStatus = PAYMENT_STATUS_NOT_RECEIVED;
      nextPaymentMethod = PAYMENT_METHOD_UNVERIFIED;
    } else if (order.paymentStatus === PAYMENT_STATUS_VERIFIED) {
      nextPaymentStatus = PAYMENT_STATUS_PARTIALLY_REFUNDED;
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        items: JSON.stringify(computed.newItems),
        subtotal: computed.subtotal,
        tax: computed.tax,
        total: computed.total,
        wantsUtensils: computed.wantsUtensils,
        utensilSets: computed.utensilSets,
        utensilCharge: computed.utensilCharge,
        refundLog,
        adminNotes: adminNotesNext,
        status: nextStatus,
        paymentStatus: nextPaymentStatus,
        paymentMethod: nextPaymentMethod,
      },
    });

    await syncOrderStatusToSheets({
      orderNumber: updated.orderNumber,
      orderStatus: updated.status,
      paymentStatus: updated.paymentStatus ?? "",
      paymentMethod: updated.paymentMethod ?? "",
    });

    const notifyCE = r.notifyCustomerEmail !== false;
    const notifyCS = r.notifyCustomerSms !== false;
    const notifyOE = r.notifyOwnerEmail !== false;
    const notifyOS = r.notifyOwnerSms !== false;

    if (notifyCE) {
      const res = await sendCustomerRefundConfirmationEmail({
        order: updated,
        entry: ledgerEntry,
      });
      if (!res.ok) {
        console.warn("[Orders PATCH refund] Customer refund email:", res.error);
      }
    }
    if (notifyOE) {
      const res = await sendOwnerRefundConfirmationEmail({
        order: updated,
        entry: ledgerEntry,
      });
      if (!res.ok) {
        console.warn("[Orders PATCH refund] Owner refund email:", res.error);
      }
    }
    if (notifyCS) {
      await sendCustomerSms(
        updated.phone,
        buildRefundSmsCustomer(updated.customerName, updated.orderNumber, ledgerEntry)
      ).catch(() => {});
    }
    if (notifyOS) {
      await sendOwnerSms(
        buildRefundSmsOwner(updated.orderNumber, ledgerEntry, updated.customerName)
      );
    }

    if (nextStatus.toLowerCase().includes("cancel")) {
      void updatePickupEvent(updated.orderNumber, "Cancelled");
    }

    revalidateAdminOrderViews();
    return NextResponse.json(updated);
  }

  const data: Prisma.OrderUpdateInput = {};

  if (body.adminNotes !== undefined) {
    data.adminNotes = body.adminNotes;
  }

  if (body.isDemo !== undefined) {
    data.isDemo = Boolean(body.isDemo);
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

    const receiptRow = toAdminOrderClientRow(updated, "");
    const [receiptEmailResult, paymentConfirmedEmailResult] =
      await Promise.all([
        sendCustomerReceiptEmail(receiptRow),
        sendCustomerPaymentConfirmedEmail(updated),
      ]);
    if (!receiptEmailResult.ok) {
      console.warn(
        "[Orders PATCH verify] Customer receipt email skipped or failed:",
        receiptEmailResult.error
      );
    }
    if (!paymentConfirmedEmailResult.ok) {
      console.warn(
        "[Orders PATCH verify] Customer payment-confirmed email skipped or failed:",
        paymentConfirmedEmailResult.error
      );
    }

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

  revalidateAdminOrderViews();
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getAdminTokenFromRequest(req.headers.get("cookie"));
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = params;
  const order = await prisma.order.findFirst({
    where: { OR: [{ orderNumber: id }, { id }] },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.order.delete({ where: { id: order.id } });
  void updatePickupEvent(order.orderNumber, "Cancelled");
  revalidateAdminOrderViews();
  return NextResponse.json({ ok: true });
}
