import { Logo } from "@/components/ui/Logo";
import { adminLoginAction } from "./actions";

export const dynamic = "force-dynamic";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { err?: string | string[] };
}) {
  const raw = searchParams.err;
  const code = Array.isArray(raw) ? raw[0] : raw;
  const message =
    code === "auth"
      ? "Invalid username or password"
      : code === "cfg"
        ? "Admin login is not configured on the server (set ADMIN_USERNAME and ADMIN_PASSWORD in the host environment)."
        : null;

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-10 sm:py-14">
      <Logo size="md" />
      <form
        action={adminLoginAction}
        className="mt-8 w-full max-w-sm space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)]"
      >
        <h1 className="text-center font-[family-name:var(--font-playfair)] text-2xl font-bold">
          Admin login
        </h1>
        {message ? (
          <p className="text-center text-sm font-medium text-[var(--accent)]">
            {message}
          </p>
        ) : null}
        <label className="block text-sm font-semibold">
          Username
          <input
            name="username"
            required
            autoComplete="username"
            className="mt-1 w-full min-h-[48px] rounded-lg border border-[var(--border)] px-3"
          />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full min-h-[48px] rounded-lg border border-[var(--border)] px-3"
          />
        </label>
        <button
          type="submit"
          className="min-h-[48px] w-full rounded-lg bg-[var(--primary)] font-bold text-white"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
