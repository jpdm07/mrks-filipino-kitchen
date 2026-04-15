"use client";

import { useEffect, useState } from "react";

export function FlanWeekStockNote() {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/capacity/weeks", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        const w = data[0] as { flanRemaining?: number };
        if (typeof w.flanRemaining === "number") setLeft(w.flanRemaining);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (left === null || left > 5) return null;

  return (
    <p className="mt-2 text-sm font-semibold text-[var(--accent)]">
      Only {left} left this week!
    </p>
  );
}
