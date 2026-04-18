/**
 * Read-only summary of server mail env (for admin diagnostics). No secrets returned.
 */

import { getReplyToEmail } from "@/lib/mail-reply-routing";

export function getOwnerOrderNotificationEmail(): string {
  return (
    process.env.OWNER_ORDER_EMAIL?.trim() ||
    process.env.EMAIL_USER?.trim() ||
    ""
  );
}

/** Contact form notifications; defaults to kitchen Gmail when env unset. Override with OWNER_INQUIRY_EMAIL (comma-separated ok). */
export function getOwnerInquiryNotificationEmails(): string[] {
  const raw = process.env.OWNER_INQUIRY_EMAIL?.trim();
  if (raw) {
    return raw.split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ["mrksfilipinokitchen@gmail.com"];
}

export type MailEnvStatus = {
  usesResend: boolean;
  resendFromSet: boolean;
  smtpUserSet: boolean;
  smtpPasswordSet: boolean;
  smtpHostEffective: string;
  recipientSet: boolean;
  recipientUsesOwnerOrderEmail: boolean;
  /** True when the server can attempt outbound mail (may still fail at send time). */
  transportReady: boolean;
  /** Human-readable problems to fix on Vercel. */
  issues: string[];
  /** Customer “Reply” target (separate from SMTP login / From when set). */
  replyToSet: boolean;
  replyTo: string | null;
};

export function getMailEnvStatus(): MailEnvStatus {
  const usesResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const resendFromSet = Boolean(process.env.RESEND_FROM_EMAIL?.trim());
  const smtpUser = process.env.EMAIL_USER?.trim() ?? "";
  const smtpPasswordSet = Boolean(process.env.EMAIL_PASSWORD?.trim());
  const smtpUserSet = Boolean(smtpUser);
  const smtpHostEffective = (
    process.env.EMAIL_SMTP_HOST || "smtp.mail.yahoo.com"
  ).trim();
  const fromAddr = process.env.EMAIL_FROM?.trim() || smtpUser;
  const owner = process.env.OWNER_ORDER_EMAIL?.trim();
  const recipientUsesOwnerOrderEmail = Boolean(owner);
  const recipientSet = Boolean(getOwnerOrderNotificationEmail());

  const issues: string[] = [];

  if (usesResend) {
    if (!resendFromSet) {
      issues.push(
        "RESEND_API_KEY is set but RESEND_FROM_EMAIL is missing. Resend will reject sends until you set a verified sender address."
      );
    }
  } else {
    if (!smtpUserSet) {
      issues.push(
        "EMAIL_USER is not set. Without Resend, the server needs SMTP (EMAIL_USER + EMAIL_PASSWORD)."
      );
    }
    if (!smtpPasswordSet) {
      issues.push(
        "EMAIL_PASSWORD is not set. Use an app password (Gmail/Yahoo), not your normal login password."
      );
    }
    if (!fromAddr && smtpUserSet) {
      issues.push("Set EMAIL_USER (used as From) or EMAIL_FROM.");
    }
    if (
      /@gmail\.com$/i.test(smtpUser) ||
      /@googlemail\.com$/i.test(smtpUser)
    ) {
      const hostExplicit = Boolean(process.env.EMAIL_SMTP_HOST?.trim());
      if (!hostExplicit) {
        issues.push(
          "EMAIL_USER looks like Gmail but EMAIL_SMTP_HOST is not set — the app defaults to smtp.mail.yahoo.com, which will fail. On Vercel set EMAIL_SMTP_HOST=smtp.gmail.com, EMAIL_SMTP_PORT=587, EMAIL_SMTP_SECURE=false, and a Gmail app password in EMAIL_PASSWORD."
        );
      }
    }
  }

  if (!recipientSet) {
    issues.push(
      "No new-order recipient: set OWNER_ORDER_EMAIL and/or EMAIL_USER (see lib/order-owner-email.ts)."
    );
  }

  const transportReady = usesResend
    ? resendFromSet && Boolean(process.env.RESEND_API_KEY?.trim())
    : smtpUserSet && smtpPasswordSet && Boolean(fromAddr);

  const replyTo = getReplyToEmail() ?? null;
  const replyToSet = Boolean(replyTo);

  return {
    usesResend,
    resendFromSet,
    smtpUserSet,
    smtpPasswordSet,
    smtpHostEffective,
    recipientSet,
    recipientUsesOwnerOrderEmail,
    transportReady,
    issues,
    replyToSet,
    replyTo,
  };
}
