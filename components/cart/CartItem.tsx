"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartLine } from "@/lib/cart-types";
import { includedDippingSauceCartLine } from "@/lib/extra-dip-sauce";

export function CartItemRow({
  line,
  onQty,
  onRemove,
  onNavigateToMenu,
}: {
  line: CartLine;
  onQty: (qty: number) => void;
  onRemove: () => void;
  /** Close drawer before following link to menu (optional). */
  onNavigateToMenu?: () => void;
}) {
  const sub = line.unitPrice * line.quantity;
  const variant =
    line.cookedOrFrozen === "cooked"
      ? "Cooked"
      : line.cookedOrFrozen === "frozen"
        ? "Frozen"
        : "";
  const dipLine = includedDippingSauceCartLine(line);
  const qs = new URLSearchParams();
  if (line.cookedOrFrozen === "cooked" || line.cookedOrFrozen === "frozen") {
    qs.set("co", line.cookedOrFrozen);
  }
  if (line.sizeKey && line.sizeKey !== "default") {
    qs.set("sk", line.sizeKey);
  }
  const qstr = qs.toString();
  const menuHref = `/menu${qstr ? `?${qstr}` : ""}#menu-item-${encodeURIComponent(line.menuItemId)}`;

  return (
    <div className="flex gap-3 border-b border-[var(--border)] py-4 last:border-0">
      <Link
        href={menuHref}
        scroll
        onClick={() => onNavigateToMenu?.()}
        className="flex min-w-0 flex-1 gap-3 rounded-lg py-0.5 outline-none ring-[var(--primary)]/40 transition-colors hover:bg-[var(--primary)]/[0.04] focus-visible:ring-2"
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--bg-section)]">
          <Image
            src={line.photoUrl}
            alt=""
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-semibold text-[var(--text)]">{line.name}</p>
          <p className="text-sm text-[var(--text-muted)]">
            {line.sizeLabel}
            {variant ? ` · ${variant}` : ""}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">
            Qty {line.quantity}
          </p>
          {dipLine ? (
            <p className="mt-0.5 text-xs font-medium text-[var(--primary)]">
              {dipLine}
            </p>
          ) : null}
        </div>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex items-center gap-2">
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
            aria-label="Quantity"
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
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--accent)]"
            aria-label="Remove item"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
        <div className="text-right">
          <p className="font-bold text-[var(--primary)]">${sub.toFixed(2)}</p>
          <p className="text-xs text-[var(--text-muted)]">
            @${line.unitPrice.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
