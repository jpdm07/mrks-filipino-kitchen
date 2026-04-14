"use client";

import { PAYMENT_INSTRUCTIONS, SITE } from "@/lib/config";
import {
  VenmoBrandIcon,
  ZelleBrandIcon,
} from "@/components/payment/PaymentBrandIcons";

export type AcceptedPaymentMethodsVariant = "checkout" | "confirmation";

type Props = {
  variant: AcceptedPaymentMethodsVariant;
  /** On the confirmation page, the customer’s order number (for the “text us” line). */
  orderNumber?: string | null;
};

function venmoDisplayLabel(handle: string): string {
  const t = handle.trim();
  if (t.startsWith("@")) return t;
  return `@${t}`;
}

export function AcceptedPaymentMethods({ variant, orderNumber }: Props) {
  const zelle = PAYMENT_INSTRUCTIONS.zellePhone;
  const venmo = venmoDisplayLabel(PAYMENT_INSTRUCTIONS.venmoHandle);
  const phoneLink = SITE.phoneTel;
  const phoneDisplay = SITE.phoneDisplay;

  const methodRows = (
    <div className="space-y-2">
      <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-white/60 px-3 py-2.5">
        <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-neutral-100">
          <ZelleBrandIcon size={34} />
        </span>
        <div className="min-w-0 text-sm leading-snug">
          <div>
            <span className="font-semibold text-[var(--text)]">Zelle</span>
            <span className="mx-1.5 text-[var(--text-muted)]">·</span>
            <span className="select-all font-medium tabular-nums text-[var(--text)]">
              {zelle}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Use this phone number as the Zelle recipient in your bank app.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-white/60 px-3 py-2.5">
        <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-neutral-100">
          <VenmoBrandIcon size={34} />
        </span>
        <div className="min-w-0 text-sm leading-snug">
          <div>
            <span className="font-semibold text-[var(--text)]">Venmo</span>
            <span className="mx-1.5 text-[var(--text-muted)]">·</span>
            <span className="select-all font-medium text-[var(--text)]">
              {venmo}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Search this username in the Venmo app to pay.
          </p>
        </div>
      </div>
    </div>
  );

  if (variant === "confirmation") {
    return (
      <div className="space-y-3">
        {methodRows}
        {orderNumber ? (
          <p className="text-sm leading-relaxed text-[var(--text)]">
            After you send payment, please{" "}
            <a
              href={phoneLink}
              className="font-semibold text-[var(--primary)] underline"
            >
              text {phoneDisplay}
            </a>{" "}
            with your confirmation number{" "}
            <span className="font-mono font-semibold text-[var(--primary)]">
              {orderNumber}
            </span>{" "}
            so we can match your payment quickly.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[var(--text)]">
        Payment methods we accept
      </p>
      <p className="text-sm leading-relaxed text-[var(--text)]">
        <strong>Zelle</strong> and <strong>Venmo</strong> only. Online card
        checkout on this site is <strong>temporarily under renovation</strong>.
      </p>
      {methodRows}
      <p className="text-sm leading-relaxed text-[var(--text-muted)]">
        After you submit this form, you&apos;ll get an <strong>order number</strong>{" "}
        on the next screen. Put that number in your{" "}
        <strong>Venmo or Zelle memo</strong>, then{" "}
        <strong>text the same order number</strong> to{" "}
        <a
          href={phoneLink}
          className="font-semibold text-[var(--primary)] underline"
        >
          {phoneDisplay}
        </a>{" "}
        once your payment has gone through.
      </p>
      <p className="text-sm text-[var(--text-muted)]">
        Questions?{" "}
        <a
          href={phoneLink}
          className="font-semibold text-[var(--primary)] underline"
        >
          Call or text {phoneDisplay}
        </a>
        .
      </p>
    </div>
  );
}
