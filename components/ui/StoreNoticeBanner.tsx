"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "mrks_store_notice_v1";

export function StoreNoticeBanner({
  hasSameDayStock,
}: {
  hasSameDayStock: boolean;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "1") {
        setShow(true);
      }
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="print:hidden relative z-40 w-full border-b-2 border-[var(--gold)] bg-[var(--primary)] text-white"
      role="dialog"
      aria-label="Ordering notes"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3 px-4 py-3 sm:py-3.5">
        <ul className="min-w-0 flex-1 space-y-1.5 text-center sm:text-left">
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
          onClick={dismiss}
          className="shrink-0 rounded-md p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss ordering notes"
        >
          <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
