"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { OrderSummary } from "./OrderSummary";
import { PickupCalendar } from "./PickupCalendar";
import { samplesSelectionComplete } from "@/lib/cart-types";
import {
  isWellFormedPickupYMD,
  pickupDateRejectedMessage,
} from "@/lib/pickup-lead-time";
import { isPickupYmdAllowedForOrderCart } from "@/lib/kitchen-schedule";
import {
  cartHasOnlyFlanItems,
  totalCookContribution,
} from "@/lib/menu-cook-capacity";
import { AcceptedPaymentMethods } from "@/components/checkout/AcceptedPaymentMethods";
import {
  hasValidPhoneDigits,
  isValidEmail,
} from "@/lib/checkout-contact-validation";
import { playOrderSubmitClick } from "@/lib/checkout-ui-sounds";
import { sortPickupSlotLabels } from "@/lib/pickup-time-slots";

type CheckoutIssueKey =
  | "name"
  | "phone"
  | "email"
  | "payment"
  | "pickup"
  | "time"
  | "samples";

type CheckoutIssues = Partial<Record<CheckoutIssueKey, boolean>>;

/** Keeps every checkout checkbox the same size and top offset for a straight left edge. */
const checkoutCheckboxInputClass =
  "mt-0.5 h-5 w-5 shrink-0 rounded border-[var(--border)] text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30";

const checkoutCheckboxLabelClass =
  "flex cursor-pointer items-start gap-3 text-sm text-[var(--text)]";

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
  const appliedUrlPickup = useRef(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [notes, setNotes] = useState("");
  const [wantsPrintedReceipt, setWantsPrintedReceipt] = useState(false);
  /** Customer acknowledges payment rules (memo with order #; verified at pickup). */
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
    () => cart.buildOrderItems(),
    [cart]
  );

  const cartFlanOnly = useMemo(() => cartHasOnlyFlanItems(items), [items]);
  const cookNeed = useMemo(() => totalCookContribution(items), [items]);

  const [capacityWeeks, setCapacityWeeks] = useState<
    Array<{
      weekStart: string;
      mainSoldOut: boolean;
      mainCookRemaining: number;
      flanRemaining: number;
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/capacity/weeks", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        setCapacityWeeks(
          data.map((w: Record<string, unknown>) => ({
            weekStart: String(w.weekStart ?? ""),
            mainSoldOut: Boolean(w.mainSoldOut),
            mainCookRemaining: Number(w.mainCookRemaining ?? 0),
            flanRemaining: Number(w.flanRemaining ?? 0),
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setCapacityWeeks([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (appliedUrlPickup.current) return;
    const raw = searchParams.get("pickupDate") ?? searchParams.get("date");
    if (!raw || !isWellFormedPickupYMD(raw)) return;
    appliedUrlPickup.current = true;
    const d = raw.trim();
    const flanOnly = cartHasOnlyFlanItems(items);
    if (!isPickupYmdAllowedForOrderCart(d, flanOnly)) {
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
  }, [searchParams, items]);

  useEffect(() => {
    if (!pickupDate) {
      setSlotOptions([]);
      setPickupTime("");
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    const mode = cartFlanOnly ? "flan" : "mixed";
    const qs = new URLSearchParams({
      cartMode: mode,
      mainNeed: String(cookNeed.mainMinutes),
      flanNeed: String(cookNeed.flanRamekins),
    });
    fetch(
      `/api/availability/${encodeURIComponent(pickupDate)}?${qs.toString()}`
    )
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
        const slots = sortPickupSlotLabels(
          Array.isArray(j.slots)
            ? j.slots.filter((x): x is string => typeof x === "string")
            : []
        );
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
  }, [pickupDate, cartFlanOnly, cookNeed.mainMinutes, cookNeed.flanRamekins]);

  const emailOk = isValidEmail(email);
  const phoneOk = hasValidPhoneDigits(phone);

  const basicsOk =
    name.trim() &&
    phoneOk &&
    emailOk &&
    pickupDate &&
    pickupTime &&
    slotOptions.includes(pickupTime) &&
    isPickupYmdAllowedForOrderCart(pickupDate, cartFlanOnly) &&
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
    if (!phone.trim() || !hasValidPhoneDigits(phone)) next.phone = true;
    if (!email.trim() || !isValidEmail(email)) next.email = true;
    if (!paymentMemoAck) next.payment = true;

    if (!pickupDate?.trim() || !isWellFormedPickupYMD(pickupDate)) {
      next.pickup = true;
    } else if (!isPickupYmdAllowedForOrderCart(pickupDate, cartFlanOnly)) {
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

    if (Object.keys(next).length > 0) {
      setIssues(next);
      const parts: string[] = [];
      if (next.name || next.phone || next.email) {
        const bits: string[] = [];
        if (next.name) bits.push("your name");
        if (next.phone) {
          bits.push(
            !phone.trim()
              ? "a phone number"
              : "a phone number with at least 10 digits"
          );
        }
        if (next.email) {
          bits.push(
            !email.trim()
              ? "an email address"
              : "a valid email address (include @ and domain)"
          );
        }
        parts.push(`Please provide ${bits.join(", ")}.`);
      }
      if (next.payment) {
        parts.push(
          "Please confirm you will put your order number in the Venmo, Zelle, or Cash App memo when you pay (Mr. K will match it with you at pickup)."
        );
      }
      if (
        next.pickup &&
        pickupDate &&
        !isPickupYmdAllowedForOrderCart(pickupDate, cartFlanOnly)
      ) {
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
      setErr(parts.filter(Boolean).join("\n\n"));
      scrollToFirstIssue(next);
      return;
    }

    playOrderSubmitClick();
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
        customInquiry: null,
        subscribeUpdates: cart.newsletterOptIn,
        wantsPrintedReceipt,
        ...(showDemoCheckout && checkoutDemo ? { isDemo: true } : {}),
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      devHint?: string;
      devDetail?: string;
      devCode?: string | null;
      prismaCode?: string | null;
      orderNumber?: string;
      ownerEmailSent?: boolean;
      ownerEmailHint?: string;
      customerOrderEmailSent?: boolean;
      customerOrderEmailHint?: string;
    };
    setLoading(false);
    if (!res.ok) {
      const msg = data.error ?? "Order failed";
      const hint =
        typeof data.devHint === "string" && data.devHint.trim()
          ? data.devHint.trim()
          : "";
      const devExtra =
        typeof data.devDetail === "string" && data.devDetail.trim()
          ? `\n\n[debug] ${data.devCode ? `${data.devCode}: ` : ""}${data.devDetail.trim()}`
          : "";
      const prismaHint =
        typeof data.prismaCode === "string" && data.prismaCode.trim()
          ? `\n\n(Error code: ${data.prismaCode.trim()})`
          : "";
      setErr(
        hint || devExtra || prismaHint
          ? `${msg}${hint ? `\n\n${hint}` : ""}${devExtra}${prismaHint}`
          : msg
      );
      return;
    }
    if (!data.orderNumber) {
      setErr("Order placed but confirmation number missing. Please contact us.");
      return;
    }
    if (data.ownerEmailSent === false) {
      const hint =
        typeof data.ownerEmailHint === "string" && data.ownerEmailHint.trim()
          ? ` Server says: ${data.ownerEmailHint.trim()}`
          : "";
      console.warn(
        `[checkout] Order saved but kitchen email was not sent.${hint} Open Network → POST /api/orders → Response for ownerEmailHint. On Vercel set EMAIL_USER + EMAIL_PASSWORD (Gmail: also EMAIL_SMTP_HOST=smtp.gmail.com, PORT=587, SECURE=false).`
      );
    }
    if (data.customerOrderEmailSent === false) {
      const hint =
        typeof data.customerOrderEmailHint === "string" &&
        data.customerOrderEmailHint.trim()
          ? ` Server says: ${data.customerOrderEmailHint.trim()}`
          : "";
      console.warn(
        `[checkout] Order saved but your confirmation email was not sent.${hint} Check POST /api/orders → customerOrderEmailHint. Same mail env as kitchen (Resend or SMTP).`
      );
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
      autoComplete="on"
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
            That link&apos;s date isn&apos;t open for this cart — pick another day.
          </p>
        ) : null}
        {capacityWeeks[0] && !cartFlanOnly && capacityWeeks[0].mainSoldOut ? (
          <p className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-2 text-sm font-medium text-[var(--text)]">
            This week is full — choose a Fri or Sat below.
          </p>
        ) : null}
        {capacityWeeks[0] &&
        !cartFlanOnly &&
        !capacityWeeks[0].mainSoldOut &&
        capacityWeeks[0].mainCookRemaining > 0 &&
        capacityWeeks[0].mainCookRemaining < 60 ? (
          <p className="rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
            Limited spots left this week.
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
          <label
            className="block text-sm font-semibold"
            htmlFor="checkout-customer-name"
          >
            Customer name *
            <input
              id="checkout-customer-name"
              name="customerName"
              type="text"
              autoComplete="name"
              enterKeyHint="next"
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
          <label className="block text-sm font-semibold" htmlFor="checkout-phone">
            Phone *
            <input
              id="checkout-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              enterKeyHint="next"
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
            {phone.trim() && !hasValidPhoneDigits(phone) ? (
              <span className="mt-1 block text-xs font-medium text-red-700">
                At least 10 digits, including area code.
              </span>
            ) : null}
          </label>
          <label className="block text-sm font-semibold" htmlFor="checkout-email">
            Email *
            <input
              id="checkout-email"
              name="email"
              type="email"
              autoComplete="billing email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
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
            {email.trim() && !isValidEmail(email) ? (
              <span className="mt-1 block text-xs font-medium text-red-700">
                Check the format (e.g. name@domain.com).
              </span>
            ) : null}
          </label>
        </div>

        <div
          ref={paymentRef}
          className={[
            "space-y-3 rounded-xl border bg-[var(--card)] p-4 shadow-sm",
            issues.payment
              ? "border-red-500 ring-2 ring-red-500/40"
              : "border-[var(--border)]",
          ].join(" ")}
        >
          <AcceptedPaymentMethods variant="checkout" />
          {showDemoCheckout ? (
            <label
              className={`${checkoutCheckboxLabelClass} rounded-lg border border-dashed border-amber-500/60 bg-amber-50/80 px-3 py-2 font-medium`}
            >
              <input
                type="checkbox"
                className={checkoutCheckboxInputClass}
                checked={checkoutDemo}
                onChange={(e) => setCheckoutDemo(e.target.checked)}
              />
              <span className="min-w-0 leading-snug">
                <strong>Demo order</strong> — skipped in finances &amp; Sheets;
                delete anytime in admin.
              </span>
            </label>
          ) : null}
          <label className={`${checkoutCheckboxLabelClass} font-medium`}>
            <input
              type="checkbox"
              className={checkoutCheckboxInputClass}
              checked={paymentMemoAck}
              onChange={(e) => {
                setPaymentMemoAck(e.target.checked);
                if (e.target.checked) setIssues((p) => ({ ...p, payment: false }));
              }}
            />
            <span className="min-w-0 leading-snug">
              My order isn&apos;t final until I pay on the next page. I&apos;ll put my
              order number in the Venmo, Zelle, or Cash App memo when I pay so Mr. K
              can match it
              with me at pickup.
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
            Times shown in Central Time.
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
              cartMode={cartFlanOnly ? "flan" : "mixed"}
              mainCookNeed={cookNeed.mainMinutes}
              flanRamekinsNeed={cookNeed.flanRamekins}
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
                No slots this day — choose another date.
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

        <label
          className="block text-sm font-semibold"
          htmlFor="checkout-notes"
        >
          Notes for the kitchen (optional)
          <textarea
            id="checkout-notes"
            name="orderNotes"
            rows={3}
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <div className="space-y-2 rounded-lg border border-[var(--border)]/80 bg-[var(--card)]/60 py-3 text-sm">
          <p className="px-3 leading-snug text-[var(--text-muted)]">
            After we confirm your order, we&apos;ll email a{" "}
            <span className="font-semibold text-[var(--text)]">digital receipt</span>{" "}
            to the address above.
          </p>
          <label className={`${checkoutCheckboxLabelClass} pr-3`}>
            <input
              type="checkbox"
              className={checkoutCheckboxInputClass}
              checked={wantsPrintedReceipt}
              onChange={(e) => setWantsPrintedReceipt(e.target.checked)}
            />
            <span className="min-w-0 leading-snug">
              Also include a printed receipt with pickup
            </span>
          </label>
        </div>
        <label className={checkoutCheckboxLabelClass}>
          <input
            type="checkbox"
            className={checkoutCheckboxInputClass}
            checked={cart.newsletterOptIn}
            onChange={(e) => cart.setNewsletterOptIn(e.target.checked)}
          />
          <span className="min-w-0 leading-snug">Email me menu updates &amp; specials</span>
        </label>
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
              Samples need a choice:{" "}
              {cart.samples.lumpiaQty > 0 && !cart.samples.lumpiaProtein
                ? "lumpia — beef, pork, or turkey. "
                : null}
              {cart.samples.pancitQty > 0 && !cart.samples.pancitType
                ? "pancit — chicken or shrimp."
                : null}{" "}
              Open the cart (bag icon) to fix.
            </p>
          ) : null}
        </div>

        {!canSubmitOrder ? (
          <p className="text-sm text-[var(--text-muted)]">
            Fill contact + pickup, tick the payment line, and fix any sample
            picks in the cart.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || !canSubmitOrder}
          className="btn btn-accent btn-block disabled:pointer-events-none disabled:opacity-40"
        >
          {loading ? "Submitting…" : "Submit Order"}
        </button>
      </div>
      <div className="min-w-0">
        <OrderSummary
          items={items}
          wantsUtensils={cart.wantsUtensils}
          utensilSets={cart.wantsUtensils ? cart.utensilSets : 0}
          utensilCharge={cart.utensilCharge}
          complimentaryUtensilAllowance={cart.complimentaryUtensilAllowance}
          subtotal={cart.subtotalBeforeTax}
          tax={cart.tax}
          total={cart.total}
        />
      </div>
    </form>
  );
}
