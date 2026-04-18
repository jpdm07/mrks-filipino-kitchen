import { buildEmailBrandBannerHtml } from "@/lib/email-brand-header";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import type { PrepLineMerged } from "@/lib/prep-summary";
import { getPrepSummaryNotificationEmails } from "@/lib/prep-summary-email-recipients";
import { sendMail, type MailSendResult } from "@/lib/mailer";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linesToText(title: string, lines: PrepLineMerged[]): string {
  if (lines.length === 0) return `${title}\n(none)\n`;
  const body = lines
    .map((l) => {
      const n = l.note ? `  (${l.note})` : "";
      return `  ${l.quantity}× ${l.label}${n}`;
    })
    .join("\n");
  return `${title}\n${body}\n`;
}

function linesToHtml(title: string, lines: PrepLineMerged[]): string {
  if (lines.length === 0) {
    return `<p style="margin:16px 0 8px;font-size:13px;font-weight:700;color:#0038A8;">${escapeHtml(title)}</p><p style="margin:0;color:#666;font-size:14px;">(none)</p>`;
  }
  const rows = lines
    .map((l) => {
      const note = l.note
        ? `<div style="font-size:12px;color:#666;margin-top:2px;">${escapeHtml(l.note)}</div>`
        : "";
      return `<tr>
  <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:700;vertical-align:top;">${l.quantity}×</td>
  <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(l.label)}${note}</td>
</tr>`;
    })
    .join("");
  return `<p style="margin:16px 0 8px;font-size:13px;font-weight:700;color:#0038A8;">${escapeHtml(title)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}</table>`;
}

export async function sendPrepSummaryEmail(params: {
  weekThursdayYmd: string;
  fri: string;
  sat: string;
  main: PrepLineMerged[];
  dessert: PrepLineMerged[];
}): Promise<MailSendResult> {
  const recipients = getPrepSummaryNotificationEmails();
  if (recipients.length === 0) {
    return { ok: false, error: "No prep summary recipient: set PREP_SUMMARY_EMAIL or OWNER_ORDER_EMAIL." };
  }

  const origin = getPublicSiteOrigin();
  const adminUrl = `${origin}/admin/prep-summary?week=${encodeURIComponent(params.weekThursdayYmd)}`;

  const subj = `[Mr. K Prep] Weekend ${params.fri} & ${params.sat} — quantities`;

  const text = [
    `Prep summary (week of Thu ${params.weekThursdayYmd})`,
    `Friday pickup: ${params.fri} · Saturday pickup: ${params.sat}`,
    ``,
    linesToText("Main menu (Sun–Sat week)", params.main),
    linesToText("Desserts & flan (week)", params.dessert),
    ``,
    `Edit or print in admin:`,
    adminUrl,
    ``,
    `Main counts are non-dessert lines for any pickup in this Sun–Sat week. Desserts & flan include the same week (e.g. Tue–Thu flan slots).`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:24px 12px;font-family:system-ui,Segoe UI,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a;background:#fafafa;">
  <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:2px solid #0038A8;box-shadow:0 2px 10px rgba(0,56,168,0.12);">
    ${buildEmailBrandBannerHtml({ variant: "blue", subtitle: "Weekly prep summary" })}
    <div style="background:#fff;padding:24px 28px;">
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0038A8;">Quantities to prep</p>
      <p style="margin:0 0 16px;font-size:14px;color:#555;">Week of Thu <strong>${escapeHtml(params.weekThursdayYmd)}</strong><br/>
      Fri <strong>${escapeHtml(params.fri)}</strong> · Sat <strong>${escapeHtml(params.sat)}</strong></p>
      ${linesToHtml("Main menu (week)", params.main)}
      ${linesToHtml("Desserts & flan (full week)", params.dessert)}
      <p style="margin:20px 0 0;font-size:13px;color:#555;">Adjust lines anytime in <a href="${escapeHtml(adminUrl)}" style="color:#0038A8;font-weight:600;">Admin → Prep summary</a>.</p>
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
