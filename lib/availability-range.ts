import { addCalendarDaysYMD } from "@/lib/pickup-lead-time";

/** Inclusive YYYY-MM-DD range: iterate each calendar day. */
export function eachYmdInRangeInclusive(
  fromYmd: string,
  toYmd: string
): string[] {
  const out: string[] = [];
  let d = fromYmd.trim();
  const end = toYmd.trim();
  let guard = 0;
  while (d <= end && guard++ < 800) {
    out.push(d);
    d = addCalendarDaysYMD(d, 1);
  }
  return out;
}
