import type { MenuItemDTO } from "@/lib/menu-types";

/** Tabs on `/menu` — three main groups plus All. */
export const MENU_CATEGORY_TABS = [
  "All",
  "Meals",
  "Sides",
  "Desserts",
] as const;

export type MenuCategoryTab = (typeof MENU_CATEGORY_TABS)[number];

function normalizeCategoryKey(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function itemCategoryMatchesTab(
  itemCategory: string,
  tab: Exclude<MenuCategoryTab, "All">
): boolean {
  return normalizeCategoryKey(itemCategory) === normalizeCategoryKey(tab);
}

/** Map a stored menu item category onto a tab (for analytics / future use). */
export function resolveMenuCategoryTab(
  raw: string | null | undefined
): MenuCategoryTab | null {
  if (raw == null) return null;
  const key = normalizeCategoryKey(raw);
  if (!key) return null;
  if (key === normalizeCategoryKey("Desserts")) return "Desserts";
  if (key === normalizeCategoryKey("Sides")) return "Sides";
  if (key === normalizeCategoryKey("Meals")) return "Meals";
  return null;
}

/** Read `?cat=` from the menu URL (server or client). */
export function parseMenuCategoryFromSearchParam(
  raw: string | string[] | undefined
): MenuCategoryTab {
  if (raw == null) return "All";
  const s = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!s) return "All";
  let decoded = s;
  try {
    decoded = decodeURIComponent(s);
  } catch {
    decoded = s;
  }
  const key = normalizeCategoryKey(decoded);
  if (!key || key === "all") return "All";

  if (key === "desserts" || key === "dessert") return "Desserts";
  if (key === "sides" || key === "side") return "Sides";
  if (key === "meals" || key === "meal") return "Meals";

  /** Legacy category strings → new tabs (old bookmarks / links). */
  if (
    new Set([
      "lumpia",
      "quail eggs",
      "quail egg",
    ]).has(key)
  ) {
    return "Sides";
  }
  if (
    new Set([
      "pancit",
      "mains",
      "main",
      "breakfast",
      "tocino",
      "adobo",
    ]).has(key)
  ) {
    return "Meals";
  }

  return "All";
}

export function itemVisibleForMenuTab(
  item: Pick<MenuItemDTO, "isActive" | "category">,
  tab: MenuCategoryTab
): boolean {
  if (!item.isActive) return false;
  if (tab === "All") return true;
  return itemCategoryMatchesTab(item.category, tab);
}
