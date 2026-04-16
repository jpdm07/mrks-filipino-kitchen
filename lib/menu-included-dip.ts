import { MENU_DIP_DISPLAY_LINE } from "@/lib/menu-takeout-description-split";

/**
 * Menu rows whose takeout includes a dipping sauce (aligned with
 * `cartLineQualifiesForDipAddon` / `orderItemLineQualifiesForDipContext` for catalog SKUs).
 */
export const MENU_ITEM_IDS_WITH_INCLUDED_DIP = new Set<string>([
  "seed-1",
  "seed-2",
  "seed-3",
  "seed-7",
  "seed-8",
  "seed-9",
  "seed-12",
]);

/** Append the standard dip sentence when missing (covers stale DB descriptions after overlay). */
export function ensureMenuDescriptionIncludesDip(
  menuItemId: string,
  description: string
): string {
  if (!MENU_ITEM_IDS_WITH_INCLUDED_DIP.has(menuItemId)) return description;
  const t = description.trimEnd();
  if (!t) return MENU_DIP_DISPLAY_LINE;
  if (/\bcomes with a dipping sauce\b/i.test(t)) return description;
  return `${t} ${MENU_DIP_DISPLAY_LINE}`;
}
