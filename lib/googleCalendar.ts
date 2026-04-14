/**
 * Dedicated calendar only (GOOGLE_CALENDAR_ID). Failures are logged; never block requests.
 * Personal calendar at GOOGLE_ACCOUNT_EMAIL must never be read or written.
 */

import { google } from "googleapis";

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
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
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
