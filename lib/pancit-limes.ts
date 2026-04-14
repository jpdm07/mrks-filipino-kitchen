/**
 * Internal lime cost assumption — baked into pancit list prices & default sample price.
 * Not shown to customers; cart/Sheets use the totals only.
 */

export const PANCIT_LIME_COST_USD = 0.3;

/** Small / individual tray (1 serving): 1 lime. */
export const PANCIT_LIMES_SMALL_TRAY = 1;

/**
 * Party tray (8–10 servings): 5 limes ≈ 1 lime per 2 servings (4–5 for 8–10; we use 5).
 */
export const PANCIT_LIMES_PARTY_TRAY = 5;

/** Sample add-on (1 container): treat like small → 1 lime. */
export const PANCIT_SAMPLE_LIMES = 1;

/** Food-only default for sample before lime; Admin → Pricing can override total. */
export const PANCIT_SAMPLE_FOOD_USD_DEFAULT = 6;

export const PANCIT_SAMPLE_PRICE_DEFAULT_USD =
  PANCIT_SAMPLE_FOOD_USD_DEFAULT +
  PANCIT_LIME_COST_USD * PANCIT_SAMPLE_LIMES;
