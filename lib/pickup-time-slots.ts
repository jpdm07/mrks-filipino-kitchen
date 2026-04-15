/** Pickup windows: 10:00 AM through 8:00 PM, 15-minute steps (checkout + admin availability). */
export function pickupTimeSlotLabels(): string[] {
  const out: string[] = [];
  const step = 15;
  for (let mins = 10 * 60; mins <= 20 * 60; mins += step) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const hour12 = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
    const ampm = h24 < 12 ? "AM" : "PM";
    out.push(`${hour12}:${String(m).padStart(2, "0")} ${ampm}`);
  }
  return out;
}

const ALLOWED = new Set(pickupTimeSlotLabels());

/** Legacy full half-hour grid (10:00 AM–7:00 PM) used to detect old “default” DB rows. */
function buildLegacyThirtyMinuteFullGrid(): string[] {
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

const LEGACY_FULL_30_MIN_GRID = buildLegacyThirtyMinuteFullGrid();

/**
 * True when stored slots are exactly the old default “every half hour” set.
 * Those rows should behave like “all standard slots” (now 15-minute intervals).
 */
export function isLegacyFullThirtyMinuteSlotGrid(slots: string[]): boolean {
  if (slots.length !== LEGACY_FULL_30_MIN_GRID.length) return false;
  const s = new Set(slots);
  if (s.size !== slots.length) return false;
  for (const x of LEGACY_FULL_30_MIN_GRID) {
    if (!s.has(x)) return false;
  }
  return true;
}

/** Sort labels by chronological order (10:00 AM → 8:00 PM). Unknown labels sort last. */
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
