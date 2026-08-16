import { buildEmailBrandBannerHtml } from "@/lib/email-brand-header";
import {
  buildCustomerReplyFooterHtml,
  buildCustomerReplyFooterPlainText,
} from "@/lib/mail-reply-routing";
import { isSafeEmailAddress } from "@/lib/customer-mailto";
import { sendMail, type MailSendResult } from "@/lib/mailer";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return part || "there";
}

/** Lets Yahoo/Gmail see a real first message from the kitchen (not a Reply to a staff-only alert). */
export async function sendCustomerInquiryReceivedEmail(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<MailSendResult> {
  const to = params.email.trim();
  if (!isSafeEmailAddress(to)) {
    return { ok: false, error: "Customer email is not valid." };
  }

  const hello = firstName(params.name);
  const topic = params.subject.trim() || "your message";
  const subj = `We received your message — Mr. K's Filipino Kitchen`;

  const text = [
    `Hi ${hello},`,
    "",
    `Thank you for writing to Mr. K's Filipino Kitchen. We received your note about ${topic}.`,
    "",
    "We'll reply to this same email. If you don't see us in Inbox, please check Spam or Junk and mark it as not spam so our answers get through.",
    "",
    "What we received:",
    params.message.trim(),
    "",
    "Questions? Call or text 979-703-3827.",
    "",
    "— Mr. K's Filipino Kitchen",
    "Cypress, TX",
  ].join("\n") + buildCustomerReplyFooterPlainText();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:24px 12px;font-family:system-ui,Segoe UI,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;background:#fafafa;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:2px solid #FFC200;box-shadow:0 2px 10px rgba(14,29,53,0.12);">
    ${buildEmailBrandBannerHtml({ variant: "gold", subtitle: "We got your message" })}
    <div style="background:#fff;padding:24px 28px;">
      <p style="margin:0 0 16px;">Hi ${escapeHtml(hello)},</p>
      <p style="margin:0 0 16px;">Thank you for writing to Mr. K&apos;s Filipino Kitchen. We received your note about <strong>${escapeHtml(topic)}</strong>.</p>
      <p style="margin:0 0 16px;">We&apos;ll reply to this same email. If a message from us is missing, check <strong>Spam</strong> or <strong>Junk</strong> and mark it as not spam.</p>
      <div style="margin:0 0 16px;padding:14px 16px;background:#FFFDF5;border:1px solid #e2e8f0;border-radius:10px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#0e1d35;">What we received</p>
        <p style="margin:0;white-space:pre-wrap;">${escapeHtml(params.message.trim())}</p>
      </div>
      <p style="margin:0;font-size:14px;color:#555;">Questions? Call or text <a href="tel:+19797033827" style="color:#0e1d35;">979-703-3827</a>.</p>
      <p style="margin:16px 0 0;font-size:14px;color:#888;">— Mr. K&apos;s Filipino Kitchen · Cypress, TX</p>
      ${buildCustomerReplyFooterHtml()}
    </div>
  </div>
</body>
</html>`;

  return sendMail({
    to,
    subject: subj,
    html,
    text,
  });
}

/** Kitchen answer sent as a new email to the customer (not a Gmail Reply on the staff alert). */
export async function sendCustomerInquiryReplyEmail(params: {
  name: string;
  email: string;
  subject: string;
  originalMessage: string;
  reply: string;
}): Promise<MailSendResult> {
  const to = params.email.trim();
  if (!isSafeEmailAddress(to)) {
    return { ok: false, error: "Customer email is not valid." };
  }
  const reply = params.reply.trim();
  if (!reply) {
    return { ok: false, error: "Reply message is required." };
  }

  const hello = firstName(params.name);
  const topic = params.subject.trim() || "your inquiry";
  const subj = `Mr. K's Filipino Kitchen — ${topic}`.slice(0, 120);

  const text = [
    `Hi ${hello},`,
    "",
    reply,
    "",
    "— Mr. K's Filipino Kitchen",
    "Cypress, TX",
    "979-703-3827",
    "",
    "---",
    "You wrote:",
    params.originalMessage.trim(),
  ].join("\n") + buildCustomerReplyFooterPlainText();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:24px 12px;font-family:system-ui,Segoe UI,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;background:#fafafa;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:2px solid #FFC200;box-shadow:0 2px 10px rgba(14,29,53,0.12);">
    ${buildEmailBrandBannerHtml({ variant: "gold", subtitle: "Message from the kitchen" })}
    <div style="background:#fff;padding:24px 28px;">
      <p style="margin:0 0 16px;">Hi ${escapeHtml(hello)},</p>
      <p style="margin:0 0 16px;white-space:pre-wrap;">${escapeHtml(reply)}</p>
      <p style="margin:0 0 16px;font-size:14px;color:#555;">— Mr. K&apos;s Filipino Kitchen · Cypress, TX<br/>979-703-3827</p>
      <div style="margin:0;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">You wrote</p>
        <p style="margin:0;white-space:pre-wrap;color:#444;">${escapeHtml(params.originalMessage.trim())}</p>
      </div>
      ${buildCustomerReplyFooterHtml()}
    </div>
  </div>
</body>
</html>`;

  return sendMail({
    to,
    subject: subj,
    html,
    text,
  });
}
