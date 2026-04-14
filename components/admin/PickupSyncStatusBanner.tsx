"use client";

import { useEffect, useState } from "react";
import { ORDER_FULFILLMENT } from "@/lib/config";

type Status =
  | {
      dbHost: string | null;
      openDaysTotal: number;
      autoSyncEnabled: boolean;
      calendarConfigured: boolean;
    }
  | { error: true };

export function PickupSyncStatusBanner() {
  const [s, setS] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/pickup-sync-status", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("bad");
        return r.json() as Promise<Status>;
      })
      .then((j) => {
        if (!cancelled) setS(j);
      })
      .catch(() => {
        if (!cancelled) setS({ error: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!s || "error" in s) return null;

  return (
    <div className="mb-6 max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-4 py-3 text-sm text-[var(--text)]">
      <p className="font-bold text-[var(--primary)]">Live site checklist</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--text-muted)]">
        <li>
          This admin session is writing to database host:{" "}
          <code className="rounded bg-[var(--card)] px-1 text-[var(--text)]">
            {s.dbHost ?? "— (DATABASE_URL missing)"}
          </code>
          . Your public site (e.g. Vercel) must use the{" "}
          <strong>same</strong> <code className="text-[var(--text)]">DATABASE_URL</code>{" "}
          or customers will never see these edits.
        </li>
        <li>
          Open pickup days in this database right now:{" "}
          <strong className="text-[var(--text)]">{s.openDaysTotal}</strong> (all
          dates). If that is 0 but you marked days green, you are not looking at
          the same database the live site uses.
        </li>
        <li>
          Google Calendar auto-pull:{" "}
          <strong className="text-[var(--text)]">
            {s.autoSyncEnabled ? "on" : "off"}
          </strong>
          {s.calendarConfigured ? "" : " (calendar env not configured)"}. If a day
          you closed keeps coming back, an event may still exist on Google — remove
          it there, or set{" "}
          <code className="text-[var(--text)]">GOOGLE_AVAILABILITY_AUTO_SYNC=false</code>{" "}
          on the host.
        </li>
        <li>
          Customers can book from <strong>{ORDER_FULFILLMENT.MIN_LEAD_DAYS}</strong>{" "}
          full calendar days out (about <strong>3–4 days</strong> to prepare).
          Closer open days may show with a lock until then. Use month arrows to
          find your dates.
        </li>
      </ul>
    </div>
  );
}
