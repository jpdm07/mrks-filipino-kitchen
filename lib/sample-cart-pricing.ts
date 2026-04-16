import { MENU_CATALOG } from "@/lib/menu-catalog";
import { FLAN_RETAIL_PER_RAMEKIN_USD } from "@/lib/flan-cost-model";
import { LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN } from "@/lib/lumpia-cost-model";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Sample line unit prices aligned with current `MENU_CATALOG` retail (and lumpia model for 4-pc).
 * Used for cart defaults, `/api/pricing` fallbacks, and static fallback when DB is unavailable.
 */
export function sampleCartPricesFromMenuCatalog(): {
  lumpia: typeof LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN;
  quail: number;
  flan: number;
  pancit: number;
} {
  const quailRow = MENU_CATALOG.find((m) => m.id === "seed-7");
  const quail10 = Number(
    quailRow?.sizes.find((s) => s.key === "10pc")?.price ??
      quailRow?.sizes[0]?.price ??
      quailRow?.basePrice ??
      7.99
  );
  const quailSample = round2((quail10 / 10) * 3);

  const chRow = MENU_CATALOG.find((m) => m.id === "seed-4");
  const shRow = MENU_CATALOG.find((m) => m.id === "seed-5");
  const chSmall = Number(
    chRow?.sizes.find((s) => s.key === "small")?.price ?? chRow?.basePrice
  );
  const shSmall = Number(
    shRow?.sizes.find((s) => s.key === "small")?.price ?? shRow?.basePrice
  );
  const chOk = Number.isFinite(chSmall);
  const shOk = Number.isFinite(shSmall);
  const pancitSample = round2(
    chOk && shOk ? Math.min(chSmall, shSmall) : chOk ? chSmall : shOk ? shSmall : 10.99
  );

  return {
    lumpia: { ...LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN },
    quail: quailSample,
    flan: FLAN_RETAIL_PER_RAMEKIN_USD,
    pancit: pancitSample,
  };
}
