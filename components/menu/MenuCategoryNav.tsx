import Link from "next/link";
import {
  MENU_CATEGORY_TABS,
  type MenuCategoryTab,
} from "@/lib/menu-categories";

/**
 * Category tabs use real navigation (?cat=) so filtering runs on the server.
 * Works even if client-side React state fails to update.
 */
export function MenuCategoryNav({ active }: { active: MenuCategoryTab }) {
  return (
    <nav
      role="tablist"
      aria-label="Menu categories"
      className="sticky top-[calc(var(--nav-h,72px)+0px)] z-30 -mx-4 flex flex-wrap items-center justify-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 py-3 backdrop-blur-md md:mx-0"
    >
      {MENU_CATEGORY_TABS.map((c) => {
        const href = c === "All" ? "/menu" : `/menu?cat=${encodeURIComponent(c)}`;
        const isActive = c === active;
        return (
          <Link
            key={c}
            href={href}
            scroll={false}
            role="tab"
            aria-selected={isActive}
            id={`menu-cat-${c.replace(/\s+/g, "-").toLowerCase()}`}
            className={`inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition duration-300 ${
              isActive
                ? "bg-gradient-to-br from-[var(--primary-soft)] to-[var(--primary-dark)] text-white shadow-[0_6px_20px_rgba(0,56,168,0.35)] ring-1 ring-white/20"
                : "bg-[var(--card)] text-[var(--text)] shadow-sm ring-1 ring-[var(--border)] hover:-translate-y-0.5 hover:shadow-md hover:ring-[var(--primary)]/35"
            }`}
          >
            {c}
          </Link>
        );
      })}
    </nav>
  );
}
