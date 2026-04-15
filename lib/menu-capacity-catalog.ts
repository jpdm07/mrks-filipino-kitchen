/**
 * Friday cook minutes per menu line (sizeKey) and flan flag — mirrors owner constraints.
 * Sync with Prisma seed / admin MenuItem.cookMinutes + isFlanItem.
 */
export const MAIN_COOK_CAP_MINUTES = 300;
export const FLAN_WEEKLY_CAP_RAMEKINS = 16;

/** Statuses that reserve kitchen capacity (excludes Cancelled, demo, etc.). */
export const ORDER_STATUSES_COUNTING_TOWARD_CAPACITY = [
  "Pending Payment Verification",
  "Awaiting Payment",
  "Confirmed",
] as const;

/** Per menuItemId, per sizeKey, cook minutes for one line unit (× quantity). */
export const COOK_MINUTES_BY_MENU_ITEM: Record<
  string,
  { bySize: Record<string, number>; isFlan?: boolean }
> = {
  "seed-1": {
    bySize: { cooked: 15, frozen: 5 },
  },
  "seed-2": {
    bySize: { cooked: 15, frozen: 5 },
  },
  "seed-3": {
    bySize: { cooked: 15, frozen: 5 },
  },
  "seed-4": {
    bySize: { small: 30, twoFour: 45, party: 75 },
  },
  "seed-5": {
    bySize: { small: 30, twoFour: 45, party: 75 },
  },
  "seed-6": {
    bySize: { individual: 0 },
    isFlan: true,
  },
  "seed-7": {
    bySize: { "10pc": 20 },
  },
  "seed-8": {
    bySize: { plate: 20 },
  },
  "seed-9": {
    bySize: { plate: 20 },
  },
  "seed-10": {
    bySize: { frozen: 5 },
  },
  "seed-11": {
    bySize: { frozen: 5 },
  },
  "seed-12": {
    bySize: { plate: 30, party: 75 },
  },
};
