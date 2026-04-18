import { EarningsPlannerClient } from "@/components/admin/EarningsPlannerClient";
import { requireAdmin } from "@/lib/admin-auth";

export default async function EarningsPlannerPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-5xl">
      <EarningsPlannerClient />
    </div>
  );
}
