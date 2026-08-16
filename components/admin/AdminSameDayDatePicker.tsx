"use client";

import { useMemo, useState } from "react";
import {
  addCalendarDaysYMD,
  getTodayInPickupTimezoneYMD,
} from "@/lib/pickup-lead-time";
import {
  daysInCalendarMonth,
  ymdFromParts,
} from "@/lib/pickup-availability-query-range";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function firstWeekdayOfMonth(year: number, month1: number) {
  return new Date(Date.UTC(year, month1 - 1, 1)).getUTCDay();
}

function monthLabel(year: number, month1: number) {
  return new Date(Date.UTC(year, month1 - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Multi-select month grid for same-day inventory pickup dates (admin).
 * Any day from today forward can be tapped — not limited to the advance kitchen calendar.
 */
export function AdminSameDayDatePicker({
  selectedYmds,
  onChange,
}: {
  selectedYmds: string[];
  onChange: (ymds: string[]) => void;
}) {
  const todayYmd = useMemo(() => getTodayInPickupTimezoneYMD(), []);
  const [year, setYear] = useState(() => Number(todayYmd.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(todayYmd.slice(5, 7)));

  const selected = useMemo(() => new Set(selectedYmds), [selectedYmds]);

  const grid = useMemo(() => {
    const dim = daysInCalendarMonth(year, month);
    const startPad = firstWeekdayOfMonth(year, month);
    const cells: { ymd: string | null; day: number | null }[] = [];
    for (let i = 0; i < startPad; i++) cells.push({ ymd: null, day: null });
    for (let d = 1; d <= dim; d++) {
      cells.push({ ymd: ymdFromParts(year, month, d), day: d });
    }
    while (cells.length % 7 !== 0) cells.push({ ymd: null, day: null });
    return cells;
  }, [year, month]);

  const shiftMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setYear(y);
    setMonth(m);
  };

  const toggle = (ymd: string) => {
    if (ymd < todayYmd) return;
    const next = new Set(selected);
    if (next.has(ymd)) next.delete(ymd);
    else next.add(ymd);
    onChange([...next].sort());
  };

  const selectToday = () => {
    const next = new Set(selected);
    next.add(todayYmd);
    onChange([...next].sort());
    setYear(Number(todayYmd.slice(0, 4)));
    setMonth(Number(todayYmd.slice(5, 7)));
  };

  const selectThrough = (days: number) => {
    const next = new Set(selected);
    for (let i = 0; i < days; i++) {
      next.add(addCalendarDaysYMD(todayYmd, i));
    }
    onChange([...next].sort());
  };

  const clearAll = () => onChange([]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="rounded border border-[var(--border)] px-2 py-1 text-sm font-semibold"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          ←
        </button>
        <p className="text-sm font-bold text-[color:var(--primary)]">
          {monthLabel(year, month)}
        </p>
        <button
          type="button"
          className="rounded border border-[var(--border)] px-2 py-1 text-sm font-semibold"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          →
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs font-semibold"
          onClick={selectToday}
        >
          Today
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs font-semibold"
          onClick={() => selectThrough(3)}
        >
          Next 3 days
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs font-semibold"
          onClick={() => selectThrough(7)}
        >
          Next 7 days
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]"
          onClick={clearAll}
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, i) => {
          if (!cell.ymd || cell.day == null) {
            return <div key={`pad-${i}`} className="aspect-square" />;
          }
          const past = cell.ymd < todayYmd;
          const on = selected.has(cell.ymd);
          const isToday = cell.ymd === todayYmd;
          return (
            <button
              key={cell.ymd}
              type="button"
              disabled={past}
              onClick={() => toggle(cell.ymd!)}
              className={`aspect-square rounded-lg text-sm font-semibold transition ${
                past
                  ? "cursor-not-allowed text-[var(--text-muted)] opacity-40"
                  : on
                    ? "bg-[color:var(--primary)] text-white ring-2 ring-[var(--gold)]"
                    : isToday
                      ? "border-2 border-[var(--gold)] bg-[var(--bg)] text-[color:var(--primary)] hover:bg-[var(--gold)]/20"
                      : "border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[var(--gold)]/15"
              }`}
              aria-pressed={on}
              aria-label={`${cell.ymd}${on ? ", selected" : ""}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      {selectedYmds.length > 0 ? (
        <p className="text-xs text-[var(--text-muted)]">
          Selected ({selectedYmds.length}):{" "}
          <span className="font-mono text-[var(--text)]">
            {selectedYmds.join(", ")}
          </span>
        </p>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          Tap dates to open same-day pickup. Selected days turn navy.
        </p>
      )}
    </div>
  );
}
