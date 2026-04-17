/**
 * Routes customer replies away from the SMTP login address (e.g. jpdm015@gmail.com)
 * to the kitchen inbox (e.g. mrksfilipinokitchen@gmail.com) via Reply-To + footers.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Set on the server (e.g. Vercel): kitchen inbox that should receive customer replies. */
export function getReplyToEmail(): string | undefined {
  const v = process.env.EMAIL_REPLY_TO?.trim();
  return v || undefined;
}

export function buildCustomerReplyFooterHtml(): string {
  const r = getReplyToEmail();
  if (!r) return "";
  const e = escapeHtml(r);
  return `<p style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;line-height:1.5;color:#555;text-align:center;">
Please email <a href="mailto:${e}" style="color:#0038A8;">${e}</a> with questions.<br/>
<span style="font-size:12px;color:#888;">Do not reply to the automated sender address — it may not be read.</span></p>`;
}

export function buildCustomerReplyFooterPlainText(): string {
  const r = getReplyToEmail();
  if (!r) return "";
  return `\n\n---\nQuestions? Email ${r} (please do not reply to the automated sender address).`;
}
