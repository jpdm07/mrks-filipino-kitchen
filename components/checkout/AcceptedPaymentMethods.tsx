"use client";

import { useCallback, useState } from "react";
import { PAYMENT_INSTRUCTIONS, SITE } from "@/lib/config";
import {
  VenmoBrandIcon,
  ZelleBrandIcon,
} from "@/components/payment/PaymentBrandIcons";
import {
  venmoPayWebUrl,
  venmoProfileWebUrl,
  zellePaymentClipboardText,
  ZELLE_CUSTOMER_URL,
} from "@/lib/payment-links";

export type AcceptedPaymentMethodsVariant = "checkout" | "confirmation";

type Props = {
  variant: AcceptedPaymentMethodsVariant;
  orderNumber?: string | null;
  /** When set with `orderNumber`, Venmo link prefills amount + memo on the confirmation step. */
  amountDue?: number | null;
};

function venmoDisplayLabel(handle: string): string {
  const t = handle.trim();
  if (t.startsWith("@")) return t;
  return `@${t}`;
}

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
        "rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--gold-light)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {done ? "Copied!" : label}
    </button>
  );
}

export function AcceptedPaymentMethods({
  variant,
  orderNumber,
  amountDue,
}: Props) {
  const zelle = PAYMENT_INSTRUCTIONS.zellePhone;
  const zelleDigits = zelle.replace(/\D/g, "");
  const zelleE164 = zelleDigits.length === 10 ? `+1${zelleDigits}` : `+${zelleDigits}`;
  const venmoHandle = PAYMENT_INSTRUCTIONS.venmoHandle;
  const venmoLabel = venmoDisplayLabel(venmoHandle);
  const phoneLink = SITE.phoneTel;
  const phoneDisplay = SITE.phoneDisplay;

  const venmoProfileHref = venmoProfileWebUrl(venmoHandle);
  const canVenmoPrefill =
    variant === "confirmation" &&
    Boolean(orderNumber) &&
    amountDue != null &&
    Number.isFinite(amountDue);

  const venmoPayHref =
    canVenmoPrefill && orderNumber && amountDue != null
      ? venmoPayWebUrl(venmoHandle, amountDue, orderNumber)
      : venmoProfileHref;

  const amountCopyText =
    amountDue != null && Number.isFinite(amountDue)
      ? `$${amountDue.toFixed(2)}`
      : "";

  const zelleAllInOneCopy =
    variant === "confirmation" &&
    orderNumber &&
    amountDue != null &&
    Number.isFinite(amountDue)
      ? zellePaymentClipboardText({
          amountUsd: amountDue,
          recipientE164: zelleE164,
          orderNumber,
        })
      : null;

  const methodRows = (
    <div className="space-y-3">
      {/* Zelle */}
      <div className="rounded-lg border border-[var(--border)] bg-white/60 px-3 py-2.5">
        <div className="flex items-start gap-3">
          <a
            href={ZELLE_CUSTOMER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-neutral-100 transition hover:ring-[var(--primary)]/40"
            aria-label="How Zelle works (opens in a new tab)"
          >
            <ZelleBrandIcon size={34} />
          </a>
          <div className="min-w-0 flex-1 text-sm leading-snug">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-[var(--text)]">Zelle</span>
              <a
                href={ZELLE_CUSTOMER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[var(--primary)] underline"
              >
                How Zelle works
              </a>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {variant === "confirmation" && zelleAllInOneCopy ? (
                <>
                  Banks don&apos;t offer a link that opens Zelle with everything
                  prefilled — tap <strong>Copy all for Zelle</strong>, then open
                  your bank&apos;s app and paste into the right fields. Recipient
                  phone:
                </>
              ) : (
                <>
                  Sign in through <strong>your bank’s</strong> website or app.
                  Send to this phone as the recipient:
                </>
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="select-all font-medium tabular-nums text-[var(--text)]">
                {zelle}
              </span>
              {variant === "confirmation" ? (
                <>
                  {zelleAllInOneCopy ? (
                    <CopyTextButton
                      label="Copy all for Zelle (amount + # + memo)"
                      copyText={zelleAllInOneCopy}
                      className="border-[var(--primary)] bg-[var(--gold-light)] font-bold"
                    />
                  ) : null}
                  <CopyTextButton label="Copy #" copyText={zelleE164} />
                  {orderNumber ? (
                    <CopyTextButton
                      label="Copy order # (memo)"
                      copyText={orderNumber}
                    />
                  ) : null}
                  {amountCopyText ? (
                    <CopyTextButton label="Copy amount" copyText={amountCopyText} />
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Venmo */}
      <div className="rounded-lg border border-[var(--border)] bg-white/60 px-3 py-2.5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-neutral-100">
            <VenmoBrandIcon size={34} />
          </span>
          <div className="min-w-0 flex-1 text-sm leading-snug">
            <div className="font-semibold text-[var(--text)]">Venmo</div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {canVenmoPrefill ? (
                <>
                  Tap below to open Venmo with{" "}
                  <strong>amount</strong> and <strong>memo</strong> (order #
                  {orderNumber}) already filled — you only confirm and pay.
                </>
              ) : (
                <>
                  Tap below to open {venmoLabel} in Venmo. After you place your
                  order, the next screen will give you a link with amount and
                  memo filled in.
                </>
              )}
            </p>
            <a
              href={venmoPayHref}
              {...(canVenmoPrefill
                ? { target: "_self" as const }
                : { target: "_blank" as const, rel: "noopener noreferrer" })}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#008CFF] px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition hover:brightness-95"
            >
              {canVenmoPrefill
                ? `Pay ${amountCopyText} in Venmo`
                : `Open ${venmoLabel} in Venmo`}
            </a>
            {canVenmoPrefill ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                After you finish in Venmo, use your browser&apos;s{" "}
                <strong>Back</strong> button to return here. Venmo can&apos;t send
                you back to our site automatically.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  if (variant === "confirmation") {
    return (
      <div className="space-y-3">
        {methodRows}
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          <strong className="text-[var(--text)]">Why isn&apos;t it marked &quot;paid&quot; yet?</strong>{" "}
          Zelle and Venmo don&apos;t tell websites when a payment completes. Mr.
          K matches your memo to your order and updates status when he sees it.
          Questions?{" "}
          <a
            href={phoneLink}
            className="font-semibold text-[var(--primary)] underline"
          >
            {phoneDisplay}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[var(--text)]">
        Payment methods we accept
      </p>
      {methodRows}
      <p className="text-sm leading-relaxed text-[var(--text-muted)]">
        After you submit this form, you&apos;ll get an <strong>order number</strong>{" "}
        on the next screen with{" "}
        <strong>one-tap Venmo</strong> (amount + memo) and copy buttons for
        Zelle.
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
