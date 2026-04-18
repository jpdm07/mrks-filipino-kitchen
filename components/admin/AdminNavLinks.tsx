import Link from "next/link";
import type { AdminNavBadgeCounts } from "@/lib/admin-nav-badges";

function NavBadge({ n, label }: { n: number; label: string }) {
  if (n <= 0) return null;
  const text = n > 99 ? "99+" : String(n);
  return (
    <span
      className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-black leading-none text-amber-950 shadow-sm ring-1 ring-amber-700/20"
      aria-label={`${label}: ${n}`}
    >
      {text}
    </span>
  );
}

const LINK_DEFS: {
  href: string;
  label: string;
  count: (b: AdminNavBadgeCounts) => number;
  badgeLabel: string;
}[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    count: (b) => b.dashboardPayment,
    badgeLabel: "Orders needing payment attention",
  },
  { href: "/admin/analytics", label: "Analytics", count: () => 0, badgeLabel: "" },
  {
    href: "/admin/inquiries",
    label: "Messages",
    count: (b) => b.unreadInquiries,
    badgeLabel: "Unread contact messages",
  },
  { href: "/admin/availability", label: "Availability", count: () => 0, badgeLabel: "" },
  { href: "/admin/mail-setup", label: "Mail setup", count: () => 0, badgeLabel: "" },
  { href: "/admin/inventory", label: "Inventory", count: () => 0, badgeLabel: "" },
  {
    href: "/admin/menu-manager",
    label: "Menu Manager",
    count: () => 0,
    badgeLabel: "",
  },
  { href: "/admin/pricing", label: "Pricing", count: () => 0, badgeLabel: "" },
  {
    href: "/admin/subscribers",
    label: "Subscribers",
    count: () => 0,
    badgeLabel: "",
  },
  {
    href: "/admin/suggestions",
    label: "Suggestions",
    count: (b) => b.recentDishSuggestions,
    badgeLabel: "Dish suggestions in the last 7 days",
  },
  {
    href: "/admin/earnings-planner",
    label: "Earnings planner",
    count: () => 0,
    badgeLabel: "",
  },
  { href: "/admin/finances", label: "Finances", count: () => 0, badgeLabel: "" },
  {
    href: "/admin/tax-documentation",
    label: "Tax export",
    count: () => 0,
    badgeLabel: "",
  },
  {
    href: "/admin/kitchen-guide",
    label: "Kitchen guide",
    count: () => 0,
    badgeLabel: "",
  },
  {
    href: "/admin/grocery-list",
    label: "Grocery list",
    count: () => 0,
    badgeLabel: "",
  },
  {
    href: "/admin/business-card",
    label: "Business Card",
    count: () => 0,
    badgeLabel: "",
  },
];

export function AdminNavLinks({ badges }: { badges: AdminNavBadgeCounts }) {
  const items = LINK_DEFS.map((d) => ({
    href: d.href,
    label: d.label,
    badge: d.count(badges),
    badgeLabel: d.badgeLabel,
  }));

  return (
    <nav
      className="mt-3 flex flex-nowrap gap-2 overflow-x-auto border-t border-[var(--border)] pt-3 pb-1 text-sm font-medium [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5"
      aria-label="Admin sections"
    >
      {items.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`inline-flex shrink-0 items-center rounded-full px-3 py-2 whitespace-nowrap hover:bg-[var(--gold-light)] ${
            l.badge > 0
              ? "ring-2 ring-amber-400/80 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]"
              : ""
          }`}
        >
          <span>{l.label}</span>
          <NavBadge n={l.badge} label={l.badgeLabel} />
        </Link>
      ))}
    </nav>
  );
}
