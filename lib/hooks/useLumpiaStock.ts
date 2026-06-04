"use client";

import { useCallback, useEffect, useState } from "react";
import type { LumpiaProtein } from "@/lib/lumpia-inventory";

export type LumpiaStockState = {
  stock: Record<LumpiaProtein, number>;
  managed: Record<LumpiaProtein, boolean>;
  loading: boolean;
};

const EMPTY: LumpiaStockState = {
  stock: { beef: 0, pork: 0, turkey: 0 },
  managed: { beef: false, pork: false, turkey: false },
  loading: true,
};

export function useLumpiaStock(pollMs = 30000): LumpiaStockState {
  const [state, setState] = useState<LumpiaStockState>(EMPTY);

  const fetchStock = useCallback(async () => {
    try {
      const r = await fetch("/api/inventory/lumpia-stock", { cache: "no-store" });
      if (!r.ok) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }
      const j = (await r.json()) as {
        stock?: Partial<Record<LumpiaProtein, number>>;
        managed?: Partial<Record<LumpiaProtein, boolean>>;
      };
      setState({
        stock: {
          beef: Math.max(0, Number(j.stock?.beef) || 0),
          pork: Math.max(0, Number(j.stock?.pork) || 0),
          turkey: Math.max(0, Number(j.stock?.turkey) || 0),
        },
        managed: {
          beef: Boolean(j.managed?.beef),
          pork: Boolean(j.managed?.pork),
          turkey: Boolean(j.managed?.turkey),
        },
        loading: false,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    void fetchStock();
    const id = setInterval(() => void fetchStock(), pollMs);
    return () => clearInterval(id);
  }, [fetchStock, pollMs]);

  return state;
}
