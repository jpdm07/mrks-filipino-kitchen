/**
 * Single source of truth for menu photos & retail prices.
 * New orders push line prices to Sheets (Items column). Admin menu saves also refresh the
 * **Menu prices** sheet via the same webhook — see `SHEETS_SCRIPT.md` + `syncMenuPricesToSheets`.
 * Lumpia retail is derived from `lumpia-cost-model.ts` (50-ct batch COGS + labor + oil).
 * Lumpia 4-pc sample prices: `LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN` (⅓ dozen per protein).
 * Tocino list prices from `tocino-cost-model.ts` (COGS for Sheets via `menu-item-unit-costs`).
 * Adobo list prices from `adobo-cost-model.ts`.
 * Flan retail is `FLAN_RETAIL_PER_RAMEKIN_USD` in `flan-cost-model.ts` (individual ramekin only).
 * Edit here first, then run: npx prisma db seed (or update rows in Admin → Menu Manager / DB).
 */

import { ADOBO_RETAIL_USD } from "./adobo-cost-model";
import { FLAN_RETAIL_PER_RAMEKIN_USD } from "./flan-cost-model";
import { LUMPIA_RETAIL_USD } from "./lumpia-cost-model";
import { TOCINO_RETAIL_USD } from "./tocino-cost-model";
import {
  PANCIT_LIME_COST_USD,
  PANCIT_LIMES_PARTY_TRAY,
} from "./pancit-limes";
import { HERO_FULLBLEED_IMAGE_SRC, OPEN_GRAPH_IMAGE_SRC } from "./site-visuals";

export {
  PANCIT_LIME_COST_USD,
  PANCIT_LIMES_PARTY_TRAY,
  PANCIT_LIMES_SMALL_TRAY,
} from "./pancit-limes";

/**
 * Your lumpia photos — add a JPEG at `public/images/lumpia.jpg` (hero, menu cards, social preview).
 * For .png or .webp, change the path here and the filename on disk.
 */
export const LUMPIA_IMAGE = "/images/lumpia.jpg";

/** Pancit — add `public/images/pancit.jpg`. */
export const PANCIT_IMAGE = "/images/pancit.jpg";

/** Breaded quail eggs — add `public/images/quail-eggs.jpg`. */
export const QUAIL_EGGS_IMAGE = "/images/quail-eggs.jpg";

/** Tocino plates — add `public/images/tocino.jpg`. */
export const TOCINO_IMAGE = "/images/tocino.jpg";

/** Caramel flan — add `public/images/flan.jpg`. */
export const FLAN_IMAGE = "/images/flan.jpg";

/** Chicken adobo — `public/images/chickenadobo.jpeg`. */
export const ADOBO_IMAGE = "/images/chickenadobo.jpeg";

/**
 * Home hero + social preview image. Default is `/images/sinigang.jpg`; override with
 * `NEXT_PUBLIC_HERO_FULLBLEED_IMAGE` in `.env.local` if needed.
 */
export const CATALOG_HERO_IMAGE = HERO_FULLBLEED_IMAGE_SRC;

/**
 * Open Graph / Twitter card (resolved with `metadataBase` in `app/layout.tsx`).
 * Override with `NEXT_PUBLIC_OG_IMAGE`; otherwise matches hero.
 */
export const CATALOG_OG_IMAGE = OPEN_GRAPH_IMAGE_SRC;

/**
 * Alternate hero (Unsplash). To use: point env or `HERO_FULLBLEED_IMAGE_SRC` in `site-visuals.ts`.
 */
export const CATALOG_HERO_IMAGE_PARADE =
  "https://images.unsplash.com/photo-1609051461156-8257e7852410?w=1600&auto=format&fit=crop";

export const CATALOG_OG_IMAGE_PARADE =
  "https://images.unsplash.com/photo-1609051461156-8257e7852410?w=1200&auto=format&fit=crop";

/**
 * Menu card photos — files under `public/images/` (see constants above).
 */
export const CATALOG_PHOTOS = {
  lumpia: LUMPIA_IMAGE,
  pancit: PANCIT_IMAGE,
  flan: FLAN_IMAGE,
  quail: QUAIL_EGGS_IMAGE,
  tocino: TOCINO_IMAGE,
  adobo: ADOBO_IMAGE,
} as const;

/**
 * Retail pricing (review periodically).
 */
export const MENU_CATALOG = [
  {
    id: "seed-1",
    name: "Lumpia: Beef",
    description:
      "Crispy golden rolls filled with seasoned ground beef, onion, garlic, carrots, soy sauce, salt, and pepper—the Filipino party favorite. Each order is one dozen; choose cooked and ready to eat, or frozen to fry whenever you like. 🥡 Comes with a dipping sauce.",
    category: "Sides",
    calories: "~240 cal/dozen cooked · ~180 cal/dozen frozen",
    basePrice: LUMPIA_RETAIL_USD.beef.cookedDozen,
    sizes: [
      {
        key: "cooked",
        label: "Cooked · per dozen",
        price: LUMPIA_RETAIL_USD.beef.cookedDozen,
      },
      {
        key: "frozen",
        label: "Frozen · per dozen",
        price: LUMPIA_RETAIL_USD.beef.frozenDozen,
      },
    ],
    photoUrl: CATALOG_PHOTOS.lumpia,
    hasCooked: true,
    hasFrozen: true,
    sortOrder: 1,
    variantGroup: "lumpia",
    variantShortLabel: "Beef",
    groupCardTitle: "Lumpia",
  },
  {
    id: "seed-2",
    name: "Lumpia: Pork",
    description:
      "Traditional pork lumpia Shanghai with a savory blend of ground pork, onion, garlic, carrots, soy sauce, salt, and pepper. One dozen per order, with your pick of cooked or frozen. 🥡 Comes with a dipping sauce.",
    category: "Sides",
    calories: "~260 cal/dozen cooked · ~190 cal/dozen frozen",
    basePrice: LUMPIA_RETAIL_USD.pork.cookedDozen,
    sizes: [
      {
        key: "cooked",
        label: "Cooked · per dozen",
        price: LUMPIA_RETAIL_USD.pork.cookedDozen,
      },
      {
        key: "frozen",
        label: "Frozen · per dozen",
        price: LUMPIA_RETAIL_USD.pork.frozenDozen,
      },
    ],
    photoUrl: CATALOG_PHOTOS.lumpia,
    hasCooked: true,
    hasFrozen: true,
    sortOrder: 2,
    variantGroup: "lumpia",
    variantShortLabel: "Pork",
    groupCardTitle: "Lumpia",
  },
  {
    id: "seed-3",
    name: "Lumpia: Turkey",
    description:
      "A lighter twist on the classic: seasoned ground turkey with onion, garlic, and carrots in a delicate spring roll skin—same hearty dozen as our beef and pork. Choose cooked or frozen to match your plans. 🥡 Comes with a dipping sauce.",
    category: "Sides",
    calories: "~215 cal/dozen cooked · ~160 cal/dozen frozen",
    basePrice: LUMPIA_RETAIL_USD.turkey.cookedDozen,
    sizes: [
      {
        key: "cooked",
        label: "Cooked · per dozen",
        price: LUMPIA_RETAIL_USD.turkey.cookedDozen,
      },
      {
        key: "frozen",
        label: "Frozen · per dozen",
        price: LUMPIA_RETAIL_USD.turkey.frozenDozen,
      },
    ],
    photoUrl: CATALOG_PHOTOS.lumpia,
    hasCooked: true,
    hasFrozen: true,
    sortOrder: 3,
    variantGroup: "lumpia",
    variantShortLabel: "Turkey",
    groupCardTitle: "Lumpia",
  },
  {
    id: "seed-4",
    name: "Pancit: Chicken",
    description:
      "Rice vermicelli noodles stir-fried with tender chicken, cabbage, carrots, and a savory soy–fish sauce. A Filipino birthday classic symbolizing long life. Garlic crisps on top; lime on the side. Order 1 serving (single to-go container), 2–4 servings, or a full party tray (8–10).",
    category: "Meals",
    calories: "~320 cal/serving",
    basePrice: 10.99,
    sizes: [
      {
        key: "small",
        label: "Chicken — 1 serving (to-go container)",
        price: 10.99,
      },
      {
        key: "twoFour",
        label: "Chicken — 2–4 servings",
        price: 25,
      },
      {
        key: "party",
        label: "Chicken Party (8-10 srv) — 9×13 tray",
        price: 63.5 + PANCIT_LIME_COST_USD * PANCIT_LIMES_PARTY_TRAY,
      },
    ],
    photoUrl: CATALOG_PHOTOS.pancit,
    hasCooked: false,
    hasFrozen: false,
    sortOrder: 4,
    variantGroup: "pancit",
    variantShortLabel: "Chicken",
    groupCardTitle: "Pancit",
  },
  {
    id: "seed-5",
    name: "Pancit: Shrimp",
    description:
      "Perfectly seasoned bihon noodles with plump shrimp, cabbage, carrots, and garlic crisps. A seafood lover's favorite. Order 1 serving (single to-go container), 2–4 servings, or a full party tray (8–10).",
    category: "Meals",
    calories: "~290 cal/serving",
    basePrice: 12.99,
    sizes: [
      {
        key: "small",
        label: "Shrimp — 1 serving (to-go container)",
        price: 12.99,
      },
      {
        key: "twoFour",
        label: "Shrimp — 2–4 servings",
        price: 28,
      },
      {
        key: "party",
        label: "Shrimp Party (8-10 srv) — 9×13 tray",
        price: 78.5 + PANCIT_LIME_COST_USD * PANCIT_LIMES_PARTY_TRAY,
      },
    ],
    photoUrl: CATALOG_PHOTOS.pancit,
    hasCooked: false,
    hasFrozen: false,
    sortOrder: 5,
    variantGroup: "pancit",
    variantShortLabel: "Shrimp",
    groupCardTitle: "Pancit",
  },
  {
    id: "seed-6",
    name: "Caramel Flan (Leche Flan)",
    description:
      "Silky-smooth Filipino egg custard with a rich caramel glaze, slow-steamed to perfection. A beloved Filipino dessert passed down through generations.",
    category: "Desserts",
    calories: "~280 cal",
    basePrice: FLAN_RETAIL_PER_RAMEKIN_USD,
    sizes: [
      {
        key: "individual",
        label: "Individual (1 ramekin)",
        price: FLAN_RETAIL_PER_RAMEKIN_USD,
      },
    ],
    photoUrl: CATALOG_PHOTOS.flan,
    hasCooked: false,
    hasFrozen: false,
    sortOrder: 6,
  },
  {
    id: "seed-7",
    name: "Quail Eggs (10 pcs)",
    description:
      "Fresh quail eggs coated in seasoned flour, deep-fried until crisp. 🥡 Comes with a dipping sauce.",
    category: "Sides",
    calories: "~165 cal / 10 pcs (breaded)",
    basePrice: 7.99,
    sizes: [{ key: "10pc", label: "Per 10 pcs", price: 7.99 }],
    photoUrl: CATALOG_PHOTOS.quail,
    hasCooked: false,
    hasFrozen: false,
    sortOrder: 7,
  },
  {
    id: "seed-8",
    name: "Tocino — Pork with Egg and Rice",
    description:
      "Tender, sweet-cured pork marinated overnight in a classic Filipino blend of brown sugar, soy sauce, white vinegar, annatto powder, garlic, and salt, then pan-fried to a beautiful caramelized glaze. Served as a complete plate with fluffy jasmine rice, a sunny-side-up egg, fresh cucumber and tomato slices, and crispy garlic crisps. 🥡 Comes with a dipping sauce.",
    category: "Meals",
    calories: "~540",
    basePrice: TOCINO_RETAIL_USD.cookedPlate,
    sizes: [
      {
        key: "plate",
        label: "Ready-Made Plate",
        price: TOCINO_RETAIL_USD.cookedPlate,
      },
    ],
    photoUrl: CATALOG_PHOTOS.tocino,
    hasCooked: true,
    hasFrozen: false,
    sortOrder: 8,
    variantGroup: "tocino",
    variantShortLabel: "Pork",
    groupCardTitle: "Tocino",
  },
  {
    id: "seed-9",
    name: "Tocino — Chicken with Egg and Rice",
    description:
      "Sweet-cured chicken marinated in the same beloved Filipino blend, pan-fried to a golden caramelized glaze. Served as a complete plate with fluffy jasmine rice, a sunny-side-up egg, fresh cucumber and tomato slices, and crispy garlic crisps. Lighter than pork, every bit as satisfying. 🥡 Comes with a dipping sauce.",
    category: "Meals",
    calories: "~510",
    basePrice: TOCINO_RETAIL_USD.cookedPlate,
    sizes: [
      {
        key: "plate",
        label: "Ready-Made Plate",
        price: TOCINO_RETAIL_USD.cookedPlate,
      },
    ],
    photoUrl: CATALOG_PHOTOS.tocino,
    hasCooked: true,
    hasFrozen: false,
    sortOrder: 9,
    variantGroup: "tocino",
    variantShortLabel: "Chicken",
    groupCardTitle: "Tocino",
  },
  {
    id: "seed-10",
    name: "Frozen Tocino — Pork (Cook at Home)",
    description:
      "Mr. K's signature sweet pork tocino, marinated overnight and frozen fresh. Thaw, pan-fry, and serve however you like—perfect with sinangag (garlic fried rice) and a fried egg. Pack is 12 oz (340 g) raw marinated meat (thin slices).",
    category: "Meals",
    calories: "Calories vary when cooked",
    basePrice: TOCINO_RETAIL_USD.frozen12oz,
    sizes: [
      {
        key: "frozen",
        label: "12 oz / 340g marinated · sealed freezer bag",
        price: TOCINO_RETAIL_USD.frozen12oz,
      },
    ],
    photoUrl: CATALOG_PHOTOS.tocino,
    hasCooked: false,
    hasFrozen: true,
    sortOrder: 10,
    variantGroup: "tocino",
    variantShortLabel: "Pork",
    groupCardTitle: "Tocino",
  },
  {
    id: "seed-11",
    name: "Frozen Tocino — Chicken (Cook at Home)",
    description:
      "Mr. K's sweet chicken tocino, marinated overnight and frozen fresh. Thaw, pan-fry, and enjoy. Quick, easy, and tastes homemade because it is. Pack is 12 oz (340 g) raw marinated meat (thin slices).",
    category: "Meals",
    calories: "Calories vary when cooked",
    basePrice: TOCINO_RETAIL_USD.frozen12oz,
    sizes: [
      {
        key: "frozen",
        label: "12 oz / 340g marinated · sealed freezer bag",
        price: TOCINO_RETAIL_USD.frozen12oz,
      },
    ],
    photoUrl: CATALOG_PHOTOS.tocino,
    hasCooked: false,
    hasFrozen: true,
    sortOrder: 11,
    variantGroup: "tocino",
    variantShortLabel: "Chicken",
    groupCardTitle: "Tocino",
  },
  {
    id: "seed-12",
    name: "Chicken Adobo",
    description:
      "Tender bone-in chicken slow-braised in Mr. K's soy-vinegar adobo sauce with garlic, bay leaf, and peppercorns. The sauce is reduced until thick and glossy, coating every piece with that signature savory-tangy flavor. Plate: jasmine rice, a fried egg, 1 drumstick and 1 thigh. Party tray: scaled for the group. 🥡 Comes with a dipping sauce.",
    category: "Meals",
    calories: "~520 (plate)",
    basePrice: ADOBO_RETAIL_USD.plate,
    sizes: [
      {
        key: "plate",
        label: "Plate — 1 serving (rice, egg, 1 drumstick & 1 thigh)",
        price: ADOBO_RETAIL_USD.plate,
      },
      {
        key: "party",
        label: "Party Tray (8-10 servings)",
        price: ADOBO_RETAIL_USD.party,
      },
    ],
    photoUrl: CATALOG_PHOTOS.adobo,
    hasCooked: false,
    hasFrozen: false,
    sortOrder: 12,
  },
] as const;

export type CatalogMenuItem = (typeof MENU_CATALOG)[number];
