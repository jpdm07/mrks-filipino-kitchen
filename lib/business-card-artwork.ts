/**
 * Pixel-perfect business card: export **one** 3.5"×2" face from your proof (PNG or JPG)
 * and save as `public/images/mrks-business-card-face.png` (or `.jpg` — set path below).
 * Leave a clear area for the QR in the lower-right of the white panel, or we overlay on top.
 *
 * Dimensions: 336×192 CSS px (96 dpi) or 2× for sharper retina — `object-cover` scales down.
 */

export const BUSINESS_CARD_FACE_SRC =
  process.env.NEXT_PUBLIC_BUSINESS_CARD_FACE_SRC?.trim() ||
  "/images/mrks-business-card-face.png";

/**
 * Absolute URL for fetch/HEAD and @react-pdf Image (browser only).
 * Supports `https://…`, protocol-relative `//…`, and site-root paths like `/images/…`.
 */
export function absoluteBusinessCardFaceUrl(): string {
  if (typeof window === "undefined") return "";
  const src = BUSINESS_CARD_FACE_SRC.trim();
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("//")) return `${window.location.protocol}${src}`;
  const path = src.startsWith("/") ? src : `/${src}`;
  return `${window.location.origin}${path}`;
}

/** QR overlay on the 336×192 px card (tune if your proof’s QR slot differs). */
export const BC_ART_QR_SIZE_PX = 46;
export const BC_ART_QR_RIGHT_PX = 10;
export const BC_ART_QR_BOTTOM_PX = 14;
