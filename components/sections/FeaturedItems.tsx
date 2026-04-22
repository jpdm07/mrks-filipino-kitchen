import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import {
  ensureMenuSizes,
  parseMenuSizes,
  type MenuItemDTO,
} from "@/lib/menu-types";
import { safeDb } from "@/lib/safe-db";
import { overlayPublicMenuItemFromCatalog } from "@/lib/menu-catalog-merge";
import { FALLBACK_MENU } from "@/lib/static-menu-fallback";
import { LUMPIA_MENU_FROM_PRICE_USD } from "@/lib/lumpia-cost-model";
import { MenuPhotoComingSoonOverlay } from "@/components/menu/MenuPhotoComingSoonOverlay";
import { SectionHeading } from "@/components/ui/SectionHeading";

export async function FeaturedItems() {
  const ids = ["seed-1", "seed-4", "seed-6"];
  const fallbackOrdered = ids
    .map((id) => FALLBACK_MENU.find((m) => m.id === id))
    .filter((x): x is MenuItemDTO => Boolean(x));

  const ordered = await safeDb(async () => {
    const rows = await prisma.menuItem.findMany({
      where: { id: { in: ids } },
    });
    return ids
      .map((id) => rows.find((i) => i.id === id))
      .filter(Boolean)
      .map((row) => {
        const r = row!;
        const o = overlayPublicMenuItemFromCatalog({
          id: r.id,
          name: r.name,
          description: r.description,
          category: r.category,
          calories: r.calories,
          basePrice: r.basePrice,
          sizes: ensureMenuSizes(parseMenuSizes(r.sizes), r.basePrice),
          photoUrl: r.photoUrl,
          isActive: r.isActive,
          soldOut: r.soldOut,
          hasCooked: r.hasCooked,
          hasFrozen: r.hasFrozen,
          sortOrder: r.sortOrder,
          variantGroup: r.variantGroup ?? null,
          variantShortLabel: r.variantShortLabel ?? null,
          groupCardTitle: r.groupCardTitle ?? null,
          groupServingBlurb: r.groupServingBlurb ?? null,
        });
        return { ...o, sizes: ensureMenuSizes(o.sizes, o.basePrice) };
      });
  }, fallbackOrdered);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <SectionHeading title="Our Most Loved Dishes" />
      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 [&>*]:min-h-0 [&>*]:h-full">
        {ordered.map((item) => {
          const price =
            item.variantGroup === "lumpia"
              ? LUMPIA_MENU_FROM_PRICE_USD
              : item.sizes[0]?.price ?? item.basePrice;
          return (
            <article
              key={item.id}
              className="card-elevated group flex h-full min-h-0 flex-col overflow-hidden"
            >
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--bg-section)]">
                <Image
                  src={item.photoUrl}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                  sizes="(max-width:768px) 100vw, 33vw"
                />
                <MenuPhotoComingSoonOverlay />
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-5">
                <h3 className="font-playfair text-xl font-black italic tracking-wide text-[color:var(--primary)]">
                  {(item.groupCardTitle ?? item.name).toUpperCase()}
                </h3>
                <p className="text-sm text-[var(--text-muted)]">{item.calories}</p>
                <p className="mt-2 min-h-0 flex-1 font-cormorant text-sm italic leading-relaxed text-[color:var(--text)]">
                  {item.description}
                </p>
                <p className="mt-4 font-playfair text-lg font-bold text-[color:var(--primary)]">
                  From ${price.toFixed(2)}
                </p>
                <Link
                  href="/menu"
                  className="btn btn-primary btn-sm btn-block mt-3"
                >
                  Order Now
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
