"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Inquiry } from "@prisma/client";

export type InquiryRow = Omit<Inquiry, "createdAt"> & { createdAt: string };

export function InquiriesAdminClient({
  initialInquiries,
}: {
  initialInquiries: InquiryRow[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialInquiries);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const unread = useMemo(() => items.filter((i) => !i.isRead).length, [items]);

  const setRead = async (id: string, isRead: boolean) => {
    setErr(null);
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(data.error ?? "Update failed");
        return;
      }
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isRead } : i))
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-6">
      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}
      <p className="text-sm text-[var(--text-muted)]">
        {unread > 0 ? (
          <span className="font-semibold text-[var(--primary)]">
            {unread} unread
          </span>
        ) : (
          "All caught up."
        )}{" "}
        · Messages from the contact page are saved here (and an SMS is sent when
        Twilio is configured).
      </p>
      {items.length === 0 ? (
        <p className="mt-8 text-[var(--text-muted)]">No inquiries yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((i) => {
            const expanded = openId === i.id;
            return (
              <li
                key={i.id}
                className={`rounded-xl border bg-[var(--card)] p-4 shadow-sm ${
                  i.isRead
                    ? "border-[var(--border)]"
                    : "border-[var(--primary)]/40 ring-1 ring-[var(--primary)]/15"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!i.isRead ? (
                        <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-bold text-white">
                          New
                        </span>
                      ) : null}
                      <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text)]">
                        {i.subject}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {new Date(i.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <p className="mt-2 text-sm">
                      <span className="font-semibold text-[var(--text)]">
                        {i.name}
                      </span>
                      {" · "}
                      <a
                        href={`mailto:${encodeURIComponent(i.email)}`}
                        className="text-[var(--primary)] underline-offset-2 hover:underline"
                      >
                        {i.email}
                      </a>
                      {" · "}
                      <a
                        href={`tel:${i.phone.replace(/\D/g, "")}`}
                        className="text-[var(--primary)] underline-offset-2 hover:underline"
                      >
                        {i.phone}
                      </a>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--gold-light)]"
                      onClick={() => setOpenId(expanded ? null : i.id)}
                    >
                      {expanded ? "Hide" : "View message"}
                    </button>
                    {!i.isRead ? (
                      <button
                        type="button"
                        disabled={busyId === i.id}
                        className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        onClick={() => setRead(i.id, true)}
                      >
                        Mark read
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === i.id}
                        className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-section)]"
                        onClick={() => setRead(i.id, false)}
                      >
                        Mark unread
                      </button>
                    )}
                  </div>
                </div>
                {expanded ? (
                  <div className="mt-4 whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-4 text-sm text-[var(--text)]">
                    {i.message}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
