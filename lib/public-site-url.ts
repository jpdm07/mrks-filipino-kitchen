/**
 * Canonical public site origin for QR codes, emails, metadata, and absolute links.
 * Matches printed materials (business cards): **https://mrkskitchen.com** (no `www`, HTTPS).
 *
 * Set `NEXT_PUBLIC_SITE_URL` in Vercel / `.env.local` to the same value in production
 * (we still normalize `www` and `http` for this host).
 */
export const CANONICAL_SITE_ORIGIN = "https://mrkskitchen.com";

const CANONICAL_HOSTS = new Set(["mrkskitchen.com", "www.mrkskitchen.com"]);

function isCanonicalMrksHost(hostname: string): boolean {
  return CANONICAL_HOSTS.has(hostname.toLowerCase());
}

/** Normalize env or user input so mrkskitchen.com always becomes https://mrkskitchen.com */
export function normalizePublicSiteOrigin(input: string): string {
  const trimmed = input.replace(/\/$/, "").trim();
  if (!trimmed) return CANONICAL_SITE_ORIGIN;

  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const u = new URL(withScheme);
    const host = u.hostname.toLowerCase();

    if (isCanonicalMrksHost(host)) {
      return CANONICAL_SITE_ORIGIN;
    }

    const protocol = u.protocol === "http:" ? "https:" : u.protocol;
    return `${protocol}//${u.host}`;
  } catch {
    return CANONICAL_SITE_ORIGIN;
  }
}

export function getPublicSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim();
  if (!raw) return CANONICAL_SITE_ORIGIN;
  return normalizePublicSiteOrigin(raw);
}

/**
 * If `href` resolves to mrkskitchen.com (any `www`/`http`), rewrite to https://mrkskitchen.com + path/query/hash.
 * Use in the browser when resolving relative URLs against `window.location` (may still be `www` before redirect).
 */
export function canonicalMrksFullUrl(href: string, baseUrl: string): string {
  try {
    const u = new URL(href, baseUrl);
    if (!isCanonicalMrksHost(u.hostname)) return u.href;
    return `${CANONICAL_SITE_ORIGIN}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return href;
  }
}
