/**
 * Dedicated calendar only (GOOGLE_CALENDAR_ID). Failures are logged; never block requests.
 * Personal calendar at GOOGLE_ACCOUNT_EMAIL must never be read or written.
 */

import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import { addCalendarDaysYMD } from "@/lib/pickup-lead-time";
import { pickupTimeSlotLabels } from "@/lib/pickup-time-slots";

function privateKey(): string | null {
  const raw = process.env.GOOGLE_PRIVATE_KEY;
  if (!raw) return null;
  return raw.replace(/\\n/g, "\n");
}

export function getCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = privateKey();
  if (!email || !key) return null;
  const jwt = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth: jwt });
}

export function convertTo24Hour(time12h: string): string {
  const t = time12h.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return "12:00:00";
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}:00`;
}

export async function createAvailabilityEvent(
  dateYmd: string,
  slots: string[],
  note?: string | null
): Promise<void> {
  const calId = process.env.GOOGLE_CALENDAR_ID;
  const cal = getCalendarClient();
  if (!cal || !calId) return;
  try {
    const desc = [
      note?.trim() ? `Note: ${note.trim()}` : null,
      slots.length ? `Slots: ${slots.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    await cal.events.insert({
      calendarId: calId,
      requestBody: {
        summary: "🟢 Mr. K's — Available for Pickup",
        description: desc || undefined,
        start: { date: dateYmd },
        end: { date: dateYmd },
        colorId: "2",
        extendedProperties: {
          private: { type: "availability", date: dateYmd },
        },
      },
    });
  } catch (e) {
    console.warn("Google Calendar createAvailabilityEvent:", e);
  }
}

const ALL_SLOT_LABELS = pickupTimeSlotLabels();
const SLOT_ALLOW = new Set(ALL_SLOT_LABELS);

/** Parse "Slots: 10:00 AM, 10:15 AM, …" lines from event descriptions (app-created). */
export function parseSlotsFromGoogleDescription(
  description: string | null | undefined
): string[] {
  const desc = (description ?? "").trim();
  const m = desc.match(/Slots:\s*([^\n]+)/i);
  if (!m) return [...ALL_SLOT_LABELS];
  const parts = m[1]
    .split(/,/)
    .map((s) => s.trim())
    .filter(Boolean);
  const ok = parts.filter((p) => SLOT_ALLOW.has(p));
  return ok.length > 0 ? ok : [...ALL_SLOT_LABELS];
}

function expandAllDayEventToYmds(ev: calendar_v3.Schema$Event): string[] {
  const s = ev.start?.date;
  const e = ev.end?.date;
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return [];
  if (!e) return [s];
  const out: string[] = [];
  let d = s;
  let guard = 0;
  while (d < e && guard++ < 400) {
    out.push(d);
    d = addCalendarDaysYMD(d, 1);
  }
  return out;
}

/**
 * True for all-day “open for pickup” markers (app sync or manual copy of the title).
 * Skips timed pickup orders (type=pickup) and non–all-day events.
 */
export function isAvailabilityMarkerEvent(
  ev: calendar_v3.Schema$Event
): boolean {
  const priv = ev.extendedProperties?.private as
    | Record<string, string | undefined>
    | undefined;
  if (priv?.type === "pickup") return false;
  if (priv?.type === "availability") return true;
  const sum = (ev.summary ?? "").toLowerCase();
  if (!ev.start?.date || ev.start.dateTime) return false;
  if (sum.includes("available for pickup")) return true;
  if (sum.includes("🟢")) return true;
  if (sum.includes("mr. k") && sum.includes("available")) return true;
  return false;
}

export type GoogleAvailabilityMarker = {
  date: string;
  note: string | null;
  slots: string[];
};

/** List availability markers in range (for DB sync). */
/** Null = service account / calendar ID missing or Google API error (do not treat as “no events”). */
export async function listGoogleAvailabilityMarkers(
  fromYmd: string,
  toYmd: string
): Promise<GoogleAvailabilityMarker[] | null> {
  const calId = process.env.GOOGLE_CALENDAR_ID;
  const cal = getCalendarClient();
  if (!cal || !calId) return null;

  const timeMin = new Date(`${fromYmd}T00:00:00-06:00`).toISOString();
  const timeMax = new Date(`${toYmd}T23:59:59-06:00`).toISOString();

  const byDate = new Map<string, GoogleAvailabilityMarker>();
  let pageToken: string | undefined;

  try {
    do {
      const res = await cal.events.list({
        calendarId: calId,
        timeMin,
        timeMax,
        singleEvents: true,
        maxResults: 500,
        pageToken,
      });
      const items = res.data.items ?? [];
      for (const ev of items) {
        if (!isAvailabilityMarkerEvent(ev)) continue;
        const noteLine = (ev.description ?? "")
          .split("\n")
          .find((l) => /^note:\s*/i.test(l));
        const note = noteLine
          ? noteLine.replace(/^note:\s*/i, "").trim() || null
          : null;
        const slots = parseSlotsFromGoogleDescription(ev.description ?? null);
        for (const date of expandAllDayEventToYmds(ev)) {
          if (date < fromYmd || date > toYmd) continue;
          byDate.set(date, { date, note, slots });
        }
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (e) {
    console.warn("Google Calendar listGoogleAvailabilityMarkers:", e);
    return null;
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function removeAvailabilityEvent(dateYmd: string): Promise<void> {
  const calId = process.env.GOOGLE_CALENDAR_ID;
  const cal = getCalendarClient();
  if (!cal || !calId) return;
  try {
    const res = await cal.events.list({
      calendarId: calId,
      privateExtendedProperty: ["type=availability"],
      timeMin: new Date(`${dateYmd}T00:00:00-06:00`).toISOString(),
      timeMax: new Date(`${dateYmd}T23:59:59-06:00`).toISOString(),
      singleEvents: true,
    });
    const items = res.data.items ?? [];
    for (const ev of items) {
      if (ev.id) {
        await cal.events.delete({ calendarId: calId, eventId: ev.id });
      }
    }
  } catch (e) {
    console.warn("Google Calendar removeAvailabilityEvent:", e);
  }
}

type OrderLike = {
  orderNumber: string;
  customerName: string;
  pickupDate?: string | null;
  pickupTime?: string | null;
};

export async function createPickupEvent(order: OrderLike): Promise<void> {
  const calId = process.env.GOOGLE_CALENDAR_ID;
  const cal = getCalendarClient();
  if (!cal || !calId || !order.pickupDate || !order.pickupTime) return;
  try {
    const time = convertTo24Hour(order.pickupTime);
    const start = `${order.pickupDate}T${time}`;
    const startDate = new Date(`${start}-06:00`);
    const endDate = new Date(startDate.getTime() + 15 * 60 * 1000);
    await cal.events.insert({
      calendarId: calId,
      requestBody: {
        summary: `📦 Pickup — ${order.customerName} | #${order.orderNumber}`,
        start: { dateTime: startDate.toISOString(), timeZone: "America/Chicago" },
        end: { dateTime: endDate.toISOString(), timeZone: "America/Chicago" },
        colorId: "5",
        extendedProperties: {
          private: { type: "pickup", orderNumber: order.orderNumber },
        },
      },
    });
  } catch (e) {
    console.warn("Google Calendar createPickupEvent:", e);
  }
}

export async function updatePickupEvent(
  orderNumber: string,
  newStatus: string
): Promise<void> {
  const calId = process.env.GOOGLE_CALENDAR_ID;
  const cal = getCalendarClient();
  if (!cal || !calId) return;
  try {
    const res = await cal.events.list({
      calendarId: calId,
      privateExtendedProperty: ["type=pickup"],
      q: orderNumber,
      singleEvents: true,
    });
    const ev = (res.data.items ?? []).find((e) =>
      e.extendedProperties?.private?.orderNumber === orderNumber
    );
    if (!ev?.id) return;
    const prefix =
      newStatus.toLowerCase().includes("confirm") || newStatus === "Confirmed"
        ? "✅"
        : newStatus.toLowerCase().includes("cancel")
          ? "❌"
          : "📦";
    await cal.events.patch({
      calendarId: calId,
      eventId: ev.id,
      requestBody: {
        summary: `${prefix} ${ev.summary?.replace(/^[✅❌📦]\s*/, "") ?? orderNumber}`,
      },
    });
  } catch (e) {
    console.warn("Google Calendar updatePickupEvent:", e);
  }
}
