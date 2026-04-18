"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type LineDraft = {
  id: string;
  name: string;
  quantity: string;
  unitPrice: string;
  size: string;
};

function newLine(): LineDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    quantity: "1",
    unitPrice: "",
    size: "",
  };
}

export function AdminManualOrderForm() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [slotOptions, setSlotOptions] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [wantsUtensils, setWantsUtensils] = useState(false);
  const [utensilSets, setUtensilSets] = useState("1");
  const [notes, setNotes] = useState("");
  const [markPaid, setMarkPaid] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [notifyOwnerSms, setNotifyOwnerSms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const cartMode = useMemo(() => {
    const named = lines.map((l) => l.name.trim()).filter(Boolean);
    if (named.length === 0) return "mixed";
    return named.every((n) => /flan|leche flan/i.test(n)) ? "flan" : "mixed";
  }, [lines]);

  const loadSlots = useCallback(async (date: string, mode: "mixed" | "flan") => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setSlotOptions([]);
      setPickupTime("");
      return;
    }
    setSlotsLoading(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/availability/${encodeURIComponent(date)}?cartMode=${mode}`,
        { cache: "no-store" }
      );
      const j = (await r.json()) as { isOpen?: boolean; slots?: string[] };
      if (!r.ok) {
        setSlotOptions([]);
        setPickupTime("");
        return;
      }
      if (!j.isOpen || !Array.isArray(j.slots) || j.slots.length === 0) {
        setSlotOptions([]);
        setPickupTime("");
        return;
      }
      setSlotOptions(j.slots);
      setPickupTime((t) => (t && j.slots!.includes(t) ? t : j.slots![0]!));
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots(pickupDate, cartMode);
  }, [pickupDate, cartMode, loadSlots]);

  const itemsPayload = useMemo(() => {
    return lines
      .map((l) => ({
        name: l.name.trim(),
        quantity: Math.floor(Number(l.quantity) || 0),
        unitPrice: Number(l.unitPrice),
        ...(l.size.trim() ? { size: l.size.trim() } : {}),
      }))
      .filter((l) => l.name && l.quantity >= 1 && Number.isFinite(l.unitPrice));
  }, [lines]);

  async function submit() {
    setErr(null);
    setOk(null);
    if (!customerName.trim() || !phone.trim() || !email.trim()) {
      setErr("Customer name, phone, and email are required.");
      return;
    }
    if (!pickupDate || !pickupTime) {
      setErr("Choose a pickup date and time.");
      return;
    }
    if (itemsPayload.length === 0) {
      setErr("Add at least one line item with name, quantity ≥ 1, and unit price.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          items: itemsPayload,
          pickupDate,
          pickupTime,
          wantsUtensils,
          utensilSets: wantsUtensils ? Math.max(1, Math.floor(Number(utensilSets) || 1)) : 0,
          notes: notes.trim() || undefined,
          markPaid,
          isDemo,
          notifyOwnerSms,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        orderNumber?: string;
      };
      if (!res.ok) {
        setErr(j.error ?? "Save failed");
        return;
      }
      setOk(`Saved as order #${j.orderNumber}.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <p className="text-sm leading-relaxed text-[var(--text-muted)]">
        Use this for walk-ins, phone orders, or other sales <strong>not</strong> from
        the website. The order uses the same capacity, pickup slot, and Sheets rules
        as checkout. Send the customer&apos;s payment yourself (cash, Venmo, etc.),
        then check <strong>Mark as paid / confirmed</strong> when appropriate.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold text-[var(--text)]">Customer name</span>
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-[var(--text)]">Phone</span>
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-semibold text-[var(--text)]">Email</span>
          <input
            type="email"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
      </div>

      <div>
        <p className="text-sm font-bold text-[var(--text)]">Line items</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Name and prices as they should appear on the order. Optional size (e.g.
          dozen, plate).
        </p>
        <ul className="mt-3 space-y-3">
          {lines.map((line) => (
            <li
              key={line.id}
              className="rounded border border-[var(--border)] bg-[var(--bg-section)] p-3"
            >
              <div className="grid gap-2 sm:grid-cols-12">
                <label className="sm:col-span-5">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Item name
                  </span>
                  <input
                    className="mt-0.5 w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm"
                    value={line.name}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.id === line.id ? { ...x, name: e.target.value } : x
                        )
                      )
                    }
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Qty
                  </span>
                  <input
                    type="number"
                    min={1}
                    className="mt-0.5 w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm"
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.id === line.id ? { ...x, quantity: e.target.value } : x
                        )
                      )
                    }
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    $ each
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className="mt-0.5 w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm"
                    value={line.unitPrice}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.id === line.id ? { ...x, unitPrice: e.target.value } : x
                        )
                      )
                    }
                  />
                </label>
                <label className="sm:col-span-3">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Size (optional)
                  </span>
                  <input
                    className="mt-0.5 w-full rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm"
                    value={line.size}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.id === line.id ? { ...x, size: e.target.value } : x
                        )
                      )
                    }
                  />
                </label>
              </div>
              {lines.length > 1 ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-red-600 hover:underline"
                  onClick={() =>
                    setLines((prev) => prev.filter((x) => x.id !== line.id))
                  }
                >
                  Remove line
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-2 text-sm font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
          onClick={() => setLines((prev) => [...prev, newLine()])}
        >
          + Add line
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold text-[var(--text)]">Pickup date</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-[var(--text)]">Pickup time</span>
          <select
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            disabled={slotsLoading || slotOptions.length === 0}
          >
            {slotOptions.length === 0 ? (
              <option value="">
                {slotsLoading ? "Loading slots…" : "Pick a date with availability first"}
              </option>
            ) : (
              slotOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      <div className="rounded border border-[var(--border)] bg-[var(--bg-section)] p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={wantsUtensils}
            onChange={(e) => setWantsUtensils(e.target.checked)}
          />
          <span className="font-medium text-[var(--text)]">Include utensils</span>
        </label>
        {wantsUtensils ? (
          <label className="mt-2 block text-sm">
            <span className="text-[var(--text-muted)]">Sets (total)</span>
            <input
              type="number"
              min={1}
              max={50}
              className="mt-1 w-24 rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1"
              value={utensilSets}
              onChange={(e) => setUtensilSets(e.target.value)}
            />
          </label>
        ) : null}
      </div>

      <label className="block text-sm">
        <span className="font-semibold text-[var(--text)]">Notes (optional)</span>
        <textarea
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <fieldset className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={markPaid}
            onChange={(e) => setMarkPaid(e.target.checked)}
          />
          <span>
            Mark as <strong>paid / confirmed</strong> (pickup calendar event when
            Google is configured)
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDemo}
            onChange={(e) => setIsDemo(e.target.checked)}
          />
          <span>Demo / test order (excluded from revenue metrics)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifyOwnerSms}
            onChange={(e) => setNotifyOwnerSms(e.target.checked)}
          />
          <span>Send owner SMS summary (Twilio)</span>
        </label>
      </fieldset>

      {err ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          {ok}{" "}
          <Link href="/admin/dashboard" className="underline">
            Dashboard
          </Link>
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn-gold"
        disabled={busy}
        onClick={() => void submit()}
      >
        {busy ? "Saving…" : "Save off-site order"}
      </button>
    </div>
  );
}
