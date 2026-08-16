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

/** Short subject — what’s in stock is listed in the body. */
export function suggestedSameDayTitle(
  _itemNames?: Array<string | { name: string }>
): string {
  return `Same-day pickup available — Mr. K's Filipino Kitchen`;
}

export const SAME_DAY_EMAIL_TEMPLATES: SameDayEmailTemplate[] = [
  {
    id: "ready-today",
    label: "In stock now",
    blurb: "Default notice — brief stock update.",
    subject: "Same-day pickup available — Mr. K's Filipino Kitchen",
    intro:
      "We’ve got a little same-day pickup ready for you — limited stock, so grab it while it lasts. Order online and pick the time that works best at checkout.",
    closing:
      "Thank you for staying with us — it means a lot. 💛\n\nMr. K's Filipino Kitchen · Cypress, TX · 979-703-3827",
  },
  {
    id: "limited",
    label: "Going fast",
    blurb: "When stock is low.",
    subject: "Limited same-day pickup — Mr. K's Filipino Kitchen",
    intro:
      "Stock is moving quickly today. If something below looks good, we’d love for you to order soon.",
    closing:
      "Thank you for being part of our kitchen community.\n\nQuestions? 979-703-3827 · Mr. K's Filipino Kitchen",
  },
  {
    id: "after-work",
    label: "After-work reminder",
    blurb: "Dinner without cooking.",
    subject: "Same-day pickup available — Mr. K's Filipino Kitchen",
    intro:
      "Need dinner without cooking? We’ve got limited same-day pickup open — order online whenever you’re ready.",
    closing:
      "Thank you for staying with us — enjoy your meal.\n\nMr. K's Filipino Kitchen · Cypress, TX · 979-703-3827",
  },
  {
    id: "family",
    label: "For sharing",
    blurb: "Household or small gathering.",
    subject: "Same-day pickup available — Mr. K's Filipino Kitchen",
    intro:
      "Feeding the household or a small gathering? Limited same-day pickup is ready in Cypress — choose your time at checkout.",
    closing:
      "Thank you for letting us cook for your table.\n\nMr. K's Filipino Kitchen · Cypress, TX · 979-703-3827",
  },
  {
    id: "notice",
    label: "Short kitchen notice",
    blurb: "Minimal copy.",
    subject: "Same-day pickup available — Mr. K's Filipino Kitchen",
    intro: "A quick note from the kitchen: limited same-day pickup is available. See below.",
    closing:
      "Thank you for staying with us!\n\nMr. K's Filipino Kitchen · Cypress, TX · 979-703-3827",
  },
];

export const DEFAULT_SAME_DAY_TEMPLATE_ID = "ready-today";

const defaultTemplate = SAME_DAY_EMAIL_TEMPLATES[0]!;

export const DEFAULT_SAME_DAY_INTRO = defaultTemplate.intro;
export const DEFAULT_SAME_DAY_CLOSING = defaultTemplate.closing;
export const DEFAULT_SAME_DAY_SUBJECT = defaultTemplate.subject;
