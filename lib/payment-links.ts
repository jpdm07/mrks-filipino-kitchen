/**
 * Venmo web pay links (consumer P2P). Format documented by Venmo / community:
 * https://venmo.com/USERNAME?txn=pay&amount=12.34&note=Memo+text
 *
 * Zelle has no universal “pay this number with memo” URL across banks — use the
 * official site + copy helpers in the UI instead.
 *
 * Cash App: `https://cash.app/$Cashtag/amount` opens the app/web with amount;
 * prefilled note is not reliable — mirror Zelle with a copy block for memo + cashtag.
 */

/** Official Zelle customer page (how it works / find your bank). */
export const ZELLE_CUSTOMER_URL = "https://www.zellepay.com/how-it-works";

/**
 * Single clipboard block for Zelle — banks don’t offer a web URL that prefills
 * recipient + amount + memo; customers paste these into their bank’s Zelle flow.
 */
export function zellePaymentClipboardText(opts: {
  amountUsd: number;
  recipientE164: string;
  orderNumber: string;
}): string {
  const amt = (Math.round(opts.amountUsd * 100) / 100).toFixed(2);
  return [
    `Amount: $${amt}`,
    `Send to (Zelle phone): ${opts.recipientE164}`,
    `Memo / note: ${opts.orderNumber}`,
  ].join("\n");
}

export function normalizeVenmoUsername(handle: string): string {
  const t = handle.trim().replace(/^@/, "");
  return t || "jpdm07";
}

/** Opens the Venmo profile (no amount) — use on checkout before an order exists. */
export function venmoProfileWebUrl(handle: string): string {
  const u = normalizeVenmoUsername(handle);
  return `https://venmo.com/${encodeURIComponent(u)}`;
}

/**
 * Opens Venmo with pay flow; amount and note prefilled (customer still confirms).
 * Use `target="_self"` on the anchor if you want the same browser tab (Back returns).
 */
export function venmoPayWebUrl(
  handle: string,
  amountUsd: number,
  note: string
): string {
  const u = normalizeVenmoUsername(handle);
  const amount = (Math.round(amountUsd * 100) / 100).toFixed(2);
  const noteSafe = note.trim().slice(0, 200);
  const base = `https://venmo.com/${encodeURIComponent(u)}`;
  const qs = new URLSearchParams({
    txn: "pay",
    amount,
    audience: "private",
  });
  if (noteSafe) qs.set("note", noteSafe);
  return `${base}?${qs.toString()}`;
}

/** Cashtag without leading $ (for `https://cash.app/$…/amount` paths). */
export function normalizeCashAppCashtagPath(handle: string): string {
  const t = handle.trim().replace(/^\$/, "").replace(/^@/, "");
  return t || "MrKsFilipinoKitchen";
}

/**
 * Opens Cash App with pay amount (customer still confirms; add note from clipboard if needed).
 */
export function cashAppPayWebUrl(handle: string, amountUsd: number): string {
  const u = normalizeCashAppCashtagPath(handle);
  const amount = (Math.round(amountUsd * 100) / 100).toFixed(2);
  return `https://cash.app/$${u}/${amount}`;
}

export function cashAppPaymentClipboardText(opts: {
  amountUsd: number;
  cashtagDisplay: string;
  orderNumber: string;
}): string {
  const amt = (Math.round(opts.amountUsd * 100) / 100).toFixed(2);
  return [
    `Amount: $${amt}`,
    `Cash App: ${opts.cashtagDisplay}`,
    `For / note: ${opts.orderNumber}`,
  ].join("\n");
}
