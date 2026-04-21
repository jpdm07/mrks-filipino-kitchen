import { SITE } from "@/lib/config";

/**
 * Display copy aligned with the approved business-card PDF (tracked typography).
 */

/** Right column headline — spaced capitals (matches print proof). */
export const BC_LEGAL_HEADLINE_TRACKED =
  "M R . K ’ S   F I L I P I N O   K I T C H E N";

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
