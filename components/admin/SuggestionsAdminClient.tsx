"use client";

import { useEffect, useMemo, useState } from "react";
import type { DishSuggestionSubmission, Suggestion } from "@prisma/client";

export function SuggestionsAdminClient({
  initial,
}: {
  initial: Suggestion[];
}) {
  const [rows, setRows] = useState(initial);
  const [dishRows, setDishRows] = useState<DishSuggestionSubmission[]>([]);

  useEffect(() => {
    fetch("/api/admin/dish-suggestions", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { suggestions?: DishSuggestionSubmission[] }) => {
        setDishRows(d.suggestions ?? []);
      })
      .catch(() => {});
  }, []);

  const total = useMemo(
    () => rows.reduce((s, r) => s + r.count, 0) || 1,
    [rows]
  );

  const clear = async () => {
    if (!confirm("Clear all votes and write-ins?")) return;
    await fetch("/api/admin/suggestions", { method: "DELETE" });
    const res = await fetch("/api/suggestions");
    const data = await res.json();
    setRows(data.suggestions ?? []);
  };

  const exportCsv = () => {
    const header = "Option,Count,Custom\n";
    const body = rows
      .map(
        (r) =>
          `"${r.option.replace(/"/g, '""')}",${r.count},${r.isCustom ? "yes" : "no"}`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "suggestions.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={exportCsv}
          className="rounded bg-[var(--primary)] px-4 py-2 font-bold text-white"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded border border-[var(--accent)] px-4 py-2 font-bold text-[var(--accent)]"
        >
          Clear All Votes
        </button>
      </div>
      <div className="rounded border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="font-bold text-[var(--primary)]">Dish suggestions (free text)</h2>
        {dishRows.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">No submissions yet.</p>
        ) : (
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
            {dishRows.map((s) => (
              <li key={s.id} className="border-b border-[var(--border)] pb-2">
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(s.submittedAt).toLocaleString()}
                </span>
                <p>{s.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const pct = Math.round((r.count / total) * 1000) / 10;
          return (
            <div
              key={r.id}
              className="rounded border border-[var(--border)] bg-[var(--card)] p-3"
            >
              <div className="flex justify-between text-sm font-medium">
                <span>
                  {r.option}{" "}
                  {r.isCustom ? (
                    <span className="text-[var(--accent)]">(write-in)</span>
                  ) : null}
                </span>
                <span>
                  {r.count} votes · {pct}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
