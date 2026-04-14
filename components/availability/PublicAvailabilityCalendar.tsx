"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatPickupYmdLong,
  getEarliestPickupDateMinYMD,
  getTodayInPickupTimezoneYMD,
  isPickupYmdAllowed,
} from "@/lib/pickup-lead-time";
import {
  customerAvailabilityQueryRange,
  daysInCalendarMonth,
  ymdFromParts,
} from "@/lib/pickup-availability-query-range";
import { useAvailabilityWhitelist } from "@/lib/hooks/useAvailabilityWhitelist";
import { PICKUP_LEAD_TIME_CUSTOMER_LINE } from "@/lib/pickup-availability-copy";

function firstWeekdayOfMonth(year: number, month1: number) {
  return new Date(Date.UTC(year, month1 - 1, 1)).getUTCDay();
}

export function PublicAvailabilityCalendar() {
  const [year, setYear] = useState(() => {
    const [y] = getTodayInPickupTimezoneYMD().split("-").map(Number);
    return y;
  });
  const [month, setMonth] = useState(() => {
    const [, m] = getTodayInPickupTimezoneYMD().split("-").map(Number);
    return m;
  });
  const [panel, setPanel] = useState<
    null | { ymd: string; kind: "bookable" | "locked" }
  >(null);
  const [kitchenNote, setKitchenNote] = useState<string | null>(null);

  const { from, to, todayYmd } = customerAvailabilityQueryRange(
    year,
    month,
    null
  );

  const [ty, tm] = useMemo(() => {
    const [y, m] = todayYmd.split("-").map(Number);
    return [y, m] as const;
  }, [todayYmd]);

  const { openDates, notes, loading, loadError } = useAvailabilityWhitelist(
    from,
    to,
    { pollMsOnError: 60000 }
  );

  const hasSeededMonth = useRef(false);
  useEffect(() => {
    if (openDates.length === 0) hasSeededMonth.current = false;
  }, [openDates.length]);

  useEffect(() => {
    if (
      hasSeededMonth.current ||
      loading ||
      loadError ||
      openDates.length === 0
    ) {
      return;
    }
    const minBookable = getEarliestPickupDateMinYMD();
    const bookable = [...openDates]
      .filter((d) => d >= minBookable && isPickupYmdAllowed(d))
      .sort();
    const pick = bookable[0] ?? [...openDates].sort()[0];
    if (pick) {
      const [y, m] = pick.split("-").map(Number);
      setYear(y);
      setMonth(m);
    }
    hasSeededMonth.current = true;
  }, [loading, loadError, openDates]);

  const openSet = useMemo(() => new Set(openDates), [openDates]);

  const cannotGoToPreviousMonth = year === ty && month === tm;

  useEffect(() => {
    setPanel(null);
  }, [year, month]);

  useEffect(() => {
    if (!panel) {
      setKitchenNote(null);
      return;
    }
    const n = (notes[panel.ymd] ?? "").trim();
    setKitchenNote(n || null);
  }, [panel, notes]);

  const grid = useMemo(() => {
    const dim = daysInCalendarMonth(year, month);
    const startPad = firstWeekdayOfMonth(year, month);
    const cells: Array<{ ymd: string | null }> = [];
    for (let i = 0; i < startPad; i++) cells.push({ ymd: null });
    for (let d = 1; d <= dim; d++) {
      cells.push({ ymd: ymdFromParts(year, month, d) });
    }
    return cells;
  }, [year, month]);

  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString(
    "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" }
  );

  const selectedBookable = panel?.kind === "bookable";
  const selectedYmd = panel?.ymd ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={cannotGoToPreviousMonth}
            aria-label="Previous month"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              if (month <= 1) {
                setMonth(12);
                setYear((y) => y - 1);
              } else setMonth((m) => m - 1);
            }}
          >
            ←
          </button>
          <span className="text-base font-bold">{label}</span>
          <button
            type="button"
            aria-label="Next month"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
            onClick={() => {
              if (month >= 12) {
                setMonth(1);
                setYear((y) => y + 1);
              } else setMonth((m) => m + 1);
            }}
          >
            →
          </button>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Loading calendar…
          </p>
        ) : null}
        {loadError ? (
          <p className="mt-3 text-sm font-medium text-[var(--accent)]">
            Could not load availability. We&apos;ll keep trying every minute.
          </p>
        ) : null}

        <p className="mt-3 text-xs text-[var(--text-muted)]">
          {PICKUP_LEAD_TIME_CUSTOMER_LINE} Only <strong>gold</strong> days are on
          Mr. K&apos;s pickup calendar; gray days are <strong>not</strong> open
          for pickup here. Pickup times are chosen at checkout. 🔒 means still
          inside the 3–4 day prep window.
        </p>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[var(--text-muted)]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {grid.map((cell, idx) => {
            if (!cell.ymd) {
              return <div key={`e-${idx}`} className="aspect-square" />;
            }
            const ymd = cell.ymd;
            const past = ymd < todayYmd;
            const tooSoon = !isPickupYmdAllowed(ymd);
            const whitelisted = openSet.has(ymd);
            const bookable = whitelisted && !past && !tooSoon;
            const lockedHighlight = whitelisted && !past && tooSoon;
            const selected = selectedYmd === ymd;

            if (past || !whitelisted) {
              return (
                <div
                  key={ymd}
                  role="presentation"
                  title={
                    past
                      ? "Past date"
                      : "Not on Mr. K's pickup calendar — not available here"
                  }
                  className={[
                    "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-bold select-none",
                    past
                      ? "bg-[var(--bg-section)] text-[var(--text-muted)] opacity-45"
                      : "bg-[#f3f4f6] text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border)]/50",
                  ].join(" ")}
                >
                  <span aria-hidden>{Number(ymd.slice(8))}</span>
                </div>
              );
            }

            return (
              <button
                key={ymd}
                type="button"
                onClick={() => {
                  if (bookable) setPanel({ ymd, kind: "bookable" });
                  else setPanel({ ymd, kind: "locked" });
                }}
                className={[
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-bold transition",
                  lockedHighlight
                    ? "cursor-pointer border-2 border-[#FFC200] bg-[#FFC200] text-[var(--text)] shadow-[0_0_16px_rgba(255,194,0,0.55)]"
                    : "cursor-pointer border-2 border-[#FFC200] bg-[#FFC200] text-[var(--text)] shadow-[0_0_14px_rgba(255,194,0,0.4)] hover:shadow-[0_0_20px_rgba(255,194,0,0.65)]",
                  selected ? "ring-2 ring-[#0038A8] ring-offset-2" : "",
                ].join(" ")}
              >
                {lockedHighlight ? (
                  <span className="absolute right-0.5 top-0.5 text-[10px]" aria-hidden>
                    🔒
                  </span>
                ) : null}
                <span>{Number(ymd.slice(8))}</span>
                {lockedHighlight ? (
                  <span className="mt-0.5 text-[7px] font-bold uppercase leading-none text-[var(--text)]/80">
                    Booking window
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={[
          "mt-6 overflow-hidden rounded-2xl border-2 border-[#0038A8]/25 bg-white transition-all duration-300",
          selectedYmd ? "max-h-[800px] opacity-100" : "max-h-0 border-transparent opacity-0",
        ].join(" ")}
        aria-live="polite"
      >
        {selectedYmd ? (
          <div className="p-5 sm:p-6">
            <p className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--text)]">
              {formatPickupYmdLong(selectedYmd)}
            </p>

            {!selectedBookable ? (
              <div className="mt-4 space-y-3 text-sm text-[var(--text)]">
                <p className="rounded-lg bg-[var(--gold-light)] px-3 py-2 font-medium">
                  🔒 Booking window — this day is on our calendar, but online
                  orders need about 3–4 days to prepare.{" "}
                  {PICKUP_LEAD_TIME_CUSTOMER_LINE}
                </p>
                {kitchenNote ? (
                  <p className="text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text)]">
                      Note from the kitchen:
                    </span>{" "}
                    {kitchenNote}
                  </p>
                ) : null}
                <p className="text-[var(--text-muted)]">
                  Choose a later highlighted date, or call{" "}
                  <a
                    href="tel:+19797033827"
                    className="font-bold text-[var(--primary)]"
                  >
                    979-703-3827
                  </a>
                  .
                </p>
              </div>
            ) : (
              <>
                {kitchenNote ? (
                  <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-3 py-2 text-sm text-[var(--text)]">
                    <span className="font-semibold">Note:</span> {kitchenNote}
                  </p>
                ) : null}
                <p className="mt-4 rounded-lg border border-[#0038A8]/20 bg-[#eef4ff] px-3 py-2 text-sm text-[var(--text)]">
                  <span className="font-semibold">Pickup times:</span> TBD for
                  now. After you start your order, you&apos;ll pick your time
                  slot from the times Mr. K has opened for this date.
                </p>
                <Link
                  href={`/order?pickupDate=${encodeURIComponent(selectedYmd)}`}
                  className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#0038A8] px-4 text-center text-base font-bold text-white hover:bg-[#002580] sm:w-auto"
                >
                  Start My Order
                </Link>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
