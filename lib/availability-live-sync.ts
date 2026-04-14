/**
 * Interval for SSE `/api/availability/stream` to re-query the DB. Admin saves
 * write the same `Availability` table the storefront reads, so lowering this
 * makes calendar changes show up sooner for customers with the site open.
 */
export const AVAILABILITY_LIVE_POLL_MS = 3500;
