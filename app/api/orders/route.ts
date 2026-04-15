import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PRICING } from "@/lib/config";
import { generateOrderNumber } from "@/lib/orderNumber";
import { sendOwnerSms } from "@/lib/twilio";
import { sendNewOrderEmailToOwner } from "@/lib/order-owner-email";
import { syncOrderToSheets } from "@/lib/sheets";
import type { OrderItemLine } from "@/lib/order-types";
import { isDatabaseUnavailableError, isPrismaEngineError } from "@/lib/safe-db";
import {
  isPickupYmdAllowed,
  isWellFormedPickupYMD,
  pickupDateRejectedMessage,
} from "@/lib/pickup-lead-time";
import {
  isPickupDateOpenInDb,
  isPickupSlotValidForDate,
} from "@/lib/availability-server";
import {
  ORDER_STATUS_PENDING_PAYMENT_VERIFICATION,
  PAYMENT_METHOD_UNVERIFIED,
  PAYMENT_STATUS_PENDING,
} from "@/lib/order-payment";
import {
  assertPickupSlotFreeInTx,
  PickupSlotTakenError,
} from "@/lib/pickup-slot-holds";

function computeTotals(
  items: OrderItemLine[],
  wantsUtensils: boolean,
  utensilSets: number
) {
  const itemsSub = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const sets = wantsUtensils ? Math.max(0, Math.min(50, utensilSets)) : 0;
  const ut = wantsUtensils && sets > 0 ? sets * PRICING.UTENSIL_PER_SET : 0;
  const sub = Math.round((itemsSub + ut) * 100) / 100;
  const tax = Math.round(sub * PRICING.TAX_RATE * 100) / 100;
  const total = Math.round((sub + tax) * 100) / 100;
  return { itemsSub, ut, sets, sub, tax, total };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      customerName?: string;
      phone?: string;
      email?: string;
      items?: OrderItemLine[];
      wantsUtensils?: boolean;
      utensilSets?: number;
      pickupDate?: string;
      pickupTime?: string;
      notes?: string;
      wantsRecurring?: boolean;
      customInquiry?: string | null;
      subscribeUpdates?: boolean;
      /** Honored only when ALLOW_DEMO_ORDERS_AT_CHECKOUT=true on the server. */
      isDemo?: boolean;
    };

    const allowDemoCheckout =
      process.env.ALLOW_DEMO_ORDERS_AT_CHECKOUT === "true";
    const isDemo = allowDemoCheckout && body.isDemo === true;

    const customerName = (body.customerName ?? "").trim();
    const phone = (body.phone ?? "").trim();
    const email = (body.email ?? "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!customerName || !phone || !email || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields or empty cart" },
        { status: 400 }
      );
    }

    const pickupDate = (body.pickupDate ?? "").trim();
    const pickupTime = (body.pickupTime ?? "").trim();
    if (!pickupDate || !pickupTime) {
      return NextResponse.json(
        { error: "Pickup date and time required" },
        { status: 400 }
      );
    }
    if (!isWellFormedPickupYMD(pickupDate)) {
      return NextResponse.json(
        { error: pickupDateRejectedMessage() },
        { status: 400 }
      );
    }
    if (!isPickupYmdAllowed(pickupDate, new Date())) {
      return NextResponse.json(
        { error: pickupDateRejectedMessage() },
        { status: 400 }
      );
    }
    if (!(await isPickupDateOpenInDb(pickupDate))) {
      return NextResponse.json(
        {
          error:
            "Sorry, that pickup date is no longer available. Please go back and select a different date.",
        },
        { status: 400 }
      );
    }
    if (!(await isPickupSlotValidForDate(pickupDate, pickupTime))) {
      return NextResponse.json(
        {
          error:
            "That pickup time is not available for the date you chose. Please go back and pick another time.",
        },
        { status: 400 }
      );
    }

    const wantsUtensils = Boolean(body.wantsUtensils);
    const utensilSets = Number(body.utensilSets) || 0;
    const { ut, sets, sub, tax, total } = computeTotals(
      items,
      wantsUtensils,
      utensilSets
    );

    const orderNumber = await generateOrderNumber();

    const status = ORDER_STATUS_PENDING_PAYMENT_VERIFICATION;
    const paymentMethod = PAYMENT_METHOD_UNVERIFIED;
    const paymentStatus = PAYMENT_STATUS_PENDING;

    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        if (!isDemo) {
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
            notes: (body.notes ?? "").trim() || null,
            wantsUtensils,
            utensilSets: sets,
            utensilCharge: ut,
            wantsRecurring: Boolean(body.wantsRecurring),
            customInquiry: (body.customInquiry ?? "").trim() || null,
            subscribeUpdates: Boolean(body.subscribeUpdates),
            status,
            paymentMethod,
            paymentStatus,
            isDemo,
          },
        });
      });
    } catch (e) {
      if (e instanceof PickupSlotTakenError) {
        return NextResponse.json(
          {
            error:
              "That pickup time was just taken. Please choose another time on the checkout page.",
          },
          { status: 409 }
        );
      }
      throw e;
    }

    const ownerSms = [
      `${isDemo ? "🧪 DEMO " : ""}🍽️ NEW ORDER #${orderNumber}`,
      `Customer: ${customerName} | ${phone}`,
      `Total: $${total.toFixed(2)}`,
      `Pickup: ${pickupDate} @ ${pickupTime}`,
      ``,
      `Customer was told to put order #${orderNumber} in Venmo/Zelle memo when paying.`,
      `Verify payment, then confirm in admin.`,
    ].join("\n");
    const ownerSmsSent = await sendOwnerSms(ownerSms);

    const ownerEmailSent = await sendNewOrderEmailToOwner({
      orderNumber,
      customerName,
      phone,
      email,
      items,
      subtotal: sub,
      tax,
      total,
      pickupDate,
      pickupTime,
      notes: (body.notes ?? "").trim() || null,
      wantsUtensils,
      utensilSets: sets,
      utensilCharge: ut,
      wantsRecurring: Boolean(body.wantsRecurring),
      customInquiry: (body.customInquiry ?? "").trim() || null,
      subscribeUpdates: Boolean(body.subscribeUpdates),
      isDemo,
    });

    if (!ownerEmailSent) {
      console.warn(
        "[orders] Order saved but owner notification email was not sent. Set Production env EMAIL_USER + EMAIL_PASSWORD (Yahoo app password). Response JSON includes ownerEmailSent for debugging."
      );
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
        wantsRecurring: Boolean(body.wantsRecurring),
        notes: body.notes,
        customInquiry: body.customInquiry ?? undefined,
        status,
        paymentMethod,
        paymentStatus,
        orderStatus: status,
      });
    } else {
      console.log(
        `[orders] Demo order #${orderNumber} — skipped Google Sheets sync`
      );
    }

    if (body.subscribeUpdates && !isDemo) {
      const em = email.toLowerCase();
      const existing = await prisma.subscriber.findUnique({
        where: { email: em },
      });
      if (!existing) {
        await prisma.subscriber.create({
          data: { email: em, name: customerName },
        });
      }
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      ownerSmsSent,
      ownerEmailSent,
    });
  } catch (e) {
    console.error(e);
    if (isDatabaseUnavailableError(e)) {
      const body: { error: string; devHint?: string } = {
        error:
          "We couldn't save your order right now. Please try again in a moment. If this keeps happening, call or text 979-703-3827 and we'll help you complete it.",
      };
      if (process.env.NODE_ENV === "development") {
        body.devHint = isPrismaEngineError(e)
          ? "Database / Prisma engine issue. Run npm run db:generate, then npx prisma db push. On Windows, try x64 Node.js or WSL2 if it still fails."
          : "Check DATABASE_URL, file permissions on the SQLite file, and that npx prisma db push completed.";
      }
      return NextResponse.json(body, { status: 503 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
