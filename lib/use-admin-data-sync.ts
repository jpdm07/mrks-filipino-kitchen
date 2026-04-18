"use client";

import { useEffect, useRef } from "react";
import { ADMIN_POLL_INTERVAL_MS } from "@/lib/admin-poll-interval";

type Options = {
  /** Defaults to {@link ADMIN_POLL_INTERVAL_MS} (same as dashboard orders). */
  intervalMs?: number;
  /** When true, no polling (e.g. modal open). */
  pause?: boolean;
};

/**
 * Keeps admin reports in sync with live DB data (confirmed orders, etc.):
 * - Polls on an interval while the browser tab is visible
 * - Refetches when the user returns to the tab after being away
 *
 * Pass a stable `refetch` (e.g. `useCallback` `load`) so it always hits current filters/range.
 */
export function useAdminDataSync(
  refetch: () => void | Promise<void>,
  options?: Options
): void {
  const ref = useRef(refetch);
  ref.current = refetch;

  useEffect(() => {
    if (options?.pause) return;
    const ms = options?.intervalMs ?? ADMIN_POLL_INTERVAL_MS;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void ref.current();
    };

    const id = window.setInterval(tick, ms);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void ref.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [options?.intervalMs, options?.pause]);
}
