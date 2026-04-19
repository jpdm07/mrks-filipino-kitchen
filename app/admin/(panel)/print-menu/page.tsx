import { requireAdmin } from "@/lib/admin-auth";
import { PrintMenuClient } from "@/components/admin/PrintMenuClient";

export const dynamic = "force-dynamic";

export default async function AdminPrintMenuPage() {
  await requireAdmin();
  return (
    <div className="-mx-4 w-[calc(100%+2rem)] print:mx-0 print:w-full">
      <PrintMenuClient />
    </div>
  );
}
