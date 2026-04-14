import type { MenuItemDTO } from "@/lib/menu-types";

/** Section order on the printable handout (matches public menu tabs). */
export const PRINT_MENU_CATEGORY_ORDER = ["Meals", "Sides", "Desserts"] as const;

export type PrintMenuSection = {
  category: string;
  items: MenuItemDTO[];
};

const MAX_DESC_LEN = 120;

export function truncateMenuDescription(raw: string, max = MAX_DESC_LEN): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** Full description for print/PDF (no ellipsis). */
export function normalizePrintMenuDescription(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function groupItemsForPrintMenu(items: MenuItemDTO[]): PrintMenuSection[] {
  const active = items
    .filter((i) => i.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const byCat = new Map<string, MenuItemDTO[]>();
  for (const i of active) {
    const list = byCat.get(i.category) ?? [];
    list.push(i);
    byCat.set(i.category, list);
  }
  const out: PrintMenuSection[] = [];
  for (const c of PRINT_MENU_CATEGORY_ORDER) {
    const list = byCat.get(c);
    if (list?.length) {
      out.push({ category: c, items: list });
      byCat.delete(c);
    }
  }
  const rest = Array.from(byCat.keys()).sort((a, b) => a.localeCompare(b));
  for (const c of rest) {
    const list = byCat.get(c);
    if (list?.length) out.push({ category: c, items: list });
  }
  return out;
}
