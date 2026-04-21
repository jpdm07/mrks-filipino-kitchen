import { SITE } from "@/lib/config";

/** Left stack — FILIPINO KITCHEN (single line of caps in layout). */
export const BC_FILIPINO_KITCHEN_CARD = "FILIPINO KITCHEN";

/** Right panel headline (single uppercase line under gold rule). */
export const BC_RIGHT_HEADLINE = "MR. K'S FILIPINO KITCHEN";

/** Line 1 of left tagline block (Cormorant italic). */
export const BC_TAGLINE_MAIN = "Authentic Filipino Food";

/** Line 2 — location / pickup (Cormorant italic). */
export const BC_TAGLINE_LOCATION = "Cypress, TX · Pickup only";

/** Facebook row — readable label (not raw URL). */
export function facebookCardLabel(): string {
  return `Facebook · ${SITE.name}`;
}

/** Bottom-left queue labels (tracked uppercase). */
export const BC_ORDER_TRACKED = "ORDER";
export const BC_ONLINE_TRACKED = "ONLINE";
export const BC_SCAN_ARROW = "Scan →";

/** Alias for layouts that expected tracked uppercase block text. */
export const BC_FILIPINO_KITCHEN_TRACKED = BC_FILIPINO_KITCHEN_CARD;

/** Alias — tagline first line only (second line uses {@link BC_TAGLINE_LOCATION}). */
export const BC_BRAND_TAGLINE = BC_TAGLINE_MAIN;

/** Alias — right panel headline single line (no second line in new proof). */
export const BC_LEGAL_HEADLINE_LINE1 = BC_RIGHT_HEADLINE;
export const BC_LEGAL_HEADLINE_LINE2 = "";
