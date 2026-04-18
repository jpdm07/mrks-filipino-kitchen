"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addCalendarDaysYMD,
  formatPickupYmdLong,
  getThursdayYmdOfSameWeek,
  getTodayInPickupTimezoneYMD,
  isPastThisWeekThursdayNoonCentral,
  isWellFormedPickupYMD,
} from "@/lib/pickup-lead-time";
import {
  EMPTY_PREP_OVERRIDE_STATE,
  mergePrepWithOverrides,
  type PrepLine,
  type PrepLineMerged,
  type PrepSummaryComputed,
  type PrepSummaryOverrideState,
} from "@/lib/prep-summary";
import { useAdminDataSync } from "@/lib/use-admin-data-sync";

type Payload = {
  computed: PrepSummaryComputed;
  merged: { main: PrepLineMerged[]; dessert: PrepLineMerged[] };
  state: PrepSummaryOverrideState;
  meta: PrepSummaryComputed["meta"];
  emailSentAt: string | null;
};

function defaultWeek(): string {
  return getThursdayYmdOfSameWeek(getTodayInPickupTimezoneYMD());
}

type RowModel = {
  key: string;
  label: string;
  baseQty: number;
  source: "computed" | "extra";
  extraId?: string;
};

function rowsForSection(
  computedLines: PrepLine[],
  section: "main" | "dessert",
  localState: PrepSummaryOverrideState
): RowModel[] {
  const out: RowModel[] = computedLines.map((c) => ({
    key: c.key,
    label: c.label,
    baseQty: c.quantity,
    source: "computed" as const,
  }));
  for (const ex of localState.extraLines) {
    if (ex.section !== section) continue;
    out.push({
      key: `extra:${ex.id}`,
      label: ex.label,
      baseQty: ex.qty,
      source: "extra",
      extraId: ex.id,
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export function PrepSummaryClient({
  initialWeekThursdayYmd,
}: {
  initialWeekThursdayYmd: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [week, setWeek] = useState(initialWeekThursdayYmd);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [localState, setLocalState] = useState<PrepSummaryOverrideState>(
    EMPTY_PREP_OVERRIDE_STATE
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newExtraSection, setNewExtraSection] = useState<"main" | "dessert">("main");
  const [newExtraLabel, setNewExtraLabel] = useState("");
  const [newExtraQty, setNewExtraQty] = useState(1);

  const weekFromUrl = searchParams.get("week");
  useEffect(() => {
    if (weekFromUrl && isWellFormedPickupYMD(weekFromUrl)) {
      setWeek(getThursdayYmdOfSameWeek(weekFromUrl));
    }
  }, [weekFromUrl]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const r = await fetch(
          `/api/admin/prep-summary?week=${encodeURIComponent(week)}`,
          { cache: "no-store", credentials: "same-origin" }
        );
        const data = (await r.json()) as Payload & { error?: string };
        if (!r.ok) throw new Error(data.error || "Load failed");
        setPayload(data as Payload);
        setLocalState(data.state ?? EMPTY_PREP_OVERRIDE_STATE);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [week]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useAdminDataSync(() => load({ silent: true }));

  const mergedPrint = useMemo(() => {
    if (!payload) return null;
    return mergePrepWithOverrides(payload.computed, localState);
  }, [payload, localState]);

  const mainRows = useMemo(
    () =>
      payload
        ? rowsForSection(payload.computed.main, "main", localState)
        : [],
    [payload, localState]
  );

  const dessertRows = useMemo(
    () =>
      payload
        ? rowsForSection(payload.computed.dessert, "dessert", localState)
        : [],
    [payload, localState]
  );

  const setWeekAndUrl = useCallback(
    (next: string) => {
      setWeek(next);
      router.replace(`/admin/prep-summary?week=${encodeURIComponent(next)}`, {
        scroll: false,
      });
    },
    [router]
  );

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/prep-summary", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, state: localState }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Save failed");
      setPayload(data as Payload);
      setLocalState(data.state ?? localState);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetOverrides = async () => {
    if (!confirm("Clear all edits, notes, and extra lines for this week?")) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/prep-summary", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, reset: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Reset failed");
      setPayload(data as Payload);
      setLocalState(data.state ?? EMPTY_PREP_OVERRIDE_STATE);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setSaving(false);
    }
  };

  const sendEmail = async () => {
    setEmailing(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/prep-summary/email", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Email failed");
      setPayload((p) =>
        p
          ? {
              ...p,
              emailSentAt: data.emailSentAt ?? new Date().toISOString(),
            }
          : p
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Email failed");
    } finally {
      setEmailing(false);
    }
  };

  const toggleHidden = (key: string) => {
    setLocalState((s) => {
      const set = new Set(s.hiddenKeys);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...s, hiddenKeys: [...set] };
    });
  };

  const setQtyOverride = (key: string, baseQty: number, raw: string) => {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    setLocalState((s) => {
      const next = { ...s.qtyOverrides };
      if (n === baseQty) delete next[key];
      else next[key] = n;
      return { ...s, qtyOverrides: next };
    });
  };

  const setLineNote = (key: string, note: string) => {
    setLocalState((s) => {
      const next = { ...s.lineNotes };
      if (!note.trim()) delete next[key];
      else next[key] = note.trim();
      return { ...s, lineNotes: next };
    });
  };

  const setExtraQty = (id: string, raw: string) => {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    setLocalState((s) => ({
      ...s,
      extraLines: s.extraLines.map((x) =>
        x.id === id ? { ...x, qty: n } : x
      ),
    }));
  };

  const addExtraLine = () => {
    const label = newExtraLabel.trim();
    if (!label) return;
    const qty = Math.max(0, Math.floor(newExtraQty || 0));
    if (qty <= 0) return;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `ex-${Date.now()}`;
    setLocalState((s) => ({
      ...s,
      extraLines: [
        ...s.extraLines,
        { id, section: newExtraSection, label, qty },
      ],
    }));
    setNewExtraLabel("");
    setNewExtraQty(1);
  };

  const removeExtraLine = (id: string) => {
    setLocalState((s) => ({
      ...s,
      extraLines: s.extraLines.filter((x) => x.id !== id),
    }));
  };

  const thursdayHits =
    week === getThursdayYmdOfSameWeek(getTodayInPickupTimezoneYMD()) &&
    isPastThisWeekThursdayNoonCentral();

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="prep-no-print flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold hover:bg-[var(--gold-light)]"
          onClick={() => setWeekAndUrl(addCalendarDaysYMD(week, -7))}
        >
          ← Previous week
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold hover:bg-[var(--gold-light)]"
          onClick={() => setWeekAndUrl(addCalendarDaysYMD(week, 7))}
        >
          Next week →
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold hover:bg-[var(--gold-light)]"
          onClick={() => setWeekAndUrl(defaultWeek())}
        >
          This week
        </button>
        <button
          type="button"
          className="ml-auto rounded-full border-2 border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90"
          onClick={() => window.print()}
        >
          Print
        </button>
        <button
          type="button"
          disabled={saving || emailing}
          className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold hover:bg-[var(--gold-light)] disabled:opacity-50"
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save edits"}
        </button>
        <button
          type="button"
          disabled={saving}
          className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
          onClick={() => void resetOverrides()}
        >
          Reset to orders
        </button>
        <button
          type="button"
          disabled={emailing}
          className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold hover:bg-[var(--gold-light)] disabled:opacity-50"
          onClick={() => void sendEmail()}
        >
          {emailing ? "Sending…" : "Email me now"}
        </button>
      </div>

      {error ? (
        <p className="prep-no-print rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading && !payload ? (
        <p className="text-[var(--text-muted)]">Loading…</p>
      ) : null}

      {payload && mergedPrint ? (
        <>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm print:border-0 print:shadow-none">
            <header className="border-b border-[var(--border)] pb-4 print:pb-3">
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--primary)] print:text-xl">
                Prep summary
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Week of Thu {payload.meta.weekThursdayYmd} · Fri pickup{" "}
                {formatPickupYmdLong(payload.meta.fri)} · Sat pickup{" "}
                {formatPickupYmdLong(payload.meta.sat)}
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Orders in this week: {payload.meta.weekOrderCount} (Fri/Sat pickups:{" "}
                {payload.meta.weekendOrderCount}) · Statuses:{" "}
                {payload.meta.statusesIncluded.join(", ")}
              </p>
              <p className="prep-no-print mt-2 text-sm text-[var(--text-muted)]">
                Pickup window for this summary:{" "}
                <strong>
                  {payload.meta.weekStartSun} – {payload.meta.weekEndSat}
                </strong>
                . If this is empty but you have orders, your pickup date may be in a
                different week — use <strong>Next week</strong> / <strong>Previous week</strong>.
              </p>
              {payload.emailSentAt ? (
                <p className="prep-no-print mt-2 text-xs text-[var(--text-muted)]">
                  Last email logged:{" "}
                  {new Date(payload.emailSentAt).toLocaleString()}
                </p>
              ) : null}
            </header>

            {thursdayHits ? (
              <div className="prep-no-print mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                Weekend ordering is past the Thursday noon (Central) cutoff — Fri/Sat
                lines are locked; refresh still picks up admin edits.
              </div>
            ) : (
              <div className="prep-no-print mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Orders can still change until Thursday 12:00 PM Central for this
                weekend — refresh after cutoff for final counts.
              </div>
            )}

            <div className="print:hidden">
              <section className="mt-6">
                <h3 className="text-lg font-bold text-[var(--text)]">
                  Main menu (this Sun–Sat week)
                </h3>
                <p className="mb-3 text-sm text-[var(--text-muted)]">
                  All non-dessert lines for pickups any day this week (updates live —
                  not gated on Thursday). Edit, save, then print or email.
                </p>
                <PrepEditTable
                  rows={mainRows}
                  localState={localState}
                  onToggleHidden={toggleHidden}
                  onQtyChange={setQtyOverride}
                  onNoteChange={setLineNote}
                  onExtraQty={setExtraQty}
                  onRemoveExtra={removeExtraLine}
                />
              </section>

              <section className="mt-8">
                <h3 className="text-lg font-bold text-[var(--text)]">
                  Desserts &amp; flan (full week)
                </h3>
                <p className="mb-3 text-sm text-[var(--text-muted)]">
                  Tue–Thu dessert/flan pickups in this calendar week are included
                  here.
                </p>
                <PrepEditTable
                  rows={dessertRows}
                  localState={localState}
                  onToggleHidden={toggleHidden}
                  onQtyChange={setQtyOverride}
                  onNoteChange={setLineNote}
                  onExtraQty={setExtraQty}
                  onRemoveExtra={removeExtraLine}
                />
              </section>
            </div>

            <div className="hidden print:block">
              <h3 className="mt-6 text-base font-bold">Main menu (final)</h3>
              <PrintLines lines={mergedPrint.main} />
              <h3 className="mt-6 text-base font-bold">
                Desserts &amp; flan (final)
              </h3>
              <PrintLines lines={mergedPrint.dessert} />
            </div>
          </div>

          <div className="prep-no-print rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--text-muted)]">
            <p className="font-semibold text-[var(--text)]">Add a manual line</p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide">Section</span>
                <select
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-2"
                  value={newExtraSection}
                  onChange={(e) =>
                    setNewExtraSection(e.target.value as "main" | "dessert")
                  }
                >
                  <option value="main">Main</option>
                  <option value="dessert">Dessert / flan</option>
                </select>
              </label>
              <label className="flex min-w-[200px] flex-1 flex-col gap-1">
                <span className="text-xs uppercase tracking-wide">Label</span>
                <input
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-2"
                  value={newExtraLabel}
                  onChange={(e) => setNewExtraLabel(e.target.value)}
                  placeholder="e.g. Extra catering batch"
                />
              </label>
              <label className="flex w-24 flex-col gap-1">
                <span className="text-xs uppercase tracking-wide">Qty</span>
                <input
                  type="number"
                  min={0}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-2"
                  value={newExtraQty}
                  onChange={(e) => setNewExtraQty(Number(e.target.value))}
                />
              </label>
              <button
                type="button"
                className="rounded-full bg-[var(--primary)] px-4 py-2 font-semibold text-white hover:opacity-90"
                onClick={addExtraLine}
              >
                Add
              </button>
            </div>
          </div>

          <div className="prep-no-print space-y-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-section)] p-4 text-sm text-[var(--text-muted)]">
            <p className="font-semibold text-[var(--text)]">Schedules (from site rules)</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>Main menu (Fri/Sat):</strong> Weekend orders close Thursday
                12:00 PM Central — align bulk prep with that cutoff.
              </li>
              <li>
                <strong>Flan (Tue–Thu pickups):</strong> Order deadline is end of
                Saturday (Central) before the pickup week (
                <code className="rounded bg-[var(--card)] px-1">flan-weekday-unlock.ts</code>
                ). There is <strong>no separate DB prep-day field</strong> for flan;
                your earnings planner suggests <strong>Sunday</strong> batches as a
                workflow hint only.
              </li>
              <li>
                Automatic email: set <code className="rounded bg-[var(--card)] px-1">PREP_SUMMARY_EMAIL</code> (optional; defaults to{" "}
                <code className="rounded bg-[var(--card)] px-1">OWNER_ORDER_EMAIL</code>
                ). Cron runs daily; sends only on Thursdays (Central) after cutoff
                window, once per week.
              </li>
            </ul>
          </div>
        </>
      ) : null}

      <style jsx global>{`
        @media print {
          .prep-no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}

function PrepEditTable({
  rows,
  localState,
  onToggleHidden,
  onQtyChange,
  onNoteChange,
  onExtraQty,
  onRemoveExtra,
}: {
  rows: RowModel[];
  localState: PrepSummaryOverrideState;
  onToggleHidden: (key: string) => void;
  onQtyChange: (key: string, baseQty: number, raw: string) => void;
  onNoteChange: (key: string, note: string) => void;
  onExtraQty: (id: string, raw: string) => void;
  onRemoveExtra: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm italic text-[var(--text-muted)]">
        Nothing in this section for this week.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <th className="py-2 pr-2">Item</th>
            <th className="py-2 pr-2">Qty</th>
            <th className="py-2 pr-2">Note</th>
            <th className="py-2">Hide</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hidden = localState.hiddenKeys.includes(row.key);
            const displayQty =
              row.source === "extra"
                ? row.baseQty
                : localState.qtyOverrides[row.key] ?? row.baseQty;
            return (
              <tr
                key={row.key}
                className={`border-b border-[var(--border)]/80 ${hidden ? "opacity-45" : ""}`}
              >
                <td className="py-2 pr-2 align-top font-medium text-[var(--text)]">
                  {row.label}
                  {row.source === "extra" ? (
                    <span className="ml-2 text-xs font-normal text-[var(--primary)]">
                      (manual)
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-2 align-top">
                  {row.source === "extra" && row.extraId ? (
                    <input
                      type="number"
                      min={0}
                      className="w-20 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1"
                      value={displayQty}
                      onChange={(e) => onExtraQty(row.extraId!, e.target.value)}
                    />
                  ) : (
                    <input
                      type="number"
                      min={0}
                      className="w-20 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1"
                      value={displayQty}
                      onChange={(e) =>
                        onQtyChange(row.key, row.baseQty, e.target.value)
                      }
                    />
                  )}
                </td>
                <td className="py-2 pr-2 align-top">
                  {row.source === "extra" && row.extraId ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-700 underline"
                      onClick={() => onRemoveExtra(row.extraId!)}
                    >
                      Remove
                    </button>
                  ) : (
                    <input
                      className="w-full min-w-[120px] rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs"
                      placeholder="Kitchen note"
                      value={localState.lineNotes[row.key] ?? ""}
                      onChange={(e) => onNoteChange(row.key, e.target.value)}
                    />
                  )}
                </td>
                <td className="py-2 align-top">
                  {row.source === "computed" ? (
                    <input
                      type="checkbox"
                      checked={hidden}
                      onChange={() => onToggleHidden(row.key)}
                      title="Hide from final list / email"
                    />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PrintLines({ lines }: { lines: PrepLineMerged[] }) {
  if (lines.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">(none)</p>;
  }
  return (
    <ul className="mt-2 list-none space-y-1 text-sm">
      {lines.map((l) => (
        <li key={l.key}>
          <strong>{l.quantity}×</strong> {l.label}
          {l.note ? (
            <span className="text-[var(--text-muted)]"> — {l.note}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
