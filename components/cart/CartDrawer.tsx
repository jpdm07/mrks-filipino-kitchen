"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ShoppingBag, X, ChevronDown, ChevronUp } from "lucide-react";
import { useCart } from "./CartContext";
import { samplesSelectionComplete } from "@/lib/cart-types";
import { CartItemRow } from "./CartItem";
import { PRICING, salesTaxPercentLabel } from "@/lib/config";
import { SalesTaxDisclosure } from "@/components/checkout/SalesTaxDisclosure";

export function CartDrawer() {
  const router = useRouter();
  const cart = useCart();
  const { drawerOpen, closeDrawer } = cart;
  const [mounted, setMounted] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(true);
  const [checkoutHint, setCheckoutHint] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!drawerOpen) setCheckoutHint(null);
  }, [drawerOpen]);

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
                    <SampleRow
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
                          return;
                        }
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
                        {cart.samples.lumpiaQty > 0 &&
                        !cart.samples.lumpiaProtein ? (
                          <p className="mt-2 text-xs font-medium text-[var(--accent)]">
                            Pick beef, pork, or turkey so we can price and pack
                            your samples.
                          </p>
                        ) : null}
                      </div>
                    </SampleRow>
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
                    <SampleRow
                      title={`Pancit sample (1 container) · $${cart.samplePrices.pancit.toFixed(2)} ea`}
                      subtitle="Small foil container · ~1 serving"
                      qty={cart.samples.pancitQty}
                      setQty={(n) => {
                        const next = Math.max(0, Math.min(10, n));
                        if (
                          next > 0 &&
                          !cart.samples.pancitType &&
                          next > cart.samples.pancitQty
                        ) {
                          return;
                        }
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
                        {cart.samples.pancitQty > 0 &&
                        !cart.samples.pancitType ? (
                          <p className="mt-2 text-xs font-medium text-[var(--accent)]">
                            Choose chicken or shrimp for pancit samples.
                          </p>
                        ) : null}
                      </div>
                    </SampleRow>
                  </div>
                ) : null}
              </div>

              <div className="mb-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--gold-light)]/40 p-4">
                <p className="font-semibold text-[var(--text)]">
                  🍴 Need Utensils? (Fork + Knife + Spoon)
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Each set: ${PRICING.UTENSIL_PER_SET.toFixed(2)}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="utensils"
                      checked={!cart.wantsUtensils}
                      onChange={() => {
                        cart.setWantsUtensils(false);
                        cart.setUtensilSets(0);
                      }}
                    />
                    No thanks
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="utensils"
                      checked={cart.wantsUtensils}
                      onChange={() => {
                        cart.setWantsUtensils(true);
                        cart.setUtensilSets((s) => (s < 1 ? 1 : s));
                      }}
                    />
                    Yes, add sets
                  </label>
                </div>
                {cart.wantsUtensils ? (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm font-medium">How many sets?</span>
                    <button
                      type="button"
                      className="btn-qty"
                      onClick={() =>
                        cart.setUtensilSets(
                          Math.max(1, cart.utensilSets - 1)
                        )
                      }
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
                    >
                      +
                    </button>
                  </div>
                ) : null}
                <p className="mt-3 text-sm font-semibold text-[var(--text)]">
                  Utensil charge:{" "}
                  {cart.wantsUtensils && cart.utensilSets > 0
                    ? `${cart.utensilSets} sets × $${PRICING.UTENSIL_PER_SET.toFixed(2)} = $${cart.utensilCharge.toFixed(2)}`
                    : "None"}
                </p>
              </div>

              <label className="mb-3 flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cart.newsletterOptIn}
                  onChange={(e) => cart.setNewsletterOptIn(e.target.checked)}
                  className="mt-1"
                />
                Keep me updated on new menu items and specials
              </label>
              <label className="mb-8 flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cart.recurringInterest}
                  onChange={(e) =>
                    cart.setRecurringInterest(e.target.checked)
                  }
                  className="mt-1"
                />
                I&apos;m interested in bi-weekly recurring bulk orders
              </label>
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
                  if (!samplesSelectionComplete(cart.samples)) {
                    setSamplesOpen(true);
                    if (
                      cart.samples.lumpiaQty > 0 &&
                      !cart.samples.lumpiaProtein
                    ) {
                      setCheckoutHint(
                        "Choose beef, pork, or turkey for lumpia samples before going to checkout."
                      );
                      return;
                    }
                    if (
                      cart.samples.pancitQty > 0 &&
                      !cart.samples.pancitType
                    ) {
                      setCheckoutHint(
                        "Choose chicken or shrimp for pancit samples before checkout."
                      );
                      return;
                    }
                  }
                  setCheckoutHint(null);
                  closeDrawer();
                  router.push("/order");
                }}
              >
                Proceed to Order
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
}: {
  title: string;
  subtitle?: string;
  qty: number;
  setQty: (n: number) => void;
  max: number;
  children?: React.ReactNode;
  /** Put radio/check rows under the subtitle (before qty on wide layouts). */
  selectorsFirst?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-3">
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
