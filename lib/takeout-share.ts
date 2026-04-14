import { SITE } from "@/lib/config";

/** Short line shown in link previews and share UI. */
export const TAKEOUT_SHARE_HOOK = "Check this out!";

export function takeoutOpenGraphTitle(): string {
  return SITE.name;
}

export function takeoutOpenGraphDescription(): string {
  return `${TAKEOUT_SHARE_HOOK} Printable takeout menu · ${SITE.location}`;
}
