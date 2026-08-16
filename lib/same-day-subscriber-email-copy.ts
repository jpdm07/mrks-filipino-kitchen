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
export function suggestedSameDayTitle(itemNames: string[] = []): string {
  const names = [
    ...new Set(itemNames.map((n) => n.trim()).filter(Boolean)),
  ];
  if (names.length === 1) {
    return `${names[0]} is in stock for same-day pickup (limited quantity) — Mr. K's Filipino Kitchen`;
  }
  if (names.length === 2) {
    return `${names[0]} & ${names[1]} in stock for same-day pickup (limited quantity) — Mr. K's Filipino Kitchen`;
  }
  if (names.length > 2) {
    return `${names[0]}, ${names[1]} & more in stock for same-day pickup (limited quantity) — Mr. K's Filipino Kitchen`;
  }
  return `Same-day pickup items are in stock (limited quantity) — Mr. K's Filipino Kitchen`;
}

export const SAME_DAY_EMAIL_TEMPLATES: SameDayEmailTemplate[] = [
  {
    id: "ready-today",
    label: "In stock now",
    blurb: "What’s available for same-day pickup — use this most days.",
    subject:
      "Same-day pickup items are in stock (limited quantity) — Mr. K's Filipino Kitchen",
    intro:
      "A quick update from Mr. K's Filipino Kitchen: the items below are in stock for same-day pickup. Quantities are limited. Order on the website if you'd like some — you'll choose your pickup time at checkout.",
    closing:
      "Thank you for staying with us.\n\nMr. K's Filipino Kitchen\nCypress, TX",
  },
  {
    id: "limited",
    label: "Going fast",
    blurb: "When you want to stress that stock won’t last.",
    subject:
      "Limited same-day pickup stock — Mr. K's Filipino Kitchen",
    intro:
      "We have a limited amount in stock for same-day pickup at Mr. K's Filipino Kitchen. The items below are available now. If you'd like an order, please place it on the website soon — once it's spoken for, it's gone.",
    closing:
      "Questions? Call or text 979-703-3827.\n\nSalamat,\nMr. K's Filipino Kitchen",
  },
  {
    id: "after-work",
    label: "After-work reminder",
    blurb: "For people who might want dinner without cooking.",
    subject:
      "Same-day pickup is in stock (limited quantity) — Mr. K's Filipino Kitchen",
    intro:
      "If you need dinner without the cooking, we have same-day pickup items in stock now — limited quantity. Order on the website and choose a pickup time at checkout.",
    closing:
      "We look forward to seeing you at pickup.\n\nMr. K's Filipino Kitchen · Cypress, TX\n979-703-3827",
  },
  {
    id: "family",
    label: "For sharing",
    blurb: "Household or a small gathering, pickup only.",
    subject:
      "Same-day Filipino favorites in stock (limited quantity) — Mr. K's",
    intro:
      "Same-day pickup items are in stock at Mr. K's Filipino Kitchen, in limited quantities. Order online for the household or a small gathering. Pickup time is chosen at checkout — this is pickup only at our Cypress kitchen.",
    closing:
      "Thank you for letting us cook for you.\n\nMr. K's Filipino Kitchen",
  },
  {
    id: "notice",
    label: "Short kitchen notice",
    blurb: "Plain and professional — no extra pitch.",
    subject:
      "Same-day pickup stock update — Mr. K's Filipino Kitchen",
    intro:
      "This is a short notice that we have items in stock for same-day pickup, in limited quantities. Details are below. Order at mrkskitchen.com when you're ready.",
    closing:
      "Mr. K's Filipino Kitchen\nCypress, TX\n979-703-3827",
  },
];

export const DEFAULT_SAME_DAY_TEMPLATE_ID = "ready-today";

const defaultTemplate = SAME_DAY_EMAIL_TEMPLATES[0]!;

export const DEFAULT_SAME_DAY_INTRO = defaultTemplate.intro;
export const DEFAULT_SAME_DAY_CLOSING = defaultTemplate.closing;
export const DEFAULT_SAME_DAY_SUBJECT = defaultTemplate.subject;
