"use client";

import { useEffect, useMemo, useState } from "react";
import { SUGGESTION_OPTIONS } from "@/lib/config";

type Row = { id: string; option: string; count: number; isCustom: boolean };

function clientPresetRows(): Row[] {
  return SUGGESTION_OPTIONS.map((option, i) => ({
    id: `poll-${i}`,
    option,
    count: 0,
    isCustom: false,
  }));
}

export function SuggestionPoll() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voteThanks, setVoteThanks] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const [suggestText, setSuggestText] = useState("");
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestThanks, setSuggestThanks] = useState(false);
  const [suggestErr, setSuggestErr] = useState<string | null>(null);

  const load = () => {
    fetch("/api/suggestions")
      .then(async (r) => {
        const d = (await r.json().catch(() => ({}))) as {
          suggestions?: unknown;
        };
        const list = d.suggestions;
        if (Array.isArray(list) && list.length > 0) {
          setRows(list as Row[]);
        } else {
          setRows(clientPresetRows());
        }
        setLoading(false);
      })
      .catch(() => {
        setRows(clientPresetRows());
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const total = useMemo(
    () => rows.reduce((s, r) => s + r.count, 0) || 1,
    [rows]
  );

  const preset = useMemo(
    () => rows.filter((r) => !r.isCustom).slice(0, 3),
    [rows]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const submitVotes = async () => {
    const votes = Array.from(selected);
    if (!votes.length) return;
    setSubmitting(true);
    setVoteError(null);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votes }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setSelected(new Set());
        setVoteThanks(true);
        window.setTimeout(() => setVoteThanks(false), 5000);
        load();
      } else {
        setVoteError(
          data.error ??
            "Could not record votes right now. You can still browse the menu."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitSuggestion = async () => {
    const text = suggestText.trim();
    if (text.length < 2) return;
    setSuggestBusy(true);
    setSuggestErr(null);
    try {
      const res = await fetch("/api/dish-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setSuggestText("");
        setSuggestThanks(true);
        window.setTimeout(() => setSuggestThanks(false), 6000);
      } else {
        setSuggestErr(data.error ?? "Could not save suggestion.");
      }
    } finally {
      setSuggestBusy(false);
    }
  };

  return (
    <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
      <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text)]">
        What Dish Should We Add Next? 🗳️
      </h3>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Vote for dishes you&apos;d love to see on the menu! You can pick multiple. No account
        required.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Loading poll…</p>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {preset.map((r) => {
              const pct = Math.round((r.count / total) * 1000) / 10;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => toggle(r.id)}
                    className={`w-full rounded-[var(--radius-sm)] border px-3 py-2 text-left text-sm shadow-sm transition duration-300 ${
                      selected.has(r.id)
                        ? "border-[var(--primary)] bg-[var(--gold-light)] shadow-[0_4px_16px_rgba(0,56,168,0.12)]"
                        : "border-[var(--border)] bg-[var(--bg)] hover:-translate-y-0.5 hover:border-[var(--primary)]/45 hover:shadow-md"
                    } disabled:opacity-60`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{r.option}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {r.count} votes · {pct}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={submitting || selected.size === 0}
              onClick={() => void submitVotes()}
              className="btn btn-accent btn-sm px-4 disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Submit votes"}
            </button>
          </div>

          <div className="mt-8 border-t border-[var(--border)] pt-6">
            <label className="text-sm font-semibold text-[var(--text)]">
              Don&apos;t see what you&apos;re craving? Tell us!
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                className="min-h-[48px] flex-1 rounded-lg border border-[var(--border)] px-3"
                value={suggestText}
                disabled={suggestBusy}
                onChange={(e) => setSuggestText(e.target.value)}
                placeholder="Suggest a dish..."
              />
              <button
                type="button"
                disabled={suggestBusy || suggestText.trim().length < 2}
                onClick={() => void submitSuggestion()}
                className="btn btn-primary btn-sm min-h-[48px] px-4 disabled:opacity-50"
              >
                {suggestBusy ? "Sending…" : "Submit Suggestion"}
              </button>
            </div>
          </div>

          {voteThanks ? (
            <p className="mt-3 text-sm font-medium text-[var(--success)]">
              Thank you! Your votes were counted.
            </p>
          ) : null}
          {suggestThanks ? (
            <p className="mt-3 text-sm font-medium text-[var(--success)]">
              Thank you! We read every suggestion. 🌟
            </p>
          ) : null}
          {voteError ? (
            <p className="mt-3 text-sm text-[var(--accent)]">{voteError}</p>
          ) : null}
          {suggestErr ? (
            <p className="mt-3 text-sm text-[var(--accent)]">{suggestErr}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
