"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Subscriber } from "@prisma/client";

type SubscriberClientRow = Omit<Subscriber, "createdAt"> & {
  createdAt: string;
};

function Inner({
  initialSubscribers,
  menuItems,
}: {
  initialSubscribers: SubscriberClientRow[];
  menuItems: { id: string; name: string }[];
}) {
  const sp = useSearchParams();
  const [subs, setSubs] = useState(initialSubscribers);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [showNews, setShowNews] = useState(sp.get("newsletter") === "1");
  const [subject, setSubject] = useState("Update from Mr. K's Filipino Kitchen");
  const [message, setMessage] = useState(
    "We have something delicious to share with you!"
  );
  const [itemId, setItemId] = useState(sp.get("item") ?? "");
  const [sent, setSent] = useState<string | null>(null);

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
    const res = await fetch("/api/admin/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        message,
        itemId: itemId || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) setSent(`Sent ${data.sent} of ${data.total} emails.`);
    else setSent(data.error ?? "Failed");
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
          <h2 className="font-bold text-lg">Newsletter</h2>
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
          <label className="mt-3 block text-sm font-semibold">
            Optional menu item spotlight
            <select
              className="mt-1 w-full rounded border px-2 py-2"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            >
              <option value="">None</option>
              {menuItems.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={sendNewsletter}
            className="mt-4 rounded bg-[var(--accent)] px-4 py-2 font-bold text-white"
          >
            Send to all subscribers
          </button>
          {sent ? <p className="mt-2 text-sm font-semibold">{sent}</p> : null}
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
  menuItems: { id: string; name: string }[];
}) {
  return (
    <Suspense fallback={<div className="py-8 text-sm">Loading…</div>}>
      <Inner {...props} />
    </Suspense>
  );
}
