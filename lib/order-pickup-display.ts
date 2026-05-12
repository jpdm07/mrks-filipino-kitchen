import { formatPickupDisplay } from "@/lib/format-pickup";
import { CUSTOMER_PICKUP_MEETUP } from "@/lib/config";

function escapeHtmlMeetup(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain-text block for transactional emails (after date/time line). */
export function customerPickupMeetupPlainBlock(): string {
  return [
    "",
    "Where to meet:",
    CUSTOMER_PICKUP_MEETUP.streetAddress,
    "",
    CUSTOMER_PICKUP_MEETUP.handoffPlain,
  ].join("\n");
}

/** HTML fragment for transactional emails. */
export function customerPickupMeetupHtmlBlock(): string {
  const addr = escapeHtmlMeetup(CUSTOMER_PICKUP_MEETUP.streetAddress);
  const hand = escapeHtmlMeetup(CUSTOMER_PICKUP_MEETUP.handoffPlain);
  return `<p style="margin:16px 0 6px;padding-top:12px;border-top:1px solid #eee;"><strong>Where to meet</strong></p>
<p style="margin:0 0 8px;">${addr}</p>
<p style="margin:0;font-size:14px;color:#555;line-height:1.45;">${hand}</p>`;
}

/** Single line for customer-facing pickup (receipts, confirmation page, emails). */
export function formatCustomerPickupLine(order: {
  customPickupTime?: string | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
}): string {
  const custom = order.customPickupTime?.trim();
  if (custom) return custom;

  const d = order.pickupDate?.trim();
  const t = order.pickupTime?.trim();
  if (d && t) return formatPickupDisplay(d, t);
  if (d) return formatPickupDisplay(d, null);
  if (t) return `Pickup date TBD · ${t}`;
  return "Pickup TBD";
}
