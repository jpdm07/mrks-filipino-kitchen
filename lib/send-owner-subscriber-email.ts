import { buildEmailBrandBannerHtml } from "@/lib/email-brand-header";
import { getOwnerAlertNotificationEmails } from "@/lib/mail-env-status";
import { sendMail, type MailSendResult } from "@/lib/mailer";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendOwnerSubscriberEmail(params: {
  email: string;
  name?: string | null;
  source?: "newsletter" | "checkout";
}): Promise<MailSendResult> {
  const recipients = getOwnerAlertNotificationEmails();
  if (recipients.length === 0) {
    return { ok: false, error: "No subscriber-alert recipient configured." };
  }

  const adminUrl = `${getPublicSiteOrigin()}/admin/subscribers`;
  const name = params.name?.trim() || "";
  const source =
    params.source === "checkout" ? "checkout (order form)" : "website subscribe form";

  const text = [
    `New newsletter subscriber`,
    ``,
    name ? `Name: ${name}` : null,
    `Email: ${params.email}`,
    `Source: ${source}`,
    ``,
    `Admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:24px 12px;font-family:system-ui,Segoe UI,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;background:#fafafa;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:2px solid #FFC200;box-shadow:0 2px 10px rgba(14,29,53,0.12);">
    ${buildEmailBrandBannerHtml({ variant: "gold", subtitle: "New subscriber" })}
    <div style="background:#fff;padding:24px 28px;">
      <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#0e1d35;">Someone joined the mailing list</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;">
        ${
          name
            ? `<tr><td style="padding:6px 0;color:#555;">Name</td><td style="padding:6px 0;text-align:right;font-weight:600;">${escapeHtml(name)}</td></tr>`
            : ""
        }
        <tr><td style="padding:6px 0;color:#555;">Email</td><td style="padding:6px 0;text-align:right;"><a href="mailto:${encodeURIComponent(params.email)}" style="color:#0e1d35;font-weight:600;">${escapeHtml(params.email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#555;">Source</td><td style="padding:6px 0;text-align:right;">${escapeHtml(source)}</td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:14px;"><a href="${adminUrl}" style="color:#0e1d35;font-weight:700;">Open subscribers in admin</a></p>
    </div>
  </div>
</body>
</html>`;

  return sendMail({
    to: recipients.join(", "),
    subject: `[Website] New subscriber: ${params.email.trim()}`,
    html,
    text,
  });
}
