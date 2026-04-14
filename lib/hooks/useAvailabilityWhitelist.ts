"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  options?: { pollMsOnError?: number }
) {
  const pollMsOnError = options?.pollMsOnError ?? 30000;
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
      const r = await fetch(
        `/api/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: "no-store" }
      );
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
  }, [from, to, applyPayload]);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    void fetchOnce();

    const qs = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const source = new EventSource(`/api/availability/stream${qs}`);

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
  }, [from, to, applyPayload, fetchOnce, pollMsOnError]);

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
