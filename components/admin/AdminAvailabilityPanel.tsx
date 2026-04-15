"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { pickupTimeSlotLabels } from "@/lib/pickup-time-slots";

type DayMap = Record<string, { isOpen: boolean; note: string; slots: string[] }>;

const ALL_SLOT_LABELS = pickupTimeSlotLabels();

/** Minutes from midnight for a label like "6:00 PM" (10:00 AM–8:00 PM grid). */
function slotLabelToMinutes(label: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s+(AM|PM)$/.exec(label.trim());
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const ap = m[3];
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + parseInt(m[2], 10);
}

function slotsWithMinutesInRangeInclusive(
  startMin: number,
  endMin: number
): Set<string> {
  const out = new Set<string>();
  for (const label of ALL_SLOT_LABELS) {
    const t = slotLabelToMinutes(label);
    if (t !== null && t >= startMin && t <= endMin) out.add(label);
  }
  return out;
}

/** Effective slots for an open day (empty stored = all standard slots). */
function effectiveSlotsSet(day: { isOpen: boolean; slots: string[] } | undefined): Set<string> {
  if (!day?.isOpen) return new Set();
  if (!day.slots || day.slots.length === 0) return new Set(ALL_SLOT_LABELS);
  return new Set(day.slots);
}

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

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AdminAvailabilityPanel() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [days, setDays] = useState<DayMap>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [weekMask, setWeekMask] = useState<number[]>([0, 5, 6]);
  const [msg, setMsg] = useState<string | null>(null);
  const [slotSelection, setSlotSelection] = useState<Set<string>>(new Set());
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  /** Shown next to the per-day Save button after a successful save. */
  const [saveDayAck, setSaveDayAck] = useState(false);
  /** Copied slot list (copy/paste between days without saving yet). */
  const [slotsClipboard, setSlotsClipboard] = useState<string[] | null>(null);
  const [rangeFromLabel, setRangeFromLabel] = useState(() => ALL_SLOT_LABELS[0] ?? "");
  const [rangeToLabel, setRangeToLabel] = useState(
    () => ALL_SLOT_LABELS[ALL_SLOT_LABELS.length - 1] ?? ""
  );
  const [loadFromYmd, setLoadFromYmd] = useState("");
  const [flanTplSaturdays, setFlanTplSaturdays] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/admin/availability?year=${year}&month=${month}`,
        { credentials: "include" }
      );
      if (!r.ok) {
        setMsg(
          r.status === 401
            ? "Session expired — open Dashboard, sign out, and log in again."
            : "Could not load availability. Check the terminal / network tab for errors."
        );
        return;
      }
      let j: unknown;
      try {
        j = await r.json();
      } catch {
        setMsg("Server returned an invalid response. Try refreshing the page.");
        return;
      }
      const daysPayload =
        j && typeof j === "object" && "days" in j
          ? (j as { days: unknown }).days
          : null;
      setDays(
        daysPayload && typeof daysPayload === "object" && !Array.isArray(daysPayload)
          ? (daysPayload as DayMap)
          : {}
      );
    } catch {
      setMsg("Could not load availability (network error). Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  /** Don’t carry “Saved” / errors across a different month view. */
  useEffect(() => {
    setMsg(null);
  }, [year, month]);

  useEffect(() => {
    setSaveDayAck(false);
  }, [selected]);

  useEffect(() => {
    setLoadFromYmd("");
  }, [selected]);

  useEffect(() => {
    if (!selected || !days[selected]) return;
    const s = days[selected].slots;
    setSlotSelection(
      new Set(s.length > 0 ? s : ALL_SLOT_LABELS)
    );
  }, [selected, days]);

  const post = async (
    body: object,
    opts?: { quietSuccess?: boolean }
  ): Promise<boolean> => {
    setMsg(null);
    setSaveDayAck(false);
    const r = await fetch("/api/admin/availability", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
    if (!r.ok) {
      setMsg("Save failed.");
      return false;
    }
    if (!opts?.quietSuccess) {
      setMsg("Changes saved.");
    }
    return true;
  };

  const syncFromGoogle = async (closeMissingInRange: boolean) => {
    setMsg(null);
    setSyncingGoogle(true);
    try {
      const r = await fetch("/api/admin/availability", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "syncFromGoogle",
          year,
          month,
          closeMissingInRange,
        }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        imported?: number;
        closed?: number;
        error?: string;
      };
      if (j.error) {
        setMsg(j.error);
        return;
      }
      if (!r.ok) {
        setMsg("Sync failed.");
        return;
      }
      setMsg(
        `Synced from Google: ${j.imported ?? 0} open day(s)${
          (j.closed ?? 0) > 0 ? `, ${j.closed} closed (not on Google)` : ""
        }.`
      );
      await load();
    } finally {
      setSyncingGoogle(false);
    }
  };

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

  const openDaysThisMonth = useMemo(() => {
    return grid
      .map((c) => c.ymd)
      .filter((ymd): ymd is string => Boolean(ymd && days[ymd]?.isOpen))
      .sort();
  }, [grid, days]);

  const copySourceChoices = useMemo(
    () => openDaysThisMonth.filter((d) => d !== selected),
    [openDaysThisMonth, selected]
  );

  const applyPresetReplace = (preset: "evening68" | "full" | "morning" | "lunch" | "afternoon") => {
    let s: Set<string>;
    switch (preset) {
      case "evening68":
        s = slotsWithMinutesInRangeInclusive(18 * 60, 20 * 60);
        break;
      case "full":
        s = slotsWithMinutesInRangeInclusive(10 * 60, 20 * 60);
        break;
      case "morning":
        s = slotsWithMinutesInRangeInclusive(10 * 60, 12 * 60);
        break;
      case "lunch":
        s = slotsWithMinutesInRangeInclusive(11 * 60, 14 * 60);
        break;
      case "afternoon":
        s = slotsWithMinutesInRangeInclusive(14 * 60, 17 * 60);
        break;
      default:
        s = new Set();
    }
    setSlotSelection(s);
  };

  const applyRangeFromDropdowns = (mode: "replace" | "add") => {
    const i0 = ALL_SLOT_LABELS.indexOf(rangeFromLabel);
    const i1 = ALL_SLOT_LABELS.indexOf(rangeToLabel);
    if (i0 < 0 || i1 < 0) return;
    const a = Math.min(i0, i1);
    const b = Math.max(i0, i1);
    const next = new Set<string>();
    for (let i = a; i <= b; i++) next.add(ALL_SLOT_LABELS[i]);
    if (mode === "replace") setSlotSelection(next);
    else
      setSlotSelection((prev) => {
        const u = new Set(prev);
        next.forEach((x) => u.add(x));
        return u;
      });
  };

  const copySlotsToClipboard = () => {
    const sorted = Array.from(slotSelection).sort(
      (x, y) => ALL_SLOT_LABELS.indexOf(x) - ALL_SLOT_LABELS.indexOf(y)
    );
    setSlotsClipboard(sorted);
    setMsg("Slot list copied — open another day and click Paste, or Save here.");
  };

  const pasteSlotsFromClipboard = () => {
    if (!slotsClipboard?.length) {
      setMsg("Nothing in clipboard — use Copy slots on a day first.");
      return;
    }
    setSlotSelection(new Set(slotsClipboard));
  };

  const loadSlotsFromOtherDay = (sourceYmd: string) => {
    const day = days[sourceYmd];
    if (!day?.isOpen) return;
    setSlotSelection(effectiveSlotsSet(day));
    setMsg(`Loaded slots from ${sourceYmd}. Click Save to apply to ${selected}.`);
  };

  const toggleDay = (ymd: string) => {
    const cur = days[ymd]?.isOpen ?? false;
    void post({
      action: "upsert",
      entries: [{ date: ymd, isOpen: !cur, note: days[ymd]?.note ?? null }],
    });
  };

  useEffect(() => {
    if (selected && days[selected]) {
      setNoteDraft(days[selected].note ?? "");
    }
  }, [selected, days]);

  const saveSelectedDay = async () => {
    if (!selected) return;
    const isOpen = days[selected]?.isOpen ?? false;
    const ok = await post(
      {
        action: "upsert",
        entries: [
          {
            date: selected,
            isOpen,
            note: noteDraft.trim() || null,
            ...(isOpen ? { slots: Array.from(slotSelection) } : {}),
          },
        ],
      },
      { quietSuccess: true }
    );
    if (ok) {
      setSaveDayAck(true);
      window.setTimeout(() => setSaveDayAck(false), 6000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-semibold">Year</label>
          <input
            type="number"
            className="mt-1 w-28 rounded border border-[var(--border)] px-2 py-2"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Month</label>
          <select
            className="mt-1 rounded border border-[var(--border)] px-2 py-2"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
        {msg ? (
          <p
            className={`max-w-md text-sm font-medium ${
              msg.startsWith("Could not") || msg.startsWith("Session")
                ? "text-[var(--accent)]"
                : "text-[var(--primary)]"
            }`}
            role="status"
          >
            {msg}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
          onClick={() => post({ action: "setMonth", year, month, isOpen: true })}
        >
          Mark whole month available
        </button>
        <button
          type="button"
          className="rounded border border-[var(--border)] px-4 py-2 text-sm font-semibold"
          onClick={() => post({ action: "setMonth", year, month, isOpen: false })}
        >
          Clear whole month
        </button>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 text-sm text-[var(--text)]">
        <p className="font-bold text-blue-900">Google Calendar → website</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          The storefront pulls Google into the database automatically when customers
          open the pickup calendar (throttled) and on the daily Vercel cron. This
          section is for an immediate pull for the <strong>month above</strong>.
          All-day events should match titles like{" "}
          <code className="rounded bg-white/90 px-1">🟢 Mr. K&apos;s — Available for Pickup</code>{" "}
          or <strong>Available for pickup</strong>, or come from this panel.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={syncingGoogle}
            className="rounded border border-blue-800 bg-white px-4 py-2 text-sm font-semibold text-blue-900 disabled:opacity-50"
            onClick={() => syncFromGoogle(false)}
          >
            {syncingGoogle ? "Syncing…" : "Pull Google now (this month)"}
          </button>
          <button
            type="button"
            disabled={syncingGoogle}
            className="rounded border border-blue-800 px-4 py-2 text-sm font-semibold text-blue-900 disabled:opacity-50"
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                !window.confirm(
                  "Close on the website every open day in this month that does NOT appear on Google? Use only if Google is your source of truth."
                )
              ) {
                return;
              }
              syncFromGoogle(true);
            }}
          >
            Sync + close extras
          </button>
        </div>
      </div>

      <div>
        <p className="font-semibold">Default weekly pattern (future dates)</p>
        <p className="text-xs text-[var(--text-muted)]">
          Applies open days from today through the next 60 days (adds availability;
          does not remove other days).
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          {WEEKDAY_LABELS.map((lb, dow) => (
            <label key={lb} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={weekMask.includes(dow)}
                onChange={(e) => {
                  if (e.target.checked) setWeekMask((m) => [...m, dow]);
                  else setWeekMask((m) => m.filter((x) => x !== dow));
                }}
              />
              {lb}
            </label>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 rounded bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
          onClick={() =>
            post({ action: "applyWeekly", daysOfWeek: weekMask })
          }
        >
          Apply weekly pattern (60 days)
        </button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-[var(--text)]">
        <p className="font-bold text-amber-950">Flan pickup habit (this month)</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          One click opens <strong>Mon–Thu</strong> with the standard flan-only note and{" "}
          <strong>6:00–8:00 PM</strong> slots (same as checkout). On the website, Mon–Thu
          flan-only days for a week <strong>lock after Saturday 11:59 PM Central</strong>{" "}
          (same every week) unless a qualifying flan order was placed before{" "}
          <strong>Sunday 12:00 AM Central</strong> after that Saturday. If you don’t see
          this box after an update, hard-refresh the page or confirm the latest deploy on
          Vercel.
        </p>
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={flanTplSaturdays}
            onChange={(e) => setFlanTplSaturdays(e.target.checked)}
          />
          <span>
            Also open <strong>Saturdays</strong> this month (full menu note, all time
            slots) — same as marking Saturday available for mixed pickup.
          </span>
        </label>
        <button
          type="button"
          className="mt-3 rounded bg-amber-800 px-4 py-2 text-sm font-bold text-white hover:bg-amber-900"
          onClick={() =>
            void post({
              action: "applyFlanPickupTemplate",
              year,
              month,
              openSaturdays: flanTplSaturdays,
            })
          }
        >
          Apply flan template to {label}
        </button>
      </div>

      <div className="mx-auto w-full max-w-xl">
        <div className="mb-2 grid grid-cols-3 items-center gap-2">
          <div className="flex justify-start">
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm font-semibold"
              onClick={() => {
                if (month <= 1) {
                  setMonth(12);
                  setYear((y) => y - 1);
                } else setMonth((m) => m - 1);
              }}
            >
              ←
            </button>
          </div>
          <span className="text-center font-bold">{label}</span>
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm font-semibold"
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
        </div>
        {loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((cell, idx) => {
              if (!cell.ymd) {
                return <div key={`e-${idx}`} className="aspect-square" />;
              }
              const ymd = cell.ymd;
              const open = days[ymd]?.isOpen === true;
              const sel = selected === ymd;
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => setSelected(ymd)}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    toggleDay(ymd);
                  }}
                  title="Click to select (edit note). Double-click to toggle open/closed."
                  className={[
                    "aspect-square rounded-md border text-sm font-semibold",
                    open
                      ? "border-emerald-600 bg-emerald-100 text-emerald-900"
                      : "border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-muted)]",
                    sel ? "ring-2 ring-[var(--primary)]" : "",
                  ].join(" ")}
                >
                  {Number(ymd.slice(8))}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Green = available · Gray = unavailable · Double-click toggles · Click
          once to add a note below
        </p>
      </div>

      {selected ? (
        <div className="max-w-lg rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="font-bold">Note for {selected}</p>
          <textarea
            className="mt-2 w-full rounded border px-2 py-2 text-sm"
            rows={3}
            placeholder='Optional (e.g. "Limited slots — party orders only")'
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          {days[selected]?.isOpen ? (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="text-sm font-bold">Pickup time slots (customer checkout)</p>
              <p className="text-xs text-[var(--text-muted)]">
                Pick which pickup windows customers see. Use{" "}
                <strong>presets</strong>, a <strong>time range</strong>, or{" "}
                <strong>copy from another day</strong> to fill many slots at once.{" "}
                <strong>Save</strong> stores the note above and these slots together.
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Standard times are in <strong>15-minute</strong> steps (10:00 AM–8:00
                PM). Saving with no boxes checked stores every standard slot (same
                as <strong>Select all</strong>). Scroll the list to see all.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--gold-light)]"
                  onClick={() => setSlotSelection(new Set())}
                >
                  Uncheck all
                </button>
                <button
                  type="button"
                  className="rounded border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--gold-light)]"
                  onClick={() => setSlotSelection(new Set(ALL_SLOT_LABELS))}
                >
                  Select all
                </button>
              </div>
              <div className="mt-3 space-y-3 rounded-md border border-[var(--border)] bg-[var(--bg-section)] p-3">
                <p className="text-xs font-semibold text-[var(--text)]">Quick fill</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["evening68", "6:00 PM – 8:00 PM"] as const,
                      ["full", "10:00 AM – 8:00 PM"] as const,
                      ["morning", "10:00 AM – 12:00 PM"] as const,
                      ["lunch", "11:00 AM – 2:00 PM"] as const,
                      ["afternoon", "2:00 PM – 5:00 PM"] as const,
                    ] as const
                  ).map(([key, text]) => (
                    <button
                      key={key}
                      type="button"
                      className="rounded border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--gold-light)]"
                      onClick={() => applyPresetReplace(key)}
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-0.5 text-xs font-medium text-[var(--text-muted)]">
                    From
                    <select
                      className="mt-0.5 min-w-[7.5rem] rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm text-[var(--text)]"
                      value={rangeFromLabel}
                      onChange={(e) => setRangeFromLabel(e.target.value)}
                    >
                      {ALL_SLOT_LABELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-0.5 text-xs font-medium text-[var(--text-muted)]">
                    To
                    <select
                      className="mt-0.5 min-w-[7.5rem] rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm text-[var(--text)]"
                      value={rangeToLabel}
                      onChange={(e) => setRangeToLabel(e.target.value)}
                    >
                      {ALL_SLOT_LABELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="rounded border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--gold-light)]"
                    onClick={() => applyRangeFromDropdowns("replace")}
                  >
                    Set range (replace)
                  </button>
                  <button
                    type="button"
                    className="rounded border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--gold-light)]"
                    onClick={() => applyRangeFromDropdowns("add")}
                  >
                    Add range
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
                  <button
                    type="button"
                    className="rounded border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--gold-light)]"
                    onClick={copySlotsToClipboard}
                  >
                    Copy slots
                  </button>
                  <button
                    type="button"
                    className="rounded border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--gold-light)]"
                    onClick={pasteSlotsFromClipboard}
                  >
                    Paste slots
                  </button>
                  {slotsClipboard?.length ? (
                    <span className="text-xs text-[var(--text-muted)]">
                      Clipboard: {slotsClipboard.length} slot
                      {slotsClipboard.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-3">
                  <label className="flex flex-col gap-0.5 text-xs font-medium text-[var(--text-muted)]">
                    Load schedule from day
                    <select
                      className="mt-0.5 min-w-[10rem] rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm text-[var(--text)]"
                      value={loadFromYmd}
                      onChange={(e) => setLoadFromYmd(e.target.value)}
                    >
                      <option value="">Choose a day…</option>
                      {copySourceChoices.map((ymd) => (
                        <option key={ymd} value={ymd}>
                          {ymd}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="rounded border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--gold-light)] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!loadFromYmd}
                    onClick={() => loadFromYmd && loadSlotsFromOtherDay(loadFromYmd)}
                  >
                    Load into this day
                  </button>
                  {copySourceChoices.length === 0 ? (
                    <span className="text-xs text-[var(--text-muted)]">
                      No other open days this month — use Copy/Paste or presets.
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 grid max-h-[min(70vh,28rem)] grid-cols-2 gap-2 overflow-y-auto text-sm sm:grid-cols-3">
                {ALL_SLOT_LABELS.map((label) => (
                  <label key={label} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={slotSelection.has(label)}
                      onChange={(e) => {
                        setSlotSelection((prev) => {
                          const n = new Set(prev);
                          if (e.target.checked) n.add(label);
                          else n.delete(label);
                          return n;
                        });
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
            <button
              type="button"
              className="rounded bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white"
              onClick={() => void saveSelectedDay()}
            >
              Save
            </button>
            {saveDayAck ? (
              <span
                className="text-sm font-semibold text-emerald-800"
                role="status"
                aria-live="polite"
              >
                Changes saved
              </span>
            ) : null}
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm font-semibold"
              onClick={() => toggleDay(selected)}
            >
              Toggle available
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
