"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import {
  getTodayInPickupTimezoneYMD,
  isPickupLockedByThursdayNoonCutoff,
  isPickupYmdAllowed,
} from "@/lib/pickup-lead-time";
import { isFlanPickupOnlyNote, kitchenDayKind } from "@/lib/kitchen-schedule";
import { isFlanTueThuPickupYmdBookableAt } from "@/lib/flan-weekday-unlock";
import { FlanPickupDayBadge } from "@/components/calendar/FlanPickupDayBadge";
import { CalendarTodayMark } from "@/components/calendar/CalendarTodayMark";
import {
  customerAvailabilityQueryRange,
  daysInCalendarMonth,
  ymdFromParts,
} from "@/lib/pickup-availability-query-range";
import { useAvailabilityWhitelist } from "@/lib/hooks/useAvailabilityWhitelist";

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
    /** Kitchen schedule + capacity (checkout). */
    cartMode?: "flan" | "mixed";
    mainCookNeed?: number;
    flanRamekinsNeed?: number;
  }
>(function PickupCalendar(
  {
    value,
    onChange,
    anchorYmd = null,
    allowNavigateToPastMonths = true,
    cartMode = "mixed",
    mainCookNeed = 0,
    flanRamekinsNeed = 0,
  },
  ref
) {

  const [year, setYear] = useState(() => {
    const [y] = getTodayInPickupTimezoneYMD().split("-").map(Number);
    return y;
  });
  const [month, setMonth] = useState(() => {
    const [, m] = getTodayInPickupTimezoneYMD().split("-").map(Number);
    return m;
  });

  useEffect(() => {
    if (!anchorYmd || !/^\d{4}-\d{2}-\d{2}$/.test(anchorYmd)) return;
    const [y, m] = anchorYmd.split("-").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return;
    setYear(y);
    setMonth(m);
  }, [anchorYmd]);

  const valueYmd =
    value && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : null;
  const { from, to, todayYmd } = customerAvailabilityQueryRange(
    year,
    month,
    valueYmd
  );

  const [ty, tm] = useMemo(() => {
    const [y, m] = todayYmd.split("-").map(Number);
    return [y, m] as const;
  }, [todayYmd]);

  const { openDates, notes, loading, loadError } = useAvailabilityWhitelist(
    from,
    to,
    {
      cartMode,
      mainNeed: mainCookNeed,
      flanNeed: flanRamekinsNeed,
    }
  );

  /** True when this cart’s kitchen load hides at least one date that would open for a lighter cart. */
  const [fewerDatesForThisCart, setFewerDatesForThisCart] = useState(false);

  const openSet = useMemo(() => new Set(openDates), [openDates]);

  useEffect(() => {
    const needsCompare =
      (cartMode === "mixed" && (mainCookNeed > 0 || flanRamekinsNeed > 0)) ||
      (cartMode === "flan" && flanRamekinsNeed > 0);
    if (!needsCompare) {
      setFewerDatesForThisCart(false);
      return;
    }

    let cancelled = false;
    const qs = (main: number, flan: number) =>
      `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&cartMode=${encodeURIComponent(cartMode)}&mainNeed=${encodeURIComponent(String(main))}&flanNeed=${encodeURIComponent(String(flan))}`;

    Promise.all([
      fetch(`/api/availability?${qs(0, 0)}`, { cache: "no-store" }),
      fetch(`/api/availability?${qs(mainCookNeed, flanRamekinsNeed)}`, {
        cache: "no-store",
      }),
    ])
      .then(async ([rb, rw]) => {
        if (cancelled) return;
        if (!rb.ok || !rw.ok) {
          setFewerDatesForThisCart(false);
          return;
        }
        const jb = (await rb.json()) as { openDates?: unknown };
        const jw = (await rw.json()) as { openDates?: unknown };
        const base = Array.isArray(jb.openDates)
          ? jb.openDates.filter((d): d is string => typeof d === "string")
          : [];
        const weighted = new Set(
          Array.isArray(jw.openDates)
            ? jw.openDates.filter((d): d is string => typeof d === "string")
            : []
        );
        const narrowed = base.some((d) => !weighted.has(d));
        setFewerDatesForThisCart(narrowed);
      })
      .catch(() => {
        if (!cancelled) setFewerDatesForThisCart(false);
      });

    return () => {
      cancelled = true;
    };
  }, [from, to, cartMode, mainCookNeed, flanRamekinsNeed]);

  useEffect(() => {
    if (loading || loadError) return;
    if (!value) return;
    if (value < from || value > to) return;
    if (!openSet.has(value)) {
      onChange("");
    }
  }, [loading, loadError, value, from, to, openSet, onChange]);

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
      {fewerDatesForThisCart && !loading && !loadError ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-3 py-2 text-sm leading-snug text-[var(--text)]">
          <span className="font-medium">Kindly note:</span> We only show pickup
          days when your whole order fits what we can take on; a busier week
          means fewer openings. Thank you for understanding—another date often
          helps.
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
          const leadOkForCart = (() => {
            if (cartMode === "flan") {
              const kd = kitchenDayKind(ymd);
              if (kd === "tue_thu")
                return isFlanTueThuPickupYmdBookableAt(ymd, new Date());
              if (kd === "sunday" || kd === "monday") return false;
            }
            return isPickupYmdAllowed(ymd);
          })();
          const tooSoon = !leadOkForCart;
          const whitelisted = openSet.has(ymd);
          const bookable = whitelisted && !past && !tooSoon;
          const bookingWindowLocked = whitelisted && !past && tooSoon;
          const note = (notes[ymd] ?? "").trim();
          const flanOnly = isFlanPickupOnlyNote(note);
          const selected = value === ymd;
          const isToday = ymd === todayYmd;
          const notOffered = !whitelisted && !past;
          const staticTitle = bookingWindowLocked
            ? isPickupLockedByThursdayNoonCutoff(ymd)
              ? `New orders after Thursday noon (Central) can’t use this weekend—pick a later open date.${note ? ` · ${note}` : ""}`
              : `First pickups are the upcoming Friday or Saturday (Central)${note ? ` · ${note}` : ""}`
            : past
              ? "Past date"
              : notOffered
                ? "Not available for online pickup — choose a date Mr. K has opened"
                : note || undefined;

          if (bookable) {
            return (
              <button
                key={ymd}
                type="button"
                title={note || undefined}
                aria-pressed={selected}
                aria-label={`${ymd} pickup${flanOnly ? " (flan pickup only)" : ""}`}
                onClick={() => onChange(ymd)}
                className={[
                  "relative flex aspect-square flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border px-0.5 py-0.5 text-sm font-semibold transition-colors",
                  selected
                    ? `!border-[#0038A8] !bg-[#0038A8] !text-white hover:!bg-[#0038A8]${isToday ? " ring-2 ring-red-600 ring-offset-2" : ""}`
                    : isToday
                      ? "rounded-xl border-2 !border-red-600 bg-amber-100 text-amber-950 shadow-sm hover:bg-amber-200"
                      : flanOnly
                        ? "border-amber-600 bg-amber-200 text-amber-950 shadow-sm ring-1 ring-amber-500/50 hover:bg-amber-300"
                        : "border-amber-500 bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-400/40 hover:bg-amber-200 hover:border-amber-600",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isToday ? (
                  <CalendarTodayMark
                    className={selected ? "!text-white" : ""}
                  />
                ) : null}
                <span className="text-sm font-semibold leading-none tabular-nums">
                  {Number(ymd.slice(8))}
                </span>
                {flanOnly ? (
                  <FlanPickupDayBadge inverted={selected} />
                ) : null}
              </button>
            );
          }

          return (
            <div
              key={ymd}
              role="presentation"
              title={staticTitle}
              className={[
                "relative flex aspect-square select-none flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md px-0.5 py-0.5 text-sm font-semibold",
                isToday
                  ? "rounded-xl border-2 border-red-600 bg-red-50 text-red-700"
                  : past
                    ? "bg-[var(--bg-section)] text-[var(--text-muted)] opacity-50"
                    : bookingWindowLocked
                      ? flanOnly
                        ? "border-2 border-amber-500 bg-amber-100/90 text-amber-950 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/40"
                        : "border-2 border-[#FFC200] bg-[#FFC200]/25 text-[var(--text)] shadow-[0_0_12px_rgba(255,194,0,0.35)]"
                      : "bg-[var(--bg-section)] text-[var(--text-muted)] opacity-70 ring-1 ring-inset ring-[var(--border)]/60",
                past && isToday ? "opacity-80" : "",
              ].join(" ")}
            >
              <span className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-0.5">
                {isToday ? <CalendarTodayMark /> : null}
                {bookingWindowLocked ? (
                  <span className="text-[10px] leading-none" aria-hidden>
                    🔒
                  </span>
                ) : null}
                <span aria-hidden className="tabular-nums leading-none">
                  {Number(ymd.slice(8))}
                </span>
                {bookingWindowLocked && flanOnly ? <FlanPickupDayBadge /> : null}
              </span>
            </div>
          );
        })}
      </div>
      {noDatesInRange ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--gold-light)] px-3 py-2 text-sm text-[var(--text)]">
          {(cartMode === "mixed" &&
            (mainCookNeed > 0 || flanRamekinsNeed > 0)) ||
          (cartMode === "flan" && flanRamekinsNeed > 0) ? (
            <span className="mb-2 block font-medium">
              With this cart, nothing in this month lines up with what we can
              offer right now—try another month, or call us and we&apos;ll do
              our best to help.
            </span>
          ) : null}
          No pickup dates are currently available in this view. Please check
          back soon or contact us at{" "}
          <a href="tel:+19797033827" className="font-bold text-[var(--primary)]">
            979-703-3827
          </a>
          .
        </p>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          <strong className="text-amber-900">Yellow</strong> = open dates you can
          pick (full menu days are a lighter yellow;{" "}
          <strong className="text-amber-900">Flan only</strong> is a deeper gold).
          Gray = not open. 🔒 = on our calendar but before the first Fri/Sat
          pickup window (Central). Hover for details.
        </p>
      )}
    </div>
  );
});

PickupCalendar.displayName = "PickupCalendar";
