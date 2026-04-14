"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartLine } from "@/lib/cart-types";

export function CartItemRow({
  line,
  onQty,
  onRemove,
}: {
  line: CartLine;
  onQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const sub = line.unitPrice * line.quantity;
  const variant =
    line.cookedOrFrozen === "cooked"
      ? "Cooked"
      : line.cookedOrFrozen === "frozen"
        ? "Frozen"
        : "";

  return (
    <div className="flex gap-3 border-b border-[var(--border)] py-4 last:border-0">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--bg-section)]">
        <Image
          src={line.photoUrl}
          alt=""
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--text)]">{line.name}</p>
        <p className="text-sm text-[var(--text-muted)]">
          {line.sizeLabel}
          {variant ? ` · ${variant}` : ""}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] bg-white"
            onClick={() => onQty(line.quantity - 1)}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            className="h-11 w-12 rounded-lg border border-[var(--border)] text-center text-sm font-semibold"
            value={line.quantity}
            inputMode="numeric"
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) onQty(v);
            }}
          />
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] bg-white"
            onClick={() => onQty(line.quantity + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-[var(--accent)]"
            aria-label="Remove item"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-bold text-[var(--primary)]">${sub.toFixed(2)}</p>
        <p className="text-xs text-[var(--text-muted)]">
          @${line.unitPrice.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
