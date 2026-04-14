import { ORDER_FULFILLMENT } from "@/lib/config";

/** e.g. "Friday, April 17 at 2:30 PM" in pickup timezone. */
export function formatPickupDisplay(ymd: string, time: string): string {
  const parts = ymd.split("-").map(Number);
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (!y || !mo || !d) return `${ymd} at ${time}`;
  const noon = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const dayPart = noon.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: ORDER_FULFILLMENT.PICKUP_TIMEZONE,
  });
  return `${dayPart} at ${time}`;
}
