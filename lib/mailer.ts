import nodemailer from "nodemailer";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

function getTransport() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: "smtp.mail.yahoo.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const transport = getTransport();
  const from = process.env.EMAIL_USER;
  if (!transport || !from) {
    console.warn("Email not configured; skipping send");
    return false;
  }
  await transport.sendMail({
    from: `"Mr. K's Filipino Kitchen" <${from}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  return true;
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
