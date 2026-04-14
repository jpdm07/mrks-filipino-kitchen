/** Strip scheme/trailing slashes for compact labels (e.g. Facebook URL on cards). */
export function urlForPrintLabel(href: string): string {
  return href
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

/** Canonical https URL for print — never strips the scheme (business card website + order link). */
export function hrefWithHttps(href: string): string {
  const t = href.trim().replace(/\/+$/, "");
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}
