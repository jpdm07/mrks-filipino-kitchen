export type SizeOption = {
  key: string;
  label: string;
  price: number;
};

export type MenuItemDTO = {
  id: string;
  name: string;
  description: string;
  category: string;
  calories: string;
  basePrice: number;
  sizes: SizeOption[];
  photoUrl: string;
  isActive: boolean;
  soldOut: boolean;
  hasCooked: boolean;
  hasFrozen: boolean;
  sortOrder: number;
  variantGroup: string | null;
  variantShortLabel: string | null;
  groupCardTitle: string | null;
  groupServingBlurb: string | null;
};

export function parseMenuSizes(raw: string): SizeOption[] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is SizeOption =>
        typeof x === "object" &&
        x !== null &&
        "key" in x &&
        "label" in x &&
        "price" in x
    ) as SizeOption[];
  } catch {
    return [];
  }
}

/** If DB sizes JSON is missing or invalid, Add to Cart still needs one price line. */
export function ensureMenuSizes(
  sizes: SizeOption[],
  basePrice: number
): SizeOption[] {
  if (sizes.length > 0) return sizes;
  const p = Number(basePrice);
  const price = Number.isFinite(p) ? p : 0;
  return [{ key: "default", label: "Standard", price }];
}
