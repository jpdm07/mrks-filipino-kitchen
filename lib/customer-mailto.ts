/**
 * Compose a new message to the customer (not Gmail “Reply”).
 * Gmail often ignores Reply-To on kitchen alerts and sends the reply back to the kitchen inbox.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isSafeEmailAddress(email: string): boolean {
  const t = email.trim();
  if (t.length > 254 || t.length < 3) return false;
  if (/[\r\n,<>]/.test(t)) return false;
  return EMAIL_RE.test(t);
}

/** RFC 5322-ish `Reply-To: "Name" <addr>` so mail apps show the customer, not the SMTP login. */
export function formatNamedReplyTo(name: string, email: string): string | undefined {
  const addr = email.trim();
  if (!isSafeEmailAddress(addr)) return undefined;
  const safeName = name.replace(/[\r\n"<>]/g, "").trim() || "Customer";
  return `"${safeName}" <${addr}>`;
}

export function customerComposeMailtoHref(params: {
  to: string;
  subject: string;
  body?: string;
}): string | null {
  if (!isSafeEmailAddress(params.to)) return null;
  const subject = params.subject.trim() || "Mr. K's Filipino Kitchen";
  const withRe = /^re:\s/i.test(subject) ? subject : `Re: ${subject}`;
  const parts = [`subject=${encodeURIComponent(withRe)}`];
  const body = params.body?.trim();
  if (body) parts.push(`body=${encodeURIComponent(body.slice(0, 1200))}`);
  return `mailto:${params.to.trim()}?${parts.join("&")}`;
}

export function inquiryReplyDraftBody(params: {
  customerName: string;
  originalMessage: string;
}): string {
  const name = params.customerName.trim() || "there";
  const quoted = params.originalMessage.trim().slice(0, 800);
  return `Hi ${name},\n\nThank you for writing to Mr. K's Filipino Kitchen.\n\n\n\n---\nTheir message:\n${quoted}`;
}
