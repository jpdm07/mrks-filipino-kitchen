import type { MenuItemDTO } from "@/lib/menu-types";
import { buildMenuGridEntries } from "@/lib/menu-grid-entries";
import { GroupedMenuCard } from "./GroupedMenuCard";
import { MenuCard } from "./MenuCard";

export function MenuGrid({ items }: { items: MenuItemDTO[] }) {
  if (!items.length) {
    return (
      <p className="py-16 text-center text-[var(--text-muted)]">
        No menu items in this category right now.
      </p>
    );
  }
  const entries = buildMenuGridEntries(items);
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-h-0 [&>*]:h-full">
      {entries.map((entry) =>
        entry.kind === "group" ? (
          <GroupedMenuCard
            key={`g-${entry.groupKey}`}
            variants={entry.variants}
          />
        ) : (
          <MenuCard key={entry.item.id} item={entry.item} />
        )
      )}
    </div>
  );
}
