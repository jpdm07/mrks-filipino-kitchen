import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { buildSiteBannerEntries } from "@/lib/lumpia-inventory-banners";
import { SameDayStockBanner } from "@/components/ui/SameDayStockBanner";
import { StoreNoticeBanner } from "@/components/ui/StoreNoticeBanner";

/**
 * Site-wide same-day stock strip + dismissible house notes (not shown on /admin).
 */
export async function SmartSchedulingBanner() {
  const path = headers().get("x-mrk-pathname") ?? "";
  if (path.startsWith("/admin")) return null;

  let forceStateA = false;
  let sameDayItems: Awaited<ReturnType<typeof prisma.inventoryItem.findMany>> =
    [];

  try {
    const [settings, items] = await Promise.all([
      prisma.pricingSettings.findUnique({ where: { id: "default" } }),
      prisma.inventoryItem.findMany({
        where: {
          showBanner: true,
          isAvailable: true,
          quantityInStock: { gt: 0 },
        },
        orderBy: { id: "asc" },
      }),
    ]);
    forceStateA = settings?.schedulingBannerForceStateA === true;
    sameDayItems = items;
  } catch {
    /* DB unavailable — stock strip hidden; house notes still show */
  }

  const stateB = !forceStateA && sameDayItems.length > 0;
  const bannerEntries = stateB ? buildSiteBannerEntries(sameDayItems) : [];

  return (
    <>
      {stateB && bannerEntries.length > 0 ? (
        <SameDayStockBanner entries={bannerEntries} />
      ) : null}
      <StoreNoticeBanner hasSameDayStock={stateB && bannerEntries.length > 0} />
    </>
  );
}
