import type { CartLine } from "@/lib/cart-types";
import { cartLineQualifiesForDipAddon } from "@/lib/extra-dip-sauce";

/** Party tray: included dip cups (approximate; shown in cart only). */
const ADOBO_PARTY_INCLUDED_DIPS_PER_TRAY = 8;

/**
 * Cart subtitle: reflects how much the buyer is ordering (e.g. per dozen → N dozen).
 * Avoids duplicating Cooked/Frozen when already present in the menu size label.
 */
export function cartLineBriefSizeDescription(line: CartLine): string {
  const q = Math.max(1, Math.floor(line.quantity));
  let out = line.sizeLabel.trim();

  if (/per dozen/i.test(out)) {
    out = out.replace(/\bper dozen\b/gi, `${q} dozen`);
  }

  if (line.menuItemId === "seed-7" || /\b10\s*pcs\b/i.test(out)) {
    out = out.replace(/\bPer\s*10\s*pcs\b/gi, `${q * 10} pcs`);
    out = out.replace(/\bper\s*10\s*pcs\b/gi, `${q * 10} pcs`);
  }

  const hasCfWord = /\b(Cooked|Frozen)\b/i.test(out);
  const want =
    line.cookedOrFrozen === "cooked"
      ? "Cooked"
      : line.cookedOrFrozen === "frozen"
        ? "Frozen"
        : "";
  if (want && !hasCfWord) {
    out = `${want} · ${out}`;
  }

  return out;
}

/** Short included-dip line for cart: count only, same tone as brief description. */
export function includedDippingSauceCountLine(line: CartLine): string | null {
  if (!cartLineQualifiesForDipAddon(line)) return null;
  const id = line.menuItemId;
  const q = Math.max(1, Math.floor(line.quantity));

  if (id === "seed-1" || id === "seed-2" || id === "seed-3") {
    const n = 2 * q;
    return `${n} dipping sauce${n === 1 ? "" : "s"} included`;
  }
  if (id === "seed-7") {
    const n = 2 * q;
    return `${n} dipping sauce${n === 1 ? "" : "s"} included`;
  }
  if ((id === "seed-8" || id === "seed-9") && line.sizeKey === "plate") {
    return `${q} dipping sauce${q === 1 ? "" : "s"} included`;
  }
  if (id === "seed-12") {
    if (line.sizeKey === "party") {
      const n = ADOBO_PARTY_INCLUDED_DIPS_PER_TRAY * q;
      return `${n} dipping sauce${n === 1 ? "" : "s"} included`;
    }
    return `${q} dipping sauce${q === 1 ? "" : "s"} included`;
  }
  return null;
}
