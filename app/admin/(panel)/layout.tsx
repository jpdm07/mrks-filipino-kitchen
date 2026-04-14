import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminLogoutButton } from "./AdminLogoutButton";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/availability", label: "Availability" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/menu-manager", label: "Menu Manager" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/suggestions", label: "Suggestions" },
  { href: "/admin/finances", label: "Finances" },
  { href: "/admin/kitchen-guide", label: "Kitchen guide" },
  { href: "/admin/business-card", label: "Business Card" },
];

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-[var(--bg-section)]">
      <div className="sticky top-0 z-[200] border-b border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/admin/dashboard"
              className="shrink-0 font-bold text-[var(--primary)]"
            >
              Mr. K Admin
            </Link>
            <AdminLogoutButton />
          </div>
          <nav
            className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3 text-sm font-medium"
            aria-label="Admin sections"
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-3 py-2 hover:bg-[var(--gold-light)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  );
}
