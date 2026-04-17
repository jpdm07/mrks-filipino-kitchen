"use client";

import {
  useMemo,
  useState,
  Suspense,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import type { Subscriber } from "@prisma/client";
import {
  clearNewsletterAutosave,
  deleteNamedNewsletterDraft,
  loadNamedNewsletterDrafts,
  loadNewsletterAutosave,
  newDraftId,
  saveNamedNewsletterDraft,
  saveNewsletterAutosave,
  type NamedNewsletterDraft,
  type NewsletterAutosave,
} from "@/lib/newsletter-draft-storage";

type SubscriberClientRow = Omit<Subscriber, "createdAt"> & {
  createdAt: string;
};

type MenuPickRow = { id: string; name: string; category: string };

const DEFAULT_SUBJECT = "Update from Mr. K's Filipino Kitchen";
const DEFAULT_MESSAGE =
  "We have something delicious to share with you!";

function parseItemIdsFromSearchParams(sp: ReturnType<typeof useSearchParams>): string[] {
  const item = sp.get("item")?.trim();
  const items =
    sp.get("items")?.split(",").map((x) => x.trim()).filter(Boolean) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of [...(item ? [item] : []), ...items]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function Inner({
  initialSubscribers,
  menuItems,
}: {
  initialSubscribers: SubscriberClientRow[];
  menuItems: MenuPickRow[];
}) {
  const sp = useSearchParams();
  const urlItemIds = parseItemIdsFromSearchParams(sp);
  const [subs, setSubs] = useState(initialSubscribers);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [showNews, setShowNews] = useState(
    () => sp.get("newsletter") === "1" || urlItemIds.length > 0
  );
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(urlItemIds);
  const [menuFilter, setMenuFilter] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [namedDrafts, setNamedDrafts] = useState<NamedNewsletterDraft[]>([]);
  const [autosaveOffer, setAutosaveOffer] = useState<NewsletterAutosave | null>(
    null
  );
  const [draftUiHint, setDraftUiHint] = useState<string | null>(null);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveBannerChecked = useRef(false);
  const autosaveBannerIgnored = useRef(false);

  const menuById = useMemo(() => {
    const m = new Map<string, MenuPickRow>();
    for (const row of menuItems) m.set(row.id, row);
    return m;
  }, [menuItems]);

  const refreshNamedDrafts = useCallback(() => {
    setNamedDrafts(loadNamedNewsletterDrafts());
  }, []);

  useEffect(() => {
    refreshNamedDrafts();
  }, [refreshNamedDrafts]);

  useEffect(() => {
    if (!showNews) {
      autosaveBannerChecked.current = false;
      return;
    }
    if (urlItemIds.length > 0 || autosaveBannerIgnored.current) return;
    if (autosaveBannerChecked.current) return;
    autosaveBannerChecked.current = true;
    const a = loadNewsletterAutosave();
    if (!a?.updatedAt) return;
    const boring =
      a.subject === DEFAULT_SUBJECT &&
      a.message === DEFAULT_MESSAGE &&
      a.itemIds.length === 0;
    if (!boring) setAutosaveOffer(a);
  }, [showNews, urlItemIds.length]);

  useEffect(() => {
    if (!showNews) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveNewsletterAutosave({
        subject,
        message,
        itemIds: selectedItemIds,
      });
    }, 600);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [showNews, subject, message, selectedItemIds]);

  const filteredMenu = useMemo(() => {
    const q = menuFilter.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
    );
  }, [menuItems, menuFilter]);

  const menuByCategory = useMemo(() => {
    const map = new Map<string, MenuPickRow[]>();
    for (const m of filteredMenu) {
      const list = map.get(m.category) ?? [];
      list.push(m);
      map.set(m.category, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredMenu]);

  const featuredRows = useMemo(
    () =>
      selectedItemIds.map((id) => {
        const row = menuById.get(id);
        return {
          id,
          label: row ? `${row.name} · ${row.category}` : "(removed from menu)",
        };
      }),
    [selectedItemIds, menuById]
  );

  const toggleItem = useCallback((id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const clearItemSelection = useCallback(() => setSelectedItemIds([]), []);

  const selectAllFiltered = useCallback(() => {
    setSelectedItemIds((prev) => {
      const seen = new Set(prev);
      const out = [...prev];
      for (const m of filteredMenu) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        out.push(m.id);
      }
      return out;
    });
  }, [filteredMenu]);

  const moveFeatured = useCallback((index: number, dir: -1 | 1) => {
    setSelectedItemIds((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const t = next[index]!;
      next[index] = next[j]!;
      next[j] = t;
      return next;
    });
  }, []);

  const removeFeatured = useCallback((id: string) => {
    setSelectedItemIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const applyEditorState = useCallback(
    (state: { subject: string; message: string; itemIds: string[] }) => {
      setSubject(state.subject);
      setMessage(state.message);
      setSelectedItemIds([...state.itemIds]);
    },
    []
  );

  const dismissAutosaveOffer = useCallback(() => {
    autosaveBannerIgnored.current = true;
    setAutosaveOffer(null);
  }, []);

  const acceptAutosaveOffer = useCallback(() => {
    if (!autosaveOffer) return;
    applyEditorState(autosaveOffer);
    setAutosaveOffer(null);
    setDraftUiHint("Restored your last autosaved draft in this browser.");
  }, [autosaveOffer, applyEditorState]);

  const saveCurrentAsNamedDraft = useCallback(() => {
    const name = window.prompt("Name this draft (e.g. “Easter lumpia blast”):");
    if (name == null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setDraftUiHint("Draft name was empty — nothing saved.");
      return;
    }
    const draft: NamedNewsletterDraft = {
      id: newDraftId(),
      name: trimmed.slice(0, 80),
      updatedAt: new Date().toISOString(),
      subject,
      message,
      itemIds: [...selectedItemIds],
    };
    saveNamedNewsletterDraft(draft);
    refreshNamedDrafts();
    setDraftUiHint(`Saved draft “${draft.name}”.`);
  }, [subject, message, selectedItemIds, refreshNamedDrafts]);

  const loadNamedDraft = useCallback(
    (d: NamedNewsletterDraft) => {
      const dirty =
        subject !== DEFAULT_SUBJECT ||
        message !== DEFAULT_MESSAGE ||
        selectedItemIds.length > 0;
      if (
        dirty &&
        !window.confirm(
          "Replace the current subject, message, and featured items with this draft?"
        )
      ) {
        return;
      }
      applyEditorState(d);
      setDraftUiHint(`Loaded draft “${d.name}”.`);
    },
    [subject, message, selectedItemIds, applyEditorState]
  );

  const removeNamedDraft = useCallback(
    (d: NamedNewsletterDraft) => {
      if (!window.confirm(`Delete saved draft “${d.name}”?`)) return;
      deleteNamedNewsletterDraft(d.id);
      refreshNamedDrafts();
      setDraftUiHint(`Deleted draft “${d.name}”.`);
    },
    [refreshNamedDrafts]
  );

  const csv = useMemo(() => {
    const header = "Name,Email,Subscribed\n";
    const rows = subs
      .map(
        (s) =>
          `"${(s.name ?? "").replace(/"/g, '""')}","${s.email}",${s.createdAt}`
      )
      .join("\n");
    return header + rows;
  }, [subs]);

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "subscribers.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const deleteSubscriber = async (id: string, email: string) => {
    if (
      !window.confirm(
        `Remove subscriber?\n\n${email}\n\nThey can subscribe again later from the site.`
      )
    ) {
      return;
    }
    setDeleteErr(null);
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/admin/subscribers/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setDeleteErr(data.error ?? "Delete failed");
        return;
      }
      setSubs((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const sendNewsletter = async () => {
    setSent(null);
    setSending(true);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          message,
          itemIds: selectedItemIds.length ? selectedItemIds : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        sent?: number;
        total?: number;
        failed?: number;
        featuredCount?: number;
        lastError?: string;
      };
      if (res.ok) {
        const feat =
          typeof data.featuredCount === "number" && data.featuredCount > 0
            ? ` Featured ${data.featuredCount} menu item(s).`
            : "";
        const fail =
          typeof data.failed === "number" && data.failed > 0
            ? ` ${data.failed} failed.${data.lastError ? ` Last error: ${data.lastError}` : ""}`
            : "";
        setSent(
          `Sent ${data.sent ?? 0} of ${data.total ?? 0} emails.${feat}${fail}`
        );
      } else setSent(data.error ?? "Failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm text-[var(--text-muted)]">
        Total: {subs.length}
      </p>
      {deleteErr ? (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {deleteErr}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded bg-[var(--primary)] px-4 py-2 font-bold text-white"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => setShowNews((v) => !v)}
          className="rounded border px-4 py-2 font-semibold"
        >
          Send Newsletter
        </button>
      </div>

      {showNews ? (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="font-bold text-lg">Email subscribers</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Write your note, pick menu items to feature (photos and prices in the
            email), reorder the spotlight, then send. Drafts autosave in{" "}
            <strong>this browser</strong> only.
          </p>

          {autosaveOffer ? (
            <div
              className="mt-3 flex flex-col gap-2 rounded-lg border border-sky-300/80 bg-sky-50 px-4 py-3 text-sm dark:border-sky-700/60 dark:bg-sky-950/40"
              role="status"
            >
              <p className="font-semibold text-sky-950 dark:text-sky-100">
                Continue a previous session?
              </p>
              <p className="text-sky-900/90 dark:text-sky-200/90">
                Autosave from{" "}
                {new Date(autosaveOffer.updatedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                .
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-sky-700 px-3 py-1.5 text-sm font-bold text-white"
                  onClick={acceptAutosaveOffer}
                >
                  Restore draft
                </button>
                <button
                  type="button"
                  className="rounded border border-sky-800/30 px-3 py-1.5 text-sm font-semibold"
                  onClick={dismissAutosaveOffer}
                >
                  Ignore
                </button>
              </div>
            </div>
          ) : null}

          <details className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3">
            <summary className="cursor-pointer text-sm font-bold text-[var(--primary)]">
              Named drafts ({namedDrafts.length})
            </summary>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Save versions you can reload later (stored locally, not on the server).
            </p>
            <button
              type="button"
              className="mt-2 rounded bg-[var(--primary)] px-3 py-1.5 text-sm font-bold text-white"
              onClick={saveCurrentAsNamedDraft}
            >
              Save current as named draft
            </button>
            {namedDrafts.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                No named drafts yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                {namedDrafts.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{d.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(d.updatedAt).toLocaleString()} ·{" "}
                        {d.itemIds.length} item(s)
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-xs font-semibold"
                        onClick={() => loadNamedDraft(d)}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800"
                        onClick={() => removeNamedDraft(d)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-[var(--text-muted)] underline"
              onClick={() => {
                if (
                  !window.confirm(
                    "Clear autosaved editor state in this browser? (Named drafts stay.)"
                  )
                )
                  return;
                clearNewsletterAutosave();
                setDraftUiHint("Autosave cleared.");
              }}
            >
              Clear autosave only
            </button>
          </details>

          {draftUiHint ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">{draftUiHint}</p>
          ) : null}

          <label className="mt-4 block text-sm font-semibold">
            Subject
            <input
              className="mt-1 w-full rounded border px-2 py-2"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setDraftUiHint(null);
              }}
            />
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Message
            <textarea
              rows={5}
              className="mt-1 w-full rounded border px-2 py-2"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setDraftUiHint(null);
              }}
            />
          </label>

          {featuredRows.length > 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3">
              <p className="text-sm font-bold text-[var(--primary)]">
                Order in email (top → bottom)
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Use arrows to reorder. Remove drops it from the email (checkbox
                below stays in sync).
              </p>
              <ol className="mt-2 space-y-2">
                {featuredRows.map((row, index) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-2 rounded border border-[var(--border)] bg-[var(--card)] px-2 py-2 text-sm"
                  >
                    <span className="w-6 shrink-0 text-center font-bold text-[var(--text-muted)]">
                      {index + 1}.
                    </span>
                    <span className="min-w-0 flex-1">{row.label}</span>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        className="rounded border px-2 py-1 text-xs font-semibold disabled:opacity-40"
                        onClick={() => moveFeatured(index, -1)}
                        aria-label="Move up"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        disabled={index >= featuredRows.length - 1}
                        className="rounded border px-2 py-1 text-xs font-semibold disabled:opacity-40"
                        onClick={() => moveFeatured(index, 1)}
                        aria-label="Move down"
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800"
                        onClick={() => removeFeatured(row.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="mt-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label className="block min-w-[12rem] flex-1 text-sm font-semibold">
                Filter menu
                <input
                  className="mt-1 w-full rounded border px-2 py-2"
                  placeholder="Search by name or category…"
                  value={menuFilter}
                  onChange={(e) => setMenuFilter(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border px-3 py-2 text-sm font-semibold"
                  onClick={selectAllFiltered}
                >
                  Select all shown
                </button>
                <button
                  type="button"
                  className="rounded border px-3 py-2 text-sm font-semibold"
                  onClick={clearItemSelection}
                >
                  Clear items
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {selectedItemIds.length} item
              {selectedItemIds.length === 1 ? "" : "s"} selected — refine order in
              the list above.
            </p>
            <div className="mt-2 max-h-[min(420px,50vh)] overflow-y-auto rounded border border-[var(--border)] bg-[var(--bg-section)] p-3">
              {menuByCategory.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No items match.</p>
              ) : (
                menuByCategory.map(([category, rows]) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                      {category}
                    </p>
                    <ul className="space-y-1">
                      {rows.map((m) => (
                        <li key={m.id}>
                          <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--card)]">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={selectedItemIds.includes(m.id)}
                              onChange={() => toggleItem(m.id)}
                            />
                            <span>{m.name}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={sending || subs.length === 0}
            onClick={sendNewsletter}
            className="mt-4 rounded bg-[var(--accent)] px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send to all subscribers"}
          </button>
          {sent ? <p className="mt-2 text-sm font-semibold">{sent}</p> : null}
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Large lists send one email at a time; if the run stops early on production,
            check Vercel function logs (time limit) or send in smaller batches later.
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]">
        <table className="min-w-[600px] w-full text-left text-sm">
          <thead className="bg-[var(--bg-section)]">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-sm text-[var(--text-muted)]"
                >
                  No subscribers yet.
                </td>
              </tr>
            ) : null}
            {subs.map((s) => (
              <tr key={s.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">{s.name ?? "—"}</td>
                <td className="px-3 py-2">{s.email}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(s.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
                    disabled={deletingId === s.id}
                    onClick={() => deleteSubscriber(s.id, s.email)}
                  >
                    {deletingId === s.id ? "…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SubscribersClient(props: {
  initialSubscribers: SubscriberClientRow[];
  menuItems: MenuPickRow[];
}) {
  return (
    <Suspense fallback={<div className="py-8 text-sm">Loading…</div>}>
      <Inner {...props} />
    </Suspense>
  );
}
