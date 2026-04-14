"use client";

export function AdminLogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/auth", {
          method: "DELETE",
          credentials: "same-origin",
        });
        window.location.assign("/admin");
      }}
      className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold"
    >
      Log out
    </button>
  );
}
