"use client";

import { useState } from "react";
import type { MenuItem } from "@prisma/client";
import {
  FLAN_MARGIN_PCT,
  FLAN_PROFIT_PER_RAMEKIN_USD,
  FLAN_RETAIL_PER_RAMEKIN_USD,
  FLAN_TRUE_COST_PER_RAMEKIN_USD,
} from "@/lib/flan-cost-model";
import {
  YEMA_COGS_PER_PIECE_USD,
  YEMA_RETAIL_SINGLE_USD,
} from "@/lib/yema-cost-model";

const defaultSizes = `[
  { "key": "default", "label": "Standard", "price": 10 }
]`;

export function MenuManagerClient({
  initialItems,
}: {
  initialItems: MenuItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [sentItemId, setSentItemId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Meals",
    calories: "",
    basePrice: 10,
    photoUrl: "",
    sizesJson: defaultSizes,
    hasCooked: false,
    hasFrozen: false,
    isActive: true,
  });

  const reload = async () => {
    const res = await fetch("/api/admin/menu");
    const data = await res.json();
    setItems(data.items ?? []);
  };

  const toggleVisibility = async (m: MenuItem) => {
    const res = await fetch("/api/admin/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, isActive: !m.isActive }),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as MenuItem;
    setItems((p) => p.map((x) => (x.id === updated.id ? updated : x)));
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    let sizes: unknown;
    try {
      sizes = JSON.parse(form.sizesJson);
    } catch {
      alert("Sizes must be valid JSON");
      return;
    }
    const res = await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sizes }),
    });
    if (res.ok) {
      const created = await res.json();
      setItems((p) => [...p, created]);
      setSentItemId(created.isActive ? created.id : null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;
    await fetch(`/api/admin/menu?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setItems((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-2">
      <form
        onSubmit={addItem}
        className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5"
      >
        <h2 className="font-bold text-lg">Add menu item</h2>
        <input
          required
          placeholder="Name"
          className="w-full rounded border px-2 py-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <textarea
          required
          placeholder="Description"
          rows={3}
          className="w-full rounded border px-2 py-2"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          placeholder="Category (Meals, Sides, or Desserts)"
          className="w-full rounded border px-2 py-2"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <input
          placeholder="Calories label"
          className="w-full rounded border px-2 py-2"
          value={form.calories}
          onChange={(e) => setForm({ ...form, calories: e.target.value })}
        />
        <input
          type="number"
          step="0.01"
          className="w-full rounded border px-2 py-2"
          value={form.basePrice}
          onChange={(e) =>
            setForm({ ...form, basePrice: parseFloat(e.target.value) || 0 })
          }
        />
        <input
          placeholder="Photo URL"
          className="w-full rounded border px-2 py-2"
          value={form.photoUrl}
          onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
        />
        <label className="text-sm font-semibold">Sizes JSON</label>
        <textarea
          rows={6}
          className="w-full rounded border px-2 py-2 font-mono text-xs"
          value={form.sizesJson}
          onChange={(e) => setForm({ ...form, sizesJson: e.target.value })}
        />
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.hasCooked}
            onChange={(e) => setForm({ ...form, hasCooked: e.target.checked })}
          />
          Has cooked option (lumpia)
        </label>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.hasFrozen}
            onChange={(e) => setForm({ ...form, hasFrozen: e.target.checked })}
          />
          Has frozen option (lumpia)
        </label>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Active
        </label>
        <button
          type="submit"
          className="w-full rounded bg-[var(--primary)] py-2 font-bold text-white"
        >
          Save new item
        </button>
        {sentItemId ? (
          <button
            type="button"
            className="w-full rounded border border-[var(--gold)] py-2 font-bold text-[var(--primary)]"
            onClick={() =>
              window.open(
                `/admin/subscribers?newsletter=1&items=${encodeURIComponent(sentItemId)}`,
                "_self"
              )
            }
          >
            Send Newsletter Update
          </button>
        ) : null}
      </form>

      <div>
        <div className="mb-2 flex justify-between">
          <h2 className="font-bold text-lg">Existing items</h2>
          <button type="button" className="text-sm underline" onClick={reload}>
            Refresh
          </button>
        </div>
        <ul className="space-y-3">
          {items.map((m) => (
            <li
              key={m.id}
              className="rounded border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{m.name}</strong>
                  {!m.isActive ? (
                    <span className="rounded bg-neutral-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-neutral-500">
                      Hidden
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      className="accent-[var(--primary)]"
                      checked={m.isActive}
                      onChange={() => void toggleVisibility(m)}
                    />
                    On menu
                  </label>
                  <button
                    type="button"
                    className="text-[var(--accent)]"
                    onClick={() => remove(m.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{m.category}</p>
              {m.id === "seed-6" ? (
                <div className="mt-2 rounded border border-[var(--primary)]/25 bg-[var(--primary)]/5 p-2 text-xs text-[var(--text)]">
                  <strong className="text-[var(--primary)]">Flan economics</strong>
                  <span className="mt-1 block">
                    Unit cost: ${FLAN_TRUE_COST_PER_RAMEKIN_USD.toFixed(2)} ·
                    Suggested price: $
                    {FLAN_RETAIL_PER_RAMEKIN_USD.toFixed(2)} · Profit/unit: $
                    {FLAN_PROFIT_PER_RAMEKIN_USD.toFixed(2)} · Margin: ~
                    {FLAN_MARGIN_PCT}%
                  </span>
                </div>
              ) : null}
              {m.id === "seed-13" ? (
                <div className="mt-2 rounded border border-amber-800/25 bg-amber-50 p-2 text-xs text-[var(--text)] dark:bg-amber-950/35">
                  <strong className="text-amber-900 dark:text-amber-100">
                    Yema — catalog (public menu)
                  </strong>
                  <span className="mt-1 block leading-snug">
                    Only <strong>per piece</strong> is listed until you add a bulk tier in{" "}
                    <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                      menu-catalog.ts
                    </code>{" "}
                    /{" "}
                    <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                      yema-cost-model.ts
                    </code>
                    . List price:{" "}
                    <strong className="tabular-nums">
                      ${YEMA_RETAIL_SINGLE_USD.toFixed(2)}
                    </strong>{" "}
                    · Rough COGS ~$
                    {YEMA_COGS_PER_PIECE_USD.toFixed(2)}/pc (internal). Run seed after catalog edits.
                  </span>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
