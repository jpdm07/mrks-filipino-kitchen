import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { buildSiteBannerEntries } from "@/lib/lumpia-inventory-banners";
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
        <div
          className="print:hidden relative z-40 w-full border-b-4 border-[var(--gold)] bg-[var(--primary-deep)] text-white shadow-[0_8px_24px_rgba(6,15,31,0.28)]"
          role="status"
        >
          <div className="mx-auto max-w-5xl px-4 py-3.5 sm:py-4">
            <div className="space-y-3">
              {bannerEntries.map((entry) => (
                <div
                  key={entry.key}
                  className="flex flex-col items-center justify-between gap-3 rounded-xl border border-[var(--gold)]/55 bg-[rgba(14,29,53,0.65)] px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[var(--gold)] sm:text-xs">
                      Same-day pickup · in stock now
                    </p>
                    <p className="mt-1.5 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
                      {entry.title ?? entry.message}
                    </p>
                    {entry.availability ? (
                      <p className="mt-1 text-lg font-extrabold text-[var(--gold)] sm:text-xl">
                        {entry.availability}
                        {entry.styleNote ? (
                          <span className="ml-2 text-base font-semibold text-white/85">
                            · {entry.styleNote}
                          </span>
                        ) : null}
                      </p>
                    ) : entry.title ? (
                      <p className="mt-1 text-sm font-medium text-white/85">
                        {entry.message}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href="/menu"
                    className="btn btn-primary btn-sm relative z-10 shrink-0 whitespace-nowrap !px-5 !py-2.5 !text-sm !font-extrabold"
                  >
                    Order now
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <StoreNoticeBanner hasSameDayStock={stateB && bannerEntries.length > 0} />
    </>
  );
}
