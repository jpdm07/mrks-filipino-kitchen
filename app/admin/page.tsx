"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) router.push("/admin/dashboard");
    else setErr("Invalid username or password");
  };

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-10 sm:py-14">
      <Logo size="md" />
      <form
        onSubmit={submit}
        className="mt-8 w-full max-w-sm space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)]"
      >
        <h1 className="text-center font-[family-name:var(--font-playfair)] text-2xl font-bold">
          Admin login
        </h1>
        {err ? (
          <p className="text-center text-sm font-medium text-[var(--accent)]">
            {err}
          </p>
        ) : null}
        <label className="block text-sm font-semibold">
          Username
          <input
            className="mt-1 w-full min-h-[48px] rounded-lg border border-[var(--border)] px-3"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <input
            type="password"
            className="mt-1 w-full min-h-[48px] rounded-lg border border-[var(--border)] px-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
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
