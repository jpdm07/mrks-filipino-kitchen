"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Music,
  Pause,
  Play,
  Shuffle,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";

/**
 * Bundled files in public/audio/ (optional CDN/env: NEXT_PUBLIC_OPM_*_URL in .env.local).
 * Display names are fixed per slot so labels stay correct when src is overridden.
 */
const SRC_KAILAN =
  process.env.NEXT_PUBLIC_OPM_KAILAN_URL?.trim() || "/audio/kailan.mp3";
const SRC_HARANA =
  process.env.NEXT_PUBLIC_OPM_HARANA_URL?.trim() || "/audio/harana.mp3";
const SRC_SIMPLENG_TAO =
  process.env.NEXT_PUBLIC_OPM_SIMPLENG_TAO_URL?.trim() ||
  "/audio/simpleng-tao.mp3";

const TRACKS = [
  { src: SRC_KAILAN, title: "Kailan", artist: "MYMP" },
  { src: SRC_HARANA, title: "Harana", artist: "Parokya ni Edgar" },
  { src: SRC_SIMPLENG_TAO, title: "Simpleng Tao", artist: "Gloc 9" },
] as const;

const LS_STOPPED = "mrks-opm-stopped";
const LS_MUTED = "mrks-opm-muted";
const LS_PANEL_POS = "mrks-opm-panel-pos";
/** Set to "1" when the visitor has expanded the panel; absent = default collapsed. */
const LS_EXPANDED = "mrks-opm-panel-expanded";
const LS_VOLUME = "mrks-opm-volume";

/** Default playback level (5% — subtle until the visitor raises it). */
const DEFAULT_VOLUME = 0.05;

type QueueState = { deck: number[]; pos: number };
type PanelPos = { left: number; top: number };

function shuffleDeck(avoidFirstIndex?: number): number[] {
  const n = TRACKS.length;
  const deck = Array.from({ length: n }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  if (
    avoidFirstIndex !== undefined &&
    n > 1 &&
    deck[0] === avoidFirstIndex
  ) {
    const k = deck.findIndex((x) => x !== avoidFirstIndex);
    if (k > 0) [deck[0], deck[k]] = [deck[k], deck[0]];
  }
  return deck;
}

function clampPanelPos(
  left: number,
  top: number,
  width: number,
  height: number
): PanelPos {
  const pad = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;
  const maxL = Math.max(pad, vw - width - pad);
  const maxT = Math.max(pad, vh - height - pad);
  return {
    left: Math.min(maxL, Math.max(pad, left)),
    top: Math.min(maxT, Math.max(pad, top)),
  };
}

export function SiteBackgroundMusic() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const failedLoadCountRef = useRef(0);
  const skipErrorRef = useRef(false);
  const dragRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const latestPosRef = useRef<PanelPos | null>(null);

  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [stoppedByUser, setStoppedByUser] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const trackIndex = queue ? queue.deck[queue.pos] : 0;
  const track = TRACKS[trackIndex];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    setMuted(localStorage.getItem(LS_MUTED) === "1");
    setStoppedByUser(localStorage.getItem(LS_STOPPED) === "1");
    setExpanded(localStorage.getItem(LS_EXPANDED) === "1");
    setQueue({ deck: shuffleDeck(), pos: 0 });
    try {
      const raw = localStorage.getItem(LS_VOLUME);
      if (raw != null) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0 && n <= 1) setVolume(n);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [mounted]);

  const persistVolume = useCallback((v: number) => {
    setVolume(v);
    try {
      localStorage.setItem(LS_VOLUME, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  const persistExpanded = useCallback((next: boolean) => {
    setExpanded(next);
    try {
      if (next) localStorage.setItem(LS_EXPANDED, "1");
      else localStorage.removeItem(LS_EXPANDED);
    } catch {
      /* ignore */
    }
  }, []);

  /** Initial panel position + restore from localStorage */
  useLayoutEffect(() => {
    if (!mounted || !queue || !panelRef.current) return;
    const el = panelRef.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w === 0 || h === 0) return;

    try {
      const raw = localStorage.getItem(LS_PANEL_POS);
      if (raw) {
        const p = JSON.parse(raw) as Partial<PanelPos>;
        if (typeof p.left === "number" && typeof p.top === "number") {
          const restored = clampPanelPos(p.left, p.top, w, h);
          latestPosRef.current = restored;
          setPanelPos(restored);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    const left = window.innerWidth - w - 16;
    const top = window.innerHeight - h - 16;
    const initial = clampPanelPos(left, top, w, h);
    latestPosRef.current = initial;
    setPanelPos(initial);
  }, [mounted, queue, loadFailed, expanded]);

  useEffect(() => {
    if (!mounted) return;
    const onResize = () => {
      const el = panelRef.current;
      if (!el) return;
      setPanelPos((prev) => {
        if (!prev) return prev;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const c = clampPanelPos(prev.left, prev.top, w, h);
        latestPosRef.current = c;
        return c;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mounted]);

  const persistPanelPos = useCallback((p: PanelPos) => {
    try {
      localStorage.setItem(LS_PANEL_POS, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, []);

  /** True if pointer started on something that should keep click/drag separate. */
  const isNonDragTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return true;
    return Boolean(
      target.closest(
        "button, a, input, textarea, select, audio, code, [data-music-no-drag]"
      )
    );
  }, []);

  /** Drag from almost anywhere on the panel (not just the grip). Window listeners keep drag smooth. */
  const onPanelPointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (isNonDragTarget(e.target)) return;
      const base = latestPosRef.current ?? panelPos;
      if (!base || !panelRef.current) return;

      dragRef.current = {
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startLeft: base.left,
        startTop: base.top,
      };

      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d || !panelRef.current) return;
        const el = panelRef.current;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const nl = d.startLeft + (ev.clientX - d.startPointerX);
        const nt = d.startTop + (ev.clientY - d.startPointerY);
        const next = clampPanelPos(nl, nt, w, h);
        latestPosRef.current = next;
        setPanelPos(next);
      };

      const onEnd = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        dragRef.current = null;
        const p = latestPosRef.current;
        if (p) persistPanelPos(p);
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [isNonDragTarget, panelPos, persistPanelPos]
  );

  const advance = useCallback(() => {
    setQueue((q) => {
      if (!q) return q;
      const nextPos = q.pos + 1;
      if (nextPos >= q.deck.length) {
        const lastPlayed = q.deck[q.pos];
        return { deck: shuffleDeck(lastPlayed), pos: 0 };
      }
      return { ...q, pos: nextPos };
    });
  }, []);

  const persistMuted = useCallback((m: boolean) => {
    setMuted(m);
    try {
      localStorage.setItem(LS_MUTED, m ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const persistStopped = useCallback((s: boolean) => {
    setStoppedByUser(s);
    try {
      if (s) localStorage.setItem(LS_STOPPED, "1");
      else localStorage.removeItem(LS_STOPPED);
    } catch {
      /* ignore */
    }
  }, []);

  const tryPlay = useCallback(async () => {
    const el = audioRef.current;
    if (!el || loadFailed) return;
    try {
      await el.play();
      setPlaying(true);
      setNeedsTap(false);
    } catch {
      setNeedsTap(true);
      setPlaying(false);
    }
  }, [loadFailed]);

  const tryPlayRef = useRef(tryPlay);
  tryPlayRef.current = tryPlay;

  /**
   * Browsers block audible autoplay until the visitor has interacted with the page.
   * We retry a few times (helps slow networks) and start on the first pointer/key anywhere.
   */
  useEffect(() => {
    if (!mounted || !hydrated || !queue || stoppedByUser || loadFailed) return;
    let cancelled = false;
    const run = () => {
      if (!cancelled) void tryPlayRef.current();
    };
    run();
    const raf = requestAnimationFrame(run);
    const t1 = window.setTimeout(run, 250);
    const t2 = window.setTimeout(run, 800);
    const t3 = window.setTimeout(run, 2000);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [mounted, hydrated, queue, stoppedByUser, loadFailed]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!hydrated || !queue || stoppedByUser || loadFailed) return;
    const go = () => {
      void tryPlayRef.current();
    };
    document.addEventListener("pointerdown", go, {
      capture: true,
      passive: true,
      once: true,
    });
    document.addEventListener("keydown", go, {
      capture: true,
      once: true,
    });
  }, [hydrated, queue, stoppedByUser, loadFailed]);

  useEffect(() => {
    if (!hydrated || stoppedByUser || loadFailed) return;
    const onShow = () => void tryPlayRef.current();
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [hydrated, stoppedByUser, loadFailed]);

  useEffect(() => {
    if (!hydrated || stoppedByUser || loadFailed) return;
    const onVis = () => {
      if (document.visibilityState === "visible") void tryPlayRef.current();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [hydrated, stoppedByUser, loadFailed]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || loadFailed) return;
    el.volume = volume;
  }, [volume, loadFailed]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || loadFailed) return;
    el.volume = volumeRef.current;
    el.load();
  }, [trackIndex, track.src, loadFailed]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || loadFailed || !playing || stoppedByUser || needsTap) return;
    const run = () => {
      void el.play().catch(() => setNeedsTap(true));
    };
    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) run();
    else el.addEventListener("canplay", run, { once: true });
    return () => el.removeEventListener("canplay", run);
  }, [trackIndex, track.src, playing, stoppedByUser, needsTap, loadFailed]);

  const onEnded = useCallback(() => {
    if (stoppedByUser) return;
    advance();
  }, [stoppedByUser, advance]);

  const handlePlay = useCallback(() => {
    persistStopped(false);
    setNeedsTap(false);
    void tryPlay();
  }, [persistStopped, tryPlay]);

  const handlePause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setPlaying(false);
    persistStopped(true);
    setNeedsTap(false);
  }, [persistStopped]);

  const toggleMute = useCallback(() => {
    persistMuted(!muted);
  }, [muted, persistMuted]);

  const handleAudioError = useCallback(() => {
    if (loadFailed || skipErrorRef.current) return;
    skipErrorRef.current = true;
    failedLoadCountRef.current += 1;
    if (failedLoadCountRef.current >= TRACKS.length) {
      setLoadFailed(true);
      setPlaying(false);
      setNeedsTap(false);
      skipErrorRef.current = false;
      return;
    }
    advance();
    window.setTimeout(() => {
      skipErrorRef.current = false;
    }, 80);
  }, [advance, loadFailed]);

  const handleResetLoadErrors = useCallback(() => {
    failedLoadCountRef.current = 0;
    setLoadFailed(false);
    setQueue({ deck: shuffleDeck(), pos: 0 });
    setNeedsTap(true);
  }, []);

  const onAudioPlaying = useCallback(() => {
    failedLoadCountRef.current = 0;
  }, []);

  if (!mounted || pathname === "/business-card" || !queue) {
    return null;
  }

  const positionStyle: CSSProperties = panelPos
    ? { left: panelPos.left, top: panelPos.top, right: "auto", bottom: "auto" }
    : {};

  const dragBarKeyHandlers = (e: React.KeyboardEvent) => {
    if (!panelPos || !panelRef.current) return;
    if (
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowRight" &&
      e.key !== "ArrowUp" &&
      e.key !== "ArrowDown"
    ) {
      return;
    }
    e.preventDefault();
    const step = e.shiftKey ? 24 : 8;
    const w = panelRef.current.offsetWidth;
    const h = panelRef.current.offsetHeight;
    let { left, top } = panelPos;
    if (e.key === "ArrowLeft") left -= step;
    if (e.key === "ArrowRight") left += step;
    if (e.key === "ArrowUp") top -= step;
    if (e.key === "ArrowDown") top += step;
    const next = clampPanelPos(left, top, w, h);
    latestPosRef.current = next;
    setPanelPos(next);
    persistPanelPos(next);
  };

  return (
    <div
      ref={panelRef}
      style={positionStyle}
      onPointerDownCapture={onPanelPointerDownCapture}
      className={`print:hidden fixed bottom-4 right-4 z-[40] flex max-w-[calc(100vw-2rem)] touch-none cursor-grab flex-col rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)]/95 shadow-[var(--shadow-lg)] backdrop-blur-sm select-none active:cursor-grabbing [&_button]:cursor-pointer sm:bottom-5 sm:right-5 ${
        expanded
          ? "w-[min(100vw-2rem,20rem)] max-w-[min(100vw-2rem,20rem)] gap-3 p-3 pt-0"
          : "w-auto max-w-[min(100vw-1rem,100%)] gap-0 p-0"
      }`}
      data-site-chrome
    >
      <audio
        key={`${queue.pos}-${trackIndex}-${track.src}`}
        ref={audioRef}
        src={track.src}
        muted={muted}
        preload="auto"
        playsInline
        onEnded={onEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={handleAudioError}
        onPlaying={onAudioPlaying}
        className="hidden"
        aria-hidden
      />

      {expanded ? (
        <div className="flex items-stretch gap-1 border-b border-[var(--border)] bg-[var(--bg-section)]/95 -mx-3 rounded-t-[var(--radius-sm)]">
          <div
            role="button"
            tabIndex={0}
            aria-label="Drag anywhere on the music panel to move it, or use arrow keys"
            onKeyDown={dragBarKeyHandlers}
            className="flex min-w-0 flex-1 cursor-grab items-center gap-2 px-3 py-2 active:cursor-grabbing"
          >
            <GripVertical
              className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
              aria-hidden
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Drag panel to move
            </span>
          </div>
          <button
            type="button"
            onClick={() => persistExpanded(false)}
            className="flex shrink-0 items-center justify-center border-l border-[var(--border)] px-3 py-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-section)] hover:text-[var(--primary)]"
            aria-expanded={expanded}
            aria-label="Collapse music player"
          >
            <ChevronDown className="h-5 w-5" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="flex items-stretch rounded-[var(--radius-sm)] bg-[var(--bg-section)]/95">
          <div
            role="button"
            tabIndex={0}
            aria-label="Drag anywhere on the music panel to move it, or use arrow keys"
            onKeyDown={dragBarKeyHandlers}
            className="flex cursor-grab items-center gap-2 pl-2.5 pr-1 py-2 active:cursor-grabbing"
          >
            <GripVertical
              className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
              aria-hidden
            />
            <Music className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
            <span className="pr-1 text-[11px] font-bold text-[var(--text)]">
              Music
            </span>
          </div>
          {!loadFailed ? (
            <>
              {stoppedByUser || !playing ? (
                <button
                  type="button"
                  onClick={handlePlay}
                  className="flex items-center border-l border-[var(--border)] px-2.5 py-2 text-[var(--primary)] hover:bg-[var(--card)]"
                  aria-label="Play music"
                >
                  <Play className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex items-center border-l border-[var(--border)] px-2.5 py-2 text-[var(--text)] hover:bg-[var(--card)]"
                  aria-label="Pause music"
                >
                  <Pause className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={toggleMute}
                className="flex items-center border-l border-[var(--border)] px-2.5 py-2 text-[var(--text)] hover:bg-[var(--card)]"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => persistExpanded(true)}
            className="flex items-center border-l border-[var(--border)] px-2.5 py-2 text-[var(--text-muted)] hover:bg-[var(--card)] hover:text-[var(--primary)]"
            aria-expanded={expanded}
            aria-label="Expand music player"
          >
            <ChevronUp className="h-5 w-5" aria-hidden />
          </button>
        </div>
      )}

      {expanded ? (
      <div className="px-0">
        <div className="flex items-start gap-2">
          <Shuffle
            className="mt-1 h-4 w-4 shrink-0 text-[var(--gold)]"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Background music · shuffled
            </p>
          </div>
        </div>

        {!loadFailed ? (
          <div
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)]/80 px-3 py-2.5"
            aria-live="polite"
          >
            <div className="mb-1 flex items-center gap-2">
              <Music
                className="h-4 w-4 shrink-0 text-[var(--primary)]"
                aria-hidden
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
                Now playing
              </span>
              {playing && !stoppedByUser ? (
                <span className="relative ml-auto flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                </span>
              ) : null}
            </div>
            <p className="font-[family-name:var(--font-playfair)] text-lg font-bold leading-snug text-[var(--text)]">
              {track.title}
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-tight text-[var(--text-muted)]">
              {track.artist}
            </p>
            {muted && playing ? (
              <p className="mt-1 text-[10px] font-semibold text-[var(--accent)]">
                Muted (still playing)
              </p>
            ) : null}
          </div>
        ) : null}

        {loadFailed ? (
          <div className="space-y-2 text-[11px] leading-snug text-[var(--accent)]">
            <p>Couldn&apos;t load bundled audio. Check network or file paths.</p>
            <p>
              Replace MP3s in{" "}
              <code className="rounded bg-[var(--bg-section)] px-1">
                public/audio/
              </code>{" "}
              or set{" "}
              <code className="rounded bg-[var(--bg-section)] px-1">
                NEXT_PUBLIC_OPM_*_URL
              </code>{" "}
              in <code className="rounded bg-[var(--bg-section)] px-1">.env.local</code>.
            </p>
            <button
              type="button"
              onClick={handleResetLoadErrors}
              className="btn btn-primary btn-sm w-full text-xs"
            >
              Try again
            </button>
          </div>
        ) : needsTap && !playing && !stoppedByUser ? (
          <button
            type="button"
            onClick={handlePlay}
            className="btn btn-primary btn-sm w-full justify-center gap-2 text-xs"
          >
            <Play className="h-4 w-4" aria-hidden />
            Click or tap anywhere on the page
          </button>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          {!needsTap ? (
            <>
              {stoppedByUser || !playing ? (
                <button
                  type="button"
                  onClick={handlePlay}
                  className="btn btn-gold btn-sm gap-1 px-2.5 py-1.5 text-xs"
                  aria-label="Play music"
                >
                  <Play className="h-4 w-4" aria-hidden />
                  Play
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePause}
                  className="btn btn-sm gap-1 border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                  aria-label="Pause music"
                >
                  <Pause className="h-4 w-4" aria-hidden />
                  Pause
                </button>
              )}
              <button
                type="button"
                onClick={handleStop}
                className="btn btn-sm gap-1 border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                aria-label="Stop music"
              >
                <Square className="h-4 w-4" aria-hidden />
                Stop
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={toggleMute}
            disabled={loadFailed}
            className="btn btn-sm gap-1 border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--text)] disabled:opacity-50"
            aria-label={muted ? "Unmute music" : "Mute music"}
          >
            {muted ? (
              <VolumeX className="h-4 w-4" aria-hidden />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden />
            )}
            {muted ? "Unmute" : "Mute"}
          </button>
        </div>

        {!loadFailed ? (
          <div className="mt-3 space-y-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-section)]/80 px-3 py-2">
            <label
              htmlFor="mrks-opm-volume"
              className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
            >
              <span>Volume</span>
              <span className="tabular-nums text-[var(--text)]">
                {Math.round(volume * 100)}%
              </span>
            </label>
            <input
              id="mrks-opm-volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => persistVolume(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-[var(--primary)]"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(volume * 100)}
              aria-label="Music volume"
            />
          </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
