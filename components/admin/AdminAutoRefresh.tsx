"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ADMIN_POLL_INTERVAL_MS } from "@/lib/admin-poll-interval";

/**
 * Keeps server-rendered admin UI current (metrics, nav badges, etc.) without a full reload.
 * Client-heavy panels that keep their own state also poll their APIs separately.
 */
export function AdminAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const run = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    };

    const id = window.setInterval(run, ADMIN_POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return null;
}
