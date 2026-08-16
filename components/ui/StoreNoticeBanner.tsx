"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function StoreNoticeBanner({
  hasSameDayStock,
}: {
  hasSameDayStock: boolean;
}) {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <div
      className="print:hidden relative z-40 w-full border-b-2 border-[var(--gold)] bg-[var(--primary)] text-white"
      role="region"
      aria-label="Ordering notes"
    >
      <div className="relative mx-auto max-w-5xl px-4 py-3 sm:px-12 sm:py-3.5">
        <ul className="space-y-1.5 text-center">
          <li className="text-[15px] leading-snug sm:text-[17px]">
            <span className="text-lg font-extrabold tracking-tight text-[var(--gold)] sm:text-xl">
              Advance scheduling
            </span>{" "}
            <span className="font-medium text-white/90">for most orders</span>
            {hasSameDayStock ? (
              <>
                {" — "}
                <span className="font-extrabold text-[var(--gold)]">same-day</span>{" "}
                <span className="font-medium text-white/90">items above</span>
              </>
            ) : null}
          </li>
          <li className="text-[15px] leading-snug sm:text-[17px]">
            <span className="text-lg font-extrabold tracking-tight text-[var(--gold)] sm:text-xl">
              Pickup only
            </span>
          </li>
          <li className="text-[15px] leading-snug sm:text-[17px]">
            <span className="text-lg font-extrabold tracking-tight text-[var(--gold)] sm:text-xl">
              Individual plates
            </span>{" "}
            <span className="font-medium text-white/90">
              welcome — not just catering
            </span>
          </li>
        </ul>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="absolute right-3 top-3 shrink-0 rounded-md p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white sm:right-4 sm:top-3.5"
          aria-label="Dismiss ordering notes"
        >
          <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
