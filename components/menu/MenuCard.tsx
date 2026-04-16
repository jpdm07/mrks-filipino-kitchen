"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MenuItemDTO } from "@/lib/menu-types";
import { useCart } from "@/components/cart/CartContext";
import { MenuPhotoComingSoonOverlay } from "@/components/menu/MenuPhotoComingSoonOverlay";
import { splitMenuTakeoutLine } from "@/lib/menu-takeout-description-split";
import { FlanWeekStockNote } from "@/components/menu/FlanWeekStockNote";

export function MenuCard({ item }: { item: MenuItemDTO }) {
  const { addLine } = useCart();
  const lumpia = item.hasCooked && item.hasFrozen;
  const [cookedOrFrozen, setCookedOrFrozen] = useState<"cooked" | "frozen">(
    "cooked"
  );

  const sizeKeys = item.sizes.map((s) => s.key);
  const defaultKey = sizeKeys[0] ?? "default";
  const [sizeKey, setSizeKey] = useState(defaultKey);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.hash.replace(/^#/, "");
    const hm = /^menu-item-(.+)$/.exec(raw);
    if (!hm?.[1]) return;
    const targetId = decodeURIComponent(hm[1]);
    if (targetId !== item.id) return;
    const params = new URLSearchParams(window.location.search);
    const co = params.get("co");
    if (lumpia && (co === "cooked" || co === "frozen")) {
      setCookedOrFrozen(co);
    }
    const sk = params.get("sk");
    if (sk && item.sizes.some((s) => s.key === sk)) {
      setSizeKey(sk);
    }
    const id = window.requestAnimationFrame(() => {
      document.getElementById(`menu-item-${item.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [item.id, lumpia]);

  const selectedSize = useMemo(() => {
    if (lumpia) {
      return (
        item.sizes.find((s) => s.key === cookedOrFrozen) ?? item.sizes[0]
      );
    }
    return item.sizes.find((s) => s.key === sizeKey) ?? item.sizes[0];
  }, [item.sizes, lumpia, cookedOrFrozen, sizeKey]);

  const unitPrice = Number(selectedSize?.price ?? item.basePrice);
  const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
  const takeoutLineSplit = useMemo(
    () => splitMenuTakeoutLine(item.description),
    [item.description]
  );
  const disabled =
    !item.isActive || item.soldOut || !Number.isFinite(unitPrice);

  const handleAdd = () => {
    if (disabled || !selectedSize) return;
    addLine({
      menuItemId: item.id,
      name: item.name,
      photoUrl: item.photoUrl,
      quantity: qty,
      unitPrice: safeUnitPrice,
      sizeKey: selectedSize.key,
      sizeLabel: selectedSize.label,
      cookedOrFrozen: lumpia ? cookedOrFrozen : undefined,
    });
    setQty(1);
  };

  return (
    <article
      id={`menu-item-${item.id}`}
      className="card-elevated group flex h-full min-h-0 scroll-mt-24 flex-col overflow-hidden"
    >
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--bg-section)]">
        <Image
          src={item.photoUrl}
          alt=""
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width:768px) 100vw, 33vw"
        />
        <MenuPhotoComingSoonOverlay />
        {item.soldOut ? (
          <span className="pointer-events-none absolute left-3 top-3 z-[2] rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold text-white">
            Sold Out
          </span>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex min-h-0 flex-1 flex-col">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text)]">
            {item.name}
          </h3>
          <p className="text-sm text-[var(--text-muted)]">{item.calories}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
            {takeoutLineSplit.dipNote
              ? [takeoutLineSplit.lead, takeoutLineSplit.dipNote]
                  .filter(Boolean)
                  .join(" ")
              : item.description}
          </p>
          {item.id === "seed-6" ? <FlanWeekStockNote /> : null}

          {lumpia ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                Cooked or Frozen
              </p>
              <div className="flex flex-wrap gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`cf-${item.id}`}
                    checked={cookedOrFrozen === "cooked"}
                    onChange={() => setCookedOrFrozen("cooked")}
                  />
                  Cooked
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`cf-${item.id}`}
                    checked={cookedOrFrozen === "frozen"}
                    onChange={() => setCookedOrFrozen("frozen")}
                  />
                  Frozen
                </label>
              </div>
            </div>
          ) : item.sizes.length > 1 ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                Size
              </p>
              <div className="flex flex-col gap-2">
                {item.sizes.map((s) => (
                  <label
                    key={s.key}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name={`sz-${item.id}`}
                      checked={sizeKey === s.key}
                      onChange={() => setSizeKey(s.key)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex flex-col border-t border-[var(--border)]/60 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-qty"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button
              type="button"
              className="btn-qty"
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <p className="mt-3 text-xl font-bold text-[var(--primary)]">
            ${safeUnitPrice.toFixed(2)}
          </p>

          <button
            type="button"
            disabled={disabled}
            onClick={handleAdd}
            className="btn btn-primary btn-sm btn-block mt-4"
          >
            Add to Cart
          </button>
          <Link
            href={`/contact?subject=inquiry&item=${encodeURIComponent(item.name)}`}
            className="mt-2 block text-center text-sm font-medium text-[var(--primary)] underline decoration-[var(--primary)]/30 underline-offset-4 transition hover:decoration-[var(--primary)]"
          >
            💬 Ask About This Dish
          </Link>
        </div>
      </div>
    </article>
  );
}
