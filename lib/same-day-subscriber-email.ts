import type { MenuItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvedInventoryBannerMessage } from "@/lib/inventory-banner-copy";
import { parseSlotLabelsJson } from "@/lib/inventory-pickup-slots";
import { newsletterHtml } from "@/lib/mailer";
import { buildCustomerReplyFooterPlainText } from "@/lib/mail-reply-routing";
import { parseMenuSizes } from "@/lib/menu-types";
import {
  formatPickupYmdLong,
  getTodayInPickupTimezoneYMD,
} from "@/lib/pickup-lead-time";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import {
  applySameDayOrderLeadFilter,
  bannerInventoryRowsForSiteBanner,
} from "@/lib/same-day-pickup";
import { sortPickupSlotLabels } from "@/lib/pickup-time-slots";

export type SameDayEmailItem = {
  inventoryId: number;
  menuItemId: string | null;
  displayName: string;
  availabilityLine: string;
  photoUrlAbsolute: string | null;
  menuDescription: string | null;
  priceLabel: string | null;
  pickupDateLabel: string;
  pickupWindowLabel: string;
};

export const DEFAULT_SAME_DAY_INTRO =
  "Good news — we have items ready for same-day pickup today at Mr. K's Filipino Kitchen. Order online, then choose your pickup time at checkout.";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absolutePhotoUrl(
  base: string,
  photo: string | null | undefined
): string | null {
  const trimmed = photo?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

function menuPriceLabel(item: MenuItem): string {
  const sizes = parseMenuSizes(item.sizes);
  if (sizes[0]?.price != null) return `$${sizes[0].price.toFixed(2)}`;
  return `$${item.basePrice.toFixed(2)}`;
}

function formatPickupWindow(labels: string[]): string {
  const sorted = sortPickupSlotLabels(labels);
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return sorted[0]!;
  return `${sorted[0]} – ${sorted[sorted.length - 1]}`;
}

export function defaultSameDaySubject(todayYmd: string): string {
  const long = formatPickupYmdLong(todayYmd);
  const short = long.replace(/,\s*\d{4}$/, "");
  return `Same-day pickup today (${short}) — Mr. K's Filipino Kitchen`;
}

export async function loadSameDaySubscriberEmailItems(): Promise<
  | { ok: true; todayYmd: string; items: SameDayEmailItem[] }
  | { ok: false; error: string }
> {
  const today = getTodayInPickupTimezoneYMD();
  const rows = await prisma.inventoryItem.findMany({
    where: {
      showBanner: true,
      isAvailable: true,
      quantityInStock: { gt: 0 },
    },
    orderBy: { id: "asc" },
  });
  const qualifying = await bannerInventoryRowsForSiteBanner(rows);
  if (!qualifying.length) {
    return {
      ok: false,
      error:
        "No same-day banner items with open pickup slots for today. Turn on Show banner, set stock, and open today's pickup window on an item card below.",
    };
  }

  const invIds = qualifying.map((r) => r.id);
  const todaySlots = await prisma.inventoryPickupSlot.findMany({
    where: {
      inventoryItemId: { in: invIds },
      dateYmd: today,
      closed: false,
    },
  });
  const slotByInv = new Map(todaySlots.map((s) => [s.inventoryItemId, s]));

  const menuIds = [
    ...new Set(
      qualifying
        .map((r) => r.menuItemId?.trim())
        .filter(Boolean) as string[]
    ),
  ];
  const menuRows = menuIds.length
    ? await prisma.menuItem.findMany({ where: { id: { in: menuIds } } })
    : [];
  const menuById = new Map(menuRows.map((m) => [m.id, m]));

  const base = getPublicSiteOrigin();
  const pickupDateLabel = formatPickupYmdLong(today);
  const items: SameDayEmailItem[] = [];

  for (const inv of qualifying) {
    const slot = slotByInv.get(inv.id);
    if (!slot) continue;
    const allLabels = parseSlotLabelsJson(slot.slotLabelsJson);
    const available = applySameDayOrderLeadFilter(allLabels, today);
    if (!available.length) continue;

    const menu = inv.menuItemId ? menuById.get(inv.menuItemId) : undefined;
    const displayName = menu?.name ?? inv.itemName;
    items.push({
      inventoryId: inv.id,
      menuItemId: inv.menuItemId,
      displayName,
      availabilityLine: resolvedInventoryBannerMessage(inv),
      photoUrlAbsolute: absolutePhotoUrl(base, menu?.photoUrl),
      menuDescription: menu?.description ?? null,
      priceLabel: menu ? menuPriceLabel(menu) : null,
      pickupDateLabel,
      pickupWindowLabel: formatPickupWindow(available),
    });
  }

  if (!items.length) {
    return {
      ok: false,
      error:
        "Pickup windows for today have closed or are not yet bookable (30-minute lead time after you place an order).",
    };
  }

  return { ok: true, todayYmd: today, items };
}

export function buildSameDayPickupItemsHtml(items: SameDayEmailItem[]): string {
  return items
    .map((item) => {
      const img = item.photoUrlAbsolute
        ? `<img src="${escapeHtml(item.photoUrlAbsolute)}" alt="${escapeHtml(item.displayName)}" width="100%" style="max-width:560px;border-radius:12px 12px 0 0;display:block;margin:0 auto;"/>`
        : "";
      const desc = item.menuDescription
        ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#444;">${escapeHtml(item.menuDescription)}</p>`
        : "";
      const price = item.priceLabel
        ? `<p style="margin:0 0 12px;font-weight:bold;color:#CE1126;font-size:15px;">From ${escapeHtml(item.priceLabel)}</p>`
        : "";
      return `<div style="margin-bottom:28px;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;background:#fff;">
${img}
<div style="padding:20px 24px;">
<h2 style="color:#0e1d35;margin:0 0 8px;font-size:22px;font-family:Georgia,serif;">${escapeHtml(item.displayName)}</h2>
${desc}
${price}
<p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1A1A1A;">${escapeHtml(item.availabilityLine)}</p>
<p style="margin:0;font-size:14px;color:#444;"><strong>Pickup:</strong> ${escapeHtml(item.pickupDateLabel)} · ${escapeHtml(item.pickupWindowLabel)}</p>
</div>
</div>`;
    })
    .join("");
}

export function buildSameDaySubscriberEmailPlainText(params: {
  introMessage: string;
  items: SameDayEmailItem[];
  orderUrl: string;
}): string {
  const lines = [
    params.introMessage,
    "",
    "Available for same-day pickup today:",
    "",
  ];
  for (const item of params.items) {
    lines.push(item.displayName);
    lines.push(`  ${item.availabilityLine}`);
    lines.push(
      `  Pickup: ${item.pickupDateLabel} · ${item.pickupWindowLabel}`
    );
    if (item.priceLabel) lines.push(`  From ${item.priceLabel}`);
    lines.push("");
  }
  lines.push(`Order online: ${params.orderUrl}`);
  return lines.join("\n") + buildCustomerReplyFooterPlainText();
}

export function composeSameDaySubscriberEmailHtml(params: {
  introMessage: string;
  items: SameDayEmailItem[];
  unsubscribeUrl: string;
}): string {
  const introHtml = `<p style="font-size:17px;line-height:1.65;margin:0 0 28px;">${escapeHtml(params.introMessage).replace(/\n/g, "<br/>")}</p>`;
  const itemBlock = introHtml + buildSameDayPickupItemsHtml(params.items);
  const closing =
    "<p style=\"margin-top:8px;font-size:15px;line-height:1.6;\">We look forward to serving you today!</p>";
  return newsletterHtml({
    message: closing,
    itemBlock,
    unsubscribeUrl: params.unsubscribeUrl,
  });
}

export async function buildSameDaySubscriberEmailDraft(
  customIntro?: string,
  customSubject?: string
): Promise<
  | {
      ok: true;
      todayYmd: string;
      items: SameDayEmailItem[];
      subscriberCount: number;
      subject: string;
      introMessage: string;
      html: string;
      text: string;
      orderUrl: string;
    }
  | { ok: false; error: string }
> {
  const loaded = await loadSameDaySubscriberEmailItems();
  if (!loaded.ok) return loaded;

  const introMessage = (customIntro ?? DEFAULT_SAME_DAY_INTRO).trim();
  if (!introMessage) {
    return { ok: false, error: "Intro message is required." };
  }

  const subscriberCount = await prisma.subscriber.count();
  const subject = (
    customSubject?.trim() || defaultSameDaySubject(loaded.todayYmd)
  ).trim();
  const base = getPublicSiteOrigin();
  const orderUrl = `${base}/order`;
  const html = composeSameDaySubscriberEmailHtml({
    introMessage,
    items: loaded.items,
    unsubscribeUrl: `${base}/api/unsubscribe?email=preview%40example.com`,
  });
  const text = buildSameDaySubscriberEmailPlainText({
    introMessage,
    items: loaded.items,
    orderUrl,
  });

  return {
    ok: true,
    todayYmd: loaded.todayYmd,
    items: loaded.items,
    subscriberCount,
    subject,
    introMessage,
    html,
    text,
    orderUrl,
  };
}

export function sameDayMailSubjectWithTimestamp(subject: string): string {
  return `${subject} · ${new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
