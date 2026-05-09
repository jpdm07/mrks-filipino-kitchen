import { formatPickupDisplay } from "@/lib/format-pickup";

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
