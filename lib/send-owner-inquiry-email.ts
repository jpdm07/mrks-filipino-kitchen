import { buildEmailBrandBannerHtml } from "@/lib/email-brand-header";
import {
  customerComposeMailtoHref,
  inquiryReplyDraftBody,
} from "@/lib/customer-mailto";
import { getOwnerInquiryNotificationEmails } from "@/lib/mail-env-status";
import { sendMail, type MailSendResult } from "@/lib/mailer";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

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

  const adminUrl = `${getPublicSiteOrigin()}/admin/inquiries`;

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
    `Gmail Reply on this alert often lands in Spam (especially Yahoo). The customer never received this staff notice, so a "Re:" looks suspicious.`,
    `Send your answer from Admin → Contact inquiries → type a reply and Send to customer.`,
    ``,
    `Admin: ${adminUrl}`,
  ].join("\n");

  const replyMailto = customerComposeMailtoHref({
    to: params.email,
    subject: params.subject.trim() || "Website inquiry",
    body: inquiryReplyDraftBody({
      customerName: params.name,
      originalMessage: params.message,
    }),
  });
  const replyButton = replyMailto
    ? `<p style="margin:24px 0 0;text-align:center;"><a href="${escapeHtml(replyMailto)}" style="display:inline-block;background:#FFC200;color:#0e1d35;text-decoration:none;font-weight:800;font-size:16px;padding:14px 22px;border-radius:8px;">Reply to ${name}</a></p>
      <p style="margin:10px 0 0;font-size:13px;color:#555;text-align:center;">This starts a <strong>new</strong> email to ${email}. Do not use Gmail&apos;s Reply on this alert — it can show as Sent but land in the customer&apos;s Spam (Yahoo especially), because they never received this kitchen notice.</p>`
    : `<p style="margin:20px 0 0;font-size:14px;color:#555;">Start a new email to <strong>${email}</strong> (do not use Reply on this alert).</p>`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:24px 12px;font-family:system-ui,Segoe UI,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;background:#fafafa;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:2px solid #FFC200;box-shadow:0 2px 10px rgba(14,29,53,0.12);">
    ${buildEmailBrandBannerHtml({ variant: "gold", subtitle: "New inquiry" })}
    <div style="background:#fff;padding:24px 28px;">
      <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#0e1d35;">Someone wrote via the contact form</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;">
        <tr><td style="padding:6px 0;color:#555;">Subject</td><td style="padding:6px 0;text-align:right;font-weight:600;">${subject}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Name</td><td style="padding:6px 0;text-align:right;">${name}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Email</td><td style="padding:6px 0;text-align:right;"><a href="${escapeHtml(replyMailto ?? `mailto:${params.email.trim()}`)}" style="color:#0e1d35;font-weight:600;">${email}</a></td></tr>
        <tr><td style="padding:6px 0;color:#555;">Phone</td><td style="padding:6px 0;text-align:right;"><a href="tel:${escapeHtml(params.phone.replace(/\D/g, ""))}" style="color:#0e1d35;">${phone}</a></td></tr>
      </table>
      <div style="margin-top:20px;padding:16px;background:#FFFDF5;border:1px solid #e2e8f0;border-radius:10px;border-left:4px solid #0e1d35;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#0e1d35;">Message</p>
        <p style="margin:0;white-space:pre-wrap;">${message}</p>
      </div>
      ${replyButton}
      <p style="margin:16px 0 0;font-size:14px;text-align:center;"><a href="${adminUrl}" style="color:#0e1d35;font-weight:700;">Open in admin</a></p>
    </div>
  </div>
</body>
</html>`;

  return sendMail({
    to: recipients.join(", "),
    subject: subj,
    html,
    text,
  });
}
