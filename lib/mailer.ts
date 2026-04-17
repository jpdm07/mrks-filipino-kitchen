import nodemailer from "nodemailer";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { buildEmailBrandBannerHtml } from "@/lib/email-brand-header";
import {
  buildCustomerReplyFooterHtml,
  getReplyToEmail,
} from "@/lib/mail-reply-routing";

export type MailSendResult =
  | { ok: true }
  | { ok: false; error: string };

/** Unique per send so clients (notably Gmail) are less likely to trim or thread as one blob. */
function withHtmlUniquenessStamp(html: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const stamp = `<!-- mrk:${id} -->`;
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${stamp}</body>`);
  }
  return `${html}\n${stamp}\n`;
}

function getSmtpFromAddress(): string {
  const explicit = process.env.EMAIL_FROM?.trim();
  const user = process.env.EMAIL_USER?.trim();
  return explicit || user || "";
}

function getFromDisplayName(): string {
  return process.env.EMAIL_FROM_NAME?.trim() || "Mr. K's Filipino Kitchen";
}

function getTransport() {
  const user = process.env.EMAIL_USER?.trim();
  /** Gmail app passwords may include spaces; SMTP auth uses the 16 chars without spaces. */
  const pass = (process.env.EMAIL_PASSWORD?.trim() ?? "").replace(/\s/g, "");
  if (!user || !pass) return null;

  const host = (process.env.EMAIL_SMTP_HOST || "smtp.mail.yahoo.com").trim();
  const portRaw = process.env.EMAIL_SMTP_PORT?.trim();
  const port = portRaw ? Number(portRaw) : 465;
  if (!Number.isFinite(port) || port <= 0) {
    console.warn("[mailer] Invalid EMAIL_SMTP_PORT; falling back to 465.");
    return nodemailer.createTransport({
      host,
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 25_000,
    });
  }

  const explicitSecure = process.env.EMAIL_SMTP_SECURE?.trim().toLowerCase();
  let secure: boolean;
  if (explicitSecure === "true") secure = true;
  else if (explicitSecure === "false") secure = false;
  else secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: port === 587 && !secure,
    auth: { user, pass },
    connectionTimeout: 25_000,
  });
}

function formatResendError(status: number, detail: unknown): string {
  if (detail && typeof detail === "object") {
    const o = detail as { message?: unknown; name?: string };
    if (typeof o.message === "string" && o.message.trim()) {
      return `Resend HTTP ${status}: ${o.message.trim()}`;
    }
    if (Array.isArray(o.message)) {
      const parts = o.message.filter((x) => typeof x === "string") as string[];
      if (parts.length) return `Resend HTTP ${status}: ${parts.join("; ")}`;
    }
  }
  if (typeof detail === "string" && detail.trim()) {
    return `Resend HTTP ${status}: ${detail.trim().slice(0, 400)}`;
  }
  return `Resend returned HTTP ${status}. Open Resend → Logs, and verify domain + RESEND_FROM_EMAIL.`;
}

async function sendMailViaResend(
  apiKey: string,
  opts: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    bcc?: string;
    replyTo?: string;
  }
): Promise<MailSendResult> {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) {
    const msg =
      "RESEND_FROM_EMAIL is not set. In Resend, add a verified sender (e.g. orders@yourdomain.com) and set RESEND_FROM_EMAIL to that exact value.";
    console.warn("[mailer]", msg);
    return { ok: false, error: msg };
  }

  const bcc = opts.bcc?.trim();
  const body: Record<string, unknown> = {
    from,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  };
  if (bcc) body.bcc = [bcc];
  const rt = opts.replyTo?.trim();
  if (rt) body.reply_to = rt;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    const err = formatResendError(res.status, detail);
    console.error("[mailer] Resend API error:", err, detail);
    return { ok: false, error: err };
  }

  return { ok: true };
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Optional BCC (e.g. kitchen copy for receipts). Resend + SMTP supported. */
  bcc?: string;
  /** Overrides env EMAIL_REPLY_TO for this message only. */
  replyTo?: string;
}): Promise<MailSendResult> {
  const replyTo = (opts.replyTo?.trim() || getReplyToEmail()) ?? undefined;
  const htmlOut = withHtmlUniquenessStamp(opts.html);
  const stamped = { ...opts, html: htmlOut };
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    return sendMailViaResend(resendKey, { ...stamped, replyTo });
  }

  const transport = getTransport();
  const fromAddr = getSmtpFromAddress();
  if (!transport || !fromAddr) {
    const msg =
      "Mail is not configured on the server. Without Resend: set EMAIL_USER + EMAIL_PASSWORD (Yahoo/Gmail app password), and EMAIL_FROM if the sender address is not the same as EMAIL_USER. On Vercel, add those under Production → Environment Variables. (Optional: Resend later with RESEND_API_KEY + RESEND_FROM_EMAIL.)";
    console.warn("[mailer]", msg);
    return { ok: false, error: msg };
  }

  const fromName = getFromDisplayName();
  try {
    await transport.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: opts.to,
      bcc: opts.bcc?.trim() || undefined,
      replyTo: replyTo || undefined,
      subject: opts.subject,
      html: htmlOut,
      text: opts.text,
      priority: "high",
      headers: {
        "X-Entity-Ref-ID": `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@mrkskitchen.com`,
      },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    let extra = "";
    if (e && typeof e === "object") {
      const o = e as { responseCode?: number; response?: string; code?: string };
      if (o.responseCode != null || o.response) {
        extra = ` code=${o.responseCode ?? "?"} response=${o.response ?? ""}`;
      }
      if (o.code) extra += ` nodemailerCode=${o.code}`;
    }
    console.error("[mailer] SMTP send failed:", msg + extra);
    return {
      ok: false,
      error: `SMTP failed: ${msg}${extra ? ` (${extra.trim()})` : ""}`,
    };
  }
}

export function newsletterHtml(params: {
  message: string;
  itemBlock?: string;
  unsubscribeUrl: string;
}): string {
  const base = getPublicSiteOrigin();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;background:#FFFDF5;font-family:Georgia,serif;color:#1A1A1A;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;margin:0 auto;">
    <tr><td style="padding:0;">${buildEmailBrandBannerHtml()}</td></tr>
    <tr><td style="padding:24px 16px 32px;">
      ${params.itemBlock ?? ""}
      <div style="font-size:16px;line-height:1.6;">${params.message}</div>
      <p style="margin-top:32px;text-align:center;">
        <a href="${base}/menu" style="display:inline-block;background:#FFC200;color:#1A1A1A;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;">Order Now</a>
      </p>
      ${buildCustomerReplyFooterHtml()}
      <p style="margin-top:40px;font-size:12px;color:#6B6B6B;text-align:center;">
        <a href="${params.unsubscribeUrl}" style="color:#0038A8;">Unsubscribe</a>
      </p>
    </td></tr>
  </table>
  </td></tr></table>
</body></html>`;
}
