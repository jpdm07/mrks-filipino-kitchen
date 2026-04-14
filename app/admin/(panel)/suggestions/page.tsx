import { requireAdmin } from "@/lib/admin-auth";
import { SuggestionsAdminClient } from "@/components/admin/SuggestionsAdminClient";
import { listSuggestions } from "@/lib/suggestion-poll-store";

export default async function SuggestionsAdminPage() {
  await requireAdmin();
  const suggestions = JSON.parse(JSON.stringify(await listSuggestions()));
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Suggestions poll
      </h1>
      <SuggestionsAdminClient initial={suggestions} />
    </div>
  );
}
