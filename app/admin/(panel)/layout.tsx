import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import {
  adminAttentionTotal,
  getAdminNavBadgeCounts,
} from "@/lib/admin-nav-badges";
import { AdminDocumentAttentionTitle } from "@/components/admin/AdminDocumentAttentionTitle";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";
import { AdminLogoutButton } from "./AdminLogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const badges = await getAdminNavBadgeCounts();
  const attentionTotal = adminAttentionTotal(badges);

  return (
    <div className="min-h-screen bg-[var(--bg-section)]">
      <AdminDocumentAttentionTitle total={attentionTotal} />
      <div className="sticky top-0 z-[200] border-b border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin/dashboard"
              className="inline-flex shrink-0 items-center gap-2 font-bold text-[var(--primary)]"
            >
              Mr. K Admin
              {attentionTotal > 0 ? (
                <>
                  <span className="sr-only">
                    {attentionTotal} item{attentionTotal === 1 ? "" : "s"} need
                    attention
                  </span>
                  <span
                    className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 shadow ring-2 ring-amber-200"
                    title={`${attentionTotal} item(s) need attention`}
                    aria-hidden
                  />
                </>
              ) : null}
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/admin/inquiries"
                className="inline-flex min-h-10 items-center rounded-full border-2 border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90"
              >
                Contact messages
              </Link>
              <AdminLogoutButton />
            </div>
          </div>
          <AdminNavLinks badges={badges} />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  );
}
