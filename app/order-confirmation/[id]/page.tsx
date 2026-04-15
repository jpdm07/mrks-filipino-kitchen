import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeDb } from "@/lib/safe-db";
import { Logo } from "@/components/ui/Logo";
import { AnimatedCheck } from "@/components/order/AnimatedCheck";
import type { OrderItemLine } from "@/lib/order-types";
import { orderHasFrozenLumpia } from "@/lib/order-types";
import { salesTaxPercentLabel } from "@/lib/config";
import { AcceptedPaymentMethods } from "@/components/checkout/AcceptedPaymentMethods";
import { ORDER_STATUS_CONFIRMED } from "@/lib/order-payment";
import { SalesTaxDisclosure } from "@/components/checkout/SalesTaxDisclosure";

export const dynamic = "force-dynamic";

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
  const frozenLumpia = orderHasFrozenLumpia(items);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <div className="flex justify-center">
        <Logo size="xl" />
      </div>
      <AnimatedCheck />
      <h1 className="mt-6 font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text)]">
        Thank you!
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Order number
      </p>
      <p
        className="select-all text-3xl font-black tracking-tight text-[var(--primary)]"
        title="Select and copy this for your payment memo"
      >
        #{order.orderNumber}
      </p>
      <p className="mt-2 text-balance text-center text-xs text-[var(--text-muted)]">
        Use this number in your Zelle/Venmo memo and when you text us after you
        pay.
      </p>

      <div className="mt-8 rounded-[var(--radius)] border-2 border-[var(--primary)] bg-[var(--primary)]/5 p-6 text-left shadow-[var(--shadow)]">
        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--primary)]">
          Send payment
        </h2>
        <p className="mt-3 text-base font-bold text-[var(--text)]">
          Amount due:{" "}
          <span className="text-[var(--primary)]">
            ${order.total.toFixed(2)}
          </span>
        </p>
        <div className="mt-4">
          <AcceptedPaymentMethods
            variant="confirmation"
            orderNumber={order.orderNumber}
          />
        </div>
        <p className="mt-4 rounded-lg border border-[var(--gold)] bg-[var(--gold-light)] px-4 py-3 text-sm font-semibold text-[var(--text)]">
          Memo / note (required): type{" "}
          <span className="font-mono text-[var(--primary)]">
            {order.orderNumber}
          </span>{" "}
          exactly — same as your order number above.
        </p>
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
            <tr className="border-b border-[var(--border)]">
              <td className="px-4 py-2">Utensils</td>
              <td className="px-4 py-2 text-right">
                {order.utensilSets > 0
                  ? `${order.utensilSets} sets · $${order.utensilCharge.toFixed(2)}`
                  : "None"}
              </td>
            </tr>
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
      ) : (
        <div className="mt-6 rounded-[var(--radius)] border-2 border-[var(--primary)] bg-[var(--primary)]/5 p-6 text-left text-base leading-relaxed text-[var(--text)] shadow-[var(--shadow)]">
          <p className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--primary)]">
            Your order has been received! 🎉
          </p>
          <p className="mt-4">
            Mr. K will verify your payment and be in touch shortly. If you
            don&apos;t hear back within a few hours, call or text{" "}
            <a
              href="tel:+19797033827"
              className="font-bold text-[var(--primary)] underline"
            >
              979-703-3827
            </a>
            .
          </p>
          <p className="mt-4 font-medium">
            Please note: your order will not begin preparation until payment has
            been verified. Thank you for your patience and for supporting Mr.
            K&apos;s Filipino Kitchen!
          </p>
        </div>
      )}
      {frozenLumpia ? (
        <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-section)] p-4 text-left text-sm">
          <p>
            Your frozen lumpia will be packaged in a sealed gallon freezer bag
            with parchment paper separators to prevent sticking.
          </p>
        </div>
      ) : null}

      <div className="mt-10 flex justify-center">
        <Link href="/menu" className="btn btn-primary px-8">
          Back to Menu
        </Link>
      </div>
    </div>
  );
}
