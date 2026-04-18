import {
  getOwnerInquiryNotificationEmails,
  getOwnerOrderNotificationEmail,
} from "@/lib/mail-env-status";

/**
 * Weekly prep summary emails. Override with PREP_SUMMARY_EMAIL (comma-separated).
 * Falls back to OWNER_ORDER_EMAIL, then contact inbox defaults.
 */
export function getPrepSummaryNotificationEmails(): string[] {
  const raw = process.env.PREP_SUMMARY_EMAIL?.trim();
  if (raw) {
    return raw
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const owner = getOwnerOrderNotificationEmail();
  if (owner) return [owner];
  return getOwnerInquiryNotificationEmails();
}
