import nodemailer from "nodemailer";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

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
  const pass = process.env.EMAIL_PASSWORD?.trim();
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

async function sendMailViaResend(
  apiKey: string,
  opts: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }
): Promise<boolean> {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) {
    console.warn(
      "[mailer] RESEND_API_KEY is set but RESEND_FROM_EMAIL is missing. Add a verified sender in Resend (e.g. orders@yourdomain.com)."
    );
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    console.error("[mailer] Resend API error:", res.status, detail);
    return false;
  }

  return true;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    return sendMailViaResend(resendKey, opts);
  }

  const transport = getTransport();
  const fromAddr = getSmtpFromAddress();
  if (!transport || !fromAddr) {
    console.warn(
      "[mailer] Skipping send: set RESEND_API_KEY + RESEND_FROM_EMAIL, or EMAIL_USER + EMAIL_PASSWORD on the server (Vercel → Production). Yahoo/Gmail usually need an app password, not your normal login. If SMTP times out from the cloud, try EMAIL_SMTP_PORT=587 or switch to Resend."
    );
    return false;
  }

  const fromName = getFromDisplayName();
  try {
    await transport.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return true;
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
    return false;
  }
}

export function newsletterHtml(params: {
  message: string;
  itemBlock?: string;
  unsubscribeUrl: string;
}): string {
  const base = getPublicSiteOrigin();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;background:#FFFDF5;font-family:Georgia,serif;color:#1A1A1A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0038A8;padding:24px 16px;">
    <tr><td align="center">
      <h1 style="margin:0;color:#FFFFFF;font-size:26px;font-weight:700;">Mr. K's</h1>
      <p style="color:#FFC200;font-size:13px;margin:8px 0 0;letter-spacing:0.12em;text-transform:uppercase;">Filipino Kitchen</p>
      <p style="color:#FFC200;font-size:14px;margin:12px 0 0;">Authentic Filipino Kitchen · Cypress, TX</p>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;padding:24px;">
    <tr><td>
      ${params.itemBlock ?? ""}
      <div style="font-size:16px;line-height:1.6;">${params.message}</div>
      <p style="margin-top:32px;text-align:center;">
        <a href="${base}/menu" style="display:inline-block;background:#FFC200;color:#1A1A1A;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;">Order Now</a>
      </p>
      <p style="margin-top:40px;font-size:12px;color:#6B6B6B;text-align:center;">
        <a href="${params.unsubscribeUrl}" style="color:#0038A8;">Unsubscribe</a>
      </p>
    </td></tr>
  </table>
</body></html>`;
}
