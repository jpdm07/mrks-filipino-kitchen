import { headers } from "next/headers";
import { getPublicSiteOrigin } from "@/lib/public-site-url";

/**
 * Build an absolute URL for share buttons (Host / X-Forwarded-* on Vercel;
 * then NEXT_PUBLIC_SITE_URL; else canonical mrkskitchen.com).
 */
export function getPublicAbsoluteUrl(pathWithLeadingSlash: string): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const rawProto = h.get("x-forwarded-proto") ?? "http";
  const proto = rawProto.split(",")[0]?.trim() || "http";
  if (host) {
    return `${proto}://${host}${pathWithLeadingSlash}`;
  }
  return `${getPublicSiteOrigin()}${pathWithLeadingSlash}`;
}
