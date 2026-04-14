"use client";

import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/auth", { method: "DELETE" });
        router.push("/admin");
        router.refresh();
      }}
      className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold"
    >
      Log out
    </button>
  );
}
