"use client";

import { useCallback, useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

type Variant = "drawer" | "menu";

/**
 * − / numeric input / + with proper typing (draft until blur or Enter).
 * Values are clamped to [min, max] on commit.
 */
export function CartQuantityField({
  value,
  min,
  max,
  onChange,
  variant,
  decAriaLabel = "Decrease quantity",
  incAriaLabel = "Increase quantity",
  inputAriaLabel = "Quantity",
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  variant: Variant;
  decAriaLabel?: string;
  incAriaLabel?: string;
  inputAriaLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [value]);

  const display = draft !== null ? draft : String(value);

  const commit = useCallback(() => {
    if (draft === null) return;
    const t = draft.trim();
    if (t === "") {
      onChange(value);
      setDraft(null);
      return;
    }
    let v = Number.parseInt(t, 10);
    if (Number.isNaN(v)) {
      setDraft(null);
      return;
    }
    v = Math.max(min, Math.min(max, v));
    onChange(v);
    setDraft(null);
  }, [draft, value, min, max, onChange]);

  const bump = (delta: number) => {
    setDraft(null);
    onChange(Math.max(min, Math.min(max, value + delta)));
  };

  const isDrawer = variant === "drawer";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={
          isDrawer
            ? "flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] bg-white"
            : "btn-qty"
        }
        onClick={() => bump(-1)}
        aria-label={decAriaLabel}
      >
        {isDrawer ? <Minus className="h-4 w-4" /> : "−"}
      </button>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={(e) => {
          const s = e.target.value;
          if (s === "" || /^\d+$/.test(s)) setDraft(s);
        }}
        onFocus={() =>
          setDraft((d) => (d === null ? String(value) : d))
        }
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={
          isDrawer
            ? "h-11 min-w-[2.75rem] w-14 rounded-lg border border-[var(--border)] bg-white text-center text-sm font-semibold tabular-nums"
            : "h-9 min-w-[2.25rem] w-11 rounded-md border border-[var(--border)] bg-white text-center text-sm font-bold tabular-nums"
        }
        aria-label={inputAriaLabel}
      />
      <button
        type="button"
        className={
          isDrawer
            ? "flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] bg-white"
            : "btn-qty"
        }
        onClick={() => bump(1)}
        aria-label={incAriaLabel}
      >
        {isDrawer ? <Plus className="h-4 w-4" /> : "+"}
      </button>
    </div>
  );
}
