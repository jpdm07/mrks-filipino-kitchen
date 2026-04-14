"use client";

import { useState } from "react";
import { LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN } from "@/lib/lumpia-cost-model";

export function PricingClient({
  initial,
}: {
  initial: {
    sampleQuail: number;
    sampleFlan: number;
    samplePancit: number;
  };
}) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (res.ok) setMsg("Saved.");
    else setMsg("Could not save.");
  };

  return (
    <form
      onSubmit={save}
      className="mt-8 max-w-md space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6"
    >
      <div className="rounded border border-[var(--border)] bg-[var(--bg-section)] px-3 py-2 text-sm text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text)]">
          Sample: Lumpia (4 pcs)
        </p>
        <p className="mt-1">
          Priced automatically as ⅓ of each protein&apos;s cooked dozen (
          <span className="whitespace-nowrap">
            beef ${LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN.beef.toFixed(2)}
          </span>
          ,{" "}
          <span className="whitespace-nowrap">
            pork ${LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN.pork.toFixed(2)}
          </span>
          ,{" "}
          <span className="whitespace-nowrap">
            turkey ${LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN.turkey.toFixed(2)}
          </span>
          ). Edit dozen prices in the menu catalog / cost model to change samples.
        </p>
      </div>
      <label className="block text-sm font-semibold">
        Sample: Breaded quail eggs (3 pcs)
        <input
          type="number"
          step="0.01"
          className="mt-1 w-full rounded border px-2 py-2"
          value={v.sampleQuail}
          onChange={(e) =>
            setV({ ...v, sampleQuail: parseFloat(e.target.value) || 0 })
          }
        />
      </label>
      <label className="block text-sm font-semibold">
        Sample: Caramel Flan (1 ramekin)
        <input
          type="number"
          step="0.01"
          className="mt-1 w-full rounded border px-2 py-2"
          value={v.sampleFlan}
          onChange={(e) =>
            setV({ ...v, sampleFlan: parseFloat(e.target.value) || 0 })
          }
        />
      </label>
      <label className="block text-sm font-semibold">
        Sample: Pancit (1 container)
        <input
          type="number"
          step="0.01"
          className="mt-1 w-full rounded border px-2 py-2"
          value={v.samplePancit}
          onChange={(e) =>
            setV({ ...v, samplePancit: parseFloat(e.target.value) || 0 })
          }
        />
      </label>
      <button
        type="submit"
        className="btn btn-primary btn-block btn-sm py-2"
      >
        Save pricing
      </button>
      {msg ? <p className="text-sm font-semibold text-[var(--success)]">{msg}</p> : null}
    </form>
  );
}
