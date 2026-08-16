/** Premade custom-newsletter copy — safe for client components. */

export type NewsletterTemplate = {
  id: string;
  label: string;
  blurb: string;
  subject: string;
  message: string;
};

export const NEWSLETTER_TEMPLATES: NewsletterTemplate[] = [
  {
    id: "whats-cooking",
    label: "What's cooking",
    blurb: "Weekly-style update with a clear next step.",
    subject: "What's cooking at Mr. K's Filipino Kitchen",
    message:
      "Hi — a short note from Mr. K's Filipino Kitchen in Cypress.\n\nWe're taking orders on the website. Pickup only — choose your date and time at checkout, then we'll confirm once your order is in.\n\nIf you featured items below, those are the ones we'd point you to first. Otherwise, the full menu is on the site.\n\nThank you for being on our list.\n\nMr. K's Filipino Kitchen\nCypress, TX\n979-703-3827",
  },
  {
    id: "thank-you",
    label: "Thank you",
    blurb: "Grateful, not promotional.",
    subject: "Thank you from Mr. K's Filipino Kitchen",
    message:
      "Hi — thank you for subscribing and for supporting Mr. K's Filipino Kitchen.\n\nWe cook Filipino food here in Cypress for pickup. When we have same-day trays or something worth a heads-up, we'll write. No spam, and you can unsubscribe any time.\n\nIf you're ready to order, the menu is on our website. Pickup times are selected at checkout.\n\nSalamat,\nMr. K's Filipino Kitchen\n979-703-3827",
  },
  {
    id: "advance-pickup",
    label: "Advance pickup reminder",
    blurb: "For Friday/Saturday style scheduling.",
    subject: "Pickup dates are open — Mr. K's Filipino Kitchen",
    message:
      "Hi — pickup dates are on the calendar at Mr. K's Filipino Kitchen.\n\nIf you want an order for later this week or the weekend, please place it on the website so we can plan the cook. Choose your pickup date and time at checkout. This is pickup only at our Cypress kitchen.\n\nQuestions? Call or text 979-703-3827.\n\nThank you,\nMr. K's Filipino Kitchen",
  },
  {
    id: "featured",
    label: "Featured dishes",
    blurb: "Use with menu photos checked below.",
    subject: "From the kitchen — Mr. K's Filipino Kitchen",
    message:
      "Hi — we wanted to share a few dishes from Mr. K's Filipino Kitchen.\n\nPhotos and details are in this email. Order on the website when you're ready, then pick your pickup time at checkout.\n\nWe appreciate you.\n\nMr. K's Filipino Kitchen\nCypress, TX",
  },
  {
    id: "closed-note",
    label: "Kitchen note / pause",
    blurb: "When you need to say you're not taking orders.",
    subject: "A note from Mr. K's Filipino Kitchen",
    message:
      "Hi — a quick note from Mr. K's Filipino Kitchen in Cypress.\n\nWe are not taking new orders right now. We'll write again when pickup is open. Thank you for your patience, and thank you for supporting a small kitchen.\n\nMr. K's Filipino Kitchen\n979-703-3827",
  },
];

export const DEFAULT_NEWSLETTER_TEMPLATE_ID = "whats-cooking";

const defaultNews = NEWSLETTER_TEMPLATES[0]!;

export const DEFAULT_NEWSLETTER_SUBJECT = defaultNews.subject;
export const DEFAULT_NEWSLETTER_MESSAGE = defaultNews.message;
