import { SITE } from "@/lib/config";

/**
 * Display copy aligned with the approved business-card PDF (tracked typography).
 */

/**
 * Right column headline — spaced capitals (matches print proof).
 * Two lines: typical InDesign business card line break after "FILIPINO".
 */
export const BC_LEGAL_HEADLINE_LINE1 = "M R . K ’ S   F I L I P I N O";
export const BC_LEGAL_HEADLINE_LINE2 = "K I T C H E N";

/** Full string (e.g. single-line fallbacks, search). */
export const BC_LEGAL_HEADLINE_TRACKED = `${BC_LEGAL_HEADLINE_LINE1}   ${BC_LEGAL_HEADLINE_LINE2}`;

/** Left panel: second tracked line under “Mr. K’s✦”. */
export const BC_FILIPINO_KITCHEN_TRACKED = "F I L I P I N O   K I T C H E N";

/** Left panel tagline (print proof says “Food”, not “Kitchen”). */
export const BC_BRAND_TAGLINE = "Authentic Filipino Food";

/** Facebook row — readable label (not raw URL). */
export function facebookCardLabel(): string {
  return `Facebook · ${SITE.name}`;
}

/** QR column — matches print proof. */
export const BC_ORDER_TRACKED = "O R D E R";
export const BC_ONLINE_TRACKED = "O N L I N E";
export const BC_SCAN_ARROW = "Scan →";
