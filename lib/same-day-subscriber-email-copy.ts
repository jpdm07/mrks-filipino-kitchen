/** Safe for client components — no Prisma or server-only imports. */

export type SameDayEmailTemplate = {
  id: string;
  label: string;
  blurb: string;
  subject: string;
  intro: string;
  closing: string;
};

export function formatSameDayEmailDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function fillSameDayDateToken(text: string, todayYmd: string): string {
  if (!text.includes("{date}")) return text;
  return text.replaceAll("{date}", formatSameDayEmailDate(todayYmd));
}

/** Cypress kitchen calendar date as YYYY-MM-DD (safe in the browser). */
export function todayYmdPickupTz(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Ready-to-send subject line. Pass in-stock item names when you have them. */
export function suggestedSameDayTitle(
  todayYmd: string,
  itemNames: string[] = []
): string {
  const date = formatSameDayEmailDate(todayYmd);
  const names = [
    ...new Set(itemNames.map((n) => n.trim()).filter(Boolean)),
  ];
  if (names.length === 1) {
    return `${names[0]} is ready for same-day pickup (${date}) — Mr. K's Filipino Kitchen`;
  }
  if (names.length === 2) {
    return `${names[0]} & ${names[1]} — same-day pickup ${date} — Mr. K's Filipino Kitchen`;
  }
  if (names.length > 2) {
    return `Same-day pickup ${date}: ${names[0]}, ${names[1]} & more — Mr. K's Filipino Kitchen`;
  }
  return `Same-day pickup is available ${date} — Mr. K's Filipino Kitchen`;
}

export const SAME_DAY_EMAIL_TEMPLATES: SameDayEmailTemplate[] = [
  {
    id: "ready-today",
    label: "Ready for pickup today",
    blurb: "Warm, straightforward — use this most days.",
    subject: "Same-day pickup is available today ({date}) — Mr. K's Filipino Kitchen",
    intro:
      "Hi — we have same-day pickup available today at Mr. K's Filipino Kitchen in Cypress. The items below are in stock now. Order on our website, choose your pickup time at checkout, and we'll have it ready when you arrive.",
    closing:
      "Thank you for supporting our kitchen. See you at pickup.\n\nMr. K's Filipino Kitchen\nCypress, TX",
  },
  {
    id: "limited",
    label: "Limited quantity",
    blurb: "Honest and calm when stock is low.",
    subject: "A few same-day trays are ready — Mr. K's Filipino Kitchen",
    intro:
      "We have a limited amount ready for same-day pickup today at Mr. K's in Cypress. If you'd like an order, please place it online soon — once these trays are spoken for, that window closes. Pickup times are listed with each item below.",
    closing:
      "Questions? Call or text 979-703-3827.\n\nSalamat,\nMr. K's Filipino Kitchen",
  },
  {
    id: "after-work",
    label: "After-work pickup",
    blurb: "For evening windows without sounding salesy.",
    subject: "Same-day pickup this evening — Mr. K's Filipino Kitchen",
    intro:
      "If you need dinner without the cooking tonight, same-day pickup is available at Mr. K's Filipino Kitchen. Place your order online and choose a pickup time that works after work. Details for what's in stock are below.",
    closing:
      "We look forward to seeing you at pickup.\n\nMr. K's Filipino Kitchen · Cypress, TX\n979-703-3827",
  },
  {
    id: "family",
    label: "For the family or a gathering",
    blurb: "Sharing trays, still pickup-only.",
    subject: "Same-day Filipino favorites, ready for pickup — Mr. K's",
    intro:
      "Same-day pickup is open today at Mr. K's Filipino Kitchen. The items below are in stock now — order online for the household or a small gathering, then choose your pickup window at checkout. This is pickup only at our Cypress kitchen.",
    closing:
      "Thank you for letting us cook for you.\n\nMr. K's Filipino Kitchen",
  },
  {
    id: "notice",
    label: "Short kitchen notice",
    blurb: "Plain and professional — no extra pitch.",
    subject: "Same-day pickup notice — Mr. K's Filipino Kitchen (Cypress, TX)",
    intro:
      "This is a short notice that same-day pickup inventory is available today. Item details and pickup times are listed below. You can order at mrkskitchen.com and select your time at checkout.",
    closing:
      "Mr. K's Filipino Kitchen\nCypress, TX\n979-703-3827",
  },
];

export const DEFAULT_SAME_DAY_TEMPLATE_ID = "ready-today";

const defaultTemplate = SAME_DAY_EMAIL_TEMPLATES[0]!;

export const DEFAULT_SAME_DAY_INTRO = defaultTemplate.intro;
export const DEFAULT_SAME_DAY_CLOSING = defaultTemplate.closing;
export const DEFAULT_SAME_DAY_SUBJECT = defaultTemplate.subject;
