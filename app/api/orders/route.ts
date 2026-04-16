import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PRICING } from "@/lib/config";
import { generateOrderNumber } from "@/lib/orderNumber";
import { sendOwnerSms } from "@/lib/twilio";
import { sendNewOrderEmailToOwner } from "@/lib/order-owner-email";
import { syncOrderToSheets } from "@/lib/sheets";
import type { OrderItemLine } from "@/lib/order-types";
import {
  isDatabaseUnavailableError,
  isPrismaEngineError,
  prismaDiagnosticCode,
} from "@/lib/safe-db";
import {
  isWellFormedPickupYMD,
  pickupDateRejectedMessage,
} from "@/lib/pickup-lead-time";
import {
  getKitchenSlotsForDate,
  isPickupYmdAllowedForOrderCart,
} from "@/lib/kitchen-schedule";
import { cartHasOnlyFlanItems } from "@/lib/menu-cook-capacity";
import {
  wouldExceedCapacityForPickupWeekWithTx,
} from "@/lib/capacity-service";
import {
  ORDER_STATUS_PENDING_PAYMENT_VERIFICATION,
  PAYMENT_METHOD_UNVERIFIED,
  PAYMENT_STATUS_PENDING,
} from "@/lib/order-payment";
import {
  assertPickupSlotFreeInTx,
  PickupSlotTakenError,
} from "@/lib/pickup-slot-holds";
import {
  hasValidPhoneDigits,
  isValidEmail,
} from "@/lib/checkout-contact-validation";

class CapacityExceededError extends Error {
  constructor() {
    super("Capacity exceeded");
    this.name = "CapacityExceededError";
  }
}

const PRINTED_RECEIPT_NOTE =
  "[Printed receipt requested — pack with order]";

/** Column Prisma reports for P2022 (shape varies by DB/driver). */
function prismaP2022ColumnHint(err: unknown): string {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2022") {
    return "";
  }
  const meta = err.meta as { column?: unknown } | undefined;
  if (meta && typeof meta.column === "string") return meta.column;
  return err.message;
}

function notesWithPrintedReceiptFallback(
  base: string | null,
  wants: boolean
): string | null {
  if (!wants) return base;
  if (!base?.trim()) return PRINTED_RECEIPT_NOTE;
  return `${base.trim()}\n\n${PRINTED_RECEIPT_NOTE}`;
}

/** Local/prod DBs sometimes lag migrations — table missing breaks checkout otherwise. */
async function safeManualSoldOutWeekStart(
  tx: Prisma.TransactionClient
): Promise<string | null> {
  try {
    const settings = await tx.kitchenCapacitySettings.findUnique({
      where: { id: "default" },
    });
    return settings?.manualSoldOutWeekStart ?? null;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      console.warn(
        "[orders] KitchenCapacitySettings table missing — run: npx prisma migrate deploy. Using no manual sold-out override."
      );
      return null;
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("KitchenCapacitySettings") &&
      (msg.includes("does not exist") || msg.includes("Unknown model"))
    ) {
      console.warn("[orders] KitchenCapacitySettings unavailable:", msg);
      return null;
    }
    throw e;
  }
}

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
      items?: OrderItemLine[];
      wantsUtensils?: boolean;
      utensilSets?: number;
      pickupDate?: string;
      pickupTime?: string;
      notes?: string;
      customInquiry?: string | null;
      subscribeUpdates?: boolean;
      wantsPrintedReceipt?: boolean;
      /** Honored only when ALLOW_DEMO_ORDERS_AT_CHECKOUT=true on the server. */
      isDemo?: boolean;
    };

    const allowDemoCheckout =
      process.env.ALLOW_DEMO_ORDERS_AT_CHECKOUT === "true";
    const isDemo = allowDemoCheckout && body.isDemo === true;
    const wantsPrintedReceipt = Boolean(body.wantsPrintedReceipt);

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

    let orderNumber: string;
    try {
      orderNumber = await generateOrderNumber();
    } catch (counterErr) {
      console.error("[orders] OrderCounter / generateOrderNumber failed:", counterErr);
      return NextResponse.json(
        {
          error:
            "We couldn't start your order (database setup). Run: npx prisma migrate deploy. Or call/text 979-703-3827.",
        },
        { status: 503 }
      );
    }

    const status = ORDER_STATUS_PENDING_PAYMENT_VERIFICATION;
    const paymentMethod = PAYMENT_METHOD_UNVERIFIED;
    const paymentStatus = PAYMENT_STATUS_PENDING;
    const baseNotes = (body.notes ?? "").trim() || null;

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
          if (!cap.ok) {
            throw new CapacityExceededError();
          }
          await assertPickupSlotFreeInTx(tx, pickupDate, pickupTime);
        }
        const common = {
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
          customInquiry: (body.customInquiry ?? "").trim() || null,
          subscribeUpdates: Boolean(body.subscribeUpdates),
          status,
          paymentMethod,
          paymentStatus,
        };

        let notesForRow = baseNotes;
        let omitWantsPrintedReceipt = false;
        let omitIsDemo = false;

        for (let attempt = 0; attempt < 12; attempt++) {
          const data = {
            ...common,
            notes: notesForRow,
            ...(!omitWantsPrintedReceipt && wantsPrintedReceipt
              ? { wantsPrintedReceipt: true as const }
              : {}),
            ...(!omitIsDemo ? { isDemo } : {}),
          } satisfies Record<string, unknown>;

          try {
            return await tx.order.create({
              data: data as Prisma.OrderCreateInput,
            });
          } catch (e) {
            if (
              !(e instanceof Prisma.PrismaClientKnownRequestError) ||
              e.code !== "P2022"
            ) {
              throw e;
            }
            const hint = prismaP2022ColumnHint(e).toLowerCase();
            let handled = false;
            if (hint.includes("wantsprintedreceipt")) {
              if (wantsPrintedReceipt && !omitWantsPrintedReceipt) {
                notesForRow = notesWithPrintedReceiptFallback(
                  baseNotes,
                  wantsPrintedReceipt
                );
              }
              omitWantsPrintedReceipt = true;
              handled = true;
            } else if (hint.includes("isdemo")) {
              omitIsDemo = true;
              handled = true;
            }
            if (!handled) throw e;
          }
        }
        throw new Error("Order create: migration fallback exhausted");
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
      if (e instanceof CapacityExceededError) {
        return NextResponse.json(
          {
            error:
              "That pickup week just filled up while you were checking out. Please go back and select a different date.",
          },
          { status: 409 }
        );
      }
      throw e;
    }

    const ownerSmsLines: string[] = [
      `${isDemo ? "🧪 DEMO " : ""}🍽️ NEW ORDER #${orderNumber}`,
      `Customer: ${customerName} | ${phone}`,
      `Total: $${total.toFixed(2)}`,
      `Pickup: ${pickupDate} @ ${pickupTime}`,
    ];
    if (wantsPrintedReceipt) {
      ownerSmsLines.push(`Printed receipt: yes — pack with pickup`);
    }
    ownerSmsLines.push(
      ``,
      `Customer was told to put order #${orderNumber} in Venmo/Zelle memo when paying.`,
      `Verify payment, then confirm in admin.`
    );
    const ownerSms = ownerSmsLines.join("\n");
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
      customInquiry: (body.customInquiry ?? "").trim() || null,
      subscribeUpdates: Boolean(body.subscribeUpdates),
      wantsPrintedReceipt,
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
        notes: body.notes,
        customInquiry: body.customInquiry ?? undefined,
        wantsPrintedReceipt,
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
      try {
        const em = email.toLowerCase();
        const existing = await prisma.subscriber.findUnique({
          where: { email: em },
        });
        if (!existing) {
          await prisma.subscriber.create({
            data: { email: em, name: customerName },
          });
        }
      } catch (subErr) {
        console.warn("[orders] Newsletter subscriber row not saved (order still placed):", subErr);
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
    const code = prismaDiagnosticCode(e);
    if (code === "P2022" || code === "P2021") {
      return NextResponse.json(
        {
          error:
            "We couldn't save your order — the database needs migrations applied. On your machine run: npx prisma migrate deploy. Or call/text 979-703-3827 to place your order.",
        },
        { status: 503 }
      );
    }
    const devDetail =
      process.env.NODE_ENV === "development"
        ? {
            devDetail: e instanceof Error ? e.message : String(e),
            devCode: code,
          }
        : {};
    return NextResponse.json(
      {
        error:
          "Something went wrong saving your order. Try again, or call/text 979-703-3827. If you manage the site: confirm DATABASE_URL and run npx prisma migrate deploy.",
        ...(code ? { prismaCode: code } : {}),
        ...devDetail,
      },
      { status: 500 }
    );
  }
}
