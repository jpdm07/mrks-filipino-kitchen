"use client";

import { useEffect } from "react";

const COLORS = ["#0e1d35", "#d4a944", "#f4e8d1", "#c99a3e", "#fbf6ec"];

export function OrderConfirmationConfetti() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    let cancelled = false;
    void import("canvas-confetti").then((mod) => {
      if (cancelled) return;
      const confetti = mod.default;

      const fire = (opts: Parameters<typeof confetti>[0]) => {
        void confetti({
          colors: COLORS,
          ticks: 200,
          gravity: 1.05,
          decay: 0.92,
          ...opts,
        });
      };

      fire({
        particleCount: 110,
        spread: 78,
        startVelocity: 38,
        origin: { x: 0.5, y: 0.58 },
      });

      window.setTimeout(() => {
        if (cancelled) return;
        fire({
          particleCount: 45,
          angle: 60,
          spread: 50,
          origin: { x: 0.08, y: 0.72 },
        });
        fire({
          particleCount: 45,
          angle: 120,
          spread: 50,
          origin: { x: 0.92, y: 0.72 },
        });
      }, 180);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
