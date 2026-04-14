"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getTodayInPickupTimezoneYMD,
  getEarliestPickupDateMinYMD,
  isPickupYmdAllowed,
} from "@/lib/pickup-lead-time";
import {
  customerAvailabilityQueryRange,
  daysInCalendarMonth,
  ymdFromParts,
} from "@/lib/pickup-availability-query-range";
import { useAvailabilityWhitelist } from "@/lib/hooks/useAvailabilityWhitelist";
import {
  NO_PICKUP_DATES_PUBLIC_MESSAGE,
  PICKUP_LEAD_TIME_CUSTOMER_LINE,
} from "@/lib/pickup-availability-copy";

function firstWeekdayOfMonth(year: number, month1: number) {
  return new Date(Date.UTC(year, month1 - 1, 1)).getUTCDay();
}

export function UpcomingPickupAvailability() {
  /** Recompute each render so the API range (and hook subscription) stay in sync with “today” and admin updates. */
  const todayStr = getTodayInPickupTimezoneYMD();
  const [cy, cm] = todayStr.split("-").map(Number);
  const { from, to, todayYmd } = customerAvailabilityQueryRange(cy, cm, null);
  const minBookable = getEarliestPickupDateMinYMD();

  const { openDates, loading, loadError } = useAvailabilityWhitelist(from, to);

  const openSet = useMemo(() => new Set(openDates), [openDates]);

  const [ty, tm] = useMemo(() => {
    const [y, m] = todayYmd.split("-").map(Number);
    return [y, m] as const;
  }, [todayYmd]);

  const [year, setYear] = useState(() => {
    const [y] = getTodayInPickupTimezoneYMD().split("-").map(Number);
    return y;
  });
  const [month, setMonth] = useState(() => {
    const [, m] = getTodayInPickupTimezoneYMD().split("-").map(Number);
    return m;
  });

  const hasSeededMonthToFirstOpen = useRef(false);

  useEffect(() => {
    if (openDates.length === 0) hasSeededMonthToFirstOpen.current = false;
  }, [openDates.length]);

  useEffect(() => {
    if (
      hasSeededMonthToFirstOpen.current ||
      loading ||
      loadError ||
      openDates.length === 0
    ) {
      return;
    }
    const bookable = [...openDates]
      .filter((d) => d >= minBookable && isPickupYmdAllowed(d))
      .sort();
    const pick = bookable[0] ?? [...openDates].sort()[0];
    if (pick) {
      const [y, m] = pick.split("-").map(Number);
      setYear(y);
      setMonth(m);
    }
    hasSeededMonthToFirstOpen.current = true;
  }, [loading, loadError, openDates, minBookable]);

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

  const cannotGoBack = year === ty && month === tm;

  const hasAnyOpenInRange = openDates.length > 0;
  const hasBookableDate = useMemo(
    () =>
      openDates.some((d) => d >= minBookable && isPickupYmdAllowed(d)),
    [openDates, minBookable]
  );

  const bookableCount = useMemo(
    () =>
      openDates.filter((d) => d >= minBookable && isPickupYmdAllowed(d)).length,
    [openDates, minBookable]
  );

  const lockedSoonCount = useMemo(
    () => openDates.filter((d) => d >= todayYmd && !isPickupYmdAllowed(d)).length,
    [openDates, todayYmd]
  );

  const showGlobalEmpty = !loading && !loadError && !hasAnyOpenInRange;

  return (
    <section
      className="border-y border-[#0038A8]/15 bg-[#eef4ff]"
      aria-labelledby="upcoming-pickup-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 text-center md:text-left">
          <h2
            id="upcoming-pickup-heading"
            className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text)] sm:text-3xl"
          >
            📅 Upcoming Pickup Availability
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
            {PICKUP_LEAD_TIME_CUSTOMER_LINE} Pickup times are{" "}
            <span className="font-semibold text-[var(--text)]">TBD</span> for
            now—you&apos;ll confirm your time window when you check out.
          </p>
          {!loadError && !loading && hasAnyOpenInRange ? (
            <p
              className="mt-3 max-w-2xl text-sm text-[var(--text)]"
              role="status"
            >
              <span className="font-semibold text-[#0038A8]">
                {bookableCount} pickup day{bookableCount !== 1 ? "s" : ""}
              </span>{" "}
              open for online ordering in the window we show below
              {lockedSoonCount > 0 ? (
                <>
                  , plus{" "}
                  <span className="font-semibold">{lockedSoonCount}</span> still
                  inside the 4-day prep window (🔒)
                </>
              ) : null}
              . Matches the{" "}
              <Link
                href="/availability"
                className="font-bold text-[#0038A8] underline decoration-[#0038A8]/30 underline-offset-4 hover:decoration-[#0038A8]"
              >
                full pickup calendar
              </Link>
              .
            </p>
          ) : !loadError && !loading && !hasAnyOpenInRange ? (
            <p
              className="mt-3 max-w-2xl text-sm text-[var(--text-muted)]"
              role="status"
            >
              This block updates live from the same calendar as{" "}
              <Link
                href="/availability"
                className="font-semibold text-[#0038A8] underline decoration-[#0038A8]/30 underline-offset-4 hover:decoration-[#0038A8]"
              >
                Pick Up Dates
              </Link>
              . If nothing appears yet, new days will show here as soon as
              they&apos;re opened.
            </p>
          ) : null}
        </div>

        {loading ? (
          <p className="text-center text-sm text-[var(--text-muted)] md:text-left">
            Loading pickup dates…
          </p>
        ) : null}
        {loadError ? (
          <p className="text-center text-sm font-medium text-[var(--accent)] md:text-left">
            Could not load availability. Please refresh or try again shortly.
          </p>
        ) : null}

        {showGlobalEmpty ? (
          <div>
            <p className="whitespace-pre-line rounded-xl border border-[#0038A8]/30 bg-white px-6 py-6 text-center text-sm leading-relaxed text-[var(--text)] shadow-sm md:text-left">
              {NO_PICKUP_DATES_PUBLIC_MESSAGE}
            </p>
            <p className="mt-4 text-center text-sm md:text-left">
              <Link
                href="/availability"
                className="font-bold text-[#0038A8] underline decoration-[#0038A8]/30 underline-offset-4 hover:decoration-[#0038A8]"
              >
                View the full pickup calendar →
              </Link>
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl border-2 border-[#0038A8] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={cannotGoBack}
                  className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => {
                    if (month <= 1) {
                      setMonth(12);
                      setYear((y) => y - 1);
                    } else setMonth((m) => m - 1);
                  }}
                  aria-label="Previous month"
                >
                  ←
                </button>
                <span className="text-sm font-bold">{label}</span>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm font-semibold"
                  onClick={() => {
                    if (month >= 12) {
                      setMonth(1);
                      setYear((y) => y + 1);
                    } else setMonth((m) => m + 1);
                  }}
                  aria-label="Next month"
                >
                  →
                </button>
              </div>

              {!hasBookableDate && hasAnyOpenInRange ? (
                <p className="mt-3 rounded-lg bg-[var(--gold-light)] px-2 py-2 text-center text-xs text-[var(--text)]">
                  No bookable dates yet in the window shown—try another month,
                  or call{" "}
                  <a
                    href="tel:+19797033827"
                    className="font-bold text-[var(--primary)]"
                  >
                    979-703-3827
                  </a>
                  .
                </p>
              ) : null}

              <div className="mt-3 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] sm:text-xs">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {grid.map((cell, idx) => {
                  if (!cell.ymd) {
                    return <div key={`e-${idx}`} className="aspect-square" />;
                  }
                  const ymd = cell.ymd;
                  const past = ymd < todayYmd;
                  const tooSoon = !isPickupYmdAllowed(ymd);
                  const whitelisted = openSet.has(ymd);
                  const bookable =
                    whitelisted && !past && !tooSoon && ymd <= toYmd;
                  const lockedHighlight = whitelisted && !past && tooSoon;

                  const dayNum = Number(ymd.slice(8));

                  if (bookable) {
                    return (
                      <Link
                        key={ymd}
                        href={`/order?pickupDate=${encodeURIComponent(ymd)}`}
                        className="flex aspect-square items-center justify-center rounded-lg border-2 border-[#FFC200] bg-[#FFC200] text-sm font-bold text-[var(--text)] shadow-[0_0_10px_rgba(255,194,0,0.35)] transition hover:shadow-[0_0_14px_rgba(255,194,0,0.5)]"
                        title={`${ymd} · Times TBD — order to choose slot`}
                      >
                        {dayNum}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={ymd}
                      className={[
                        "flex aspect-square items-center justify-center rounded-lg text-sm font-semibold",
                        past
                          ? "bg-[var(--bg-section)] text-[var(--text-muted)] opacity-45"
                          : !whitelisted
                            ? "bg-[#f0f2f5] text-[var(--text-muted)]"
                            : lockedHighlight
                              ? "relative border-2 border-[#FFC200] bg-[#FFC200]/30 text-[var(--text)]"
                              : "bg-[var(--bg-section)] text-[var(--text-muted)] opacity-60",
                      ].join(" ")}
                      title={
                        lockedHighlight
                          ? "Booking window — times TBD at checkout"
                          : undefined
                      }
                    >
                      {lockedHighlight ? (
                        <span className="flex flex-col items-center leading-none">
                          <span className="text-[9px]" aria-hidden>
                            🔒
                          </span>
                          <span className="text-[11px] font-bold sm:text-sm">
                            {dayNum}
                          </span>
                        </span>
                      ) : (
                        dayNum
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-center text-[11px] text-[var(--text-muted)] sm:text-xs">
                <span className="font-semibold text-[#0038A8]">Gold</span> =
                open for pickup (times TBD).{" "}
                <span className="font-semibold text-[var(--text)]">🔒</span> =
                inside 4-day prep window.
              </p>
            </div>

            <div className="mt-6 text-center md:text-left">
              <Link
                href="/availability"
                className="inline-flex items-center gap-1 text-sm font-bold text-[#0038A8] underline decoration-[#0038A8]/30 underline-offset-4 hover:decoration-[#0038A8]"
              >
                See full calendar &amp; details →
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
