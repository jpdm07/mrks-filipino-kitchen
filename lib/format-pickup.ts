import { ORDER_FULFILLMENT } from "@/lib/config";

/** e.g. "Friday, April 17 at 2:30 PM" in pickup timezone. Omit `time` when not set (e.g. admin manual order). */
export function formatPickupDisplay(
  ymd: string,
  time?: string | null
): string {
  const parts = ymd.split("-").map(Number);
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  const t = typeof time === "string" ? time.trim() : "";
  const tbd = "pickup time TBD";
  if (!y || !mo || !d) {
    return t ? `${ymd} at ${t}` : `${ymd} — ${tbd}`;
  }
  const noon = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const dayPart = noon.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: ORDER_FULFILLMENT.PICKUP_TIMEZONE,
  });
  return t ? `${dayPart} at ${t}` : `${dayPart} — ${tbd}`;
}
