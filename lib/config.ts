import { CANONICAL_SITE_ORIGIN } from "@/lib/public-site-url";

export const PRICING = {
  UTENSIL_PER_SET: 0.75,
  UTENSIL_COST_MRK: 0.095,
  /**
   * Texas sales & use tax on the customer’s taxable sale (order subtotal).
   * 8.25% is the usual combined rate for Cypress, TX 77433 (6.25% state + local/special).
   * Confirm or update via the Texas Comptroller if your jurisdiction or rules change.
   */
  TAX_RATE: 0.0825,
} as const;

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
  email: "jpdm07@yahoo.com",
  location: "Cypress, TX 77433",
  facebookUrl:
    "https://www.facebook.com/people/Mr-Ks/61587453610719/",
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
