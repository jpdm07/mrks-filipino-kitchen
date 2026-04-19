"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { GA_MEASUREMENT_ID } from "@/lib/gtag";

/**
 * Sends a GA4 page_view on first load and on every client-side navigation (App Router).
 * Must be wrapped in `<Suspense>` because `useSearchParams()` can suspend.
 */
export function GoogleAnalyticsRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    const gtag = window.gtag;
    if (typeof gtag !== "function") return;

    const query = searchParams?.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    gtag("config", GA_MEASUREMENT_ID, {
      page_path: path,
    });
  }, [pathname, searchParams]);

  return null;
}
