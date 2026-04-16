/**
 * Orders: each line’s `unitPrice` is what the customer paid (cart / DB menu).
 * Structured `items` + `itemsSummary` are POSTed for the Apps Script (one sheet row per line).
 * The Apps Script in `SHEETS_SCRIPT.md` also bumps **Monthly sales** + refreshes a line chart (private to your Sheet).
 */

import type { OrderItemLine } from "./order-types";
import {
  getSauceCupsFromOrderLine,
  getUnitCost,
  napkinCostSharePerLine,
  orderLineEstimatedProfitUsd,
} from "./menu-item-unit-costs";

export type SheetsOrderLinePayload = {
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  unitCost: number;
  estimatedProfit: number;
  sauceCups: number;
  container?: string;
  dipCup?: boolean;
  foilCover?: boolean;
  frozenBag?: boolean;
};

export function lineToSheetsOrderPayload(
  i: OrderItemLine,
  napkinShare: number
): SheetsOrderLinePayload {
  const size = i.size ?? "";
  const lineTotal = Math.round(i.quantity * i.unitPrice * 100) / 100;
  const baseUnitCost = getUnitCost(i.name, size);
  const unitCost = Math.round((baseUnitCost + napkinShare) * 100) / 100;
  const estimatedProfit = orderLineEstimatedProfitUsd(i, napkinShare);
  const base: SheetsOrderLinePayload = {
    name: i.name,
    size,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    lineTotal,
    unitCost,
    estimatedProfit,
    sauceCups: getSauceCupsFromOrderLine(i) * i.quantity,
  };
  if (/flan|leche flan/i.test(i.name)) {
    return {
      ...base,
      container: "5oz silver aluminum ramekin",
      dipCup: false,
      foilCover: false,
      frozenBag: false,
    };
  }
  return base;
}

export type MenuPriceSheetRow = {
  menuItemId: string;
  name: string;
  sizeLabel: string;
  unitPrice: number;
};

/** Build flat rows from Prisma `MenuItem` records (parses `sizes` JSON). */
export function menuItemsToPriceSheetRows(
  items: Array<{ id: string; name: string; sizes: string; basePrice: number }>
): MenuPriceSheetRow[] {
  const rows: MenuPriceSheetRow[] = [];
  for (const item of items) {
    try {
      const sizes = JSON.parse(item.sizes) as unknown;
      if (Array.isArray(sizes) && sizes.length > 0) {
        for (const s of sizes as Array<{ label?: string; price?: unknown }>) {
          if (
            s &&
            typeof s.label === "string" &&
            typeof s.price === "number" &&
            !Number.isNaN(s.price)
          ) {
            rows.push({
              menuItemId: item.id,
              name: item.name,
              sizeLabel: s.label,
              unitPrice: s.price,
            });
          }
        }
        continue;
      }
    } catch {
      /* use basePrice fallback */
    }
    rows.push({
      menuItemId: item.id,
      name: item.name,
      sizeLabel: "Default",
      unitPrice: item.basePrice,
    });
  }
  return rows;
}

/** Overwrites the **Menu prices** sheet via webhook (`type: "menuPrices"`). */
export async function syncMenuPricesToSheets(rows: MenuPriceSheetRow[]) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("GOOGLE_SHEETS_WEBHOOK_URL not set; skipping menu price sync");
    return { ok: false as const, reason: "no_webhook" as const };
  }
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "menuPrices",
        syncedAt: new Date().toISOString(),
        rows,
      }),
    });
    return { ok: true as const };
  } catch (err) {
    console.error("Sheets menu sync failed (non-fatal):", err);
    return { ok: false as const, reason: "fetch_error" as const };
  }
}

export async function syncOrderToSheets(order: {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  phone: string;
  email: string;
  items: OrderItemLine[];
  utensilSets: number;
  utensilCharge: number;
  subtotal: number;
  tax: number;
  total: number;
  pickupDate?: string;
  pickupTime?: string;
  notes?: string;
  customInquiry?: string;
  wantsPrintedReceipt?: boolean;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
}) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("GOOGLE_SHEETS_WEBHOOK_URL not set; skipping");
    return;
  }
  try {
    const share = napkinCostSharePerLine(order.items.length);
    const structuredItems = order.items.map((i) => lineToSheetsOrderPayload(i, share));
    const itemsSummary = order.items
      .map(
        (i) =>
          `${i.name}${i.size ? ` (${i.size})` : ""} ×${i.quantity} @$${i.unitPrice.toFixed(2)}`
      )
      .join(" | ");

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "order",
        orderNumber: order.orderNumber,
        date: order.createdAt,
        customerName: order.customerName,
        phone: order.phone,
        email: order.email,
        items: structuredItems,
        itemsSummary,
        utensilSets: order.utensilSets,
        utensilCharge: order.utensilCharge.toFixed(2),
        subtotal: order.subtotal.toFixed(2),
        tax: order.tax.toFixed(2),
        total: order.total.toFixed(2),
        pickupDate: order.pickupDate || "",
        pickupTime: order.pickupTime || "",
        wantsRecurring: "No",
        notes: order.notes || "",
        customInquiry: order.customInquiry || "",
        wantsPrintedReceipt: order.wantsPrintedReceipt ? "Yes" : "No",
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
      }),
    });
  } catch (err) {
    console.error("Sheets sync failed (non-fatal):", err);
  }
}

/** After admin changes payment verification — update every sheet row for this order #. */
export async function syncOrderStatusToSheets(payload: {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
}) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("GOOGLE_SHEETS_WEBHOOK_URL not set; skipping status sync");
    return;
  }
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "status_update",
        orderNumber: payload.orderNumber,
        orderStatus: payload.orderStatus,
        paymentStatus: payload.paymentStatus,
        paymentMethod: payload.paymentMethod,
      }),
    });
  } catch (err) {
    console.error("Sheets status sync failed (non-fatal):", err);
  }
}
