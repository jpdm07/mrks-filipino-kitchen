import { getPublicSiteOrigin } from "@/lib/public-site-url";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Absolute URL for a logo/banner image in emails.
 * Set `EMAIL_BRAND_IMAGE_URL` to a full https URL, or a site path like `/images/your-logo.png`
 * (served from your live domain via NEXT_PUBLIC_SITE_URL).
 * Optional: `NEXT_PUBLIC_EMAIL_LOGO_URL` (path or full URL) for the same purpose.
 */
export function resolveEmailBrandImageUrl(): string | null {
  const raw = (
    process.env.EMAIL_BRAND_IMAGE_URL ??
    process.env.NEXT_PUBLIC_EMAIL_LOGO_URL ??
    ""
  ).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${getPublicSiteOrigin()}${raw}`;
  return null;
}

/** Visual lane: at a glance — gold = order / payment / inquiry notices; blue = full receipt. */
export type EmailBrandBannerVariant =
  /** Philippine blue band, white copy (receipts, newsletters). */
  | "blue"
  /** Gold band, navy copy — order placed, payment confirmed, new inquiry alert. */
  | "gold";

export type EmailBrandBannerOptions = {
  /** e.g. "Receipt" or "Order received" under the main title */
  subtitle?: string;
  variant?: EmailBrandBannerVariant;
};

/**
 * Branded header for HTML emails (table-based for clients).
 * Optional image above the wordmark when `resolveEmailBrandImageUrl()` is set.
 */
export function buildEmailBrandBannerHtml(
  opts?: EmailBrandBannerOptions
): string {
  const variant: EmailBrandBannerVariant = opts?.variant ?? "blue";
  const isGold = variant === "gold";

  const imgUrl = resolveEmailBrandImageUrl();
  const imgBlock = imgUrl
    ? `<img src="${escapeHtml(imgUrl)}" alt="Mr. K's Filipino Kitchen" width="260" style="max-width:260px;width:100%;height:auto;display:block;margin:0 auto 14px;border:0;outline:none;text-decoration:none;"/>`
    : "";

  const sub = opts?.subtitle?.trim();
  const subColor = isGold ? "#1A237E" : "#FFC200";
  const subBlock = sub
    ? `<p style="margin:8px 0 0;color:${subColor};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-family:system-ui,Segoe UI,sans-serif;font-weight:700;">${escapeHtml(sub)}</p>`
    : "";

  const tableBg = isGold
    ? "background:linear-gradient(180deg,#FFE566 0%,#FFC200 52%,#E6AC00 100%);"
    : "background:#0038A8;";
  const h1Color = isGold ? "#0038A8" : "#FFFFFF";
  const line2Color = isGold ? "#0038A8" : "#FFC200";
  const line3Color = isGold ? "#1a1a1a" : "#FFE08A";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableBg}padding:22px 18px 20px;border-radius:12px 12px 0 0;">
  <tr><td align="center">
    ${imgBlock}
    <h1 style="margin:0;color:${h1Color};font-size:24px;font-weight:700;line-height:1.15;font-family:Georgia,'Times New Roman',serif;">Mr. K&apos;s</h1>
    <p style="color:${line2Color};font-size:12px;margin:8px 0 0;letter-spacing:0.14em;text-transform:uppercase;font-family:system-ui,Segoe UI,sans-serif;font-weight:700;">Filipino Kitchen</p>
    <p style="color:${line3Color};font-size:13px;margin:10px 0 0;font-family:system-ui,Segoe UI,sans-serif;">Authentic Filipino Kitchen · Cypress, TX</p>
    ${subBlock}
  </td></tr>
</table>`;
}
