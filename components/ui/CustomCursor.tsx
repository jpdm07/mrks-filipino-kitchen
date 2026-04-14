"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const SUN_SIZE = 28;
const HISTORY_LEN = 48;
const STAR_LAG = [9, 18, 30];
const STAR_SIZES = [10, 8, 6];
const STAR_OPACITY = [0.7, 0.45, 0.2];
/** Gold (sun), blue stripe, red stripe — Philippine flag echo */
const STAR_FILLS = ["#FFC200", "#0038A8", "#CE1126"] as const;
const MIST_LAG = [5, 9] as const; // blue under, red on top (slightly further back)
const MIST_LERP = 0.22;
const LERP = 0.32;

/** Heavy client-side link usage + `cursor:none` leaves no visible pointer if the sun glitches. */
const PATHS_SKIP_DECORATIVE_CURSOR = new Set(["/menu", "/takeout-menu"]);

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function isInteractiveTarget(el: Element | null): boolean {
  if (!el || !(el instanceof Element)) return false;
  const node = el.closest(
    "a[href], button, [role='button'], [role='link'], [role='tab'], input, textarea, select, label, summary, .btn"
  );
  return Boolean(node);
}

function FlagSun() {
  return (
    <svg
      width={SUN_SIZE}
      height={SUN_SIZE}
      viewBox="0 0 28 28"
      aria-hidden
    >
      <g transform="translate(14,14)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg})`}
            d="M 0 -13 L 1.35 -4.5 L -1.35 -4.5 Z"
            fill="#FFC200"
          />
        ))}
        <circle r="5" fill="#E6A800" />
      </g>
    </svg>
  );
}

function TrailStar({ size, fill }: { size: number; fill: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-5 -5 10 10"
      className="pointer-events-none absolute left-0 top-0 will-change-transform"
      aria-hidden
    >
      <path
        d="M 0 -4 L 0.95 -1.2 L 3.8 -0.9 L 1.5 0.95 L 2.35 4 L 0 2.45 L -2.35 4 L -1.5 0.95 L -3.8 -0.9 L -0.95 -1.2 Z"
        fill={fill}
        stroke={fill === "#FFC200" ? "none" : "rgba(255, 251, 245, 0.5)"}
        strokeWidth={fill === "#FFC200" ? 0 : 0.4}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function CustomCursor() {
  const pathname = usePathname();
  const [mqFine, setMqFine] = useState(false);
  const mouse = useRef({ x: -100, y: -100 });
  const history = useRef<{ x: number; y: number }[]>([]);
  const smoothStars = useRef([
    { x: -100, y: -100 },
    { x: -100, y: -100 },
    { x: -100, y: -100 },
  ]);
  const smoothMist = useRef([
    { x: -100, y: -100 },
    { x: -100, y: -100 },
  ]);
  const overInteractive = useRef(false);

  const sunWrapRef = useRef<HTMLDivElement>(null);
  const starRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mistRefs = useRef<(HTMLDivElement | null)[]>([]);

  const skipDecorative = PATHS_SKIP_DECORATIVE_CURSOR.has(pathname);
  const showDecorative = mqFine && !skipDecorative;

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const applyMq = () => setMqFine(mq.matches);
    applyMq();
    mq.addEventListener("change", applyMq);
    return () => mq.removeEventListener("change", applyMq);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("has-custom-cursor", showDecorative);
    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [showDecorative]);

  useEffect(() => {
    if (!showDecorative) return;

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      history.current.push({ x: e.clientX, y: e.clientY });
      if (history.current.length > HISTORY_LEN) {
        history.current.shift();
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const next = isInteractiveTarget(el);
      if (next !== overInteractive.current) {
        overInteractive.current = next;
      }
    };

    const onLeave = () => {
      overInteractive.current = false;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    let raf = 0;
    const loop = () => {
      const h = history.current;
      const len = h.length;
      const mx = mouse.current.x;
      const my = mouse.current.y;

      for (let i = 0; i < 3; i++) {
        const lag = STAR_LAG[i];
        const idx = Math.max(0, len - 1 - lag);
        const target = len > 0 ? h[idx] : { x: mx, y: my };
        const s = smoothStars.current[i];
        s.x = lerp(s.x, target.x, LERP);
        s.y = lerp(s.y, target.y, LERP);
        const el = starRefs.current[i];
        if (el) {
          el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
          el.style.opacity = String(STAR_OPACITY[i]);
        }
      }

      for (let i = 0; i < 2; i++) {
        const lag = MIST_LAG[i];
        const idx = Math.max(0, len - 1 - lag);
        const target = len > 0 ? h[idx] : { x: mx, y: my };
        const m = smoothMist.current[i];
        m.x = lerp(m.x, target.x, MIST_LERP);
        m.y = lerp(m.y, target.y, MIST_LERP);
        const mel = mistRefs.current[i];
        if (mel) {
          mel.style.transform = `translate(${m.x}px, ${m.y}px) translate(-50%, -50%)`;
        }
      }

      const scale = overInteractive.current ? 1.14 : 1;
      const sunEl = sunWrapRef.current;
      if (sunEl) {
        sunEl.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%) scale(${scale})`;
        sunEl.style.filter = overInteractive.current
          ? "drop-shadow(0 0 10px rgba(255, 194, 0, 0.95)) drop-shadow(0 0 4px rgba(230, 168, 0, 0.85))"
          : "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.22))";
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [showDecorative]);

  if (!showDecorative) return null;

  return (
    <div
      data-custom-cursor-root
      className="pointer-events-none fixed inset-0 z-[10000] overflow-hidden print:hidden"
      aria-hidden
    >
      <div
        ref={(el) => {
          mistRefs.current[0] = el;
        }}
        className="pointer-events-none absolute left-0 top-0 h-[52px] w-[52px] rounded-full will-change-transform"
        style={{
          zIndex: 8,
          background:
            "radial-gradient(circle, rgba(0,56,168,0.42) 0%, rgba(0,56,168,0.12) 45%, transparent 72%)",
          filter: "blur(6px)",
        }}
      />
      <div
        ref={(el) => {
          mistRefs.current[1] = el;
        }}
        className="pointer-events-none absolute left-0 top-0 h-[40px] w-[40px] rounded-full will-change-transform"
        style={{
          zIndex: 9,
          background:
            "radial-gradient(circle, rgba(206,17,38,0.38) 0%, rgba(206,17,38,0.1) 48%, transparent 74%)",
          filter: "blur(5px)",
        }}
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          ref={(el) => {
            starRefs.current[i] = el;
          }}
          className="pointer-events-none absolute left-0 top-0"
          style={{ zIndex: 29 }}
        >
          <TrailStar size={STAR_SIZES[i]} fill={STAR_FILLS[i]} />
        </div>
      ))}
      <div
        ref={sunWrapRef}
        className="pointer-events-none absolute left-0 top-0 will-change-transform"
        style={{
          zIndex: 30,
          transition: "filter 0.18s ease",
        }}
      >
        <FlagSun />
      </div>
    </div>
  );
}
