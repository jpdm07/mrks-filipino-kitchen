"use client";

import { useMemo, useState } from "react";

export type AdminSubscriberOption = {
  id: string;
  email: string;
  name: string | null;
};

export function AdminSubscriberPicker({
  subscribers,
  selectedIds,
  onSelectedIdsChange,
  loading,
  onSendOne,
  sending,
  sendDisabled,
}: {
  subscribers: AdminSubscriberOption[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  loading?: boolean;
  onSendOne?: (subscriber: AdminSubscriberOption) => void;
  sending?: boolean;
  sendDisabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) => {
      const name = (s.name ?? "").toLowerCase();
      return name.includes(q) || s.email.toLowerCase().includes(q);
    });
  }, [subscribers, query]);

  const toggle = (id: string) => {
    onSelectedIdsChange(
      selected.has(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  const selectFiltered = () => {
    const seen = new Set(selectedIds);
    const next = [...selectedIds];
    for (const s of filtered) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      next.push(s.id);
    }
    onSelectedIdsChange(next);
  };

  return (
    <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
      <p className="text-sm font-semibold">Who to notify</p>
      <p className="text-xs text-[var(--text-muted)]">
        Send to one person with the button on their row, check a few then use
        Send to selected, or send to everyone.
      </p>

      <input
        className="w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name or email…"
        disabled={loading}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs font-semibold"
          onClick={selectFiltered}
          disabled={loading || filtered.length === 0}
        >
          Select shown
        </button>
        <button
          type="button"
          className="rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs font-semibold"
          onClick={() => onSelectedIdsChange([])}
          disabled={loading || selectedIds.length === 0}
        >
          Clear
        </button>
      </div>

      <ul className="max-h-52 overflow-y-auto rounded border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
        {loading ? (
          <li className="px-3 py-4 text-sm text-[var(--text-muted)]">
            Loading subscribers…
          </li>
        ) : filtered.length === 0 ? (
          <li className="px-3 py-4 text-sm text-[var(--text-muted)]">
            {subscribers.length === 0
              ? "No subscribers yet. Add yourself from the public site, then refresh."
              : "No matches."}
          </li>
        ) : (
          filtered.map((s) => (
            <li key={s.id}>
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {s.name?.trim() || "No name"}
                    </span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">
                      {s.email}
                    </span>
                  </span>
                </label>
                {onSendOne ? (
                  <button
                    type="button"
                    className="shrink-0 rounded bg-[var(--accent)] px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50"
                    disabled={sending || loading || sendDisabled}
                    onClick={() => onSendOne(s)}
                  >
                    Send
                  </button>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function confirmSubscriberSend(params: {
  audience: "selected" | "all";
  selectedIds: string[];
  subscribers: AdminSubscriberOption[];
  subject: string;
}): boolean {
  const { audience, selectedIds, subscribers, subject } = params;
  if (audience === "all") {
    return window.confirm(
      `Send this email to ALL ${subscribers.length} subscriber${
        subscribers.length === 1 ? "" : "s"
      }?\n\nTitle: ${subject}\n\nThis cannot be undone.`
    );
  }
  const chosen = subscribers.filter((s) => selectedIds.includes(s.id));
  const preview = chosen
    .slice(0, 8)
    .map((s) => s.email)
    .join("\n");
  const extra =
    chosen.length > 8 ? `\n…and ${chosen.length - 8} more` : "";
  return window.confirm(
    `Send this email to ${chosen.length} selected subscriber${
      chosen.length === 1 ? "" : "s"
    }?\n\n${preview}${extra}\n\nTitle: ${subject}`
  );
}
