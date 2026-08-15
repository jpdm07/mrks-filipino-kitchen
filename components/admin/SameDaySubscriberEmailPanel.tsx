"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DEFAULT_SAME_DAY_INTRO } from "@/lib/same-day-subscriber-email";

type PreviewItem = {
  inventoryId: number;
  displayName: string;
  pickupWindowLabel: string;
  availabilityLine: string;
};

type PreviewPayload = {
  subject: string;
  introMessage: string;
  html: string;
  itemCount: number;
  items: PreviewItem[];
  subscriberCount: number;
  todayYmd: string;
};

export function SameDaySubscriberEmailPanel() {
  const [introMessage, setIntroMessage] = useState(DEFAULT_SAME_DAY_INTRO);
  const [subject, setSubject] = useState("");
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const subjectFromPreview = useRef(false);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/inventory/same-day-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          introMessage,
          subject: subject.trim() || undefined,
        }),
      });
      const data = (await res.json()) as PreviewPayload & { error?: string };
      if (!res.ok) {
        setPreview(null);
        setPreviewHtml(null);
        setError(data.error ?? "Could not load preview.");
        return;
      }
      setPreview(data);
      setPreviewHtml(data.html);
      if (!subjectFromPreview.current) {
        setSubject(data.subject);
        subjectFromPreview.current = true;
      }
    } catch (e) {
      setPreview(null);
      setPreviewHtml(null);
      setError(e instanceof Error ? e.message : "Network error — try again.");
    } finally {
      setLoadingPreview(false);
    }
  }, [introMessage, subject]);

  useEffect(() => {
    void loadPreview();
    // Initial preview only — use Refresh preview after editing intro or subject.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendToSubscribers = async () => {
    if (!preview || preview.subscriberCount === 0) return;
    const ok = window.confirm(
      `Send this same-day pickup email to ${preview.subscriberCount} subscriber${
        preview.subscriberCount === 1 ? "" : "s"
      }?\n\nSubject: ${subject.trim() || preview.subject}`
    );
    if (!ok) return;

    setSending(true);
    setError(null);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/inventory/same-day-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          introMessage,
          subject: subject.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        sent?: number;
        failed?: number;
        total?: number;
        lastError?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Send failed.");
        return;
      }
      const sent = data.sent ?? 0;
      const failed = data.failed ?? 0;
      if (failed > 0) {
        setSendResult(
          `Sent ${sent} of ${data.total ?? sent + failed}. ${failed} failed${
            data.lastError ? `: ${data.lastError}` : "."
          }`
        );
      } else {
        setSendResult(
          `Sent to ${sent} subscriber${sent === 1 ? "" : "s"}.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error — try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
      <div>
        <h2 className="font-bold text-lg text-[color:var(--primary)]">
          Email subscribers — same-day pickup
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Notify your mailing list when banner items are in stock with an open
          pickup window for today. Each item includes its menu photo, availability,
          and pickup times.{" "}
          <Link
            href="/admin/subscribers"
            className="font-semibold text-[color:var(--primary)] underline"
          >
            Manage subscribers
          </Link>
        </p>
      </div>

      {error ? (
        <p
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {preview && !error ? (
        <p className="rounded-lg border border-[color:var(--gold-muted)] bg-[color:rgba(212,169,68,0.12)] px-3 py-2 text-sm">
          <span className="font-semibold text-[color:var(--primary)]">
            {preview.itemCount} item{preview.itemCount === 1 ? "" : "s"}
          </span>{" "}
          ready for today ({preview.todayYmd}) ·{" "}
          <span className="font-semibold">
            {preview.subscriberCount} subscriber
            {preview.subscriberCount === 1 ? "" : "s"}
          </span>
        </p>
      ) : null}

      <label className="block text-sm">
        <span className="font-semibold">Email subject</span>
        <input
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Loaded from preview when items qualify…"
        />
      </label>

      <label className="block text-sm">
        <span className="font-semibold">Intro message</span>
        <textarea
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 min-h-[88px]"
          value={introMessage}
          onChange={(e) => setIntroMessage(e.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-semibold disabled:opacity-50"
          disabled={loadingPreview}
          onClick={() => void loadPreview()}
        >
          {loadingPreview ? "Refreshing…" : "Refresh preview"}
        </button>
        <button
          type="button"
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          disabled={
            sending ||
            loadingPreview ||
            !preview ||
            !!error ||
            preview.subscriberCount === 0
          }
          onClick={() => void sendToSubscribers()}
        >
          {sending ? "Sending…" : "Send to all subscribers"}
        </button>
      </div>

      {sendResult ? (
        <p className="text-sm font-semibold text-[color:var(--primary)]">
          {sendResult}
        </p>
      ) : null}

      {preview?.items.length && !error ? (
        <ul className="text-sm text-[var(--text-muted)] space-y-1">
          {preview.items.map((item) => (
            <li key={item.inventoryId}>
              <strong className="text-[var(--text)]">{item.displayName}</strong>
              {" — "}
              {item.pickupWindowLabel}
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-semibold text-[color:var(--primary)]">
          Email preview
        </p>
        {previewHtml && !error ? (
          <iframe
            title="Same-day pickup email preview"
            className="w-full rounded-lg border border-[var(--border)] bg-white"
            style={{ minHeight: "min(720px, 70vh)" }}
            srcDoc={previewHtml}
            sandbox=""
          />
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            {loadingPreview
              ? "Loading preview…"
              : "Preview appears when at least one banner item has stock and an open pickup window for today."}
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Sends one email at a time to each subscriber (same as the general
        newsletter). Large lists may take a minute; check Vercel logs if a run
        stops early.
      </p>
    </section>
  );
}
