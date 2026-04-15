"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MenuItemDTO } from "@/lib/menu-types";
import { useCart } from "@/components/cart/CartContext";
import { MenuPhotoComingSoonOverlay } from "@/components/menu/MenuPhotoComingSoonOverlay";

function shortLabel(v: MenuItemDTO): string {
  const t = v.variantShortLabel?.trim();
  if (t) return t;
  const m = v.name.match(/:\s*(.+)$/);
  return (m?.[1] ?? v.name).trim();
}

function resolveTocinoVariant(
  list: MenuItemDTO[],
  meat: "pork" | "chicken",
  style: "plate" | "frozen"
): MenuItemDTO | undefined {
  return list.find((v) => {
    const lbl = (v.variantShortLabel ?? "").toLowerCase();
    if (meat === "pork" && lbl !== "pork") return false;
    if (meat === "chicken" && lbl !== "chicken") return false;
    if (style === "frozen") return Boolean(v.hasFrozen);
    return Boolean(v.hasCooked) && !v.hasFrozen;
  });
}

function firstTocinoDefaults(list: MenuItemDTO[]): {
  meat: "pork" | "chicken";
  style: "plate" | "frozen";
} {
  const first = list.find((v) => !v.soldOut) ?? list[0];
  const lbl = (first?.variantShortLabel ?? "").toLowerCase();
  return {
    meat: lbl === "chicken" ? "chicken" : "pork",
    style: first?.hasFrozen ? "frozen" : "plate",
  };
}

export function GroupedMenuCard({ variants }: { variants: MenuItemDTO[] }) {
  const { addLine } = useCart();
  const sorted = useMemo(
    () => [...variants].sort((a, b) => a.sortOrder - b.sortOrder),
    [variants]
  );

  const isTocinoUnified = sorted[0]?.variantGroup === "tocino";

  const [variantId, setVariantId] = useState(() => {
    const ok = variants.find((v) => !v.soldOut);
    return (ok ?? variants[0])?.id ?? "";
  });

  const [tocinoMeat, setTocinoMeat] = useState<"pork" | "chicken">(() =>
    variants[0]?.variantGroup === "tocino"
      ? firstTocinoDefaults(variants).meat
      : "pork"
  );
  const [tocinoStyle, setTocinoStyle] = useState<"plate" | "frozen">(() =>
    variants[0]?.variantGroup === "tocino"
      ? firstTocinoDefaults(variants).style
      : "plate"
  );

  useEffect(() => {
    if (sorted[0]?.variantGroup === "tocino") return;
    const v = sorted.find((x) => x.id === variantId);
    if (v && !v.soldOut) return;
    const next = sorted.find((x) => !x.soldOut) ?? sorted[0];
    const nid = next?.id ?? "";
    if (nid && nid !== variantId) setVariantId(nid);
  }, [sorted, variantId]);

  useEffect(() => {
    if (sorted[0]?.variantGroup !== "tocino") return;
    const r = resolveTocinoVariant(sorted, tocinoMeat, tocinoStyle);
    if (r && !r.soldOut) return;

    const altStyle: "plate" | "frozen" =
      tocinoStyle === "plate" ? "frozen" : "plate";
    const rAlt = resolveTocinoVariant(sorted, tocinoMeat, altStyle);
    if (rAlt && !rAlt.soldOut) {
      setTocinoStyle(altStyle);
      return;
    }

    const otherMeat: "pork" | "chicken" =
      tocinoMeat === "pork" ? "chicken" : "pork";
    for (const st of ["plate", "frozen"] as const) {
      const row = resolveTocinoVariant(sorted, otherMeat, st);
      if (row && !row.soldOut) {
        setTocinoMeat(otherMeat);
        setTocinoStyle(st);
        return;
      }
    }

    const f = sorted.find((x) => !x.soldOut);
    if (!f) return;
    const { meat, style } = firstTocinoDefaults(sorted);
    if (meat !== tocinoMeat) setTocinoMeat(meat);
    if (style !== tocinoStyle) setTocinoStyle(style);
  }, [sorted, tocinoMeat, tocinoStyle]);

  const variant = useMemo(() => {
    if (!sorted.length) return undefined;
    if (sorted[0]?.variantGroup === "tocino") {
      const r = resolveTocinoVariant(sorted, tocinoMeat, tocinoStyle);
      if (r && !r.soldOut) return r;
      return sorted.find((x) => !x.soldOut) ?? sorted[0];
    }
    return sorted.find((v) => v.id === variantId) ?? sorted[0];
  }, [sorted, tocinoMeat, tocinoStyle, variantId]);

  const cookedFrozenPick = Boolean(variant?.hasCooked && variant?.hasFrozen);
  const isLumpiaGroup = variant?.variantGroup === "lumpia";

  const [cookedOrFrozen, setCookedOrFrozen] = useState<"cooked" | "frozen">(
    "cooked"
  );
  const [sizeKey, setSizeKey] = useState(variant?.sizes[0]?.key ?? "default");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!variant) return;
    setCookedOrFrozen("cooked");
    setSizeKey(variant.sizes[0]?.key ?? "default");
  }, [variant]);

  const selectedSize = useMemo(() => {
    if (!variant) return undefined;
    if (cookedFrozenPick) {
      return (
        variant.sizes.find((s) => s.key === cookedOrFrozen) ?? variant.sizes[0]
      );
    }
    return variant.sizes.find((s) => s.key === sizeKey) ?? variant.sizes[0];
  }, [variant, cookedFrozenPick, cookedOrFrozen, sizeKey]);

  const title =
    variant?.groupCardTitle?.trim() || variant?.category || "Menu item";

  const groupBlurb = variant?.groupServingBlurb?.trim() ?? null;
  const photoUrl = sorted[0]?.photoUrl ?? "";
  const allSoldOut = sorted.length > 0 && sorted.every((v) => v.soldOut);

  const unitPrice = Number(selectedSize?.price ?? variant?.basePrice ?? 0);
  const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
  const disabled =
    !variant ||
    !variant.isActive ||
    variant.soldOut ||
    !selectedSize ||
    !Number.isFinite(unitPrice);

  const handleAdd = () => {
    if (disabled || !variant || !selectedSize) return;
    addLine({
      menuItemId: variant.id,
      name: variant.name,
      photoUrl: variant.photoUrl,
      quantity: qty,
      unitPrice: safeUnitPrice,
      sizeKey: selectedSize.key,
      sizeLabel: selectedSize.label,
      cookedOrFrozen: cookedFrozenPick ? cookedOrFrozen : undefined,
    });
    setQty(1);
  };

  if (!variant) return null;

  const meatCap =
    tocinoMeat === "chicken" ? "Chicken" : "Pork";
  const selectionSummary = isTocinoUnified
    ? `${meatCap} · ${selectedSize?.label ?? ""}`.replace(/\s·\s$/, "")
    : `${shortLabel(variant)} · ${selectedSize?.label ?? ""}`.replace(
        /\s·\s$/,
        ""
      );

  const servingDetail =
    cookedFrozenPick && isLumpiaGroup
      ? "12 lumpia (1 dozen) per order at the price shown."
      : isTocinoUnified
        ? tocinoStyle === "plate"
          ? "Ready-made plate with egg, rice, cucumber, tomato, garlic crisps, and dipping sauce."
          : "12 oz frozen marinated pack in a sealed bag — cook at home."
        : "";

  const groupKey = variant.variantGroup ?? "group";

  const tocinoMeatDisabled = (meat: "pork" | "chicken") => {
    const plate = resolveTocinoVariant(sorted, meat, "plate");
    const frozen = resolveTocinoVariant(sorted, meat, "frozen");
    const pOk = plate && !plate.soldOut;
    const fOk = frozen && !frozen.soldOut;
    return !pOk && !fOk;
  };

  const tocinoStyleDisabled = (style: "plate" | "frozen") => {
    const row = resolveTocinoVariant(sorted, tocinoMeat, style);
    return !row || row.soldOut;
  };

  return (
    <article className="card-elevated group flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--bg-section)]">
        <Image
          src={photoUrl}
          alt=""
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width:768px) 100vw, 33vw"
        />
        <MenuPhotoComingSoonOverlay />
        {allSoldOut ? (
          <span className="pointer-events-none absolute left-3 top-3 z-[2] rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold text-white">
            Sold Out
          </span>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex min-h-0 flex-1 flex-col">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text)]">
            {title}
          </h3>
          <p className="text-sm text-[var(--text-muted)]">{variant.calories}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
            {variant.description}
          </p>

          <div className="mt-3 rounded-lg border border-[var(--gold)]/45 bg-[var(--gold)]/12 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
              Your selection
            </p>
            <p className="mt-1 font-semibold leading-snug text-[var(--text)]">
              {selectionSummary}
            </p>
            {servingDetail ? (
              <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">
                {servingDetail}
              </p>
            ) : null}
            <p className="mt-2 text-xl font-bold text-[var(--primary)]">
              ${safeUnitPrice.toFixed(2)}
              {qty > 1 ? (
                <span className="ml-2 text-sm font-semibold text-[var(--text-muted)]">
                  × {qty} = ${(safeUnitPrice * qty).toFixed(2)}
                </span>
              ) : null}
            </p>
          </div>

          {groupBlurb ? (
            <p className="mt-2 text-xs leading-snug text-[var(--text-muted)]">
              {groupBlurb}
            </p>
          ) : null}

          {isTocinoUnified ? (
            <>
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                  Meat
                </p>
                <div className="flex flex-wrap gap-3">
                  {(["pork", "chicken"] as const).map((m) => (
                    <label
                      key={m}
                      className={`flex cursor-pointer items-center gap-2 text-sm capitalize ${
                        tocinoMeatDisabled(m)
                          ? "cursor-not-allowed opacity-50"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`tocino-meat-${groupKey}`}
                        checked={tocinoMeat === m}
                        disabled={tocinoMeatDisabled(m)}
                        onChange={() => setTocinoMeat(m)}
                      />
                      {m}
                      {tocinoMeatDisabled(m) ? (
                        <span className="text-[10px] font-bold text-[var(--accent)]">
                          (out)
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                  Plate or frozen pack
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
                  <label
                    className={`flex cursor-pointer items-center gap-2 text-sm ${
                      tocinoStyleDisabled("plate")
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name={`tocino-style-${groupKey}`}
                      checked={tocinoStyle === "plate"}
                      disabled={tocinoStyleDisabled("plate")}
                      onChange={() => setTocinoStyle("plate")}
                    />
                    Ready-made plate (with egg &amp; rice)
                    {tocinoStyleDisabled("plate") ? (
                      <span className="text-[10px] font-bold text-[var(--accent)]">
                        (out)
                      </span>
                    ) : null}
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-2 text-sm ${
                      tocinoStyleDisabled("frozen")
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name={`tocino-style-${groupKey}`}
                      checked={tocinoStyle === "frozen"}
                      disabled={tocinoStyleDisabled("frozen")}
                      onChange={() => setTocinoStyle("frozen")}
                    />
                    Frozen 12 oz (cook at home)
                    {tocinoStyleDisabled("frozen") ? (
                      <span className="text-[10px] font-bold text-[var(--accent)]">
                        (out)
                      </span>
                    ) : null}
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                  {variant.variantGroup === "lumpia" ? "Protein" : "Option"}
                </p>
                <div className="flex flex-wrap gap-3">
                  {sorted.map((v) => (
                    <label
                      key={v.id}
                      className={`flex cursor-pointer items-center gap-2 text-sm ${
                        v.soldOut ? "cursor-not-allowed opacity-50" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`protein-${groupKey}`}
                        checked={variantId === v.id}
                        disabled={v.soldOut}
                        onChange={() => setVariantId(v.id)}
                      />
                      {shortLabel(v)}
                      {v.soldOut ? (
                        <span className="text-[10px] font-bold text-[var(--accent)]">
                          (out)
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>
              </div>

              {cookedFrozenPick ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                    Cooked or frozen
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`cf-${groupKey}`}
                        checked={cookedOrFrozen === "cooked"}
                        onChange={() => setCookedOrFrozen("cooked")}
                      />
                      Cooked
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`cf-${groupKey}`}
                        checked={cookedOrFrozen === "frozen"}
                        onChange={() => setCookedOrFrozen("frozen")}
                      />
                      Frozen
                    </label>
                  </div>
                </div>
              ) : !cookedFrozenPick && variant.sizes.length > 1 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                    Size
                  </p>
                  <div className="flex flex-col gap-2">
                    {variant.sizes.map((s) => (
                      <label
                        key={s.key}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="radio"
                          name={`sz-${groupKey}`}
                          checked={sizeKey === s.key}
                          onChange={() => setSizeKey(s.key)}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
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

          <button
            type="button"
            disabled={disabled}
            onClick={handleAdd}
            className="btn btn-primary btn-sm btn-block mt-4"
          >
            Add to Cart
          </button>
          <Link
            href={`/contact?subject=inquiry&item=${encodeURIComponent(variant.name)}`}
            className="mt-2 block text-center text-sm font-medium text-[var(--primary)] underline decoration-[var(--primary)]/30 underline-offset-4 transition hover:decoration-[var(--primary)]"
          >
            💬 Ask About This Dish
          </Link>
        </div>
      </div>
    </article>
  );
}
