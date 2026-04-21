import { getPublicSiteOrigin } from "@/lib/public-site-url";

/**
 * URL encoded on business-card QR codes (screen, print, PDF).
 * Optional override: `NEXT_PUBLIC_BUSINESS_CARD_QR_URL` (full URL with scheme).
 */
export function getBusinessCardQrUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BUSINESS_CARD_QR_URL?.trim();
  if (!raw) return getPublicSiteOrigin();
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withScheme);
    const href = `${u.origin}${u.pathname}${u.search}${u.hash}`;
    if (u.pathname === "/" && !u.search && !u.hash) {
      return u.origin;
    }
    return href.replace(/\/$/, "");
  } catch {
    return getPublicSiteOrigin();
  }
}
