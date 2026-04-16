"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { computeUtensilChargeUsd, PRICING } from "@/lib/config";
import { complimentaryUtensilAllowanceFromOrderItems } from "@/lib/utensils-allowance";
import {
  LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN,
  type LumpiaSampleProtein,
} from "@/lib/lumpia-cost-model";
import { sampleCartPricesFromMenuCatalog } from "@/lib/sample-cart-pricing";
import type { CartLine, SampleSelection } from "@/lib/cart-types";
import {
  cartLineKey,
  cartLinesToOrderItems,
  emptySamples,
  samplesToLines,
} from "@/lib/cart-types";
import {
  cartQualifiesForExtraDip,
  EXTRA_DIP_MAX_QTY,
  EXTRA_DIP_UNIT_PRICE_USD,
  makeExtraDipOrderLine,
} from "@/lib/extra-dip-sauce";
import type { OrderItemLine } from "@/lib/order-types";

const MRKS_CART_KEY = "mrks_cart";
const CART_STORAGE_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

type SamplePrices = {
  lumpia: Record<LumpiaSampleProtein, number>;
  quail: number;
  flan: number;
  pancit: number;
};

function normalizeLumpiaSamplePrices(
  x: unknown
): Record<LumpiaSampleProtein, number> {
  if (
    x &&
    typeof x === "object" &&
    "beef" in x &&
    "pork" in x &&
    "turkey" in x
  ) {
    const o = x as Record<string, unknown>;
    const beef = Number(o.beef);
    const pork = Number(o.pork);
    const turkey = Number(o.turkey);
    if (
      Number.isFinite(beef) &&
      Number.isFinite(pork) &&
      Number.isFinite(turkey)
    ) {
      return { beef, pork, turkey };
    }
  }
  if (typeof x === "number" && Number.isFinite(x)) {
    return { beef: x, pork: x, turkey: x };
  }
  return { ...LUMPIA_SAMPLE_4PC_RETAIL_BY_PROTEIN };
}

type CartContextValue = {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "id">) => void;
  updateQuantity: (id: string, qty: number) => void;
  removeLine: (id: string) => void;
  clearCart: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  itemCount: number;
  samples: SampleSelection;
  setSamples: React.Dispatch<React.SetStateAction<SampleSelection>>;
  samplePrices: SamplePrices;
  wantsUtensils: boolean;
  setWantsUtensils: (v: boolean) => void;
  utensilSets: number;
  setUtensilSets: Dispatch<SetStateAction<number>>;
  newsletterOptIn: boolean;
  setNewsletterOptIn: (v: boolean) => void;
  extraDipSauceQty: number;
  setExtraDipSauceQty: Dispatch<SetStateAction<number>>;
  itemsSubtotal: number;
  complimentaryUtensilAllowance: number;
  utensilCharge: number;
  subtotalBeforeTax: number;
  tax: number;
  total: number;
  buildOrderItems: () => OrderItemLine[];
};

function isCartLine(x: unknown): x is CartLine {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.menuItemId === "string" &&
    typeof o.name === "string" &&
    typeof o.photoUrl === "string" &&
    typeof o.quantity === "number" &&
    typeof o.unitPrice === "number" &&
    typeof o.sizeKey === "string" &&
    typeof o.sizeLabel === "string" &&
    (o.cookedOrFrozen === undefined ||
      o.cookedOrFrozen === "cooked" ||
      o.cookedOrFrozen === "frozen")
  );
}

function isSampleSelection(x: unknown): x is SampleSelection {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const p = o.lumpiaProtein;
  const pt = o.pancitType;
  return (
    typeof o.lumpiaQty === "number" &&
    (p === null || p === "beef" || p === "pork" || p === "turkey") &&
    typeof o.quailQty === "number" &&
    typeof o.flanQty === "number" &&
    typeof o.pancitQty === "number" &&
    (pt === null || pt === "chicken" || pt === "shrimp")
  );
}

function readStoredCart(): {
  lines: CartLine[];
  samples: SampleSelection;
  wantsUtensils: boolean;
  utensilSets: number;
  newsletterOptIn: boolean;
  extraDipSauceQty: number;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MRKS_CART_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as {
      savedAt?: number;
      lines?: unknown;
      samples?: unknown;
      wantsUtensils?: unknown;
      utensilSets?: unknown;
      newsletterOptIn?: unknown;
      extraDipSauceQty?: unknown;
    };
    if (
      typeof data.savedAt === "number" &&
      Date.now() - data.savedAt > CART_STORAGE_MAX_AGE_MS
    ) {
      localStorage.removeItem(MRKS_CART_KEY);
      return null;
    }
    if (!Array.isArray(data.lines) || !data.lines.every(isCartLine)) return null;
    if (!isSampleSelection(data.samples)) return null;
    const dipRaw =
      typeof data.extraDipSauceQty === "number"
        ? Math.floor(data.extraDipSauceQty)
        : 0;
    const extraDipSauceQty = Math.max(
      0,
      Math.min(EXTRA_DIP_MAX_QTY, dipRaw)
    );
    const wantsUtensils = Boolean(data.wantsUtensils);
    let utensilSets =
      typeof data.utensilSets === "number"
        ? Math.max(0, Math.min(50, Math.floor(data.utensilSets)))
        : 0;
    if (wantsUtensils && utensilSets < 1) utensilSets = 1;
    return {
      lines: data.lines,
      samples: data.samples,
      wantsUtensils,
      utensilSets,
      newsletterOptIn: Boolean(data.newsletterOptIn),
      extraDipSauceQty,
    };
  } catch {
    return null;
  }
}

const CartContext = createContext<CartContextValue | null>(null);

const defaultPrices: SamplePrices = sampleCartPricesFromMenuCatalog();

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [samples, setSamples] = useState<SampleSelection>(() => emptySamples());
  const [samplePrices, setSamplePrices] = useState<SamplePrices>(defaultPrices);
  const [wantsUtensils, setWantsUtensils] = useState(false);
  const [utensilSets, setUtensilSets] = useState(0);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [extraDipSauceQty, setExtraDipSauceQty] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    const s = readStoredCart();
    if (s) {
      setLines(s.lines);
      setSamples(s.samples);
      setWantsUtensils(s.wantsUtensils);
      setUtensilSets(s.utensilSets);
      setNewsletterOptIn(s.newsletterOptIn);
      setExtraDipSauceQty(s.extraDipSauceQty);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        MRKS_CART_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          lines,
          samples,
          wantsUtensils,
          utensilSets,
          newsletterOptIn,
          extraDipSauceQty,
        })
      );
    } catch {
      /* ignore quota / private mode */
    }
  }, [
    hydrated,
    lines,
    samples,
    wantsUtensils,
    utensilSets,
    newsletterOptIn,
    extraDipSauceQty,
  ]);

  useEffect(() => {
    if (!cartQualifiesForExtraDip(lines, samples) && extraDipSauceQty > 0) {
      setExtraDipSauceQty(0);
    }
  }, [lines, samples, extraDipSauceQty]);

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (!d || typeof d !== "object") return;
        const o = d as Record<string, unknown>;
        setSamplePrices({
          lumpia: normalizeLumpiaSamplePrices(o.lumpia),
          quail:
            typeof o.quail === "number" && Number.isFinite(o.quail)
              ? o.quail
              : defaultPrices.quail,
          flan:
            typeof o.flan === "number" && Number.isFinite(o.flan)
              ? o.flan
              : defaultPrices.flan,
          pancit:
            typeof o.pancit === "number" && Number.isFinite(o.pancit)
              ? o.pancit
              : defaultPrices.pancit,
        });
      })
      .catch(() => {});
  }, []);

  const addLine = useCallback((line: Omit<CartLine, "id">) => {
    const id = cartLineKey(
      line.menuItemId,
      line.sizeKey,
      line.cookedOrFrozen
    );
    setLines((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = {
          ...next[i],
          quantity: Math.min(99, next[i].quantity + line.quantity),
        };
        return next;
      }
      return [...prev, { ...line, id }];
    });
    setDrawerOpen(true);
  }, []);

  const updateQuantity = useCallback((id: string, qty: number) => {
    const q = Math.max(0, Math.min(99, Math.floor(qty)));
    setLines((prev) => {
      if (q <= 0) return prev.filter((l) => l.id !== id);
      return prev.map((l) => (l.id === id ? { ...l, quantity: q } : l));
    });
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    try {
      localStorage.removeItem(MRKS_CART_KEY);
    } catch {
      /* ignore */
    }
    setLines([]);
    setSamples(emptySamples());
    setWantsUtensils(false);
    setUtensilSets(0);
    setNewsletterOptIn(false);
    setExtraDipSauceQty(0);
    setDrawerOpen(false);
  }, []);

  const buildOrderItems = useCallback((): OrderItemLine[] => {
    const base = [
      ...cartLinesToOrderItems(lines),
      ...samplesToLines(samples, samplePrices),
    ];
    if (
      extraDipSauceQty > 0 &&
      cartQualifiesForExtraDip(lines, samples)
    ) {
      return [...base, makeExtraDipOrderLine(extraDipSauceQty)];
    }
    return base;
  }, [lines, samples, samplePrices, extraDipSauceQty]);

  const complimentaryUtensilAllowance = useMemo(
    () => complimentaryUtensilAllowanceFromOrderItems(buildOrderItems()),
    [buildOrderItems]
  );

  useEffect(() => {
    if (!hydrated || !wantsUtensils) return;
    setUtensilSets((prev) => {
      const minSets = complimentaryUtensilAllowance;
      return prev < minSets ? minSets : prev;
    });
  }, [hydrated, wantsUtensils, complimentaryUtensilAllowance]);

  const itemCount = useMemo(
    () => lines.reduce((s, l) => s + l.quantity, 0),
    [lines]
  );

  const itemsSubtotal = useMemo(() => {
    const fromCart = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const sampleLines = samplesToLines(samples, samplePrices);
    const fromSamples = sampleLines.reduce(
      (s, l) => s + l.unitPrice * l.quantity,
      0
    );
    const dip =
      extraDipSauceQty > 0 && cartQualifiesForExtraDip(lines, samples)
        ? extraDipSauceQty * EXTRA_DIP_UNIT_PRICE_USD
        : 0;
    return fromCart + fromSamples + dip;
  }, [lines, samples, samplePrices, extraDipSauceQty]);

  const utensilCharge = useMemo(
    () =>
      computeUtensilChargeUsd(
        wantsUtensils,
        utensilSets,
        complimentaryUtensilAllowance
      ),
    [wantsUtensils, utensilSets, complimentaryUtensilAllowance]
  );

  const subtotalBeforeTax = useMemo(
    () => itemsSubtotal + utensilCharge,
    [itemsSubtotal, utensilCharge]
  );

  const tax = useMemo(
    () => Math.round(subtotalBeforeTax * PRICING.TAX_RATE * 100) / 100,
    [subtotalBeforeTax]
  );

  const total = useMemo(
    () => Math.round((subtotalBeforeTax + tax) * 100) / 100,
    [subtotalBeforeTax, tax]
  );

  const value = useMemo(
    () => ({
      lines,
      addLine,
      updateQuantity,
      removeLine,
      clearCart,
      drawerOpen,
      openDrawer,
      closeDrawer,
      itemCount,
      samples,
      setSamples,
      samplePrices,
      wantsUtensils,
      setWantsUtensils,
      utensilSets,
      setUtensilSets,
      newsletterOptIn,
      setNewsletterOptIn,
      extraDipSauceQty,
      setExtraDipSauceQty,
      itemsSubtotal,
      complimentaryUtensilAllowance,
      utensilCharge,
      subtotalBeforeTax,
      tax,
      total,
      buildOrderItems,
    }),
    [
      lines,
      addLine,
      updateQuantity,
      removeLine,
      clearCart,
      drawerOpen,
      openDrawer,
      closeDrawer,
      itemCount,
      samples,
      samplePrices,
      wantsUtensils,
      utensilSets,
      newsletterOptIn,
      extraDipSauceQty,
      itemsSubtotal,
      complimentaryUtensilAllowance,
      utensilCharge,
      subtotalBeforeTax,
      tax,
      total,
      buildOrderItems,
    ]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
