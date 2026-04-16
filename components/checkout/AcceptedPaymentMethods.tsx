"use client";

import { useCallback, useState } from "react";
import { PAYMENT_INSTRUCTIONS, SITE } from "@/lib/config";
import {
  VenmoBrandIcon,
  ZelleBrandIcon,
} from "@/components/payment/PaymentBrandIcons";
import {
  venmoPayWebUrl,
  zellePaymentClipboardText,
  ZELLE_CUSTOMER_URL,
} from "@/lib/payment-links";

export type AcceptedPaymentMethodsVariant = "checkout" | "confirmation";

type Props = {
  variant: AcceptedPaymentMethodsVariant;
  orderNumber?: string | null;
  amountDue?: number | null;
};

function CopyTextButton({
  label,
  copyText,
  className = "",
}: {
  label: string;
  copyText: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const onClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch {
      /* ignore */
    }
  }, [copyText]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--gold-light)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {done ? "Copied!" : label}
    </button>
  );
}

/** Checkout: no payment links — keeps the form short and reduces drop-off. */
export function AcceptedPaymentMethods({
  variant,
  orderNumber,
  amountDue,
}: Props) {
  if (variant === "checkout") {
    return (
      <div
        className="flex flex-wrap items-center justify-center gap-4"
        role="group"
        aria-label="Venmo and Zelle accepted; pay on the next screen after you submit"
      >
        <span className="sr-only">
          Venmo and Zelle accepted. You will pay on the next screen.
        </span>
        <div
          className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
          title="Venmo"
        >
          <VenmoBrandIcon size={40} />
        </div>
        <div
          className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
          title="Zelle"
        >
          <ZelleBrandIcon size={40} />
        </div>
      </div>
    );
  }

  const phoneLink = SITE.phoneTel;
  const phoneDisplay = SITE.phoneDisplay;

  const zelle = PAYMENT_INSTRUCTIONS.zellePhone;
  const zelleDigits = zelle.replace(/\D/g, "");
  const zelleE164 =
    zelleDigits.length === 10 ? `+1${zelleDigits}` : `+${zelleDigits}`;
  const venmoHandle = PAYMENT_INSTRUCTIONS.venmoHandle;

  const canVenmoPrefill =
    Boolean(orderNumber) &&
    amountDue != null &&
    Number.isFinite(amountDue);

  const venmoPayHref =
    canVenmoPrefill && orderNumber && amountDue != null
      ? venmoPayWebUrl(venmoHandle, amountDue, orderNumber)
      : "#";

  const amountCopyText =
    amountDue != null && Number.isFinite(amountDue)
      ? `$${amountDue.toFixed(2)}`
      : "";

  const zelleAllInOneCopy =
    orderNumber && amountDue != null && Number.isFinite(amountDue)
      ? zellePaymentClipboardText({
          amountUsd: amountDue,
          recipientE164: zelleE164,
          orderNumber,
        })
      : null;

  return (
    <div className="space-y-3">
      {canVenmoPrefill ? (
        <a
          href={venmoPayHref}
          target="_self"
          className="inline-flex min-h-[48px] w-full min-w-[min(100%,220px)] items-center justify-center gap-2 rounded-xl bg-[#008CFF] px-4 py-3 text-center text-base font-bold text-white shadow-sm transition hover:brightness-95"
        >
          <VenmoBrandIcon size={26} />
          Pay {amountCopyText} in Venmo
        </a>
      ) : null}

      {canVenmoPrefill ? (
        <p
          className="text-center text-sm font-semibold tracking-wide text-[var(--text-muted)]"
          aria-hidden
        >
          or
        </p>
      ) : null}

      <div className="rounded-xl border border-[var(--border)] bg-white/80 px-3 py-3">
        <div className="flex items-start gap-2">
          <ZelleBrandIcon size={28} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold text-[var(--text)]">Zelle</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Send to <span className="font-semibold text-[var(--text)]">{zelle}</span>
              . Use the buttons to copy details into your bank app.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {zelleAllInOneCopy ? (
                <CopyTextButton
                  label="Copy all (Zelle)"
                  copyText={zelleAllInOneCopy}
                  className="border-[var(--primary)]/40 bg-[var(--gold-light)]"
                />
              ) : null}
              <CopyTextButton label="Copy #" copyText={zelleE164} />
              {orderNumber ? (
                <CopyTextButton label="Memo" copyText={orderNumber} />
              ) : null}
              {amountCopyText ? (
                <CopyTextButton label="Amount" copyText={amountCopyText} />
              ) : null}
            </div>
            <a
              href={ZELLE_CUSTOMER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs font-medium text-[var(--primary)] underline"
            >
              New to Zelle?
            </a>
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Questions?{" "}
        <a
          href={phoneLink}
          className="font-semibold text-[var(--primary)] underline"
        >
          {phoneDisplay}
        </a>
      </p>
    </div>
  );
}
