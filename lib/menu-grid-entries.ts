import type { MenuItemDTO } from "@/lib/menu-types";

export type MenuGridSingle = { kind: "single"; item: MenuItemDTO; sort: number };

export type MenuGridGroup = {
  kind: "group";
  groupKey: string;
  variants: MenuItemDTO[];
  sort: number;
};

export type MenuGridEntry = MenuGridSingle | MenuGridGroup;

/**
 * Collapse rows that share `variantGroup` into one card; preserve menu order via min sortOrder.
 */
export function buildMenuGridEntries(items: MenuItemDTO[]): MenuGridEntry[] {
  const byGroup = new Map<string, MenuItemDTO[]>();
  const singles: MenuItemDTO[] = [];

  for (const item of items) {
    const g = item.variantGroup?.trim();
    if (!g) {
      singles.push(item);
      continue;
    }
    const list = byGroup.get(g) ?? [];
    list.push(item);
    byGroup.set(g, list);
  }

  for (const list of Array.from(byGroup.values())) {
    list.sort((a: MenuItemDTO, b: MenuItemDTO) => a.sortOrder - b.sortOrder);
  }

  const groups: MenuGridGroup[] = Array.from(byGroup.entries()).map(
    ([groupKey, variants]) => ({
      kind: "group",
      groupKey,
      variants,
      sort: Math.min(...variants.map((v: MenuItemDTO) => v.sortOrder)),
    })
  );

  const singleEntries: MenuGridSingle[] = singles.map((item) => ({
    kind: "single",
    item,
    sort: item.sortOrder,
  }));

  return [...groups, ...singleEntries].sort((a, b) => a.sort - b.sort);
}
