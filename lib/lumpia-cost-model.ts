/**
 * Lumpia COGS model — ~50 lumpia per batch (one protein per batch).
 *
 * Filling (no cabbage in this kitchen’s lumpia — cabbage is not included in COGS below).
 * Ingredient inputs (your store prices, prorated where needed):
 * - Carrots: $2.59/bag, 1 cup (assumed ~2.25 cups/bag shredded → ~$1.15)
 * - Celery: $1.99/bunch, ½ cup (~3 cups usable → ~$0.33)
 * - Red onion: $1.50 each, ½ cup (~1.25 cups/onion → ~$0.60)
 * - Garlic: 3 cloves (treated as prorated from a head; not $0.60/clove)
 * - Eggs: $3.50/18 ct, 3 eggs → ~$0.58
 * - Soy sauce: $2 Kroger bottle, ¼ cup (assumed ~15 fl oz bottle → ~$0.27)
 * - Magic Sarap: 1 tsp per 50 ct (~5.29 oz shaker often ~$4.39 at Kroger/Instacart → ~$0.15/batch)
 * - Ground beef: 1 lb @ mid of $5.99–$6.50 → $6.245
 * - Ground pork: 1 lb @ **low** of your $3.99–$4.99 range → $3.99 (modeled “typical sale” buy)
 * - Ground turkey: 1 lb @ **high** of your $3.99–$4.99 range → $4.99 (often tracks higher on shelf)
 *
 * Not on your list but required for realism:
 * - Spring-roll wrappers for 50 (~$3.50/batch — adjust if your pack price differs)
 * - Deep-fry vegetable oil, amortized (~$1.00/batch for cooked line only)
 *
 * Labor: imputed batch time is still ~2 hr per 50 ct; the **hourly rate is lowered** here so
 * loaded COGS stay realistic vs. competitive local dozen pricing (ingredient + wrapper + oil
 * lines are unchanged).
 *
 * Google Sheets: `syncOrderToSheets` sends structured line items (`name`, `size`, `quantity`,
 * `unitPrice`, `lineTotal`, …) from the order payload (`lib/sheets.ts`). Keep retail prices in
 * `MENU_CATALOG` in sync with this
 * model so new orders match your sheet rows.
 *
 * Houston / Cypress area retail comps (published menus; verify before each price change):
 * - Roll Out Lumpia (TX home seller): original pork/beef dozen frozen $20, dozen fried $23
 *   https://www.rolloutlumpia.com/flavors-and-pricing
 * - Henry’s Lumpia (menu reference): 8 pc $12 → ~$18/dozen equivalent
 * - The Lumpia Chef (online): 12 pc $16; 50 pc $55 (~$13.20/dozen at bulk)
 * Cypress-specific storefront menus with public lumpia pricing are sparse (e.g. Ayie’s Yelp listing
 * shows closed). Roll Out lists one price for all “original” proteins; here retail **differs by meat**
 * (beef highest; pork and turkey share the same dozen price).
 */

export const LUMPIA_BATCH_COUNT = 50;

/** Per-batch ingredient + labor subtotals (USD), before retail markup. */
export const LUMPIA_BATCH_COGS_USD = {
  /** Veggies + egg + soy + garlic + Magic Sarap 1 tsp/50 ct (shared across proteins). */
  /** Onion, garlic, carrots, soy, egg, Magic Sarap — cabbage not used in this kitchen's lumpia. */
  vegPantry: 3.11,
  wrappers50: 3.5,
  fryOilPerBatchCooked: 1.0,
  /** 2 hr × $7.50/hr imputed — tuned with retail so Sheets margin math stays sane vs. area comps. */
  laborPerBatch: 15,
  beefPerLb: 6.245,
  porkPerLb: 3.99,
  turkeyPerLb: 4.99,
} as const;

function batchCogsCooked(meat: number) {
  const b = LUMPIA_BATCH_COGS_USD;
  return b.vegPantry + meat + b.wrappers50 + b.fryOilPerBatchCooked + b.laborPerBatch;
}

function batchCogsFrozen(meat: number) {
  const b = LUMPIA_BATCH_COGS_USD;
  return b.vegPantry + meat + b.wrappers50 + b.laborPerBatch;
}

function dozenFromBatch(batchTotal: number) {
  return (batchTotal * 12) / LUMPIA_BATCH_COUNT;
}

/** Approximate fully-loaded COGS per dozen (for your own margin math). */
export const LUMPIA_DOZEN_COGS_USD = {
  beef: {
    cooked: dozenFromBatch(batchCogsCooked(LUMPIA_BATCH_COGS_USD.beefPerLb)),
    frozen: dozenFromBatch(batchCogsFrozen(LUMPIA_BATCH_COGS_USD.beefPerLb)),
  },
  pork: {
    cooked: dozenFromBatch(batchCogsCooked(LUMPIA_BATCH_COGS_USD.porkPerLb)),
    frozen: dozenFromBatch(batchCogsFrozen(LUMPIA_BATCH_COGS_USD.porkPerLb)),
  },
  turkey: {
    cooked: dozenFromBatch(batchCogsCooked(LUMPIA_BATCH_COGS_USD.turkeyPerLb)),
    frozen: dozenFromBatch(batchCogsFrozen(LUMPIA_BATCH_COGS_USD.turkeyPerLb)),
  },
} as const;

/** Published competitor retail (dozen) — sanity-check your list price, not their COGS. */
export const LUMPIA_COMPETITOR_RETAIL_DOZEN_USD = {
  rollOutOriginalFrozen: 20,
  rollOutOriginalFried: 23,
} as const;

function ingredientBatchCooked(meat: number) {
  const b = LUMPIA_BATCH_COGS_USD;
  return b.vegPantry + meat + b.wrappers50 + b.fryOilPerBatchCooked;
}

function ingredientBatchFrozen(meat: number) {
  const b = LUMPIA_BATCH_COGS_USD;
  return b.vegPantry + meat + b.wrappers50;
}

/** Per-dozen ingredient + wrap + oil only (no imputed labor) — compare to ~$8–10/dozen grocery frozen. */
export const LUMPIA_DOZEN_INGREDIENTS_ONLY_USD = {
  beef: {
    cooked: dozenFromBatch(ingredientBatchCooked(LUMPIA_BATCH_COGS_USD.beefPerLb)),
    frozen: dozenFromBatch(ingredientBatchFrozen(LUMPIA_BATCH_COGS_USD.beefPerLb)),
  },
  pork: {
    cooked: dozenFromBatch(ingredientBatchCooked(LUMPIA_BATCH_COGS_USD.porkPerLb)),
    frozen: dozenFromBatch(ingredientBatchFrozen(LUMPIA_BATCH_COGS_USD.porkPerLb)),
  },
  turkey: {
    cooked: dozenFromBatch(ingredientBatchCooked(LUMPIA_BATCH_COGS_USD.turkeyPerLb)),
    frozen: dozenFromBatch(ingredientBatchFrozen(LUMPIA_BATCH_COGS_USD.turkeyPerLb)),
  },
} as const;

/**
 * Menu list prices (per dozen). Beef priced above pork & turkey; pork and turkey share the same dozen.
 * Cooked and frozen use the same list price; frozen still has lower modeled COGS (no fry oil).
 */
export const LUMPIA_RETAIL_USD = {
  beef: { cookedDozen: 14.99, frozenDozen: 14.99 },
  pork: { cookedDozen: 12.99, frozenDozen: 12.99 },
  turkey: { cookedDozen: 12.99, frozenDozen: 12.99 },
} as const;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type LumpiaSampleProtein = keyof typeof LUMPIA_RETAIL_USD;

/** 4-pc sample ≈ ⅓ dozen at that protein’s cooked dozen rate (beef vs pork/turkey). */
export function lumpiaSample4pcRetailUsd(p: LumpiaSampleProtein): number {
  return round2((LUMPIA_RETAIL_USD[p].cookedDozen * 4) / 12);
}

export const LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN = {
  beef: lumpiaSample4pcRetailUsd("beef"),
  pork: lumpiaSample4pcRetailUsd("pork"),
  turkey: lumpiaSample4pcRetailUsd("turkey"),
} as const;

/**
 * Legacy single default (pork dozen basis). Public cart uses `LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN`.
 * `PricingSettings.sampleLumpia` in DB may still store this for older tooling.
 */
export const LUMPIA_SAMPLE_4PC_RETAIL_USD =
  LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN.pork;

const laborPerDozen = (LUMPIA_BATCH_COGS_USD.laborPerBatch * 12) / LUMPIA_BATCH_COUNT;

function lumpiaDozenEconomics(
  retail: number,
  cogsLoaded: number,
  ingredientsOnly: number
) {
  const marginProfitUsd = round2(retail - cogsLoaded);
  return {
    retail,
    cogsLoaded,
    ingredientsOnly,
    laborImputed: laborPerDozen,
    /** Same as `marginProfitUsd` — cash before rent, packaging, fees, etc. */
    contributionBeforeFixed: marginProfitUsd,
    marginProfitUsd,
    loadedCostPctOfRetail: round2((100 * cogsLoaded) / retail),
    /** Gross margin on the selling price: (retail − loaded COGS) ÷ retail. */
    marginProfitPctOfRetail: round2((100 * marginProfitUsd) / retail),
  };
}

/**
 * Per-dozen retail, loaded COGS, imputed labor slice, and margin (profit) in dollars and % of price.
 * `loadedCostPctOfRetail` = COGS ÷ retail. `marginProfitPctOfRetail` is the complement for gross margin on sales.
 */
export const LUMPIA_UNIT_ECONOMICS_PER_DOZEN = {
  beef: {
    cooked: lumpiaDozenEconomics(
      LUMPIA_RETAIL_USD.beef.cookedDozen,
      LUMPIA_DOZEN_COGS_USD.beef.cooked,
      LUMPIA_DOZEN_INGREDIENTS_ONLY_USD.beef.cooked
    ),
    frozen: lumpiaDozenEconomics(
      LUMPIA_RETAIL_USD.beef.frozenDozen,
      LUMPIA_DOZEN_COGS_USD.beef.frozen,
      LUMPIA_DOZEN_INGREDIENTS_ONLY_USD.beef.frozen
    ),
  },
  pork: {
    cooked: lumpiaDozenEconomics(
      LUMPIA_RETAIL_USD.pork.cookedDozen,
      LUMPIA_DOZEN_COGS_USD.pork.cooked,
      LUMPIA_DOZEN_INGREDIENTS_ONLY_USD.pork.cooked
    ),
    frozen: lumpiaDozenEconomics(
      LUMPIA_RETAIL_USD.pork.frozenDozen,
      LUMPIA_DOZEN_COGS_USD.pork.frozen,
      LUMPIA_DOZEN_INGREDIENTS_ONLY_USD.pork.frozen
    ),
  },
  turkey: {
    cooked: lumpiaDozenEconomics(
      LUMPIA_RETAIL_USD.turkey.cookedDozen,
      LUMPIA_DOZEN_COGS_USD.turkey.cooked,
      LUMPIA_DOZEN_INGREDIENTS_ONLY_USD.turkey.cooked
    ),
    frozen: lumpiaDozenEconomics(
      LUMPIA_RETAIL_USD.turkey.frozenDozen,
      LUMPIA_DOZEN_COGS_USD.turkey.frozen,
      LUMPIA_DOZEN_INGREDIENTS_ONLY_USD.turkey.frozen
    ),
  },
} as const;
