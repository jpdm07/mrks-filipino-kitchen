"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  orderNumber: string;
  initialIsDemo: boolean;
};

export function AdminOrderDemoDeletePanel({
  orderNumber,
  initialIsDemo,
}: Props) {
  const router = useRouter();
  const [isDemo, setIsDemo] = useState(initialIsDemo);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const patchDemo = async (next: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderNumber)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDemo: next }),
        }
      );
      if (!res.ok) {
        setErr("Could not update demo flag.");
        return;
      }
      setIsDemo(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (
      !window.confirm(
        "Delete this order permanently? This cannot be undone."
      )
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderNumber)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setErr("Could not delete order.");
        return;
      }
      router.push("/admin/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--gold-light)]/40 p-4 text-left">
      <h2 className="font-bold text-[var(--text)]">Demo &amp; cleanup</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Demo orders are{" "}
        <strong className="text-[var(--text)]">excluded from Finances</strong>{" "}
        and from dashboard revenue. You can delete any order here.
      </p>
      {err ? (
        <p className="mt-2 text-sm font-medium text-[var(--accent)]">{err}</p>
      ) : null}
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={isDemo}
          disabled={busy}
          onChange={(e) => void patchDemo(e.target.checked)}
        />
        <span>
          <span className="font-semibold text-[var(--text)]">
            Mark as demo / test order
          </span>
          <br />
          <span className="text-[var(--text-muted)]">
            Uncheck if this was a real sale you want in revenue reports.
          </span>
        </span>
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void remove()}
        className="mt-4 rounded-lg border-2 border-[var(--accent)] bg-white px-4 py-2 text-sm font-bold text-[var(--accent)] hover:bg-[var(--accent)]/10"
      >
        Delete order permanently
      </button>
    </div>
  );
}
