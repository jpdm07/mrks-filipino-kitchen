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
      className="rounded-lg border border-[color:rgba(251,246,236,0.35)] bg-white/10 px-4 py-2 text-sm font-semibold text-[color:var(--cream)] hover:bg-white/18"
    >
      Log out
    </button>
  );
}
