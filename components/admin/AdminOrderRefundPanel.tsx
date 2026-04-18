"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { OrderItemLine } from "@/lib/order-types";
import type { RefundLedgerEntry } from "@/lib/refund-log";
import {
  PAYMENT_STATUS_REFUNDED,
  PAYMENT_STATUS_VERIFIED,
} from "@/lib/order-payment";

type SentVia = "venmo" | "zelle" | "cash" | "other";

export function AdminOrderRefundPanel({
  orderNumber,
  items,
  wantsUtensils,
  utensilSets,
  totalUsd,
  paymentStatus,
  refundHistory,
}: {
  orderNumber: string;
  items: OrderItemLine[];
  wantsUtensils: boolean;
  utensilSets: number;
  totalUsd: number;
  paymentStatus: string | null;
  refundHistory: RefundLedgerEntry[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okHint, setOkHint] = useState<string | null>(null);

  const [qtyRefund, setQtyRefund] = useState<number[]>(() =>
    items.map(() => 0)
  );
  const [decreaseUtensilSets, setDecreaseUtensilSets] = useState(0);
  const [sentVia, setSentVia] = useState<SentVia>("venmo");
  const [customerNote, setCustomerNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [notifyCustomerEmail, setNotifyCustomerEmail] = useState(true);
  const [notifyCustomerSms, setNotifyCustomerSms] = useState(true);
  const [notifyOwnerEmail, setNotifyOwnerEmail] = useState(true);
  const [notifyOwnerSms, setNotifyOwnerSms] = useState(true);
  const [revertPaymentVerification, setRevertPaymentVerification] =
    useState(false);

  const canRefund = useMemo(() => {
    if (totalUsd <= 0.009) return false;
    if (paymentStatus === PAYMENT_STATUS_REFUNDED) return false;
    return items.length > 0 || (wantsUtensils && utensilSets > 0);
  }, [items.length, paymentStatus, totalUsd, wantsUtensils, utensilSets]);

  const lineDecrements = useMemo(() => {
    const out: { index: number; qty: number }[] = [];
    qtyRefund.forEach((q, index) => {
      if (q > 0) out.push({ index, qty: q });
    });
    return out;
  }, [qtyRefund]);

  if (!canRefund) {
    return (
      <div className="mt-6 rounded border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="font-bold">Refunds</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {totalUsd <= 0.009 || paymentStatus === PAYMENT_STATUS_REFUNDED
            ? "This order has no remaining balance to refund."
            : "Nothing to refund (no line items or utensils on file)."}
        </p>
        {refundHistory.length > 0 ? <RefundHistoryList entries={refundHistory} /> : null}
      </div>
    );
  }

  async function submit() {
    setErr(null);
    setOkHint(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refund: {
            lineDecrements,
            decreaseUtensilSetsBy: decreaseUtensilSets,
            sentVia,
            customerNote: customerNote.trim() || undefined,
            internalNote: internalNote.trim() || undefined,
            notifyCustomerEmail,
            notifyCustomerSms,
            notifyOwnerEmail,
            notifyOwnerSms,
            revertPaymentVerification,
          },
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Refund failed");
        return;
      }
      setQtyRefund(items.map(() => 0));
      setDecreaseUtensilSets(0);
      setCustomerNote("");
      setInternalNote("");
      setOkHint("Refund recorded. Customer/owner notifications sent per your checkboxes.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded border border-[var(--border)] bg-[var(--card)] p-4">
      <h2 className="font-bold">Record a refund</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
        Send money back yourself in{" "}
        <strong className="text-[var(--text)]">Venmo</strong> or{" "}
        <strong className="text-[var(--text)]">Zelle</strong> first, then use this
        form to update the order, log what you returned, and email/SMS confirmations.
        The site does not move money automatically.
      </p>

      <div className="mt-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Refund quantities (per line)
        </p>
        <ul className="space-y-3 text-sm">
          {items.map((line, index) => (
            <li
              key={`${line.name}-${index}-${line.menuItemId ?? ""}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--border)] bg-[var(--bg-section)] px-3 py-2"
            >
              <span className="min-w-0 flex-1 font-medium text-[var(--text)]">
                {line.name}
                {line.size ? ` · ${line.size}` : ""}{" "}
                <span className="text-[var(--text-muted)]">
                  (on order: {line.quantity})
                </span>
              </span>
              <label className="flex items-center gap-2 text-[var(--text-muted)]">
                Refund qty
                <input
                  type="number"
                  min={0}
                  max={line.quantity}
                  className="w-16 rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[var(--text)]"
                  value={qtyRefund[index] ?? 0}
                  onChange={(e) => {
                    const v = Math.max(
                      0,
                      Math.min(
                        line.quantity,
                        Math.floor(Number(e.target.value) || 0)
                      )
                    );
                    setQtyRefund((prev) => {
                      const next = [...prev];
                      next[index] = v;
                      return next;
                    });
                  }}
                />
              </label>
            </li>
          ))}
        </ul>

        {wantsUtensils && utensilSets > 0 ? (
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-[var(--text)]">
              Reduce utensil sets by (currently {utensilSets})
            </span>
            <input
              type="number"
              min={0}
              max={utensilSets}
              className="w-20 rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1"
              value={decreaseUtensilSets}
              onChange={(e) =>
                setDecreaseUtensilSets(
                  Math.max(
                    0,
                    Math.min(
                      utensilSets,
                      Math.floor(Number(e.target.value) || 0)
                    )
                  )
                )
              }
            />
          </label>
        ) : null}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            How you sent money back
          </p>
          <select
            className="mt-1 w-full max-w-xs rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
            value={sentVia}
            onChange={(e) => setSentVia(e.target.value as SentVia)}
          >
            <option value="venmo">Venmo</option>
            <option value="zelle">Zelle</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-[var(--text)]">
            Note to customer (optional, appears on their email)
          </span>
          <textarea
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
            rows={2}
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="e.g. Refunding the flan only — sorry it wasn’t available."
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-[var(--text)]">
            Internal note (optional, appended to admin notes)
          </span>
          <textarea
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
            rows={2}
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="For your records only."
          />
        </label>

        <fieldset className="space-y-2 text-sm">
          <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Notifications
          </legend>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifyCustomerEmail}
              onChange={(e) => setNotifyCustomerEmail(e.target.checked)}
            />
            Email customer confirmation
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifyCustomerSms}
              onChange={(e) => setNotifyCustomerSms(e.target.checked)}
            />
            SMS customer
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifyOwnerEmail}
              onChange={(e) => setNotifyOwnerEmail(e.target.checked)}
            />
            Email you (owner inbox)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifyOwnerSms}
              onChange={(e) => setNotifyOwnerSms(e.target.checked)}
            />
            SMS you (owner phone)
          </label>
        </fieldset>

        {paymentStatus === PAYMENT_STATUS_VERIFIED ? (
          <label className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
            <input
              type="checkbox"
              className="mt-1"
              checked={revertPaymentVerification}
              onChange={(e) => setRevertPaymentVerification(e.target.checked)}
            />
            <span>
              Also mark payment as <strong>not verified</strong> (awaiting payment
              again). Use only if you need to collect replacement funds after a
              partial fix.
            </span>
          </label>
        ) : null}

        {err ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {err}
          </p>
        ) : null}
        {okHint ? (
          <p className="text-sm font-medium text-emerald-700" role="status">
            {okHint}
          </p>
        ) : null}

        <button
          type="button"
          className="btn btn-gold btn-sm"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? "Saving…" : "Record refund & notify"}
        </button>
      </div>

      {refundHistory.length > 0 ? (
        <div className="mt-8 border-t border-[var(--border)] pt-4">
          <RefundHistoryList entries={refundHistory} />
        </div>
      ) : null}
    </div>
  );
}

function RefundHistoryList({ entries }: { entries: RefundLedgerEntry[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-[var(--text)]">Refund history</h3>
      <ul className="mt-2 space-y-3 text-xs text-[var(--text-muted)]">
        {entries.map((e) => (
          <li
            key={e.id}
            className="rounded border border-[var(--border)] bg-[var(--bg-section)] p-2"
          >
            <p className="font-semibold text-[var(--text)]">
              {new Date(e.at).toLocaleString()} — ${e.refundTotalUsd.toFixed(2)} via{" "}
              {e.sentVia}
            </p>
            <p>New total after: ${e.newTotalUsd.toFixed(2)}</p>
            {e.lineChanges.length > 0 ? (
              <ul className="mt-1 list-disc pl-4">
                {e.lineChanges.map((c) => (
                  <li key={`${e.id}-${c.index}-${c.name}`}>
                    {c.name}: −{c.qtyRemoved} (${c.lineRefundUsd.toFixed(2)})
                  </li>
                ))}
              </ul>
            ) : null}
            {e.utensilRefundUsd > 0.005 ? (
              <p>Utensils: −${e.utensilRefundUsd.toFixed(2)}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
