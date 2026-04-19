import Link from "next/link";
import { AdminInquiriesHeaderLink } from "@/components/admin/AdminInquiriesHeaderLink";
import { requireAdmin } from "@/lib/admin-auth";
import {
  adminAttentionTotal,
  getAdminNavBadgeCounts,
} from "@/lib/admin-nav-badges";
import { AdminDocumentAttentionTitle } from "@/components/admin/AdminDocumentAttentionTitle";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";
import { AdminAutoRefresh } from "@/components/admin/AdminAutoRefresh";
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
      <AdminAutoRefresh />
      <AdminDocumentAttentionTitle total={attentionTotal} />
      <div className="sticky top-0 z-[200] border-b border-[var(--border)] bg-[var(--card)] shadow-sm print:hidden">
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
              <AdminInquiriesHeaderLink />
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
