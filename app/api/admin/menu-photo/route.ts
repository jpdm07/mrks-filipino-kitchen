import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";

/**
 * Vercel’s filesystem is ephemeral — files written to public/uploads vanish
 * on the next deploy and break the menu and emails. Kitchen photos must live
 * in git at public/images/ and in MENU_CATALOG.
 */
export async function POST() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    {
      error:
        "Menu photos have to be files in the site (public/images) so they stay in git and never 404 after a deploy. Uploading here would vanish on Vercel. Use the catalog path such as /images/lumpia.jpg.",
    },
    { status: 400 }
  );
}
