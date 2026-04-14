import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { SubscribersClient } from "@/components/admin/SubscribersClient";

export default async function SubscribersPage() {
  await requireAdmin();
  const [subscribersRaw, menuItems] = await Promise.all([
    prisma.subscriber.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.menuItem.findMany({ orderBy: { name: "asc" } }),
  ]);
  const subscribers = subscribersRaw.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));
  return (
    <div>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold">
        Subscribers
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Total: {subscribers.length}
      </p>
      <SubscribersClient
        initialSubscribers={subscribers}
        menuItems={menuItems.map((m) => ({ id: m.id, name: m.name }))}
      />
    </div>
  );
}
