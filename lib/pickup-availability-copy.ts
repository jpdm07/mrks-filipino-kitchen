export function orderFormPickupConfirmationLine(formattedDateLong: string): string {
  return `You're ordering for pickup on ${formattedDateLong}. To change the date, select a different date on the calendar below.`;
}

export const NO_PICKUP_DATES_PUBLIC_MESSAGE = `No pickup dates are currently available.
Check back soon — new slots are added regularly!
Questions? Call or text us at 979-703-3827.`;
