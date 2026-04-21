"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HREF = "/admin/inquiries";

export function AdminInquiriesHeaderLink() {
  const pathname = usePathname();
  const active = pathname === HREF || pathname.startsWith(`${HREF}/`);

  return (
    <Link
      href={HREF}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-10 items-center rounded-full border-2 px-4 py-2 text-sm font-bold shadow-sm transition duration-200 hover:opacity-90 ${
        active
          ? "border-[color:var(--gold)] bg-[color:var(--gold)] text-[color:var(--primary)] ring-2 ring-[color:var(--gold-muted)] ring-offset-2 ring-offset-[color:var(--primary)]"
          : "border-[color:rgba(251,246,236,0.45)] bg-transparent text-[color:var(--cream)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)]"
      }`}
    >
      Contact messages
    </Link>
  );
}
