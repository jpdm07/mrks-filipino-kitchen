"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ShoppingBag, X, ChevronDown, ChevronUp } from "lucide-react";
import { useCart } from "./CartContext";
import { samplesSelectionComplete } from "@/lib/cart-types";
import { CartItemRow } from "./CartItem";
import {
  formatUtensilsCartOneLiner,
  salesTaxPercentLabel,
  utensilsPolicyHelpText,
} from "@/lib/config";
import { SalesTaxDisclosure } from "@/components/checkout/SalesTaxDisclosure";
import { CartPaymentMethodsStrip } from "@/components/payment/PaymentBrandIcons";
import {
  cartQualifiesForExtraDip,
  EXTRA_DIP_MAX_QTY,
  EXTRA_DIP_UNIT_PRICE_USD,
} from "@/lib/extra-dip-sauce";

export function CartDrawer() {
  const router = useRouter();
  const cart = useCart();
  const { drawerOpen, closeDrawer } = cart;
  const [mounted, setMounted] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(true);
  const [checkoutHint, setCheckoutHint] = useState<string | null>(null);
  const [highlightLumpiaSample, setHighlightLumpiaSample] = useState(false);
  const [highlightPancitSample, setHighlightPancitSample] = useState(false);
  const [lumpiaNeedProteinNudge, setLumpiaNeedProteinNudge] = useState(false);
  const [pancitNeedTypeNudge, setPancitNeedTypeNudge] = useState(false);
  const lumpiaSampleRef = useRef<HTMLDivElement>(null);
  const pancitSampleRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!drawerOpen) {
      setCheckoutHint(null);
      setHighlightLumpiaSample(false);
      setHighlightPancitSample(false);
      setLumpiaNeedProteinNudge(false);
      setPancitNeedTypeNudge(false);
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (cart.samples.lumpiaProtein) {
      setHighlightLumpiaSample(false);
      setLumpiaNeedProteinNudge(false);
    }
  }, [cart.samples.lumpiaProtein]);

  useEffect(() => {
    if (
      cart.samples.lumpiaQty > 0 &&
      !cart.samples.lumpiaProtein
    ) {
      setLumpiaNeedProteinNudge(false);
    }
  }, [cart.samples.lumpiaQty, cart.samples.lumpiaProtein]);

  useEffect(() => {
    if (cart.samples.pancitType) {
      setHighlightPancitSample(false);
      setPancitNeedTypeNudge(false);
    }
  }, [cart.samples.pancitType]);

  useEffect(() => {
    if (cart.samples.pancitQty > 0 && !cart.samples.pancitType) {
      setPancitNeedTypeNudge(false);
    }
  }, [cart.samples.pancitQty, cart.samples.pancitType]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen, closeDrawer]);

  if (!mounted || !drawerOpen) return null;

  const lumpPx = cart.samplePrices.lumpia;
  const lumpProt = cart.samples.lumpiaProtein;
  const lumpiaSampleTitle = lumpProt
    ? `Lumpia sample (4 pcs) · $${lumpPx[lumpProt].toFixed(2)} ea`
    : "Lumpia sample (4 pcs)";
  const lumpiaSampleSub = lumpProt
    ? "⅓ dozen at your protein’s cooked dozen price."
    : `Beef $${lumpPx.beef.toFixed(2)} · Pork $${lumpPx.pork.toFixed(2)} · Turkey $${lumpPx.turkey.toFixed(2)} each — choose protein below`;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[5000] cursor-default bg-black/40 backdrop-blur-sm print:hidden lg:bg-black/30"
        onClick={closeDrawer}
        aria-label="Close cart overlay"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="fixed inset-y-0 right-0 z-[5010] flex w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-2xl print:hidden"
        onClick={(e) => e.stopPropagation()}
      >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-[var(--primary)]" />
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--text)]">
                  Your Order
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="btn-icon h-11 w-11"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4">
              {cart.lines.length === 0 &&
              cart.samples.lumpiaQty === 0 &&
              cart.samples.quailQty === 0 &&
              cart.samples.flanQty === 0 &&
              cart.samples.pancitQty === 0 ? (
                <p className="py-12 text-center text-[var(--text-muted)]">
                  Your cart is empty. Browse the menu to add delicious Filipino
                  favorites!
                </p>
              ) : null}
              {cart.lines.map((line) => (
                <CartItemRow
                  key={line.id}
                  line={line}
                  onQty={(q) => cart.updateQuantity(line.id, q)}
                  onRemove={() => cart.removeLine(line.id)}
                />
              ))}

              <div className="my-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-section)]">
                <button
                  type="button"
                  onClick={() => setSamplesOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-[var(--text)]"
                >
                  <span>
                    Want to try something new?{" "}
                    <span className="block text-sm font-normal text-[var(--text-muted)]">
                      Add samples to your order
                    </span>
                  </span>
                  {samplesOpen ? (
                    <ChevronUp className="h-5 w-5 shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 shrink-0" />
                  )}
                </button>
                {samplesOpen ? (
                  <div className="space-y-4 border-t border-[var(--border)] px-4 py-4 text-sm">
                    <div ref={lumpiaSampleRef}>
                    <SampleRow
                      highlight={highlightLumpiaSample}
                      title={lumpiaSampleTitle}
                      subtitle={lumpiaSampleSub}
                      qty={cart.samples.lumpiaQty}
                      setQty={(n) => {
                        const next = Math.max(0, Math.min(10, n));
                        if (
                          next > 0 &&
                          !cart.samples.lumpiaProtein &&
                          next > cart.samples.lumpiaQty
                        ) {
                          setLumpiaNeedProteinNudge(true);
                          return;
                        }
                        setLumpiaNeedProteinNudge(false);
                        cart.setSamples((s) => ({ ...s, lumpiaQty: next }));
                      }}
                      max={10}
                      selectorsFirst
                    >
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          Choose protein first
                        </p>
                        <div className="mt-1 flex flex-wrap gap-3">
                          {(["beef", "pork", "turkey"] as const).map((p) => (
                            <label
                              key={p}
                              className="inline-flex cursor-pointer items-center gap-2"
                            >
                              <input
                                type="radio"
                                name="sample-lumpia"
                                checked={cart.samples.lumpiaProtein === p}
                                onChange={() =>
                                  cart.setSamples((s) => ({
                                    ...s,
                                    lumpiaProtein: p,
                                  }))
                                }
                              />
                              <span className="capitalize">{p}</span>
                            </label>
                          ))}
                        </div>
                        {lumpiaNeedProteinNudge ? (
                          <p
                            className="mt-2 text-sm font-medium text-red-600 dark:text-red-400"
                            role="alert"
                          >
                            Choose a protein (beef, pork, or turkey) before
                            increasing quantity.
                          </p>
                        ) : null}
                        {cart.samples.lumpiaQty > 0 &&
                        !cart.samples.lumpiaProtein ? (
                          <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                            Pick beef, pork, or turkey so we can price and pack
                            your samples.
                          </p>
                        ) : null}
                      </div>
                    </SampleRow>
                    </div>
                    <SampleRow
                      title={`Breaded quail sample (3 pcs) · $${cart.samplePrices.quail.toFixed(2)} ea`}
                      qty={cart.samples.quailQty}
                      setQty={(n) =>
                        cart.setSamples((s) => ({ ...s, quailQty: n }))
                      }
                      max={10}
                    />
                    <SampleRow
                      title={`Caramel Flan (Leche Flan) · $${cart.samplePrices.flan.toFixed(2)} ea`}
                      subtitle="Baked & served in a 5oz aluminum ramekin with clear lid; includes bag & napkin."
                      qty={cart.samples.flanQty}
                      setQty={(n) =>
                        cart.setSamples((s) => ({ ...s, flanQty: n }))
                      }
                      max={10}
                    />
                    <div ref={pancitSampleRef}>
                    <SampleRow
                      highlight={highlightPancitSample}
                      title={`Pancit sample (1 container) · $${cart.samplePrices.pancit.toFixed(2)} ea`}
                      subtitle="Small container · ~1 serving"
                      qty={cart.samples.pancitQty}
                      setQty={(n) => {
                        const next = Math.max(0, Math.min(10, n));
                        if (
                          next > 0 &&
                          !cart.samples.pancitType &&
                          next > cart.samples.pancitQty
                        ) {
                          setPancitNeedTypeNudge(true);
                          return;
                        }
                        setPancitNeedTypeNudge(false);
                        cart.setSamples((s) => ({ ...s, pancitQty: next }));
                      }}
                      max={10}
                      selectorsFirst
                    >
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          Chicken or shrimp
                        </p>
                        <div className="mt-1 flex flex-wrap gap-4">
                          {(["chicken", "shrimp"] as const).map((p) => (
                            <label
                              key={p}
                              className="inline-flex cursor-pointer items-center gap-2"
                            >
                              <input
                                type="radio"
                                name="sample-pancit"
                                checked={cart.samples.pancitType === p}
                                onChange={() =>
                                  cart.setSamples((s) => ({
                                    ...s,
                                    pancitType: p,
                                  }))
                                }
                              />
                              <span className="capitalize">{p}</span>
                            </label>
                          ))}
                        </div>
                        {pancitNeedTypeNudge ? (
                          <p
                            className="mt-2 text-sm font-medium text-red-600 dark:text-red-400"
                            role="alert"
                          >
                            Choose chicken or shrimp before increasing quantity.
                          </p>
                        ) : null}
                        {cart.samples.pancitQty > 0 &&
                        !cart.samples.pancitType ? (
                          <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                            Choose chicken or shrimp for pancit samples.
                          </p>
                        ) : null}
                      </div>
                    </SampleRow>
                    </div>
                  </div>
                ) : null}
              </div>

              {cartQualifiesForExtraDip(cart.lines, cart.samples) ? (
                <div className="mb-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
                  <p className="font-semibold text-[var(--text)]">
                    Extra dipping sauce
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    ${EXTRA_DIP_UNIT_PRICE_USD.toFixed(2)} per 2 oz cup — for the
                    lumpia, quail, tocino plates, adobo, or samples in your cart.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">How many extra?</span>
                    <button
                      type="button"
                      className="btn-qty"
                      onClick={() =>
                        cart.setExtraDipSauceQty((q) =>
                          Math.max(0, q - 1)
                        )
                      }
                      aria-label="Remove one extra dipping sauce"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-bold">
                      {cart.extraDipSauceQty}
                    </span>
                    <button
                      type="button"
                      className="btn-qty"
                      onClick={() =>
                        cart.setExtraDipSauceQty((q) =>
                          Math.min(EXTRA_DIP_MAX_QTY, q + 1)
                        )
                      }
                      aria-label="Add one extra dipping sauce"
                    >
                      +
                    </button>
                    {cart.extraDipSauceQty > 0 ? (
                      <span className="text-sm font-semibold text-[var(--primary)]">
                        +$
                        {(
                          cart.extraDipSauceQty * EXTRA_DIP_UNIT_PRICE_USD
                        ).toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="mb-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--gold-light)]/40 p-4">
                <p className="font-semibold text-[var(--text)]">
                  🍴 Utensils
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                  {utensilsPolicyHelpText()}
                </p>
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)]/60 bg-white/50 px-3 py-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)]"
                    checked={cart.wantsUtensils}
                    onChange={(e) => {
                      const on = e.target.checked;
                      cart.setWantsUtensils(on);
                      if (on) {
                        cart.setUtensilSets((s) => (s < 1 ? 1 : s));
                      } else {
                        cart.setUtensilSets(0);
                      }
                    }}
                  />
                  <span>
                    <span className="font-semibold text-[var(--text)]">
                      Include utensils with my order
                    </span>
                    <span className="mt-1 block text-sm leading-snug text-[var(--text-muted)]">
                      Check this to request utensils. Use the counter for how many
                      sets you need for your group — your first set is free.
                    </span>
                  </span>
                </label>
                {cart.wantsUtensils ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 pl-7">
                    <span className="text-sm font-medium text-[var(--text)]">
                      How many sets total?
                    </span>
                    <button
                      type="button"
                      className="btn-qty"
                      onClick={() =>
                        cart.setUtensilSets(
                          Math.max(1, cart.utensilSets - 1)
                        )
                      }
                      aria-label="Remove one utensil set"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-bold">
                      {cart.utensilSets}
                    </span>
                    <button
                      type="button"
                      className="btn-qty"
                      onClick={() =>
                        cart.setUtensilSets(
                          Math.min(50, cart.utensilSets + 1)
                        )
                      }
                      aria-label="Add one utensil set"
                    >
                      +
                    </button>
                  </div>
                ) : null}
                <p className="mt-4 text-sm text-[var(--text)]">
                  <span className="font-semibold">Utensils: </span>
                  <span className="text-[var(--text-muted)]">
                    {formatUtensilsCartOneLiner(
                      cart.wantsUtensils,
                      cart.utensilSets,
                      cart.utensilCharge,
                      cart.complimentaryUtensilAllowance
                    )}
                  </span>
                </p>
              </div>

              <CartPaymentMethodsStrip />
            </div>

            <div className="border-t border-[var(--border)] bg-[var(--bg)] p-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal (items + utensils)</span>
                  <span>${cart.subtotalBeforeTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Tax ({salesTaxPercentLabel()})</span>
                  <span>${cart.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-[var(--border)] pt-2 text-lg font-bold text-[var(--primary)]">
                  <span>Total</span>
                  <span>${cart.total.toFixed(2)}</span>
                </div>
                <SalesTaxDisclosure className="mt-3" />
              </div>
              {checkoutHint ? (
                <p className="mt-3 rounded-lg border border-[var(--accent)]/40 bg-[var(--gold-light)] px-3 py-2 text-sm font-medium text-[var(--text)]">
                  {checkoutHint}
                </p>
              ) : null}
              <button
                type="button"
                className="btn btn-gold btn-block btn-sm mt-4"
                onClick={() => {
                  setHighlightLumpiaSample(false);
                  setHighlightPancitSample(false);
                  if (!samplesSelectionComplete(cart.samples)) {
                    setSamplesOpen(true);
                    if (
                      cart.samples.lumpiaQty > 0 &&
                      !cart.samples.lumpiaProtein
                    ) {
                      setCheckoutHint(
                        "Choose beef, pork, or turkey for lumpia samples before going to checkout."
                      );
                      setHighlightLumpiaSample(true);
                      window.setTimeout(() => {
                        lumpiaSampleRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }, 100);
                      return;
                    }
                    if (
                      cart.samples.pancitQty > 0 &&
                      !cart.samples.pancitType
                    ) {
                      setCheckoutHint(
                        "Choose chicken or shrimp for pancit samples before checkout."
                      );
                      setHighlightPancitSample(true);
                      window.setTimeout(() => {
                        pancitSampleRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }, 100);
                      return;
                    }
                  }
                  setCheckoutHint(null);
                  closeDrawer();
                  const qs = new URLSearchParams(
                    typeof window !== "undefined" ? window.location.search : ""
                  );
                  const pd =
                    qs.get("pickupDate")?.trim() || qs.get("date")?.trim() || "";
                  router.push(
                    pd
                      ? `/order?pickupDate=${encodeURIComponent(pd)}`
                      : "/order"
                  );
                }}
              >
                Proceed to Checkout
              </button>
            </div>
          </aside>
    </>,
    document.body
  );
}

function SampleRow({
  title,
  subtitle,
  qty,
  setQty,
  max,
  children,
  selectorsFirst,
  highlight,
}: {
  title: string;
  subtitle?: string;
  qty: number;
  setQty: (n: number) => void;
  max: number;
  children?: React.ReactNode;
  /** Put radio/check rows under the subtitle (before qty on wide layouts). */
  selectorsFirst?: boolean;
  /** Red outline when checkout blocked on this row. */
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-lg border bg-white p-3 transition-shadow",
        highlight
          ? "border-red-500 ring-2 ring-red-500 ring-offset-2"
          : "border-[var(--border)]",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          {subtitle ? (
            <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
          {selectorsFirst && children ? (
            <div className="mt-2">{children}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Qty</span>
          <button
            type="button"
            className="btn-qty"
            onClick={() => setQty(Math.max(0, qty - 1))}
          >
            −
          </button>
          <span className="w-6 text-center font-bold">{qty}</span>
          <button
            type="button"
            className="btn-qty"
            onClick={() => setQty(Math.min(max, qty + 1))}
          >
            +
          </button>
        </div>
      </div>
      {!selectorsFirst && children ? (
        <div className="mt-2">{children}</div>
      ) : null}
    </div>
  );
}
