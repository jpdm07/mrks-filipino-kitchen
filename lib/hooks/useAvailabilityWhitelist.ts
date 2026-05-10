"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AvailabilityWhitelistPayload = {
  openDates: string[];
  notes: Record<string, string>;
};

/**
 * Subscribes to GET /api/availability via SSE; on error falls back to polling.
 * Same payload shape as the public availability API.
 */
export function useAvailabilityWhitelist(
  from: string,
  to: string,
  options?: {
    pollMsOnError?: number;
    /** `all` = union of mixed + flan weekdays (public /availability page). */
    cartMode?: "flan" | "mixed" | "all";
    mainNeed?: number;
    flanNeed?: number;
    /** Cart menu SKUs — narrows dates to inventory same-day pickup slots. */
    menuItemIds?: string[];
  }
) {
  const pollMsOnError = options?.pollMsOnError ?? 30000;
  const cartMode = options?.cartMode ?? "mixed";
  const mainNeed = options?.mainNeed ?? 0;
  const flanNeed = options?.flanNeed ?? 0;
  const menuItemIdsKey = [
    ...new Set(
      (options?.menuItemIds ?? []).map((s) => s.trim()).filter(Boolean)
    ),
  ]
    .sort()
    .join("\0");
  const menuItemIds = useMemo(
    () =>
      [
        ...new Set(
          (options?.menuItemIds ?? []).map((s) => s.trim()).filter(Boolean)
        ),
      ].sort(),
    [menuItemIdsKey]
  );
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyPayload = useCallback(
    (data: { openDates?: unknown; notes?: unknown }) => {
      const od = Array.isArray(data.openDates)
        ? data.openDates.filter((d): d is string => typeof d === "string")
        : [];
      const n =
        data.notes && typeof data.notes === "object" && data.notes !== null
          ? (data.notes as Record<string, string>)
          : {};
      setOpenDates(od);
      setNotes(n);
      setLoadError(false);
      setLoading(false);
    },
    []
  );

  const fetchOnce = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        from,
        to,
        cartMode,
        mainNeed: String(mainNeed),
        flanNeed: String(flanNeed),
      });
      for (const id of menuItemIds) qs.append("menuItemIds", id);
      const r = await fetch(`/api/availability?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!r.ok) {
        setOpenDates([]);
        setNotes({});
        setLoadError(true);
        setLoading(false);
        return;
      }
      const j = (await r.json()) as {
        openDates?: unknown;
        notes?: unknown;
      };
      applyPayload(j);
    } catch {
      setOpenDates([]);
      setNotes({});
      setLoadError(true);
      setLoading(false);
    }
  }, [from, to, applyPayload, cartMode, mainNeed, flanNeed, menuItemIds]);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    void fetchOnce();

    const qs = new URLSearchParams({
      from,
      to,
      cartMode,
      mainNeed: String(mainNeed),
      flanNeed: String(flanNeed),
    });
    for (const id of menuItemIds) qs.append("menuItemIds", id);
    const source = new EventSource(
      `/api/availability/stream?${qs.toString()}`
    );

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          openDates?: unknown;
          notes?: unknown;
        };
        applyPayload(data);
      } catch {
        /* ignore */
      }
    };

    source.onerror = () => {
      source.close();
      void fetchOnce();
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        void fetchOnce();
      }, pollMsOnError);
    };

    return () => {
      source.close();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [
    from,
    to,
    applyPayload,
    fetchOnce,
    pollMsOnError,
    cartMode,
    mainNeed,
    flanNeed,
    menuItemIds,
  ]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchOnce();
    };
    const onFocus = () => void fetchOnce();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchOnce]);

  return { openDates, notes, loading, loadError, refetch: fetchOnce };
}
