"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  Printer,
  Share2,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { SITE } from "@/lib/config";
import { TAKEOUT_SHARE_HOOK } from "@/lib/takeout-share";

type Props = {
  /** Fully qualified URL, e.g. https://mrkskitchen.com/takeout-menu */
  shareUrl: string;
  /** Hide print/PDF on pages where the handout is not shown (e.g. main `/menu`). */
  showPrint?: boolean;
};

/** Relative share URLs + `navigator.share({ text, url })` often yield an empty draft on Windows targets. */
function useAbsoluteShareUrl(href: string) {
  const [abs, setAbs] = useState(href);
  useEffect(() => {
    try {
      setAbs(new URL(href, window.location.href).href);
    } catch {
      setAbs(href);
    }
  }, [href]);
  return abs;
}

export function TakeoutMenuShareBar({
  shareUrl,
  showPrint = true,
}: Props) {
  const absoluteShareUrl = useAbsoluteShareUrl(shareUrl);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  /** Rich preview (logo + name + hook) comes from Open Graph on the live link; keep the payload mostly the URL. */
  const shareTitle = `${TAKEOUT_SHARE_HOOK} — ${SITE.name}`;
  const linkOnlyBody = absoluteShareUrl;
  const fullMessageForPaste = `${TAKEOUT_SHARE_HOOK}\n${SITE.name}\n${absoluteShareUrl}`;

  const onNativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      // URL only in the payload (title is a hint); rich card = OG on the destination.
      await navigator.share({
        title: shareTitle,
        url: absoluteShareUrl,
      });
      setMenuOpen(false);
    } catch {
      /* dismissed */
    }
  }, [shareTitle, absoluteShareUrl]);

  const onPrint = () => window.print();

  const onCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(absoluteShareUrl);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const onCopyFullMessage = async () => {
    try {
      await navigator.clipboard.writeText(fullMessageForPaste);
      setCopiedFull(true);
      window.setTimeout(() => setCopiedFull(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const smsHref = `sms:?body=${encodeURIComponent(linkOnlyBody)}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(linkOnlyBody)}`;
  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(absoluteShareUrl)}`;
  const xHref = `https://twitter.com/intent/tweet?url=${encodeURIComponent(absoluteShareUrl)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(linkOnlyBody)}`;
  const liHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(absoluteShareUrl)}`;
  const tgHref = `https://t.me/share/url?url=${encodeURIComponent(absoluteShareUrl)}`;
  const redditHref = `https://www.reddit.com/submit?url=${encodeURIComponent(absoluteShareUrl)}&title=${encodeURIComponent(shareTitle)}`;

  const primaryBtn =
    "inline-flex min-h-[48px] min-w-[8.5rem] flex-none items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-sm transition hover:border-[var(--primary)]/40 hover:bg-[var(--bg-section)]";

  const rowClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--bg-section)]";

  const overlay =
    menuOpen && mounted ? (
      <div
        className="fixed inset-0 z-[12000] flex items-end justify-center p-4 sm:items-center"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          aria-label="Close share menu"
          onClick={() => setMenuOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)]"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] bg-gradient-to-br from-[var(--gold-light)]/40 to-transparent px-4 py-4">
            <div className="min-w-0 flex-1">
              <p id={titleId} className="sr-only">
                Share {SITE.name} takeout menu
              </p>
              <div className="flex gap-4">
                <div className="shrink-0 rounded-xl border border-[var(--border)] bg-white p-2 shadow-sm">
                  <Logo size="sm" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-[var(--primary)]">
                    {TAKEOUT_SHARE_HOOK}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-playfair)] text-lg font-bold leading-tight text-[var(--text)]">
                    {SITE.name}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                    Most apps show your logo and name from the link preview when you share the URL
                    (needs your live site, not localhost).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCopyFullMessage}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--primary)]/35 bg-[var(--bg)]/80 px-3 py-2 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--gold-light)]/50 sm:w-auto"
              >
                {copiedFull ? (
                  <Check className="h-3.5 w-3.5 text-[var(--success)]" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                )}
                {copiedFull ? "Copied — paste in any app" : "Copy hook, name + link"}
              </button>
              <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
                “Share” and “Copy link” send only the URL so chats can unfurl the preview card.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="btn-icon h-10 w-10 shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[min(55vh,400px)] overflow-y-auto overscroll-contain px-2 py-2">
            {canNativeShare ? (
              <button type="button" onClick={onNativeShare} className={rowClass}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                  <Share2 className="h-5 w-5 text-[var(--primary)]" aria-hidden />
                </span>
                <span className="flex-1">Share via this device…</span>
                <ExternalLink className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
              </button>
            ) : null}

            <a href={smsHref} className={rowClass} onClick={() => setMenuOpen(false)}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                <MessageSquare className="h-5 w-5 text-emerald-700" aria-hidden />
              </span>
              <span className="flex-1">SMS / Messages</span>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
            </a>

            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClass}
              onClick={() => setMenuOpen(false)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/20 text-lg" aria-hidden>
                💬
              </span>
              <span className="flex-1">WhatsApp</span>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
            </a>

            <a
              href={fbHref}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClass}
              onClick={() => setMenuOpen(false)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1877F2]/15 text-sm font-bold text-[#1877F2]" aria-hidden>
                f
              </span>
              <span className="flex-1">Facebook</span>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
            </a>

            <a
              href={xHref}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClass}
              onClick={() => setMenuOpen(false)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-sm font-bold text-white" aria-hidden>
                X
              </span>
              <span className="flex-1">X (Twitter)</span>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
            </a>

            <a href={mailHref} className={rowClass} onClick={() => setMenuOpen(false)}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                <Mail className="h-5 w-5 text-[var(--primary)]" aria-hidden />
              </span>
              <span className="flex-1">Email</span>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
            </a>

            <a
              href={liHref}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClass}
              onClick={() => setMenuOpen(false)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0A66C2]/15 text-xs font-bold text-[#0A66C2]" aria-hidden>
                in
              </span>
              <span className="flex-1">LinkedIn</span>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
            </a>

            <a
              href={tgHref}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClass}
              onClick={() => setMenuOpen(false)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#229ED9]/15 text-lg" aria-hidden>
                ✈️
              </span>
              <span className="flex-1">Telegram</span>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
            </a>

            <a
              href={redditHref}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClass}
              onClick={() => setMenuOpen(false)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-lg font-bold text-orange-600" aria-hidden>
                r
              </span>
              <span className="flex-1">Reddit</span>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="print:hidden">
      <div className="flex w-full flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={primaryBtn}
        >
          <Share2 className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
          Share
        </button>
        {showPrint ? (
          <button type="button" onClick={onPrint} className={primaryBtn}>
            <Printer className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
            Print / Save PDF
          </button>
        ) : null}
        <button type="button" onClick={onCopyUrl} className={primaryBtn}>
          {copiedUrl ? (
            <Check className="h-4 w-4 shrink-0 text-[var(--success)]" aria-hidden />
          ) : (
            <Copy className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
          )}
          {copiedUrl ? "Copied" : "Copy link"}
        </button>
      </div>

      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </div>
  );
}
