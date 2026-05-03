"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Order } from "@prisma/client";
import { refreshAdminAfterOrderChange } from "@/lib/admin-orders-changed-event";

function parseUsdInput(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number.parseFloat(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export function AdminOrderPaymentRecordSection({
  orderId,
  orderNumber,
  orderTotalUsd,
  tipAmount,
  amountReceivedUsd,
  paymentRecordNotes,
  onSaved,
}: {
  orderId: string;
  orderNumber: string;
  orderTotalUsd: number;
  tipAmount: number;
  amountReceivedUsd: number | null;
  paymentRecordNotes: string | null;
  onSaved?: (order: Order) => void;
}) {
  const router = useRouter();
  const [tipStr, setTipStr] = useState("");
  const [receivedStr, setReceivedStr] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setTipStr(tipAmount > 0 ? tipAmount.toFixed(2) : "");
    setReceivedStr(
      amountReceivedUsd != null ? amountReceivedUsd.toFixed(2) : ""
    );
    setNotes(paymentRecordNotes ?? "");
    setErr(null);
    setHint(null);
  }, [orderId, orderNumber, tipAmount, amountReceivedUsd, paymentRecordNotes]);

  const comparison = useMemo(() => {
    const tipRaw = tipStr.trim() === "" ? 0 : parseUsdInput(tipStr);
    if (Number.isNaN(tipRaw)) return null;
    const recvV =
      receivedStr.trim() === ""
        ? null
        : parseUsdInput(receivedStr);
    if (recvV != null && Number.isNaN(recvV)) return null;
    const expected = orderTotalUsd + tipRaw;
    if (recvV == null) return { expected, delta: null as number | null };
    const delta = Math.round((recvV - expected) * 100) / 100;
    return { expected, delta };
  }, [tipStr, receivedStr, orderTotalUsd]);

  const save = async () => {
    setErr(null);
    setHint(null);

    const tipParsed =
      tipStr.trim() === "" ? 0 : parseUsdInput(tipStr);
    if (tipParsed == null || Number.isNaN(tipParsed)) {
      setErr("Tip must be a number or empty.");
      return;
    }
    if (tipParsed < 0 || tipParsed > 100_000) {
      setErr("Tip is out of range.");
      return;
    }

    let amountReceived: number | null;
    if (receivedStr.trim() === "") {
      amountReceived = null;
    } else {
      const r = parseUsdInput(receivedStr);
      if (r == null || Number.isNaN(r)) {
        setErr("Amount received must be a number or blank.");
        return;
      }
      if (r < 0 || r > 1_000_000) {
        setErr("Amount received is out of range.");
        return;
      }
      amountReceived = r;
    }

    setBusy(true);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderNumber)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipAmount: tipParsed,
            amountReceivedUsd: amountReceived,
            paymentRecordNotes: notes.trim() || null,
          }),
        }
      );
      const raw = (await res.json()) as Order | { error?: string };
      if (!res.ok) {
        setErr((raw as { error?: string }).error ?? "Save failed");
        return;
      }
      const updated = raw as Order;
      onSaved?.(updated);
      refreshAdminAfterOrderChange(router);
      setHint("Saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <h2 className="font-bold text-[var(--text)]">Payment &amp; tips (your records)</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Order total from the menu is{" "}
        <strong className="text-[var(--text)]">${orderTotalUsd.toFixed(2)}</strong>.
        Use this block to log what the customer actually gave you, tips, and why anything
        differs (cash rounding, split tender, adjustment).
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Tip (USD)
          <input
            type="text"
            inputMode="decimal"
            className="mt-1 w-full min-h-11 rounded-lg border border-[var(--border)] bg-white px-3 py-2 tabular-nums"
            placeholder="0.00"
            value={tipStr}
            onChange={(e) => setTipStr(e.target.value)}
            disabled={busy}
            autoComplete="off"
          />
        </label>
        <label className="block text-sm font-semibold">
          Cash / card taken (USD)
          <input
            type="text"
            inputMode="decimal"
            className="mt-1 w-full min-h-11 rounded-lg border border-[var(--border)] bg-white px-3 py-2 tabular-nums"
            placeholder="Leave blank if not tracking"
            value={receivedStr}
            onChange={(e) => setReceivedStr(e.target.value)}
            disabled={busy}
            autoComplete="off"
          />
        </label>
      </div>

      {comparison && comparison.delta != null ? (
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Order + tip (expected):{" "}
          <strong className="tabular-nums text-[var(--text)]">
            ${comparison.expected.toFixed(2)}
          </strong>
          {" · "}
          {comparison.delta === 0 ? (
            <span className="text-emerald-800">Matches amount taken.</span>
          ) : (
            <span>
              Difference vs taken:{" "}
              <strong
                className={
                  comparison.delta > 0 ? "text-emerald-800" : "text-amber-900"
                }
              >
                {comparison.delta > 0 ? "+" : ""}
                {comparison.delta.toFixed(2)}
              </strong>
            </span>
          )}
        </p>
      ) : comparison ? (
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Order + tip (if you enter both):{" "}
          <strong className="tabular-nums">${comparison.expected.toFixed(2)}</strong>
        </p>
      ) : null}

      <label className="mt-4 block text-sm font-semibold">
        Notes (why you changed amounts — internal only)
        <textarea
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          rows={3}
          placeholder="e.g. Customer rounded up cash · $5 tip in Venmo memo · adjusted for coupon…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
        />
      </label>

      {err ? (
        <p className="mt-2 text-sm font-medium text-red-700" role="alert">
          {err}
        </p>
      ) : null}
      {hint ? (
        <p className="mt-2 text-sm font-semibold text-emerald-800" role="status">
          {hint}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="mt-3 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save payment & tip record"}
      </button>
    </div>
  );
}
