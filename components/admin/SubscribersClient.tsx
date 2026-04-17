"use client";

import { useMemo, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { Subscriber } from "@prisma/client";

type SubscriberClientRow = Omit<Subscriber, "createdAt"> & {
  createdAt: string;
};

type MenuPickRow = { id: string; name: string; category: string };

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
  const [subject, setSubject] = useState("Update from Mr. K's Filipino Kitchen");
  const [message, setMessage] = useState(
    "We have something delicious to share with you!"
  );
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(urlItemIds);
  const [menuFilter, setMenuFilter] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

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

  const toggleItem = useCallback((id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const clearItemSelection = useCallback(() => setSelectedItemIds([]), []);

  const selectAllFiltered = useCallback(() => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      for (const m of filteredMenu) next.add(m.id);
      return Array.from(next);
    });
  }, [filteredMenu]);

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
            Write your note, check any menu items to feature (photos and prices go
            in the email), then send to everyone on the list below.
          </p>
          <label className="mt-3 block text-sm font-semibold">
            Subject
            <input
              className="mt-1 w-full rounded border px-2 py-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Message
            <textarea
              rows={5}
              className="mt-1 w-full rounded border px-2 py-2"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
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
              {selectedItemIds.length === 1 ? "" : "s"} selected — the email lists
              them in the order you check them (new checks go to the bottom).
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
