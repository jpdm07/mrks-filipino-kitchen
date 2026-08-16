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
import { resolveEmailMenuPhotoUrl } from "@/lib/menu-photo-url";
import { getPublicSiteOrigin } from "@/lib/public-site-url";
import { bannerInventoryRowsForSiteBanner } from "@/lib/same-day-pickup";
import { sortPickupSlotLabels } from "@/lib/pickup-time-slots";
import {
  DEFAULT_SAME_DAY_CLOSING,
  DEFAULT_SAME_DAY_INTRO,
  fillSameDayDateToken,
  suggestedSameDayTitle,
} from "@/lib/same-day-subscriber-email-copy";

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

export function defaultSameDaySubject(itemNames: string[] = []): string {
  return suggestedSameDayTitle(itemNames);
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
        "No same-day items to announce. Mark an inventory row available, turn on Show banner, and set stock above zero.",
    };
  }

  const invIds = qualifying.map((r) => r.id);
  const slotRows = await prisma.inventoryPickupSlot.findMany({
    where: {
      inventoryItemId: { in: invIds },
      dateYmd: { gte: today },
      closed: false,
    },
    orderBy: [{ dateYmd: "asc" }, { id: "asc" }],
  });
  const slotByInv = new Map<number, (typeof slotRows)[number]>();
  for (const slot of slotRows) {
    if (!slotByInv.has(slot.inventoryItemId)) {
      slotByInv.set(slot.inventoryItemId, slot);
    }
  }

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
  const items: SameDayEmailItem[] = [];

  for (const inv of qualifying) {
    const slot = slotByInv.get(inv.id);
    const labels = slot ? parseSlotLabelsJson(slot.slotLabelsJson) : [];
    const pickupDateLabel = slot
      ? formatPickupYmdLong(slot.dateYmd)
      : "Available now";
    const pickupWindowLabel = labels.length
      ? formatPickupWindow(labels)
      : "See the website for pickup times";

    const menu = inv.menuItemId ? menuById.get(inv.menuItemId) : undefined;
    const displayName = menu?.name ?? inv.itemName;
    items.push({
      inventoryId: inv.id,
      menuItemId: inv.menuItemId,
      displayName,
      availabilityLine: resolvedInventoryBannerMessage(inv),
      photoUrlAbsolute: resolveEmailMenuPhotoUrl({
        photoUrl: menu?.photoUrl,
        menuItemId: inv.menuItemId,
        displayName: displayName,
        origin: base,
      }),
      menuDescription: menu?.description ?? null,
      priceLabel: menu ? menuPriceLabel(menu) : null,
      pickupDateLabel,
      pickupWindowLabel,
    });
  }

  return { ok: true, todayYmd: today, items };
}

export function buildSameDayPickupItemsHtml(items: SameDayEmailItem[]): string {
  return items
    .map((item) => {
      const img = item.photoUrlAbsolute
        ? `<img src="${escapeHtml(item.photoUrlAbsolute)}" alt="${escapeHtml(item.displayName)}" width="560" height="auto" border="0" style="max-width:560px;width:100%;height:auto;border-radius:12px 12px 0 0;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;"/>`
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
<p style="margin:0;font-size:14px;color:#444;">Same-day pickup · limited quantity</p>
</div>
</div>`;
    })
    .join("");
}

export function buildSameDaySubscriberEmailPlainText(params: {
  introMessage: string;
  items: SameDayEmailItem[];
  orderUrl: string;
  closingMessage?: string;
}): string {
  const lines = [
    params.introMessage,
    "",
    "In stock for same-day pickup (limited quantity):",
    "",
  ];
  for (const item of params.items) {
    lines.push(item.displayName);
    lines.push(`  ${item.availabilityLine}`);
    lines.push(`  Same-day pickup · limited quantity`);
    if (item.priceLabel) lines.push(`  From ${item.priceLabel}`);
    lines.push("");
  }
  lines.push(`Order online: ${params.orderUrl}`);
  if (params.closingMessage?.trim()) {
    lines.push("", params.closingMessage.trim());
  }
  return lines.join("\n") + buildCustomerReplyFooterPlainText();
}

export function composeSameDaySubscriberEmailHtml(params: {
  introMessage: string;
  items: SameDayEmailItem[];
  unsubscribeUrl: string;
  closingMessage?: string;
}): string {
  const introHtml = `<p style="font-size:17px;line-height:1.65;margin:0 0 28px;">${escapeHtml(params.introMessage).replace(/\n/g, "<br/>")}</p>`;
  const itemBlock = introHtml + buildSameDayPickupItemsHtml(params.items);
  const closing = (params.closingMessage ?? DEFAULT_SAME_DAY_CLOSING).trim();
  const closingHtml = `<p style="margin-top:8px;font-size:15px;line-height:1.6;">${escapeHtml(closing).replace(/\n/g, "<br/>")}</p>`;
  return newsletterHtml({
    message: closingHtml,
    itemBlock,
    unsubscribeUrl: params.unsubscribeUrl,
  });
}

export async function buildSameDaySubscriberEmailDraft(
  customIntro?: string,
  customSubject?: string,
  customClosing?: string
): Promise<
  | {
      ok: true;
      todayYmd: string;
      items: SameDayEmailItem[];
      subscriberCount: number;
      subject: string;
      introMessage: string;
      closingMessage: string;
      html: string;
      text: string;
      orderUrl: string;
    }
  | { ok: false; error: string }
> {
  const loaded = await loadSameDaySubscriberEmailItems();
  if (!loaded.ok) return loaded;

  const introMessage = fillSameDayDateToken(
    (customIntro ?? DEFAULT_SAME_DAY_INTRO).trim(),
    loaded.todayYmd
  );
  if (!introMessage) {
    return { ok: false, error: "Intro message is required." };
  }

  const closingMessage = fillSameDayDateToken(
    (customClosing ?? DEFAULT_SAME_DAY_CLOSING).trim(),
    loaded.todayYmd
  );
  if (!closingMessage) {
    return { ok: false, error: "Closing message is required." };
  }

  const subscriberCount = await prisma.subscriber.count();
  const suggested = suggestedSameDayTitle(
    loaded.items.map((item) => item.displayName)
  );
  const subject = fillSameDayDateToken(
    (customSubject?.trim() || suggested).trim(),
    loaded.todayYmd
  );
  const base = getPublicSiteOrigin();
  const orderUrl = `${base}/menu`;
  const html = composeSameDaySubscriberEmailHtml({
    introMessage,
    items: loaded.items,
    closingMessage,
    unsubscribeUrl: `${base}/api/unsubscribe?email=preview%40example.com`,
  });
  const text = buildSameDaySubscriberEmailPlainText({
    introMessage,
    items: loaded.items,
    orderUrl,
    closingMessage,
  });

  return {
    ok: true,
    todayYmd: loaded.todayYmd,
    items: loaded.items,
    subscriberCount,
    subject,
    introMessage,
    closingMessage,
    html,
    text,
    orderUrl,
  };
}
