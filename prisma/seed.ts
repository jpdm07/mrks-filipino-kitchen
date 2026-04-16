import { PrismaClient } from "@prisma/client";
import { computeUtensilChargeUsd, PRICING, SUGGESTION_OPTIONS } from "../lib/config";
import { MENU_CATALOG } from "../lib/menu-catalog";
import { COOK_MINUTES_BY_MENU_ITEM } from "../lib/menu-capacity-catalog";
import { FLAN_RETAIL_PER_RAMEKIN_USD } from "../lib/flan-cost-model";
import { LUMPIA_SAMPLE_4PC_RETAIL_USD } from "../lib/lumpia-cost-model";
import { PANCIT_SAMPLE_PRICE_DEFAULT_USD } from "../lib/pancit-limes";
import {
  menuItemsToPriceSheetRows,
  syncMenuPricesToSheets,
} from "../lib/sheets";
import {
  ORDER_STATUS_CONFIRMED,
  PAYMENT_METHOD_VERIFIED_LABEL,
  PAYMENT_STATUS_VERIFIED,
} from "../lib/order-payment";

const prisma = new PrismaClient();

async function main() {
  await prisma.pricingSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      sampleLumpia: LUMPIA_SAMPLE_4PC_RETAIL_USD,
      sampleQuail: 2.49,
      sampleFlan: FLAN_RETAIL_PER_RAMEKIN_USD,
      samplePancit: PANCIT_SAMPLE_PRICE_DEFAULT_USD,
    },
    update: {
      sampleLumpia: LUMPIA_SAMPLE_4PC_RETAIL_USD,
      sampleQuail: 2.49,
      sampleFlan: FLAN_RETAIL_PER_RAMEKIN_USD,
      samplePancit: PANCIT_SAMPLE_PRICE_DEFAULT_USD,
    },
  });

  await prisma.orderCounter.upsert({
    where: { id: "counter" },
    create: { id: "counter", count: 1000 },
    update: { count: 1000 },
  });

  await prisma.kitchenCapacitySettings.upsert({
    where: { id: "default" },
    create: { id: "default", manualSoldOutWeekStart: null },
    update: {},
  });

  for (const m of MENU_CATALOG) {
    const variantGroup = "variantGroup" in m ? m.variantGroup : null;
    const variantShortLabel = "variantShortLabel" in m ? m.variantShortLabel : null;
    const groupCardTitle = "groupCardTitle" in m ? m.groupCardTitle : null;
    const groupServingBlurb = "groupServingBlurb" in m ? m.groupServingBlurb : null;
    const cap = COOK_MINUTES_BY_MENU_ITEM[m.id];
    const isFlanItem = cap?.isFlan === true;
    const cookMinutes =
      cap && !isFlanItem
        ? Math.max(0, ...Object.values(cap.bySize))
        : 0;
    await prisma.menuItem.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        name: m.name,
        description: m.description,
        category: m.category,
        calories: m.calories,
        basePrice: m.basePrice,
        sizes: JSON.stringify(m.sizes),
        photoUrl: m.photoUrl,
        isActive: true,
        soldOut: false,
        cookMinutes,
        isFlanItem,
        hasCooked: m.hasCooked,
        hasFrozen: m.hasFrozen,
        sortOrder: m.sortOrder,
        variantGroup,
        variantShortLabel,
        groupCardTitle,
        groupServingBlurb,
      },
      update: {
        name: m.name,
        description: m.description,
        category: m.category,
        calories: m.calories,
        basePrice: m.basePrice,
        sizes: JSON.stringify(m.sizes),
        photoUrl: m.photoUrl,
        cookMinutes,
        isFlanItem,
        hasCooked: m.hasCooked,
        hasFrozen: m.hasFrozen,
        sortOrder: m.sortOrder,
        variantGroup,
        variantShortLabel,
        groupCardTitle,
        groupServingBlurb,
      },
    });
  }

  const presetPollIds = SUGGESTION_OPTIONS.map((_, i) => `poll-${i}`);
  await prisma.suggestion.deleteMany({
    where: {
      OR: [
        { isCustom: false, id: { notIn: presetPollIds } },
        { isCustom: true },
      ],
    },
  });

  for (let i = 0; i < SUGGESTION_OPTIONS.length; i++) {
    const option = SUGGESTION_OPTIONS[i];
    await prisma.suggestion.upsert({
      where: { id: `poll-${i}` },
      create: {
        id: `poll-${i}`,
        option,
        count: 0,
        isCustom: false,
      },
      update: { option },
    });
  }

  const lumpiaPork = MENU_CATALOG.find((m) => m.id === "seed-2")!;
  const pancitCh = MENU_CATALOG.find((m) => m.id === "seed-4")!;
  const lumpiaUnit = lumpiaPork.sizes.find((s) => s.key === "cooked")!.price;
  const pancitPartySize = pancitCh.sizes.find((s) => s.key === "party")!;
  const pancitPartyUnit = pancitPartySize.price;
  const demoItems = [
    {
      name: "Lumpia: Pork",
      quantity: 2,
      unitPrice: lumpiaUnit,
      size: "Cooked · per dozen",
      cookedOrFrozen: "cooked" as const,
      menuItemId: "seed-2",
    },
    {
      name: "Pancit: Chicken",
      quantity: 1,
      unitPrice: pancitPartyUnit,
      size: pancitPartySize.label,
      menuItemId: "seed-4",
    },
  ];
  const itemsSub = 2 * lumpiaUnit + pancitPartyUnit;
  const demoUtensilSets = 2;
  const ut = computeUtensilChargeUsd(true, demoUtensilSets);
  const sub = Math.round((itemsSub + ut) * 100) / 100;
  const tax = Math.round(sub * PRICING.TAX_RATE * 100) / 100;
  const total = Math.round((sub + tax) * 100) / 100;

  await prisma.order.upsert({
    where: { orderNumber: "MRK-1000" },
    create: {
      orderNumber: "MRK-1000",
      customerName: "Sample Customer",
      phone: "281-555-0100",
      email: "sample@example.com",
      items: JSON.stringify(demoItems),
      subtotal: sub,
      tax,
      total,
      pickupDate: "2026-04-20",
      pickupTime: "2:00 PM",
      notes: "Demo order from seed",
      wantsUtensils: true,
      utensilSets: demoUtensilSets,
      utensilCharge: ut,
      wantsRecurring: false,
      status: ORDER_STATUS_CONFIRMED,
      paymentMethod: PAYMENT_METHOD_VERIFIED_LABEL,
      paymentStatus: PAYMENT_STATUS_VERIFIED,
      subscribeUpdates: false,
      isDemo: true,
    },
    update: {
      items: JSON.stringify(demoItems),
      subtotal: sub,
      tax,
      total,
      pickupTime: "2:00 PM",
      status: ORDER_STATUS_CONFIRMED,
      paymentMethod: PAYMENT_METHOD_VERIFIED_LABEL,
      paymentStatus: PAYMENT_STATUS_VERIFIED,
      isDemo: true,
    },
  });

  const menuAfterSeed = await prisma.menuItem.findMany({
    orderBy: { sortOrder: "asc" },
  });
  const sheetSync = await syncMenuPricesToSheets(
    menuItemsToPriceSheetRows(menuAfterSeed)
  );
  if (
    process.env.GOOGLE_SHEETS_WEBHOOK_URL &&
    !sheetSync.ok &&
    sheetSync.reason === "fetch_error"
  ) {
    console.warn("Google Sheets menu price sync failed after seed (check webhook URL).");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
