import Link from "next/link";
import { MenuCategoryNav } from "@/components/menu/MenuCategoryNav";
import { MenuGrid } from "@/components/menu/MenuGrid";
import { SuggestionPoll } from "@/components/sections/SuggestionPoll";
import {
  itemVisibleForMenuTab,
  parseMenuCategoryFromSearchParam,
} from "@/lib/menu-categories";
import { getPublicMenuItems } from "@/lib/public-menu-items";

export const dynamic = "force-dynamic";

type MenuPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function MenuPage({ searchParams }: MenuPageProps) {
  const items = await getPublicMenuItems();

  const activeTab = parseMenuCategoryFromSearchParam(searchParams.cat);
  const visible = items.filter((i) => itemVisibleForMenuTab(i, activeTab));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text)] print:hidden sm:text-4xl">
        Menu
      </h1>
      <div className="mx-auto mt-3 max-w-2xl px-1 text-center print:hidden">
        <p className="text-sm text-[var(--text-muted)] sm:text-base">
          Home-cooked Filipino favorites, pickup only in Cypress, TX.
        </p>
        <p className="mt-2 text-sm sm:text-base">
          <Link
            href="/takeout-menu"
            className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
          >
            Open printable takeout menu
          </Link>
        </p>
      </div>
      <div className="print:hidden">
        <div className="mt-8">
          <MenuCategoryNav active={activeTab} />
        </div>
        <div className="mt-10">
          <MenuGrid items={visible} />
        </div>
        <div className="mt-16">
          <SuggestionPoll />
        </div>
      </div>
    </div>
  );
}
