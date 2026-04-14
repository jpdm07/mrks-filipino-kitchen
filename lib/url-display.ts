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
