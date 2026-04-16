import { getFacebookPageUrl } from "@/lib/facebook-url";
import { CANONICAL_SITE_ORIGIN } from "@/lib/public-site-url";

export const PRICING = {
  /** Per paid set after complimentary allowance (fork + knife + spoon). */
  UTENSIL_PER_SET: 0.25,
  /** Included free when the customer opts in to utensils (per order). */
  COMPLIMENTARY_UTENSIL_SETS_PER_ORDER: 1,
  UTENSIL_COST_MRK: 0.095,
  /**
   * Texas sales & use tax on the customer’s taxable sale (order subtotal).
   * 8.25% is the usual combined rate for Cypress, TX 77433 (6.25% state + local/special).
   * Confirm or update via the Texas Comptroller if your jurisdiction or rules change.
   */
  TAX_RATE: 0.0825,
} as const;

/** Billable utensil fee: first `complimentarySets` requested sets are $0 (see `lib/utensils-allowance.ts`). */
export function computeUtensilChargeUsd(
  wantsUtensils: boolean,
  utensilSets: number,
  complimentarySets: number = PRICING.COMPLIMENTARY_UTENSIL_SETS_PER_ORDER
): number {
  if (!wantsUtensils) return 0;
  const sets = Math.min(50, Math.max(0, Math.floor(utensilSets)));
  if (sets <= 0) return 0;
  const freeCap = Math.min(50, Math.max(0, Math.floor(complimentarySets)));
  const freeApplied = Math.min(freeCap, sets);
  const billable = sets - freeApplied;
  return Math.round(billable * PRICING.UTENSIL_PER_SET * 100) / 100;
}

/** Short policy line for cart / checkout. */
export function utensilsPolicyHelpText(): string {
  const u = PRICING.UTENSIL_PER_SET;
  const cents = Math.round(u * 100);
  const n = PRICING.COMPLIMENTARY_UTENSIL_SETS_PER_ORDER;
  return `We include at least ${n} complimentary set per order (fork, knife, spoon), plus 1 per ready-made tocino plate, per single pancit serving, and per pancit sample. Each set beyond that total is ${cents}¢ ($${u.toFixed(2)}).`;
}

/**
 * Cart, checkout summary, and confirmation — one line (no “Utensils:” prefix).
 * `charge` must match {@link computeUtensilChargeUsd}(wants, sets, complimentarySets).
 */
export function formatUtensilsCartOneLiner(
  wantsUtensils: boolean,
  sets: number,
  charge: number,
  complimentarySets: number = PRICING.COMPLIMENTARY_UTENSIL_SETS_PER_ORDER
): string {
  if (!wantsUtensils || sets <= 0) return "None";
  if (charge <= 0) {
    return `${sets} set${sets === 1 ? "" : "s"} — complimentary`;
  }
  const freeCap = Math.max(0, Math.floor(complimentarySets));
  const freeApplied = Math.min(freeCap, sets);
  const paidApplied = sets - freeApplied;
  return `${sets} sets (${freeApplied} complimentary + ${paidApplied} × $${PRICING.UTENSIL_PER_SET.toFixed(2)}) = $${charge.toFixed(2)}`;
}

/** Checkout summary line under the price (avoids repeating the dollar amount). */
export function formatUtensilsCheckoutSubtext(
  wantsUtensils: boolean,
  sets: number,
  charge: number,
  complimentarySets: number = PRICING.COMPLIMENTARY_UTENSIL_SETS_PER_ORDER
): string | null {
  if (!wantsUtensils || sets <= 0) return null;
  if (charge <= 0) {
    return `${sets} set${sets === 1 ? "" : "s"} — complimentary with your order.`;
  }
  const freeCap = Math.max(0, Math.floor(complimentarySets));
  const freeApplied = Math.min(freeCap, sets);
  const paidApplied = sets - freeApplied;
  return `${freeApplied} set${freeApplied === 1 ? "" : "s"} included; ${paidApplied} extra at $${PRICING.UTENSIL_PER_SET.toFixed(2)} each.`;
}

/** Owner / confirmation copy (includes “Utensils:” prefix). */
export function formatUtensilsOwnerLine(
  wantsUtensils: boolean,
  sets: number,
  charge: number,
  complimentarySets: number = PRICING.COMPLIMENTARY_UTENSIL_SETS_PER_ORDER
): string {
  if (!wantsUtensils || sets <= 0) return "Utensils: none";
  if (charge <= 0) {
    return `Utensils: ${sets} set${sets === 1 ? "" : "s"} (complimentary)`;
  }
  const freeCap = Math.max(0, Math.floor(complimentarySets));
  const freeApplied = Math.min(freeCap, sets);
  const paidApplied = sets - freeApplied;
  return `Utensils: ${sets} sets — $${charge.toFixed(2)} (${freeApplied} complimentary + ${paidApplied} paid)`;
}

/** Label for receipts/UI, always in sync with PRICING.TAX_RATE. */
export function salesTaxPercentLabel(): string {
  return `${(PRICING.TAX_RATE * 100).toFixed(2)}%`;
}

export const SITE = {
  name: "Mr. K's Filipino Kitchen",
  /** Apex URL — matches business cards and QR codes (see `lib/public-site-url.ts`). */
  publicUrl: CANONICAL_SITE_ORIGIN,
  phoneDisplay: "979-703-3827",
  phoneTel: "tel:+19797033827",
  /** Public inbox — contact page, footer, printable menu, business card (screen + PDF). */
  email: "mrksfilipinokitchen@gmail.com",
  location: "Cypress, TX 77433",
  /** Canonical Page URL — see `lib/facebook-url.ts` (mobile-safe default). */
  facebookUrl: getFacebookPageUrl(),
} as const;

/**
 * Pickup date rules for web orders (min date on the picker + API validation).
 * Earliest selectable pickup is the first Friday or Saturday on or after
 * “today” in PICKUP_TIMEZONE (same week when you order Wed–Thu).
 */
export const ORDER_FULFILLMENT = {
  PICKUP_TIMEZONE: "America/Chicago",
} as const;

/** Zelle / Venmo checkout copy (no card processing). */
export const PAYMENT_INSTRUCTIONS = {
  zellePhone: "979-703-3827",
  /** Display handle for Venmo (set NEXT_PUBLIC_VENMO_HANDLE in .env.local). */
  venmoHandle: process.env.NEXT_PUBLIC_VENMO_HANDLE ?? "@jpdm07",
} as const;

export const SUGGESTION_OPTIONS = [
  "Sinigang (Pork or Shrimp)",
  "Kare-Kare",
  "Halo-Halo",
] as const;
