"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE_NAME,
  adminSessionCookieSettings,
  newAdminSessionToken,
} from "@/lib/admin-auth";

/**
 * Server Action login: sets the session cookie on the same RSC response stream.
 * More reliable on Vercel than POST /api/admin/auth + fetch (Set-Cookie on API routes).
 */
export async function adminLoginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const u = (process.env.ADMIN_USERNAME ?? "").trim();
  const p = (process.env.ADMIN_PASSWORD ?? "").trim();

  if (!u || !p) {
    redirect("/admin?err=cfg");
  }
  if (username !== u || password !== p) {
    redirect("/admin?err=auth");
  }

  cookies().set(
    ADMIN_COOKIE_NAME,
    newAdminSessionToken(),
    adminSessionCookieSettings()
  );
  redirect("/admin/dashboard");
}
