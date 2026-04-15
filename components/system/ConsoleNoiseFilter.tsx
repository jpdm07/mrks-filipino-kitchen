"use client";

import { useEffect } from "react";

/**
 * Some mobile browsers / in-app webviews log noisy lines (e.g. "onurlchange…",
 * "tagging handler…") that we don't control. Filter those from console so they
 * don't clutter devtools; they are not from this app's source.
 */
const NOISE =
  /onurlchange|tagging handler|core handler executed|injected.*handler/i;

export function ConsoleNoiseFilter() {
  useEffect(() => {
    const log = console.log;
    const info = console.info;

    const filter =
      (orig: (...args: unknown[]) => void) =>
      (...args: unknown[]) => {
        const s = args.map((a) => String(a)).join(" ");
        if (NOISE.test(s)) return;
        orig.apply(console, args as []);
      };

    console.log = filter(log);
    console.info = filter(info);

    return () => {
      console.log = log;
      console.info = info;
    };
  }, []);

  return null;
}
