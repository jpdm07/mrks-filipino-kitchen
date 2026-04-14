"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { pickupTimeSlotLabels } from "@/lib/pickup-time-slots";

type DayMap = Record<string, { isOpen: boolean; note: string; slots: string[] }>;

const ALL_SLOT_LABELS = pickupTimeSlotLabels();

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

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch(
        `/api/admin/availability?year=${year}&month=${month}`,
        { credentials: "include" }
      );
      if (!r.ok) {
        setMsg("Could not load availability.");
        return;
      }
      const j = await r.json();
      setDays((j.days as DayMap) ?? {});
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected || !days[selected]) return;
    const s = days[selected].slots;
    setSlotSelection(
      new Set(s.length > 0 ? s : ALL_SLOT_LABELS)
    );
  }, [selected, days]);

  const post = async (body: object) => {
    setMsg(null);
    const r = await fetch("/api/admin/availability", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) setMsg("Save failed.");
    else setMsg("Saved.");
    await load();
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

  const saveNote = () => {
    if (!selected) return;
    void post({
      action: "upsert",
      entries: [
        {
          date: selected,
          isOpen: days[selected]?.isOpen ?? false,
          note: noteDraft.trim() || null,
        },
      ],
    });
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
          <p className="text-sm font-medium text-[var(--primary)]">{msg}</p>
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

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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
          <span className="font-bold">{label}</span>
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
        {loading ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : null}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid max-w-xl grid-cols-7 gap-1">
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
                Check the windows offered for this date. At least one required for
                customers to complete checkout.
              </p>
              <div className="mt-2 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto text-sm sm:grid-cols-3">
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
              <button
                type="button"
                className="mt-3 rounded bg-[#FFC200] px-3 py-2 text-sm font-bold text-[var(--text)]"
                onClick={() =>
                  post({
                    action: "upsert",
                    entries: [
                      {
                        date: selected,
                        isOpen: true,
                        note: noteDraft.trim() || null,
                        slots: Array.from(slotSelection),
                      },
                    ],
                  })
                }
              >
                Save time slots
              </button>
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white"
              onClick={saveNote}
            >
              Save note
            </button>
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
