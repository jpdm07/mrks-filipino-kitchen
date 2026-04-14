import { headers } from "next/headers";
import {
  CANONICAL_SITE_ORIGIN,
  getPublicSiteOrigin,
} from "@/lib/public-site-url";

/**
 * Build an absolute URL for share buttons (Host / X-Forwarded-* on Vercel;
 * then NEXT_PUBLIC_SITE_URL; else canonical mrkskitchen.com).
 * Always uses **https://mrkskitchen.com** for that domain (never `www`), matching cards.
 */
export function getPublicAbsoluteUrl(pathWithLeadingSlash: string): string {
  const h = headers();
  const hostHeader = h.get("x-forwarded-host") ?? h.get("host");
  if (hostHeader) {
    const hostname = hostHeader.split(":")[0]?.toLowerCase() ?? "";
    if (hostname === "mrkskitchen.com" || hostname === "www.mrkskitchen.com") {
      return `${CANONICAL_SITE_ORIGIN}${pathWithLeadingSlash}`;
    }
    const rawProto = h.get("x-forwarded-proto") ?? "http";
    const proto = rawProto.split(",")[0]?.trim() || "http";
    return `${proto}://${hostHeader}${pathWithLeadingSlash}`;
  }
  return `${getPublicSiteOrigin()}${pathWithLeadingSlash}`;
}
