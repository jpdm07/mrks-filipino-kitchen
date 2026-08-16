"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdminPremadeCopyButtons } from "@/components/admin/AdminPremadeCopyButtons";
import {
  AdminSubscriberPicker,
  confirmSubscriberSend,
  type AdminSubscriberOption,
} from "@/components/admin/AdminSubscriberPicker";
import {
  DEFAULT_SAME_DAY_CLOSING,
  DEFAULT_SAME_DAY_INTRO,
  DEFAULT_SAME_DAY_TEMPLATE_ID,
  SAME_DAY_EMAIL_TEMPLATES,
  fillSameDayDateToken,
  suggestedSameDayTitle,
} from "@/lib/same-day-subscriber-email-copy";

type PreviewItem = {
  inventoryId: number;
  displayName: string;
  groupTitle?: string | null;
  variantLabel?: string | null;
  pickupWindowLabel: string;
  pickupDateLabel?: string;
  availabilityLine: string;
};

type PreviewPayload = {
  subject: string;
  introMessage: string;
  closingMessage?: string;
  html: string;
  itemCount: number;
  items: PreviewItem[];
  subscriberCount: number;
  todayYmd: string;
};

export function SameDaySubscriberEmailPanel({
  hideSubscribersLink = false,
  initialSubscribers,
}: {
  hideSubscribersLink?: boolean;
  initialSubscribers?: AdminSubscriberOption[];
}) {
  const [introMessage, setIntroMessage] = useState(DEFAULT_SAME_DAY_INTRO);
  const [closingMessage, setClosingMessage] = useState(DEFAULT_SAME_DAY_CLOSING);
  const [subject, setSubject] = useState(() => suggestedSameDayTitle());
  const [templateId, setTemplateId] = useState<string | null>(
    DEFAULT_SAME_DAY_TEMPLATE_ID
  );
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<AdminSubscriberOption[]>(
    initialSubscribers ?? []
  );
  const [loadingSubs, setLoadingSubs] = useState(!initialSubscribers);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const subjectEdited = useRef(false);

  useEffect(() => {
    if (initialSubscribers) {
      setSubscribers(initialSubscribers);
      setLoadingSubs(false);
      return;
    }
    let cancelled = false;
    setLoadingSubs(true);
    void fetch("/api/admin/subscribers", { credentials: "same-origin" })
      .then(async (res) => {
        const data = (await res.json()) as {
          subscribers?: AdminSubscriberOption[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setSubscribers([]);
          return;
        }
        setSubscribers(data.subscribers ?? []);
      })
      .catch(() => {
        if (!cancelled) setSubscribers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSubs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialSubscribers]);

  const loadPreview = useCallback(
    async (override?: {
      introMessage: string;
      closingMessage: string;
      subject: string;
    }) => {
      const intro = override?.introMessage ?? introMessage;
      const closing = override?.closingMessage ?? closingMessage;
      const subj = override?.subject ?? subject;
      setLoadingPreview(true);
      setError(null);
      setSendResult(null);
      try {
        const res = await fetch("/api/admin/inventory/same-day-newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview",
            introMessage: intro,
            closingMessage: closing,
            subject: subj.trim() || undefined,
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
        if (!subjectEdited.current) {
          setSubject(suggestedSameDayTitle());
        }
      } catch (e) {
        setPreview(null);
        setPreviewHtml(null);
        setError(e instanceof Error ? e.message : "Network error — try again.");
      } finally {
        setLoadingPreview(false);
      }
    },
    [introMessage, closingMessage, subject]
  );

  useEffect(() => {
    void loadPreview();
    // Initial preview only — use Refresh preview after editing copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTemplate = (id: string) => {
    const template = SAME_DAY_EMAIL_TEMPLATES.find((t) => t.id === id);
    if (!template) return;
    const ymd = preview?.todayYmd;
    const nextSubject = ymd
      ? fillSameDayDateToken(template.subject, ymd)
      : template.subject;
    const nextIntro = ymd
      ? fillSameDayDateToken(template.intro, ymd)
      : template.intro;
    const nextClosing = ymd
      ? fillSameDayDateToken(template.closing, ymd)
      : template.closing;
    setTemplateId(id);
    setIntroMessage(nextIntro);
    setClosingMessage(nextClosing);
    const stockTitle = suggestedSameDayTitle();
    const titleToUse = subjectEdited.current ? subject : stockTitle;
    setSubject(titleToUse);
    void loadPreview({
      introMessage: nextIntro,
      closingMessage: nextClosing,
      subject: titleToUse,
    });
  };

  const sendToSubscribers = async (
    audience: "selected" | "all",
    idsOverride?: string[]
  ) => {
    if (!preview) return;
    const ids = idsOverride ?? selectedIds;
    if (audience === "selected" && ids.length === 0) return;
    if (audience === "all" && subscribers.length === 0) return;
    const title = subjectEdited.current
      ? subject.trim() || preview.subject
      : suggestedSameDayTitle();
    const ok = confirmSubscriberSend({
      audience,
      selectedIds: ids,
      subscribers,
      subject: title,
    });
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
          closingMessage,
          subject: title,
          audience,
          subscriberIds: audience === "selected" ? ids : undefined,
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
          Notify subscribers — same-day pickup
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Lets people know what is in stock for same-day pickup, in limited
          quantity — no dates or pickup times. Send to one subscriber, a few, or
          everyone.
          {!hideSubscribersLink ? (
            <>
              {" "}
              <Link
                href="/admin/subscribers"
                className="font-semibold text-[color:var(--primary)] underline"
              >
                Manage subscribers
              </Link>
            </>
          ) : (
            <>
              {" "}
              <Link
                href="/admin/inventory"
                className="font-semibold text-[color:var(--primary)] underline"
              >
                Edit inventory
              </Link>
            </>
          )}
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
          in stock to announce ({preview.todayYmd}) ·{" "}
          <span className="font-semibold">
            {preview.subscriberCount} on the list
          </span>
        </p>
      ) : null}

      <label className="block text-sm">
        <span className="font-semibold">Title</span>
        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
          Short email subject. What’s in stock is listed in the email, not here.
        </span>
        <input
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            subjectEdited.current = true;
            setTemplateId(null);
          }}
        />
        <button
          type="button"
          className="mt-1 text-xs font-semibold text-[color:var(--primary)] underline"
          onClick={() => {
            subjectEdited.current = false;
            const next = suggestedSameDayTitle();
            setSubject(next);
            void loadPreview({
              introMessage,
              closingMessage,
              subject: next,
            });
          }}
        >
          Use default title
        </button>
      </label>

      <AdminSubscriberPicker
        subscribers={subscribers}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        loading={loadingSubs}
        sending={sending}
        sendDisabled={loadingPreview || !preview || !!error}
        onSendOne={(s) => void sendToSubscribers("selected", [s.id])}
      />

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
            selectedIds.length === 0
          }
          onClick={() => void sendToSubscribers("selected")}
        >
          {sending
            ? "Sending…"
            : `Send to selected (${selectedIds.length})`}
        </button>
        <button
          type="button"
          className="rounded border-2 border-[color:var(--primary)] bg-[color:var(--primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          disabled={
            sending ||
            loadingPreview ||
            !preview ||
            !!error ||
            subscribers.length === 0
          }
          onClick={() => void sendToSubscribers("all")}
        >
          {sending
            ? "Sending…"
            : `Send to everyone (${subscribers.length})`}
        </button>
      </div>

      {sendResult ? (
        <p className="text-sm font-semibold text-[color:var(--primary)]">
          {sendResult}
        </p>
      ) : null}

      <AdminPremadeCopyButtons
        options={SAME_DAY_EMAIL_TEMPLATES}
        activeId={templateId}
        onSelect={applyTemplate}
      />

      <label className="block text-sm">
        <span className="font-semibold">Intro</span>
        <textarea
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 min-h-[88px]"
          value={introMessage}
          onChange={(e) => {
            setIntroMessage(e.target.value);
            setTemplateId(null);
          }}
        />
      </label>

      <label className="block text-sm">
        <span className="font-semibold">Closing</span>
        <textarea
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 min-h-[72px]"
          value={closingMessage}
          onChange={(e) => {
            setClosingMessage(e.target.value);
            setTemplateId(null);
          }}
        />
      </label>

      {preview?.items.length && !error ? (
        <ul className="text-sm text-[var(--text-muted)] space-y-1">
          {preview.items.map((item) => (
            <li key={item.inventoryId}>
              <strong className="text-[var(--text)]">{item.displayName}</strong>
              {" — same-day pickup · limited quantity"}
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
              : "Preview appears when at least one inventory item is available, in stock, and Show banner is on."}
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Sends one email at a time. After a test looks right, switch to everyone
        on the list. Large lists may take a minute.
      </p>
    </section>
  );
}
