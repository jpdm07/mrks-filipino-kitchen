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

export type EmailBrandBannerOptions = {
  /** e.g. "Receipt" under the main title */
  subtitle?: string;
};

/**
 * Blue branded header block for HTML emails (table-based for clients).
 * Optional image above the wordmark when `resolveEmailBrandImageUrl()` is set.
 */
export function buildEmailBrandBannerHtml(
  opts?: EmailBrandBannerOptions
): string {
  const imgUrl = resolveEmailBrandImageUrl();
  const imgBlock = imgUrl
    ? `<img src="${escapeHtml(imgUrl)}" alt="Mr. K's Filipino Kitchen" width="260" style="max-width:260px;width:100%;height:auto;display:block;margin:0 auto 14px;border:0;outline:none;text-decoration:none;"/>`
    : "";

  const sub = opts?.subtitle?.trim();
  const subBlock = sub
    ? `<p style="margin:6px 0 0;color:#FFC200;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-family:system-ui,Segoe UI,sans-serif;">${escapeHtml(sub)}</p>`
    : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0038A8;padding:22px 18px 20px;border-radius:12px 12px 0 0;">
  <tr><td align="center">
    ${imgBlock}
    <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;line-height:1.15;font-family:Georgia,'Times New Roman',serif;">Mr. K&apos;s</h1>
    <p style="color:#FFC200;font-size:12px;margin:8px 0 0;letter-spacing:0.14em;text-transform:uppercase;font-family:system-ui,Segoe UI,sans-serif;">Filipino Kitchen</p>
    <p style="color:#FFE08A;font-size:13px;margin:10px 0 0;font-family:system-ui,Segoe UI,sans-serif;">Authentic Filipino Kitchen · Cypress, TX</p>
    ${subBlock}
  </td></tr>
</table>`;
}
