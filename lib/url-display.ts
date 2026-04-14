/** Strip scheme/trailing slashes for compact labels (e.g. Facebook URL on cards). */
export function urlForPrintLabel(href: string): string {
  return href
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

/** Canonical https URL for print — keeps scheme; upgrades http → https; adds https if missing. */
export function hrefWithHttps(href: string): string {
  const t = href.trim().replace(/\/+$/, "");
  if (!t) return t;
  if (/^https:\/\//i.test(t)) return t;
  if (/^http:\/\//i.test(t)) return `https://${t.slice(7)}`;
  return `https://${t.replace(/^\/+/, "")}`;
}

/**
 * Short label for business cards: drops `https://www.` when present, then any
 * remaining `https://` or `http://` (e.g. facebook.com/…, mrkskitchen.com).
 * Use only for display; keep `hrefWithHttps` for `href` / QR targets.
 */
export function businessCardUrlDisplay(href: string): string {
  const full = hrefWithHttps(href).trim().replace(/\/+$/, "");
  if (!full) return full;
  let s = full.replace(/^https:\/\/www\./i, "").replace(/^http:\/\/www\./i, "");
  s = s.replace(/^https:\/\//i, "").replace(/^http:\/\//i, "");
  return s;
}
