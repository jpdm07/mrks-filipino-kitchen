import type { MenuItem } from "@prisma/client";
import { parseMenuSizes } from "@/lib/menu-types";
import { resolveEmailMenuPhotoUrl } from "@/lib/menu-photo-url";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function spotlightPrice(item: MenuItem): string {
  const sizes = parseMenuSizes(item.sizes);
  if (sizes[0]?.price != null) return `$${sizes[0].price.toFixed(2)}`;
  return `$${item.basePrice.toFixed(2)}`;
}

/** One card per menu item for subscriber newsletter HTML. */
export function buildNewsletterSpotlightHtml(items: MenuItem[]): string {
  return items
    .map((item) => {
      const price = spotlightPrice(item);
      const photo = resolveEmailMenuPhotoUrl({
        photoUrl: item.photoUrl,
        menuItemId: item.id,
        displayName: item.name,
      });
      const img = photo
        ? `<img data-mrk-photo="${escapeHtml(item.id)}" src="${escapeHtml(photo)}" alt="${escapeHtml(item.name)}" width="560" border="0" style="max-width:560px;width:100%;height:auto;border-radius:12px;display:block;border:0;outline:none;text-decoration:none;"/>`
        : "";
      const soldNote = item.soldOut
        ? `<p style="margin:8px 0 0;font-size:14px;color:#92400e;">Temporarily sold out — you can still browse the rest of the menu.</p>`
        : "";
      return `<div style="margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid #e8e8e8;">
${img}
<h2 style="color:#0e1d35;margin:16px 0 8px;">${escapeHtml(item.name)}</h2>
<p style="margin:0 0 8px;">${escapeHtml(item.description)}</p>
<p style="font-weight:bold;color:#CE1126;">From ${price}</p>
${soldNote}
</div>`;
    })
    .join("");
}

export function buildNewsletterSpotlightPlainText(items: MenuItem[]): string {
  if (items.length === 0) return "";
  const lines = items.map(
    (item) =>
      `- ${item.name} (from ${spotlightPrice(item)})${item.soldOut ? " [sold out for now]" : ""}`
  );
  return ["Featured on the menu:", ...lines, ""].join("\n");
}
