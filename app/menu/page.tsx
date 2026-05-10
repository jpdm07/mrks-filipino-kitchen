import Link from "next/link";
import { InventoryStockBanner } from "@/components/inventory/InventoryStockBanner";
import { MenuCategoryNav } from "@/components/menu/MenuCategoryNav";
import { MenuGrid } from "@/components/menu/MenuGrid";
import { MenuKitchenCapacityBanner } from "@/components/menu/MenuKitchenCapacityBanner";
import { SuggestionPoll } from "@/components/sections/SuggestionPoll";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  itemVisibleForMenuTab,
  parseMenuCategoryFromSearchParam,
} from "@/lib/menu-categories";
import { getPublicMenuItems } from "@/lib/public-menu-items";

export const dynamic = "force-dynamic";

type MenuPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function firstSearchParam(
  v: string | string[] | undefined
): string | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  const t = typeof s === "string" ? s.trim() : "";
  return t || undefined;
}

export default async function MenuPage({ searchParams }: MenuPageProps) {
  const items = await getPublicMenuItems();

  const activeTab = parseMenuCategoryFromSearchParam(searchParams.cat);
  const visible = items.filter((i) => itemVisibleForMenuTab(i, activeTab));
  const pickupDate =
    firstSearchParam(searchParams.pickupDate) ??
    firstSearchParam(searchParams.date);

  return (
    <>
      <InventoryStockBanner />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading
          title="Menu"
          subtitle="Authentic Filipino favorites, pickup only in Cypress, TX."
          className="print:hidden"
        />
        <div className="mx-auto mt-6 max-w-2xl px-1 text-center print:hidden">
          <Link
            href="/takeout-menu"
            className="font-semibold text-[color:var(--gold-dark)] underline-offset-4 transition hover:text-[color:var(--primary)] hover:underline"
          >
            Open printable takeout menu
          </Link>
        </div>
        <div className="print:hidden">
          <MenuKitchenCapacityBanner />
          <div className="mt-8">
            <MenuCategoryNav active={activeTab} pickupDate={pickupDate} />
          </div>
          <div className="mt-10">
            <MenuGrid items={visible} />
          </div>
          <div className="mt-16">
            <SuggestionPoll />
          </div>
        </div>
      </div>
    </>
  );
}
