import type { MenuItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatStockUnitPhrase } from "@/lib/inventory-banner-copy";
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
  groupTitle: string | null;
  variantLabel: string | null;
  variantGroup: string | null;
  availabilityLine: string;
  photoUrlAbsolute: string | null;
  menuDescription: string | null;
  priceLabel: string | null;
  pickupDateLabel: string;
  pickupWindowLabel: string;
};

/** Cards for HTML: flavors that share a menu group / photo collapse to one image. */
type SameDayEmailCard =
  | { kind: "single"; item: SameDayEmailItem }
  | {
      kind: "group";
      groupKey: string;
      title: string;
      photoId: number;
      photoUrlAbsolute: string | null;
      variants: SameDayEmailItem[];
    };

/** Group key for shared product photo (lumpia flavors, etc.). */
function sameDayPhotoGroupKey(item: SameDayEmailItem): string | null {
  const vg = item.variantGroup?.trim();
  if (vg) return `vg:${vg.toLowerCase()}`;
  const title = item.groupTitle?.trim();
  const photo = item.photoUrlAbsolute?.trim();
  if (title && photo) return `photo:${title.toLowerCase()}|${photo}`;
  return null;
}

function variantLineLabel(item: SameDayEmailItem): string {
  const v = item.variantLabel?.trim();
  if (v) return v;
  return item.displayName;
}

function groupSameDayEmailItems(items: SameDayEmailItem[]): SameDayEmailCard[] {
  const buckets = new Map<string, SameDayEmailItem[]>();
  for (const item of items) {
    const key = sameDayPhotoGroupKey(item);
    if (!key) continue;
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }

  const cards: SameDayEmailCard[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = sameDayPhotoGroupKey(item);
    if (!key) {
      cards.push({ kind: "single", item });
      continue;
    }
    const bucket = buckets.get(key)!;
    if (bucket.length < 2) {
      cards.push({ kind: "single", item });
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    const title =
      bucket.find((b) => b.groupTitle?.trim())?.groupTitle?.trim() ||
      bucket[0]!.displayName.replace(/\s*[—–-]\s*.+$/, "").trim() ||
      "Menu item";
    const withPhoto =
      bucket.find((b) => b.photoUrlAbsolute?.trim()) ?? bucket[0]!;
    cards.push({
      kind: "group",
      groupKey: key,
      title,
      photoId: withPhoto.inventoryId,
      photoUrlAbsolute: withPhoto.photoUrlAbsolute,
      variants: bucket,
    });
  }
  return cards;
}

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

/** Stock line for email — no repeated dish name or same-day CTA (those live in the intro). */
function emailStockLine(inv: {
  itemName: string;
  quantityInStock: number;
  unitLabel: string;
  bannerMessage: string | null;
}): string {
  const custom = inv.bannerMessage?.trim();
  if (custom) return custom;
  return `${formatStockUnitPhrase(
    inv.quantityInStock,
    inv.unitLabel.trim() || "units"
  )} in stock`;
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
      groupTitle: menu?.groupCardTitle?.trim() || null,
      variantLabel: menu?.variantShortLabel?.trim() || null,
      variantGroup: menu?.variantGroup?.trim() || null,
      availabilityLine: emailStockLine(inv),
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

function buildSingleItemCardHtml(item: SameDayEmailItem): string {
  const img = item.photoUrlAbsolute
    ? `<img data-mrk-photo="${item.inventoryId}" src="${escapeHtml(item.photoUrlAbsolute)}" alt="${escapeHtml(item.displayName)}" width="560" border="0" style="max-width:560px;width:100%;height:auto;border-radius:12px 12px 0 0;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;"/>`
    : "";
  const price = item.priceLabel
    ? `<p style="margin:4px 0 0;font-weight:bold;color:#CE1126;font-size:15px;">From ${escapeHtml(item.priceLabel)}</p>`
    : "";
  return `<div style="margin-bottom:20px;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;background:#fff;">
${img}
<div style="padding:16px 20px;">
<h2 style="color:#0e1d35;margin:0;font-size:20px;font-family:Georgia,serif;line-height:1.25;">${escapeHtml(item.displayName)}</h2>
<p style="margin:8px 0 0;font-size:15px;font-weight:600;color:#1A1A1A;">${escapeHtml(item.availabilityLine)}</p>
${price}
</div>
</div>`;
}

function buildGroupedItemCardHtml(card: Extract<SameDayEmailCard, { kind: "group" }>): string {
  const img = card.photoUrlAbsolute
    ? `<img data-mrk-photo="${card.photoId}" src="${escapeHtml(card.photoUrlAbsolute)}" alt="${escapeHtml(card.title)}" width="560" border="0" style="max-width:560px;width:100%;height:auto;border-radius:12px 12px 0 0;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;"/>`
    : "";
  const rows = card.variants
    .map((v) => {
      const price = v.priceLabel ? ` · from ${escapeHtml(v.priceLabel)}` : "";
      return `<tr>
<td style="padding:8px 0;border-top:1px solid #eee;font-size:15px;font-weight:700;color:#0e1d35;vertical-align:top;">${escapeHtml(variantLineLabel(v))}</td>
<td style="padding:8px 0 8px 12px;border-top:1px solid #eee;font-size:14px;font-weight:600;color:#1A1A1A;text-align:right;vertical-align:top;">${escapeHtml(v.availabilityLine)}${price}</td>
</tr>`;
    })
    .join("");
  return `<div style="margin-bottom:20px;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;background:#fff;">
${img}
<div style="padding:16px 20px;">
<h2 style="color:#0e1d35;margin:0 0 8px;font-size:20px;font-family:Georgia,serif;line-height:1.25;">${escapeHtml(card.title)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
${rows}
</table>
</div>
</div>`;
}

export function buildSameDayPickupItemsHtml(items: SameDayEmailItem[]): string {
  return groupSameDayEmailItems(items)
    .map((card) =>
      card.kind === "group"
        ? buildGroupedItemCardHtml(card)
        : buildSingleItemCardHtml(card.item)
    )
    .join("");
}

export function buildSameDaySubscriberEmailPlainText(params: {
  introMessage: string;
  items: SameDayEmailItem[];
  orderUrl: string;
  closingMessage?: string;
}): string {
  const lines = [params.introMessage, ""];
  for (const card of groupSameDayEmailItems(params.items)) {
    if (card.kind === "group") {
      lines.push(card.title);
      for (const v of card.variants) {
        const price = v.priceLabel ? ` · from ${v.priceLabel}` : "";
        lines.push(
          `  • ${variantLineLabel(v)} — ${v.availabilityLine}${price}`
        );
      }
      lines.push("");
      continue;
    }
    const item = card.item;
    const price = item.priceLabel ? ` · from ${item.priceLabel}` : "";
    lines.push(`• ${item.displayName} — ${item.availabilityLine}${price}`);
  }
  lines.push(`Order: ${params.orderUrl}`);
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
  const introHtml = `<p style="font-size:16px;line-height:1.55;margin:0 0 20px;color:#1A1A1A;">${escapeHtml(params.introMessage).replace(/\n/g, "<br/>")}</p>`;
  const itemBlock = introHtml + buildSameDayPickupItemsHtml(params.items);
  const closing = (params.closingMessage ?? DEFAULT_SAME_DAY_CLOSING).trim();
  const closingHtml = closing
    ? `<p style="margin-top:4px;font-size:13px;line-height:1.5;color:#555;">${escapeHtml(closing).replace(/\n/g, "<br/>")}</p>`
    : "";
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
  const suggested = suggestedSameDayTitle();
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
