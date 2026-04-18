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
          ? "border-white bg-white text-[var(--primary)] ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--card)]"
          : "border-[var(--primary)] bg-[var(--primary)] text-white"
      }`}
    >
      Contact messages
    </Link>
  );
}
