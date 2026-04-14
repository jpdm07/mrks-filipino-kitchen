/** Pickup windows: 10:00 AM through 7:00 PM, 30-minute steps (matches checkout UI). */
export function pickupTimeSlotLabels(): string[] {
  const out: string[] = [];
  for (let mins = 10 * 60; mins <= 19 * 60; mins += 30) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const hour12 = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
    const ampm = h24 < 12 ? "AM" : "PM";
    out.push(`${hour12}:${m === 0 ? "00" : "30"} ${ampm}`);
  }
  return out;
}

const ALLOWED = new Set(pickupTimeSlotLabels());

export function isValidPickupTimeLabel(t: string): boolean {
  return ALLOWED.has(t.trim());
}
