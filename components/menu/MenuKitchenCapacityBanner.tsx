"use client";

import { useEffect, useState } from "react";

export function MenuKitchenCapacityBanner() {
  const [mainSoldOut, setMainSoldOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/capacity/weeks", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        const w = data[0] as { mainSoldOut?: boolean };
        setMainSoldOut(Boolean(w.mainSoldOut));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mainSoldOut) return null;

  return (
    <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-[var(--primary)]/35 bg-[var(--primary)]/10 px-4 py-3 text-center text-sm font-medium text-[var(--text)] print:hidden">
      📅 This week&apos;s pickups are full — but you can still place your order
      for next Friday or Saturday! Use checkout and choose a later open date.
    </div>
  );
}
