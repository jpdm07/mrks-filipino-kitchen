"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { OrderSummary } from "./OrderSummary";
import { PickupCalendar } from "./PickupCalendar";
import {
  cartLinesToOrderItems,
  samplesSelectionComplete,
  samplesToLines,
} from "@/lib/cart-types";
import {
  formatPickupYmdLong,
  isPickupYmdAllowed,
  isWellFormedPickupYMD,
  pickupDateRejectedMessage,
} from "@/lib/pickup-lead-time";
import { orderFormPickupConfirmationLine } from "@/lib/pickup-availability-copy";
import { AcceptedPaymentMethods } from "@/components/checkout/AcceptedPaymentMethods";

type CheckoutIssueKey =
  | "name"
  | "phone"
  | "email"
  | "payment"
  | "pickup"
  | "time"
  | "samples"
  | "custom";

type CheckoutIssues = Partial<Record<CheckoutIssueKey, boolean>>;

function inputIssueClass(active: boolean) {
  return active
    ? "border-red-500 ring-2 ring-red-500/35 focus:border-red-500 focus:ring-red-500/40"
    : "border-[var(--border)]";
}

export function OrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cart = useCart();
  const calendarRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const pickupSectionRef = useRef<HTMLDivElement>(null);
  const timeSectionRef = useRef<HTMLDivElement>(null);
  const samplesRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLDivElement>(null);
  const appliedUrlPickup = useRef(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [notes, setNotes] = useState("");
  const [customCheck, setCustomCheck] = useState(false);
  const [customText, setCustomText] = useState("");
  /** Customer acknowledges they will put the order # in Venmo/Zelle memo after submit. */
  const [paymentMemoAck, setPaymentMemoAck] = useState(false);
  /** Shown only when NEXT_PUBLIC_ALLOW_DEMO_CHECKOUT=true at build time; server must set ALLOW_DEMO_ORDERS_AT_CHECKOUT. */
  const [checkoutDemo, setCheckoutDemo] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [issues, setIssues] = useState<CheckoutIssues>({});
  const [loading, setLoading] = useState(false);
  const [slotOptions, setSlotOptions] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [urlLeadReject, setUrlLeadReject] = useState(false);
  /** Month jump for deep-linked orders only; not tied to every pickupDate change. */
  const [calendarAnchorYmd, setCalendarAnchorYmd] = useState<string | null>(
    null
  );

  const items = useMemo(
    () => [
      ...cartLinesToOrderItems(cart.lines),
      ...samplesToLines(cart.samples, cart.samplePrices),
    ],
    [cart.lines, cart.samples, cart.samplePrices]
  );

  useEffect(() => {
    if (appliedUrlPickup.current) return;
    const raw = searchParams.get("pickupDate") ?? searchParams.get("date");
    if (!raw || !isWellFormedPickupYMD(raw)) return;
    appliedUrlPickup.current = true;
    const d = raw.trim();
    if (!isPickupYmdAllowed(d)) {
      setUrlLeadReject(true);
      return;
    }
    setCalendarAnchorYmd(d);
    setPickupDate(d);
    window.setTimeout(() => {
      calendarRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 500);
  }, [searchParams]);

  useEffect(() => {
    if (!pickupDate) {
      setSlotOptions([]);
      setPickupTime("");
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    fetch(`/api/availability/${encodeURIComponent(pickupDate)}`)
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as {
          slots?: unknown;
          isOpen?: boolean;
        };
        if (cancelled) return;
        if (!r.ok) {
          setSlotOptions([]);
          setPickupTime("");
          if (r.status === 400) setPickupDate("");
          return;
        }
        if (j.isOpen === false) {
          setPickupDate("");
          setPickupTime("");
          setSlotOptions([]);
          return;
        }
        const slots = Array.isArray(j.slots)
          ? j.slots.filter((x): x is string => typeof x === "string")
          : [];
        setSlotOptions(slots);
        setPickupTime((prev) => (prev && slots.includes(prev) ? prev : ""));
      })
      .catch(() => {
        if (!cancelled) {
          setSlotOptions([]);
          setPickupTime("");
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pickupDate]);

  const basicsOk =
    name.trim() &&
    phone.trim() &&
    email.trim() &&
    pickupDate &&
    pickupTime &&
    slotOptions.includes(pickupTime) &&
    isPickupYmdAllowed(pickupDate) &&
    !slotsLoading;

  const samplesOk = samplesSelectionComplete(cart.samples);
  const canSubmitOrder = basicsOk && samplesOk;

  useEffect(() => {
    if (samplesOk) {
      setIssues((p) => (p.samples ? { ...p, samples: false } : p));
    }
  }, [samplesOk]);

  const showDemoCheckout =
    process.env.NEXT_PUBLIC_ALLOW_DEMO_CHECKOUT === "true";

  const scrollToFirstIssue = (i: CheckoutIssues) => {
    const run = () => {
      const el =
        i.name || i.phone || i.email
          ? contactRef.current
          : i.payment
            ? paymentRef.current
            : i.pickup
              ? pickupSectionRef.current
              : i.time
                ? timeSectionRef.current
                : i.samples
                  ? samplesRef.current
                  : i.custom
                    ? customRef.current
                    : null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.setTimeout(run, 50);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setIssues({});

    if (items.length === 0) {
      setErr("Your cart is empty.");
      return;
    }

    const next: CheckoutIssues = {};
    if (!name.trim()) next.name = true;
    if (!phone.trim()) next.phone = true;
    if (!email.trim()) next.email = true;
    if (!paymentMemoAck) next.payment = true;

    if (!pickupDate?.trim() || !isWellFormedPickupYMD(pickupDate)) {
      next.pickup = true;
    } else if (!isPickupYmdAllowed(pickupDate)) {
      next.pickup = true;
    } else if (slotsLoading) {
      next.time = true;
    } else if (slotOptions.length === 0) {
      next.time = true;
    } else if (!pickupTime || !slotOptions.includes(pickupTime)) {
      next.time = true;
    }

    if (!samplesOk) {
      next.samples = true;
    }

    if (customCheck && !customText.trim()) {
      next.custom = true;
    }

    if (Object.keys(next).length > 0) {
      setIssues(next);
      const parts: string[] = [];
      if (next.name || next.phone || next.email) {
        parts.push("Please fill in name, phone, and email.");
      }
      if (next.payment) {
        parts.push(
          "Please confirm you will use your order number in the payment memo and text it after paying."
        );
      }
      if (next.pickup && pickupDate && !isPickupYmdAllowed(pickupDate)) {
        parts.push(pickupDateRejectedMessage());
      } else if (next.pickup) {
        parts.push("Please select a valid pickup date.");
      }
      if (next.time) {
        if (slotsLoading) {
          parts.push(
            "Pickup times are still loading — wait a moment, then try again."
          );
        } else if (slotOptions.length === 0) {
          parts.push(
            "No time slots for this date — choose another pickup day."
          );
        } else {
          parts.push("Please select a pickup time.");
        }
      }
      if (next.samples) {
        const bits: string[] = [];
        if (cart.samples.lumpiaQty > 0 && !cart.samples.lumpiaProtein) {
          bits.push("choose beef, pork, or turkey for lumpia samples");
        }
        if (cart.samples.pancitQty > 0 && !cart.samples.pancitType) {
          bits.push("choose chicken or shrimp for pancit samples");
        }
        parts.push(
          bits.length > 0
            ? `Open the cart (bag icon) and ${bits.join("; ")}.`
            : "Complete sample choices in your cart."
        );
      }
      if (next.custom) {
        parts.push("Please describe your custom dish, or turn off that option.");
      }
      setErr(parts.filter(Boolean).join("\n\n"));
      scrollToFirstIssue(next);
      return;
    }

    setLoading(true);
    const sets = cart.wantsUtensils ? Math.max(1, cart.utensilSets) : 0;
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        items,
        wantsUtensils: cart.wantsUtensils,
        utensilSets: sets,
        pickupDate,
        pickupTime,
        notes: notes.trim(),
        customInquiry: customCheck ? customText.trim() : null,
        subscribeUpdates: cart.newsletterOptIn,
        ...(showDemoCheckout && checkoutDemo ? { isDemo: true } : {}),
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      devHint?: string;
      orderNumber?: string;
    };
    setLoading(false);
    if (!res.ok) {
      const msg = data.error ?? "Order failed";
      const hint =
        typeof data.devHint === "string" && data.devHint.trim()
          ? data.devHint.trim()
          : "";
      setErr(hint ? `${msg}\n\n${hint}` : msg);
      return;
    }
    if (!data.orderNumber) {
      setErr("Order placed but confirmation number missing. Please contact us.");
      return;
    }
    cart.clearCart();
    router.push(`/order-confirmation/${encodeURIComponent(data.orderNumber)}`);
  };

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--text-muted)]">
        Your cart is empty.{" "}
        <a href="/menu" className="font-semibold text-[var(--primary)] underline">
          Browse the menu
        </a>{" "}
        to add items.
      </p>
    );
  }

  const hasFieldIssues = Object.keys(issues).length > 0;

  return (
    <form
      noValidate
      onSubmit={submit}
      className="grid min-w-0 gap-10 lg:grid-cols-2 lg:items-start"
    >
      <div className="min-w-0 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold sm:text-3xl">
            Checkout
          </h1>
          <button
            type="button"
            onClick={() => cart.openDrawer()}
            aria-label="Open shopping cart to review or change items"
            className="shrink-0 self-start rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--primary)] shadow-sm transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
          >
            Back to cart
          </button>
        </div>
        {urlLeadReject ? (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--gold-light)] px-3 py-2 text-sm text-[var(--text)]">
            The date in your link isn&apos;t available for online pickup yet
            (first pickup is the upcoming Friday or Saturday, Central Time). Pick
            another open date on the calendar.
          </p>
        ) : null}
        {pickupDate && isPickupYmdAllowed(pickupDate) ? (
          <p
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
            role="status"
          >
            {orderFormPickupConfirmationLine(formatPickupYmdLong(pickupDate))}
          </p>
        ) : null}
        {err ? (
          <p
            className={[
              "whitespace-pre-line rounded-lg px-4 py-2 text-sm font-medium",
              hasFieldIssues
                ? "border-2 border-red-500 bg-red-50 text-red-900"
                : "bg-[var(--gold-light)] text-[var(--accent)]",
            ].join(" ")}
            role="alert"
          >
            {err}
          </p>
        ) : null}
        <div ref={contactRef} className="space-y-4">
          <label className="block text-sm font-semibold">
            Customer name *
            <input
              className={[
                "mt-1 w-full min-h-[48px] rounded-lg border px-3 outline-none",
                inputIssueClass(Boolean(issues.name)),
              ].join(" ")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIssues((p) => ({ ...p, name: false }));
              }}
            />
          </label>
          <label className="block text-sm font-semibold">
            Phone *
            <input
              type="tel"
              className={[
                "mt-1 w-full min-h-[48px] rounded-lg border px-3 outline-none",
                inputIssueClass(Boolean(issues.phone)),
              ].join(" ")}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setIssues((p) => ({ ...p, phone: false }));
              }}
            />
          </label>
          <label className="block text-sm font-semibold">
            Email *
            <input
              type="email"
              className={[
                "mt-1 w-full min-h-[48px] rounded-lg border px-3 outline-none",
                inputIssueClass(Boolean(issues.email)),
              ].join(" ")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setIssues((p) => ({ ...p, email: false }));
              }}
            />
          </label>
        </div>

        <div
          ref={paymentRef}
          className={[
            "space-y-4 rounded-xl border bg-[var(--card)] p-4 shadow-sm",
            issues.payment
              ? "border-red-500 ring-2 ring-red-500/40"
              : "border-[var(--border)]",
          ].join(" ")}
        >
          <AcceptedPaymentMethods variant="checkout" />
          {showDemoCheckout ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-dashed border-amber-500/60 bg-amber-50/80 px-3 py-2 text-sm font-medium text-[var(--text)]">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0"
                checked={checkoutDemo}
                onChange={(e) => setCheckoutDemo(e.target.checked)}
              />
              <span>
                <strong>Test / demo order</strong> — won&apos;t count in finances
                or Google Sheet; you can delete it from admin anytime.
              </span>
            </label>
          ) : null}
          <label className="flex cursor-pointer items-start gap-3 text-sm font-medium">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0"
              checked={paymentMemoAck}
              onChange={(e) => {
                setPaymentMemoAck(e.target.checked);
                if (e.target.checked) setIssues((p) => ({ ...p, payment: false }));
              }}
            />
            <span>
              I understand I will put my order number in the Venmo or Zelle memo
              when I pay, and text that same number after payment is sent.
            </span>
          </label>
        </div>

        <div
          ref={pickupSectionRef}
          className={[
            "rounded-xl p-1",
            issues.pickup ? "ring-2 ring-red-500 ring-offset-2" : "",
          ].join(" ")}
        >
          <p className="text-sm font-semibold">Pickup date *</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Choose an open day (Central Time), then a pickup time.
          </p>
          <div
            ref={calendarRef}
            id="pickup-calendar"
            className="mt-2 max-w-md scroll-mt-28 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
          >
            <PickupCalendar
              value={pickupDate}
              onChange={(d) => {
                setPickupDate(d);
                setIssues((p) => ({ ...p, pickup: false, time: false }));
              }}
              anchorYmd={calendarAnchorYmd}
            />
          </div>
        </div>

        {pickupDate ? (
          <div
            ref={timeSectionRef}
            className={[
              "rounded-xl p-1",
              issues.time ? "ring-2 ring-red-500 ring-offset-2" : "",
            ].join(" ")}
          >
            <p className="text-sm font-semibold">Pickup time *</p>
            {slotsLoading ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">Loading times…</p>
            ) : slotOptions.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--accent)]">
                No time slots are set for this date. Please pick another day.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {slotOptions.map((t) => {
                  const sel = pickupTime === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setPickupTime(t);
                        setIssues((p) => ({ ...p, time: false }));
                      }}
                      className={[
                        "min-h-[44px] rounded-full border px-4 text-sm font-semibold transition-colors",
                        sel
                          ? "border-[#0038A8] bg-[#0038A8] text-white"
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[#FFC200]",
                      ].join(" ")}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        <label className="block text-sm font-semibold">
          Special instructions
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={customCheck}
            onChange={(e) => {
              setCustomCheck(e.target.checked);
              if (!e.target.checked) {
                setIssues((p) => ({ ...p, custom: false }));
              }
            }}
            className="mt-1"
          />
          I&apos;d like to inquire about a custom dish not on the menu
        </label>
        {customCheck ? (
          <div
            ref={customRef}
            className={[
              "rounded-lg p-1",
              issues.custom ? "ring-2 ring-red-500 ring-offset-2" : "",
            ].join(" ")}
          >
            <textarea
              rows={3}
              className={[
                "w-full rounded-lg border px-3 py-2 outline-none",
                inputIssueClass(Boolean(issues.custom)),
              ].join(" ")}
              placeholder="Describe what you'd like us to make"
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value);
                setIssues((p) => ({ ...p, custom: false }));
              }}
            />
          </div>
        ) : null}

        <div
          ref={samplesRef}
          className={
            issues.samples
              ? "rounded-lg ring-2 ring-red-500 ring-offset-2"
              : ""
          }
        >
          {!samplesOk ? (
            <p className="rounded-lg border border-[var(--accent)]/40 bg-[var(--gold-light)] px-4 py-3 text-sm font-medium text-[var(--text)]">
              Your cart includes samples that need a choice:{" "}
              {cart.samples.lumpiaQty > 0 && !cart.samples.lumpiaProtein
                ? "pick beef, pork, or turkey for lumpia samples. "
                : null}
              {cart.samples.pancitQty > 0 && !cart.samples.pancitType
                ? "pick chicken or shrimp for pancit samples."
                : null}
              Open the cart from the bag icon to finish.
            </p>
          ) : null}
        </div>

        {canSubmitOrder ? (
          <div className="rounded-xl border-2 border-[var(--primary)]/25 bg-[var(--bg-section)] p-4 text-left">
            <p className="text-sm font-semibold leading-relaxed text-[var(--text)]">
              Ready to submit? You&apos;ll see your <strong>order number</strong>{" "}
              and total <strong>${cart.total.toFixed(2)}</strong> on the next
              screen — use that number in your payment memo, then text us after
              you pay. Prep starts after payment is verified.
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Enter your details, choose pickup date and time, and resolve any sample
            choices (lumpia protein / pancit type) in your cart to continue.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-accent btn-block disabled:pointer-events-none disabled:opacity-40"
        >
          {loading ? "Submitting order…" : "Submit order & get order number"}
        </button>
      </div>
      <div className="min-w-0">
        <OrderSummary
          items={items}
          wantsUtensils={cart.wantsUtensils}
          utensilSets={cart.wantsUtensils ? cart.utensilSets : 0}
          utensilCharge={cart.utensilCharge}
          subtotal={cart.subtotalBeforeTax}
          tax={cart.tax}
          total={cart.total}
        />
      </div>
    </form>
  );
}
