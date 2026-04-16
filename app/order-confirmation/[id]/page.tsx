import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeDb } from "@/lib/safe-db";
import { Logo } from "@/components/ui/Logo";
import { AnimatedCheck } from "@/components/order/AnimatedCheck";
import { OrderConfirmationConfetti } from "@/components/order/OrderConfirmationConfetti";
import type { OrderItemLine } from "@/lib/order-types";
import { orderHasFrozenLumpia } from "@/lib/order-types";
import {
  formatUtensilsCheckoutSubtext,
  salesTaxPercentLabel,
} from "@/lib/config";
import {
  complimentaryUtensilAllowanceFromOrderItems,
  shouldShowUtensilsOnOrderConfirmation,
} from "@/lib/utensils-allowance";
import { AcceptedPaymentMethods } from "@/components/checkout/AcceptedPaymentMethods";
import { ORDER_STATUS_CONFIRMED } from "@/lib/order-payment";
import { formatPickupYmdLong } from "@/lib/pickup-lead-time";
import { SalesTaxDisclosure } from "@/components/checkout/SalesTaxDisclosure";

export const dynamic = "force-dynamic";
/** Avoid stale HTML if a CDN or browser cached an older confirmation layout. */
export const fetchCache = "force-no-store";
export const revalidate = 0;

function parseItems(raw: string): OrderItemLine[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as OrderItemLine[]) : [];
  } catch {
    return [];
  }
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id);
  const order = await safeDb(
    () =>
      prisma.order.findFirst({
        where: { OR: [{ orderNumber: id }, { id }] },
      }),
    null
  );
  if (!order) notFound();

  const items = parseItems(order.items);
  const complimentaryUtensils = complimentaryUtensilAllowanceFromOrderItems(items);
  const showUtensilsBlock = shouldShowUtensilsOnOrderConfirmation(
    items,
    order.utensilCharge
  );
  const frozenLumpia = orderHasFrozenLumpia(items);

  const pickupYmd = order.pickupDate?.trim();
  const pickupTime = order.pickupTime?.trim();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <OrderConfirmationConfetti />
      <div className="flex justify-center">
        <Logo size="xl" />
      </div>
      <AnimatedCheck />
      <h1 className="mt-6 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text)]">
        Thank you!
      </h1>
      <p className="mt-6 text-sm text-[var(--text-muted)]">Order #</p>
      <p
        className="select-all text-3xl font-black tracking-tight text-[var(--primary)]"
        title="Your order number"
      >
        #{order.orderNumber}
      </p>
      <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
        Show this # at pickup.
      </p>

      {pickupYmd ? (
        <p className="mx-auto mt-6 max-w-lg rounded-lg border border-[var(--border)] bg-[var(--gold-light)] px-4 py-3 text-sm text-[var(--text)]">
          Pickup: <strong>{formatPickupYmdLong(pickupYmd)}</strong>
          {pickupTime ? (
            <>
              {" "}
              at <strong>{pickupTime}</strong>
            </>
          ) : null}
          .
        </p>
      ) : null}

      <div className="mt-8 rounded-[var(--radius)] border-2 border-[var(--primary)] bg-[var(--primary)]/5 p-5 text-left shadow-[var(--shadow)]">
        <div className="mb-4 rounded-xl border-2 border-amber-500/80 bg-amber-50 px-4 py-3 text-center shadow-sm">
          <p className="text-base font-bold text-amber-950">
            Your order isn&apos;t final until we receive payment.
          </p>
          <p className="mt-1 text-sm text-amber-950/90">
            Check your email for order confirmation.
          </p>
        </div>
        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--primary)]">
          Pay now
        </h2>
        <p className="mt-2 text-lg font-bold text-[var(--text)]">
          Total:{" "}
          <span className="text-[var(--primary)]">${order.total.toFixed(2)}</span>
        </p>
        <div className="mt-4">
          <AcceptedPaymentMethods
            variant="confirmation"
            orderNumber={order.orderNumber}
            amountDue={order.total}
          />
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-left shadow-[var(--shadow)]">
        <table className="w-full min-w-[280px] text-sm">
          <tbody>
            {items.map((i, idx) => (
              <tr key={idx} className="border-b border-[var(--border)]">
                <td className="max-w-[65vw] break-words px-3 py-2 sm:max-w-none sm:px-4">
                  {i.name}
                  {i.size ? ` · ${i.size}` : ""}
                  {i.cookedOrFrozen === "frozen" ||
                  i.cookedOrFrozen === "cooked"
                    ? ` · ${i.cookedOrFrozen}`
                    : ""}
                  {i.isSample ? " · sample" : ""} ×{i.quantity}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold sm:px-4">
                  ${(i.unitPrice * i.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
            {showUtensilsBlock ? (
              <>
                <tr className="border-b border-[var(--border)]">
                  <td className="px-4 py-2">Utensils</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {order.utensilSets > 0
                      ? `$${order.utensilCharge.toFixed(2)}`
                      : "—"}
                  </td>
                </tr>
                {order.utensilSets > 0
                  ? (() => {
                      const hint = formatUtensilsCheckoutSubtext(
                        Boolean(order.wantsUtensils),
                        order.utensilSets,
                        order.utensilCharge,
                        complimentaryUtensils
                      );
                      return hint ? (
                        <tr
                          key="utensils-detail"
                          className="border-b border-[var(--border)]"
                        >
                          <td
                            colSpan={2}
                            className="px-4 pb-3 pt-0 text-xs leading-snug text-[var(--text-muted)]"
                          >
                            {hint}
                          </td>
                        </tr>
                      ) : null;
                    })()
                  : null}
              </>
            ) : null}
            <tr className="border-b border-[var(--border)]">
              <td className="px-4 py-2">Subtotal</td>
              <td className="px-4 py-2 text-right">
                ${order.subtotal.toFixed(2)}
              </td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="px-4 py-2">Tax ({salesTaxPercentLabel()})</td>
              <td className="px-4 py-2 text-right">
                ${order.tax.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-bold">Total</td>
              <td className="px-4 py-3 text-right text-lg font-bold text-[var(--primary)]">
                ${order.total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <SalesTaxDisclosure className="mt-4" />

      {order.status === ORDER_STATUS_CONFIRMED ? (
        <div className="mt-6 rounded-[var(--radius)] bg-[var(--gold-light)] p-4 text-left text-sm text-[var(--text)]">
          <p>
            Thank you! Your payment is confirmed and your pickup is set. If you
            need anything before pickup, call or text{" "}
            <a
              href="tel:+19797033827"
              className="font-bold text-[var(--primary)]"
            >
              979-703-3827
            </a>
            .
          </p>
        </div>
      ) : null}
      {frozenLumpia ? (
        <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-section)] p-4 text-left text-sm">
          <p>
            Your frozen lumpia will be packaged in a sealed gallon freezer bag
            with parchment paper separators to prevent sticking.
          </p>
        </div>
      ) : null}
    </div>
  );
}
