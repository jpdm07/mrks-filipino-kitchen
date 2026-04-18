import { buildEmailBrandBannerHtml } from "@/lib/email-brand-header";
import { getOwnerInquiryNotificationEmails } from "@/lib/mail-env-status";
import { sendMail, type MailSendResult } from "@/lib/mailer";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendOwnerInquiryEmail(params: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): Promise<MailSendResult> {
  const recipients = getOwnerInquiryNotificationEmails();
  if (recipients.length === 0) {
    return { ok: false, error: "No inquiry recipient configured." };
  }

  const subj = `[Website] ${params.subject.trim() || "Contact message"}`;
  const name = escapeHtml(params.name);
  const email = escapeHtml(params.email);
  const phone = escapeHtml(params.phone);
  const subject = escapeHtml(params.subject);
  const message = escapeHtml(params.message);

  const text = [
    `New contact form message`,
    ``,
    `Subject: ${params.subject}`,
    `From: ${params.name}`,
    `Email: ${params.email}`,
    `Phone: ${params.phone}`,
    ``,
    params.message,
    ``,
    `Reply to the customer directly using their email above.`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:24px 12px;font-family:system-ui,Segoe UI,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;background:#fafafa;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:2px solid #FFC200;box-shadow:0 2px 10px rgba(0,56,168,0.12);">
    ${buildEmailBrandBannerHtml({ variant: "gold", subtitle: "New inquiry" })}
    <div style="background:#fff;padding:24px 28px;">
      <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#0038A8;">Someone wrote via the contact form</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;">
        <tr><td style="padding:6px 0;color:#555;">Subject</td><td style="padding:6px 0;text-align:right;font-weight:600;">${subject}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Name</td><td style="padding:6px 0;text-align:right;">${name}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Email</td><td style="padding:6px 0;text-align:right;"><a href="mailto:${encodeURIComponent(params.email)}" style="color:#0038A8;font-weight:600;">${email}</a></td></tr>
        <tr><td style="padding:6px 0;color:#555;">Phone</td><td style="padding:6px 0;text-align:right;"><a href="tel:${escapeHtml(params.phone.replace(/\D/g, ""))}" style="color:#0038A8;">${phone}</a></td></tr>
      </table>
      <div style="margin-top:20px;padding:16px;background:#FFFDF5;border:1px solid #e2e8f0;border-radius:10px;border-left:4px solid #0038A8;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#0038A8;">Message</p>
        <p style="margin:0;white-space:pre-wrap;">${message}</p>
      </div>
      <p style="margin:20px 0 0;font-size:14px;color:#555;">Use <strong>Reply</strong> in your mail app to respond — it is set to the customer&apos;s email.</p>
    </div>
  </div>
</body>
</html>`;

  return sendMail({
    to: recipients.join(", "),
    subject: subj,
    html,
    text,
    replyTo: params.email.trim(),
  });
}
