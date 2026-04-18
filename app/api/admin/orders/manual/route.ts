import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-auth";
import { generateOrderNumber } from "@/lib/orderNumber";
import { computeOrderMonetaryTotals } from "@/lib/order-totals";
import type { OrderItemLine } from "@/lib/order-types";
import { cartHasOnlyFlanItems } from "@/lib/menu-cook-capacity";
import {
  getKitchenSlotsForDate,
  isPickupYmdAllowedForOrderCart,
} from "@/lib/kitchen-schedule";
import {
  isWellFormedPickupYMD,
  pickupDateRejectedMessage,
} from "@/lib/pickup-lead-time";
import { wouldExceedCapacityForPickupWeekWithTx } from "@/lib/capacity-service";
import {
  assertPickupSlotFreeInTx,
  PickupSlotTakenError,
} from "@/lib/pickup-slot-holds";
import {
  hasValidPhoneDigits,
  isValidEmail,
} from "@/lib/checkout-contact-validation";
import { sanitizeExtraDipOrderLines } from "@/lib/extra-dip-sauce";
import {
  ORDER_STATUS_CONFIRMED,
  ORDER_STATUS_PENDING_PAYMENT_VERIFICATION,
  PAYMENT_METHOD_MANUAL_OFFSITE,
  PAYMENT_METHOD_VERIFIED_LABEL,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_VERIFIED,
} from "@/lib/order-payment";
import { syncOrderToSheets } from "@/lib/sheets";
import { createPickupEvent } from "@/lib/googleCalendar";
import { sendOwnerSms } from "@/lib/twilio";

class CapacityExceededError extends Error {
  constructor() {
    super("Capacity exceeded");
    this.name = "CapacityExceededError";
  }
}

async function safeManualSoldOutWeekStart(
  tx: Prisma.TransactionClient
): Promise<string | null> {
  try {
    const settings = await tx.kitchenCapacitySettings.findUnique({
      where: { id: "default" },
    });
    return settings?.manualSoldOutWeekStart ?? null;
  } catch {
    return null;
  }
}

function normalizeManualItems(raw: unknown): OrderItemLine[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: OrderItemLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") return null;
    const o = row as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const qty = Math.floor(Number(o.quantity));
    const unitPrice = Number(o.unitPrice);
    if (!name || !Number.isFinite(qty) || qty < 1 || !Number.isFinite(unitPrice)) {
      return null;
    }
    const line: OrderItemLine = {
      name,
      quantity: qty,
      unitPrice: Math.round(unitPrice * 100) / 100,
    };
    if (typeof o.size === "string" && o.size.trim()) line.size = o.size.trim();
    if (typeof o.sizeKey === "string" && o.sizeKey.trim())
      line.sizeKey = o.sizeKey.trim();
    if (typeof o.cookedOrFrozen === "string" && o.cookedOrFrozen.trim())
      line.cookedOrFrozen = o.cookedOrFrozen.trim();
    if (typeof o.menuItemId === "string" && o.menuItemId.trim())
      line.menuItemId = o.menuItemId.trim();
    if (o.isSample === true) line.isSample = true;
    if (typeof o.category === "string" && o.category.trim())
      line.category = o.category.trim();
    out.push(line);
  }
  return out;
}

/** Admin-only: record a walk-in / phone sale so capacity, slots, and books match website orders. */
export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = parsed as {
    customerName?: string;
    phone?: string;
    email?: string;
    items?: unknown;
    pickupDate?: string;
    pickupTime?: string;
    wantsUtensils?: boolean;
    utensilSets?: number;
    notes?: string | null;
    markPaid?: boolean;
    isDemo?: boolean;
    notifyOwnerSms?: boolean;
  };

  const customerName = (body.customerName ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const email = (body.email ?? "").trim();
  const rawItems = normalizeManualItems(body.items);
  if (!customerName || !phone || !email || !rawItems) {
    return NextResponse.json(
      {
        error:
          "Missing customer, phone, email, or items. Each line needs name, quantity (≥1), and unitPrice.",
      },
      { status: 400 }
    );
  }

  const dipSanitized = sanitizeExtraDipOrderLines(rawItems);
  if (dipSanitized.error) {
    return NextResponse.json({ error: dipSanitized.error }, { status: 400 });
  }
  const items = dipSanitized.items;
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }
  if (!hasValidPhoneDigits(phone)) {
    return NextResponse.json(
      { error: "Enter a phone number with at least 10 digits." },
      { status: 400 }
    );
  }

  const pickupDate = (body.pickupDate ?? "").trim();
  const pickupTime = (body.pickupTime ?? "").trim();
  if (!pickupDate || !pickupTime) {
    return NextResponse.json(
      { error: "Pickup date and time required." },
      { status: 400 }
    );
  }
  if (!isWellFormedPickupYMD(pickupDate)) {
    return NextResponse.json(
      { error: pickupDateRejectedMessage() },
      { status: 400 }
    );
  }

  const isDemo = Boolean(body.isDemo);
  const markPaid = body.markPaid !== false;
  const cartFlanOnly = cartHasOnlyFlanItems(items);
  if (!isPickupYmdAllowedForOrderCart(pickupDate, cartFlanOnly, new Date())) {
    return NextResponse.json(
      { error: pickupDateRejectedMessage() },
      { status: 400 }
    );
  }

  const slotList = await getKitchenSlotsForDate(pickupDate, cartFlanOnly);
  if (!slotList.includes(pickupTime.trim())) {
    return NextResponse.json(
      {
        error:
          "That pickup time is not valid for the chosen date. Pick a slot from the list for that day.",
      },
      { status: 400 }
    );
  }

  const wantsUtensils = Boolean(body.wantsUtensils);
  const utensilSets = Number(body.utensilSets) || 0;
  const { ut, sets, sub, tax, total } = computeOrderMonetaryTotals(
    items,
    wantsUtensils,
    utensilSets
  );

  let orderNumber: string;
  try {
    orderNumber = await generateOrderNumber();
  } catch (e) {
    console.error("[admin/manual-order] generateOrderNumber:", e);
    return NextResponse.json(
      {
        error:
          "Could not allocate an order number. Run npx prisma migrate deploy and ensure OrderCounter exists.",
      },
      { status: 503 }
    );
  }

  const noteParts = [(body.notes ?? "").trim(), "[Off-site / admin entry]"]
    .filter(Boolean)
    .join("\n\n");
  const baseNotes = noteParts || null;

  const status = markPaid
    ? ORDER_STATUS_CONFIRMED
    : ORDER_STATUS_PENDING_PAYMENT_VERIFICATION;
  const paymentMethod = markPaid
    ? PAYMENT_METHOD_VERIFIED_LABEL
    : PAYMENT_METHOD_MANUAL_OFFSITE;
  const paymentStatus = markPaid ? PAYMENT_STATUS_VERIFIED : PAYMENT_STATUS_PENDING;

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      if (!isDemo) {
        const manualSoldOutWeekStart = await safeManualSoldOutWeekStart(tx);
        const cap = await wouldExceedCapacityForPickupWeekWithTx(
          tx,
          pickupDate,
          items,
          { manualSoldOutWeekStart }
        );
        if (!cap.ok) throw new CapacityExceededError();
        await assertPickupSlotFreeInTx(tx, pickupDate, pickupTime);
      }

      return tx.order.create({
        data: {
          orderNumber,
          customerName,
          phone,
          email,
          items: JSON.stringify(items),
          subtotal: sub,
          tax,
          total,
          pickupDate,
          pickupTime,
          wantsUtensils,
          utensilSets: sets,
          utensilCharge: ut,
          wantsRecurring: false,
          customInquiry: null,
          subscribeUpdates: false,
          notes: baseNotes,
          status,
          paymentMethod,
          paymentStatus,
          isDemo,
          manualEntry: true,
        } as Prisma.OrderCreateInput,
      });
    });
  } catch (e) {
    if (e instanceof PickupSlotTakenError) {
      return NextResponse.json(
        {
          error:
            "That pickup time is already taken. Choose another slot or date.",
        },
        { status: 409 }
      );
    }
    if (e instanceof CapacityExceededError) {
      return NextResponse.json(
        {
          error:
            "That pickup week cannot take this kitchen load — choose another open date or reduce items.",
        },
        { status: 409 }
      );
    }
    throw e;
  }

  if (!isDemo) {
    await syncOrderToSheets({
      orderNumber,
      createdAt: order.createdAt.toISOString(),
      customerName,
      phone,
      email,
      items,
      utensilSets: sets,
      utensilCharge: ut,
      subtotal: sub,
      tax,
      total,
      pickupDate,
      pickupTime,
      notes: baseNotes ?? undefined,
      customInquiry: undefined,
      wantsPrintedReceipt: false,
      status,
      paymentMethod,
      paymentStatus,
      orderStatus: status,
    });
  }

  if (markPaid && !isDemo) {
    void createPickupEvent(order);
  }

  if (body.notifyOwnerSms && !isDemo) {
    const sms = [
      `📝 MANUAL ORDER #${orderNumber}`,
      `Customer: ${customerName} | ${phone}`,
      `Total: $${total.toFixed(2)}`,
      `Pickup: ${pickupDate} @ ${pickupTime}`,
      `Source: ${PAYMENT_METHOD_MANUAL_OFFSITE}`,
    ].join("\n");
    await sendOwnerSms(sms);
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/finances");
  revalidatePath("/admin/orders/manual");

  return NextResponse.json({
    ok: true,
    orderNumber: order.orderNumber,
    orderId: order.id,
    total: order.total,
    status: order.status,
  });
}
