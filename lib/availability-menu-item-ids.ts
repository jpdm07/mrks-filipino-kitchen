/**
 * Checkout passes cart menu SKUs so availability APIs can intersect with inventory
 * same-day pickup slot windows. Supports repeated `menuItemIds` and comma lists.
 */
export function parseMenuItemIdsFromSearchParams(
  searchParams: URLSearchParams
): string[] {
  const parts: string[] = [];
  for (const raw of searchParams.getAll("menuItemIds")) {
    for (const seg of raw.split(",")) {
      const t = seg.trim();
      if (t) parts.push(t);
    }
  }
  return [...new Set(parts)];
}
