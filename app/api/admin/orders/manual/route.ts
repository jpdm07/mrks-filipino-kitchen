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

/** When admin leaves contact blank, DB + Sheets still need values; clearly labeled placeholders. */
const MANUAL_PLACEHOLDER_CUSTOMER = "Customer (unspecified)";
const MANUAL_PLACEHOLDER_PHONE = "0000000000";
const MANUAL_PLACEHOLDER_EMAIL = "manual-order@placeholder.invalid";

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
    if (o.adoboProtein === "chicken" || o.adoboProtein === "pork") {
      line.adoboProtein = o.adoboProtein;
    }
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

  const customerNameIn = (body.customerName ?? "").trim();
  const phoneIn = (body.phone ?? "").trim();
  const emailIn = (body.email ?? "").trim();
  const rawItems = normalizeManualItems(body.items);
  if (!rawItems) {
    return NextResponse.json(
      {
        error:
          "Add at least one line item with name, quantity (≥1), and unit price.",
      },
      { status: 400 }
    );
  }

  const dipSanitized = sanitizeExtraDipOrderLines(rawItems);
  if (dipSanitized.error) {
    return NextResponse.json({ error: dipSanitized.error }, { status: 400 });
  }
  const items = dipSanitized.items;

  const customerName = customerNameIn || MANUAL_PLACEHOLDER_CUSTOMER;
  const phone = phoneIn || MANUAL_PLACEHOLDER_PHONE;
  const email = emailIn || MANUAL_PLACEHOLDER_EMAIL;
  if (emailIn && !isValidEmail(emailIn)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }
  if (phoneIn && !hasValidPhoneDigits(phoneIn)) {
    return NextResponse.json(
      { error: "Enter a phone number with at least 10 digits." },
      { status: 400 }
    );
  }

  const pickupDateRaw = (body.pickupDate ?? "").trim();
  const pickupTimeRaw = (body.pickupTime ?? "").trim();
  const hasPickupDate = pickupDateRaw.length > 0;
  const hasPickupTime = pickupTimeRaw.length > 0;
  const scheduleComplete = hasPickupDate && hasPickupTime;

  const isDemo = Boolean(body.isDemo);
  const markPaid = body.markPaid !== false;
  const cartFlanOnly = cartHasOnlyFlanItems(items);

  if (hasPickupDate) {
    if (!isWellFormedPickupYMD(pickupDateRaw)) {
      return NextResponse.json(
        { error: pickupDateRejectedMessage() },
        { status: 400 }
      );
    }
    if (!isPickupYmdAllowedForOrderCart(pickupDateRaw, cartFlanOnly, new Date())) {
      return NextResponse.json(
        { error: pickupDateRejectedMessage() },
        { status: 400 }
      );
    }
  }

  if (scheduleComplete) {
    const slotList = await getKitchenSlotsForDate(pickupDateRaw, cartFlanOnly);
    if (!slotList.includes(pickupTimeRaw)) {
      return NextResponse.json(
        {
          error:
            "That pickup time is not valid for the chosen date. Pick a slot from the list for that day.",
        },
        { status: 400 }
      );
    }
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
          "Could not allocate an order number. Run npm run db:migrate (production DATABASE_URL in .env.local) and ensure OrderCounter exists.",
      },
      { status: 503 }
    );
  }

  const scheduleIncompleteNote = scheduleComplete
    ? ""
    : hasPickupDate || hasPickupTime
      ? "[Pickup incomplete — confirm date & slot when ready]"
      : "[Pickup date/time not set — add later in admin]";

  const noteParts = [
    (body.notes ?? "").trim(),
    scheduleIncompleteNote,
    "[Off-site / admin entry]",
  ]
    .filter(Boolean)
    .join("\n\n");
  const baseNotes = noteParts || null;

  const pickupDate = hasPickupDate ? pickupDateRaw : null;
  const pickupTime = hasPickupTime ? pickupTimeRaw : null;

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
      if (!isDemo && hasPickupDate) {
        const manualSoldOutWeekStart = await safeManualSoldOutWeekStart(tx);
        const cap = await wouldExceedCapacityForPickupWeekWithTx(
          tx,
          pickupDateRaw,
          items,
          { manualSoldOutWeekStart }
        );
        if (!cap.ok) throw new CapacityExceededError();
      }
      if (!isDemo && scheduleComplete) {
        await assertPickupSlotFreeInTx(tx, pickupDateRaw, pickupTimeRaw);
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
      pickupDate: pickupDate ?? undefined,
      pickupTime: pickupTime ?? undefined,
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
      `Pickup: ${
        pickupDate && pickupTime
          ? `${pickupDate} @ ${pickupTime}`
          : pickupDate
            ? `${pickupDate} (time TBD)`
            : pickupTime
              ? `(date TBD) @ ${pickupTime}`
              : "TBD"
      }`,
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
