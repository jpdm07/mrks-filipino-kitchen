"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import {
  getTodayInPickupTimezoneYMD,
  isPickupYmdAllowed,
} from "@/lib/pickup-lead-time";
import { PICKUP_LEAD_TIME_CUSTOMER_LINE } from "@/lib/pickup-availability-copy";
import { useAvailabilityWhitelist } from "@/lib/hooks/useAvailabilityWhitelist";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymdFromParts(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function daysInMonth(year: number, month1: number) {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function firstWeekdayOfMonth(year: number, month1: number) {
  return new Date(Date.UTC(year, month1 - 1, 1)).getUTCDay();
}

/**
 * Pickup dates are a whitelist: only YYYY-MM-DD strings returned by the API
 * (explicit DB rows with isOpen === true) are selectable.
 */
export const PickupCalendar = forwardRef<
  HTMLDivElement,
  {
    value: string;
    onChange: (ymd: string) => void;
    /** When set, the grid jumps to this date’s month (e.g. deep link). */
    anchorYmd?: string | null;
    /** If false, the customer cannot navigate to months before the current month. */
    allowNavigateToPastMonths?: boolean;
  }
>(function PickupCalendar(
  {
    value,
    onChange,
    anchorYmd = null,
    allowNavigateToPastMonths = true,
  },
  ref
) {

  const todayYmd = useMemo(() => getTodayInPickupTimezoneYMD(), []);
  const [ty, tm] = useMemo(() => {
    const [y, m] = todayYmd.split("-").map(Number);
    return [y, m] as const;
  }, [todayYmd]);

  const initialYm = useMemo(() => {
    const [y, m] = todayYmd.split("-").map(Number);
    return { y, m };
  }, [todayYmd]);
  const [year, setYear] = useState(initialYm.y);
  const [month, setMonth] = useState(initialYm.m);

  useEffect(() => {
    if (!anchorYmd || !/^\d{4}-\d{2}-\d{2}$/.test(anchorYmd)) return;
    const [y, m] = anchorYmd.split("-").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return;
    setYear(y);
    setMonth(m);
  }, [anchorYmd]);

  const from = ymdFromParts(year, month, 1);
  const to = ymdFromParts(year, month, daysInMonth(year, month));

  const { openDates, notes, loading, loadError } = useAvailabilityWhitelist(
    from,
    to
  );

  const openSet = useMemo(() => new Set(openDates), [openDates]);

  useEffect(() => {
    if (loading || loadError) return;
    if (!value) return;
    if (value < from || value > to) return;
    if (!openSet.has(value)) {
      onChange("");
    }
  }, [loading, loadError, value, from, to, openSet, onChange]);

  const grid = useMemo(() => {
    const dim = daysInMonth(year, month);
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

  const noDatesInRange = !loading && !loadError && openDates.length === 0;

  const cannotGoToPreviousMonth =
    !allowNavigateToPastMonths && year === ty && month === tm;

  return (
    <div ref={ref} tabIndex={-1} className="space-y-2 outline-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={cannotGoToPreviousMonth}
          className="rounded border border-[var(--border)] px-3 py-1 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => {
            if (month <= 1) {
              setMonth(12);
              setYear((y) => y - 1);
            } else setMonth((m) => m - 1);
          }}
        >
          ←
        </button>
        <span className="text-sm font-bold">{label}</span>
        <button
          type="button"
          className="rounded border border-[var(--border)] px-3 py-1 text-sm font-semibold"
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
        <p className="text-xs text-[var(--text-muted)]">Loading availability…</p>
      ) : null}
      {loadError ? (
        <p className="text-xs font-medium text-[var(--accent)]">
          Could not load availability. Please refresh or try again.
        </p>
      ) : null}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[var(--text-muted)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, idx) => {
          if (!cell.ymd) {
            return <div key={`e-${idx}`} className="aspect-square" />;
          }
          const ymd = cell.ymd;
          const past = ymd < todayYmd;
          const tooSoon = !isPickupYmdAllowed(ymd);
          const whitelisted = openSet.has(ymd);
          const open = whitelisted && !past && !tooSoon;
          const bookingWindowLocked = whitelisted && !past && tooSoon;
          const note = (notes[ymd] ?? "").trim();
          const selected = value === ymd;
          const disabled = past || tooSoon || !open;

          return (
            <button
              key={ymd}
              type="button"
              disabled={disabled}
              title={
                bookingWindowLocked
                  ? `Booking window: ${PICKUP_LEAD_TIME_CUSTOMER_LINE}${note ? ` · ${note}` : ""}`
                  : note || undefined
              }
              onClick={() => {
                if (!disabled) onChange(ymd);
              }}
              className={[
                "relative aspect-square rounded-md text-sm font-semibold transition-colors",
                past
                  ? "cursor-not-allowed bg-[var(--bg-section)] text-[var(--text-muted)] opacity-50"
                  : bookingWindowLocked
                    ? "cursor-not-allowed border-2 border-[#FFC200] bg-[#FFC200]/25 text-[var(--text)] shadow-[0_0_12px_rgba(255,194,0,0.35)]"
                    : disabled
                      ? "cursor-not-allowed bg-[var(--bg-section)] text-[var(--text-muted)] opacity-60"
                      : "cursor-pointer border border-[var(--border)] text-[var(--text)] hover:bg-[#FFC200]",
                selected ? "!border-[#0038A8] !bg-[#0038A8] !text-white hover:!bg-[#0038A8]" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="flex h-full w-full items-center justify-center gap-0.5 rounded-md">
                {bookingWindowLocked ? (
                  <span className="text-[10px]" aria-hidden>
                    🔒
                  </span>
                ) : null}
                <span>{Number(ymd.slice(8))}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[var(--text-muted)]">{PICKUP_LEAD_TIME_CUSTOMER_LINE}</p>
      {noDatesInRange ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--gold-light)] px-3 py-2 text-sm text-[var(--text)]">
          No pickup dates are currently available. Please check back soon or
          contact us at{" "}
          <a href="tel:+19797033827" className="font-bold text-[var(--primary)]">
            979-703-3827
          </a>
          .
        </p>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          Only dates Mr. K has opened in advance can be selected. Hover a date
          to see any note from the kitchen.
        </p>
      )}
    </div>
  );
});

PickupCalendar.displayName = "PickupCalendar";
