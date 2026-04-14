import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { InquiriesAdminClient } from "@/components/admin/InquiriesAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage() {
  await requireAdmin();
  const raw = await prisma.inquiry.findMany({
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
  });
  const inquiries = JSON.parse(JSON.stringify(raw));
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Contact inquiries
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Submissions from the public contact / custom inquiry form. Use the
        checkboxes and <strong className="text-[var(--text)]">Delete selected</strong>,
        or the red <strong className="text-[var(--text)]">Delete</strong> button on
        each message, to remove them permanently.
      </p>
      <InquiriesAdminClient initialInquiries={inquiries} />
    </div>
  );
}
