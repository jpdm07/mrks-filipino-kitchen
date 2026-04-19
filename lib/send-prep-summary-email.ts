import { buildEmailBrandBannerHtml } from "@/lib/email-brand-header";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import type { PrepDayBucket, PrepLineMerged } from "@/lib/prep-summary";
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

function byDayToText(days: PrepDayBucket[]): string {
  if (days.length === 0) return "";
  const blocks = days.map((d) => {
    const main =
      d.main.length === 0
        ? "  (none)"
        : d.main.map((l) => `  ${l.quantity}× ${l.label}`).join("\n");
    const dessert =
      d.dessert.length === 0
        ? "  (none)"
        : d.dessert.map((l) => `  ${l.quantity}× ${l.label}`).join("\n");
    return `${d.labelLong} — ${d.orderCount} order(s)\nMain:\n${main}\nDesserts & flan:\n${dessert}`;
  });
  return `By pickup day (from orders)\n${blocks.join("\n\n")}\n`;
}

function byDayToHtml(days: PrepDayBucket[]): string {
  if (days.length === 0) return "";
  const blocks = days
    .map((d) => {
      const mainRows =
        d.main.length === 0
          ? `<tr><td colspan="2" style="padding:6px 8px;color:#666;font-size:13px;">(none)</td></tr>`
          : d.main
              .map(
                (l) =>
                  `<tr><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;font-weight:700;">${l.quantity}×</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(l.label)}</td></tr>`
              )
              .join("");
      const dessertRows =
        d.dessert.length === 0
          ? `<tr><td colspan="2" style="padding:6px 8px;color:#666;font-size:13px;">(none)</td></tr>`
          : d.dessert
              .map(
                (l) =>
                  `<tr><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;font-weight:700;">${l.quantity}×</td><td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(l.label)}</td></tr>`
              )
              .join("");
      return `<div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
<p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0038A8;">${escapeHtml(d.labelLong)}</p>
<p style="margin:0 0 8px;font-size:12px;color:#666;">${d.orderCount} order(s) · pickup ${escapeHtml(d.pickupYmd)}</p>
<p style="margin:8px 0 4px;font-size:12px;font-weight:700;color:#0038A8;">Main</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${mainRows}</table>
<p style="margin:12px 0 4px;font-size:12px;font-weight:700;color:#0038A8;">Desserts &amp; flan</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${dessertRows}</table>
</div>`;
    })
    .join("");
  return `<p style="margin:20px 0 8px;font-size:13px;font-weight:700;color:#0038A8;">By pickup day</p>
<p style="margin:0 0 12px;font-size:13px;color:#555;">Same order data as the admin; not changed by manual quantity edits below.</p>
${blocks}`;
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
  byPickupDay: PrepDayBucket[];
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
    params.byPickupDay.length > 0 ? byDayToText(params.byPickupDay) : "",
    linesToText("Main menu (Sun–Sat week) — totals", params.main),
    linesToText("Desserts & flan (week) — totals", params.dessert),
    ``,
    `Edit or print in admin:`,
    adminUrl,
    ``,
    `“By pickup day” is from order pickup dates. Totals below may include manual edits in admin.`,
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
      ${params.byPickupDay.length > 0 ? byDayToHtml(params.byPickupDay) : ""}
      ${linesToHtml("Main menu (week totals)", params.main)}
      ${linesToHtml("Desserts & flan (full week totals)", params.dessert)}
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
