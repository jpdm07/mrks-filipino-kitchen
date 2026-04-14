"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Inquiry } from "@prisma/client";
import { Trash2 } from "lucide-react";

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
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [err, setErr] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const unread = useMemo(() => items.filter((i) => !i.isRead).length, [items]);

  const allSelected =
    items.length > 0 && selected.size === items.length;
  const someSelected =
    selected.size > 0 && selected.size < items.length;

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectEvery = () => {
    setSelected(new Set(items.map((i) => i.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const deleteIds = async (ids: string[]) => {
    if (ids.length === 0) return;
    setErr(null);
    setDeleteBusy(true);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
      };
      if (!res.ok) {
        setErr(data.error ?? "Delete failed");
        return;
      }
      const deleted = new Set(ids);
      setItems((prev) => prev.filter((i) => !deleted.has(i.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      if (openId && deleted.has(openId)) setOpenId(null);
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  };

  const confirmDeleteMany = (ids: string[], label: string) => {
    if (
      !window.confirm(
        `Delete ${label}? This cannot be undone.`
      )
    ) {
      return;
    }
    void deleteIds(ids);
  };

  const setRead = async (id: string, isRead: boolean) => {
    setErr(null);
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead }),
        credentials: "same-origin",
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
        <p className="mt-8 text-[var(--text-muted)]">
          No inquiries yet. When messages arrive, you&apos;ll see checkboxes,{" "}
          <strong className="text-[var(--text)]">Delete selected</strong>, and a red{" "}
          <strong className="text-[var(--text)]">Delete message</strong> button on each
          row.
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-2 rounded-lg border-2 border-red-800/25 bg-red-50/90 px-3 py-3 text-sm dark:bg-red-950/40">
            <p className="font-semibold text-red-950 dark:text-red-100">
              Remove messages
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-[var(--text)]">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--border)]"
                  checked={allSelected}
                  onChange={() =>
                    allSelected ? clearSelection() : selectEvery()
                  }
                />
                Select all ({items.length})
              </label>
              <button
                type="button"
                disabled={selected.size === 0 || deleteBusy}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 disabled:text-red-100"
                onClick={() =>
                  confirmDeleteMany(
                    [...selected],
                    `${selected.size} selected message${selected.size === 1 ? "" : "s"}`
                  )
                }
              >
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                Delete selected
                {selected.size > 0 ? ` (${selected.size})` : ""}
              </button>
            </div>
            {selected.size === 0 ? (
              <p className="text-xs text-red-900/80 dark:text-red-200/90">
                Tip: tick one or more boxes first, then use Delete selected.
              </p>
            ) : null}
          </div>
          <ul className="mt-6 space-y-4">
            {items.map((i) => {
              const expanded = openId === i.id;
              const isChecked = selected.has(i.id);
              return (
                <li
                  key={i.id}
                  className={`rounded-xl border bg-[var(--card)] p-4 shadow-sm ${
                    i.isRead
                      ? "border-[var(--border)]"
                      : "border-[var(--primary)]/40 ring-1 ring-[var(--primary)]/15"
                  }`}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <label className="mt-1 flex cursor-pointer items-start pt-0.5">
                      <span className="sr-only">Select message from {i.name}</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[var(--border)]"
                        checked={isChecked}
                        onChange={() => toggleSelect(i.id)}
                      />
                    </label>
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
                    <div className="flex w-full min-w-[12rem] shrink-0 flex-col gap-2 sm:w-auto sm:max-w-[min(100%,20rem)]">
                      <div className="flex flex-wrap gap-2">
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
                      <button
                        type="button"
                        disabled={deleteBusy}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 sm:w-auto"
                        onClick={() =>
                          confirmDeleteMany(
                            [i.id],
                            `this message from ${i.name} (“${i.subject.slice(0, 60)}${i.subject.length > 60 ? "…" : ""}”)`
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                        Delete message
                      </button>
                    </div>
                  </div>
                  {expanded ? (
                    <div className="mt-4 space-y-3">
                      <div className="whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-4 text-sm text-[var(--text)]">
                        {i.message}
                      </div>
                      <button
                        type="button"
                        disabled={deleteBusy}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-red-700 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 sm:w-auto"
                        onClick={() =>
                          confirmDeleteMany(
                            [i.id],
                            `this message from ${i.name}`
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        Delete this inquiry
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
