/** Customer-facing copy for the 4-day (or configured) pickup lead time. */
export const PICKUP_LEAD_TIME_CUSTOMER_LINE =
  "Dates within 4 days are unavailable — we need time to prepare your order fresh.";

export const ORDER_FORM_PREP_BANNER =
  "⏱️ Please note: orders require a minimum of 4 days to prepare. Select your preferred pickup date and time below from our available slots.";

export function orderFormPickupConfirmationLine(formattedDateLong: string): string {
  return `You're ordering for pickup on ${formattedDateLong}. To change the date, select a different date on the calendar below.`;
}

export const AVAILABILITY_PAGE_HOW_IT_WORKS = `How ordering works at Mr. K's Kitchen:

1. 📅 Pick an available date and time below
2. 🛒 Place your order on the menu page
3. 💚 Send payment via Zelle or Venmo
4. ✅ Mr. K confirms your order and you're all set!

Orders require a minimum of 4 days to prepare.
All orders are pickup only from Cypress, TX 77433.`;

export const NO_PICKUP_DATES_PUBLIC_MESSAGE = `No pickup dates are currently available.
Check back soon — new slots are added regularly!
Questions? Call or text us at 979-703-3827.`;
