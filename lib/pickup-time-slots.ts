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

/** Sort labels by chronological order (10:00 AM → 7:00 PM). Unknown labels sort last. */
export function sortPickupSlotLabels(slots: string[]): string[] {
  const order = pickupTimeSlotLabels();
  const idx = new Map(order.map((label, i) => [label, i]));
  return [...slots].sort((a, b) => {
    const ia = idx.get(a.trim());
    const ib = idx.get(b.trim());
    if (ia !== undefined && ib !== undefined) return ia - ib;
    if (ia !== undefined) return -1;
    if (ib !== undefined) return 1;
    return a.localeCompare(b);
  });
}

export function isValidPickupTimeLabel(t: string): boolean {
  return ALLOWED.has(t.trim());
}
