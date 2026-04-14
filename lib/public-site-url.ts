/**
 * Canonical public site origin for QR codes, emails, metadata, and absolute links.
 * Matches printed materials (business cards) at https://mrkskitchen.com
 *
 * Set `NEXT_PUBLIC_SITE_URL` in Vercel / `.env.local` to the same value in production.
 */
export const CANONICAL_SITE_ORIGIN = "https://mrkskitchen.com";

export function getPublicSiteOrigin(): string {
  const v = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim();
  return v && v.length > 0 ? v : CANONICAL_SITE_ORIGIN;
}
