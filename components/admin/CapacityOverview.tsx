"use client";

import { useCallback, useEffect, useState } from "react";

type Week = {
  weekStart: string;
  weekEnd: string;
  mainCookUsed: number;
  mainCookCap: number;
  mainCookRemaining: number;
  mainSoldOut: boolean;
  flanUsed: number;
  flanCap: number;
  flanRemaining: number;
  flanSoldOut: boolean;
};

function barPct(used: number, cap: number) {
  if (cap <= 0) return 0;
  return Math.min(100, Math.round((used / cap) * 100));
}

export function CapacityOverview() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch("/api/capacity/weeks", { cache: "no-store" });
      if (!r.ok) throw new Error("Could not load capacity");
      const data = (await r.json()) as Week[];
      setWeeks(Array.isArray(data) ? data : []);
    } catch {
      setErr("Could not load capacity.");
      setWeeks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markSoldOut = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/capacity/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "mark" }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? "Request failed");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const resetFlag = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/capacity/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "reset" }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? "Request failed");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const labels = ["This Week", "Next Week", "Week After", "Fourth Week"];

  return (
    <div className="mb-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text)]">
        Capacity overview
      </h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Live from orders (300 min cook / week, 16 flan ramekins / week). Manual
        close only affects the current week.
      </p>
      {err ? (
        <p className="mt-2 text-sm font-medium text-[var(--accent)]">{err}</p>
      ) : null}
      {loading ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Loading…</p>
      ) : (
        <div className="mt-4 space-y-4">
          {weeks.map((w, i) => {
            const mainPct = barPct(w.mainCookUsed, w.mainCookCap);
            const flanPct = barPct(w.flanUsed, w.flanCap);
            const title = labels[i] ?? `Week of ${w.weekStart}`;
            return (
              <div
                key={w.weekStart}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-3 py-2"
              >
                <p className="text-sm font-bold text-[var(--primary)]">
                  {title}{" "}
                  <span className="font-normal text-[var(--text-muted)]">
                    ({w.weekStart} → {w.weekEnd})
                  </span>
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[var(--text-muted)]">Cooking:</span>
                    <span className="font-mono font-semibold">
                      {w.mainCookUsed}/{w.mainCookCap} min
                    </span>
                    {w.mainSoldOut ? (
                      <span className="rounded bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">
                        FULL
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">
                        {mainPct}%
                      </span>
                    )}
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]"
                    aria-hidden
                  >
                    <div
                      className="h-full bg-[var(--primary)] transition-[width]"
                      style={{ width: `${mainPct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[var(--text-muted)]">Flan:</span>
                    <span className="font-mono font-semibold">
                      {w.flanUsed}/{w.flanCap}
                    </span>
                    {w.flanSoldOut ? (
                      <span className="rounded bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">
                        FULL
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">
                        {flanPct}%
                      </span>
                    )}
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]"
                    aria-hidden
                  >
                    <div
                      className="h-full bg-amber-500 transition-[width]"
                      style={{ width: `${flanPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void markSoldOut()}
          className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-3 py-2 text-sm font-bold text-[var(--accent)] disabled:opacity-50"
        >
          Mark this week sold out manually
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void resetFlag()}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--text)] disabled:opacity-50"
        >
          Reset manual sold-out flag
        </button>
      </div>
    </div>
  );
}
