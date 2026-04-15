/**
 * Canonical Facebook Page URL for the site.
 *
 * We default to `https://www.facebook.com/profile.php?id=…` instead of
 * `/people/…/…/` vanity URLs: those paths encode the display name (e.g. "Mr-Ks")
 * and have been reported to fail on some mobile browsers and in-app WebViews.
 * `profile.php?id=` is the long-supported format Facebook still resolves to the
 * same Page.
 */

const DEFAULT_PAGE_ID = "61587453610719";

function isAllowedFacebookHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "facebook.com" ||
    h === "www.facebook.com" ||
    h === "m.facebook.com" ||
    h === "mbasic.facebook.com" ||
    h === "fb.com" ||
    h === "www.fb.com" ||
    h.endsWith(".facebook.com") ||
    h.endsWith(".fb.com")
  );
}

function normalizeFacebookHttpsUrl(raw: string): string {
  let s = raw.trim().replace(/\/+$/, "");
  if (!s) {
    return `https://www.facebook.com/profile.php?id=${DEFAULT_PAGE_ID}`;
  }
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }
  try {
    const url = new URL(s);
    if (!isAllowedFacebookHost(url.hostname)) {
      return `https://www.facebook.com/profile.php?id=${DEFAULT_PAGE_ID}`;
    }
    url.protocol = "https:";
    return url.toString();
  } catch {
    return `https://www.facebook.com/profile.php?id=${DEFAULT_PAGE_ID}`;
  }
}

/**
 * Facebook Page link for `href` across the site.
 * Override with `NEXT_PUBLIC_FACEBOOK_URL` (full https URL on facebook.com or fb.com).
 */
export function getFacebookPageUrl(): string {
  const fromEnv =
    typeof process.env.NEXT_PUBLIC_FACEBOOK_URL === "string"
      ? process.env.NEXT_PUBLIC_FACEBOOK_URL.trim()
      : "";
  if (fromEnv) {
    return normalizeFacebookHttpsUrl(fromEnv);
  }
  return `https://www.facebook.com/profile.php?id=${DEFAULT_PAGE_ID}`;
}
