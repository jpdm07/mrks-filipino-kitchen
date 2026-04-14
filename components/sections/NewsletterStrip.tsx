"use client";

import { useState } from "react";

export function NewsletterStrip() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(data.message ?? "Thanks for subscribing!");
      setEmail("");
      setName("");
    } else {
      setMsg(data.error ?? "Something went wrong.");
    }
  };

  return (
    <section className="border-y border-[var(--gold-bright)]/40 bg-gradient-to-b from-[var(--gold-light)] via-[var(--gold)]/90 to-[var(--gold-bright)]/80 py-12 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text)]">
          Get menu updates &amp; specials
        </h2>
        <form
          onSubmit={submit}
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center"
        >
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[48px] flex-1 rounded-lg border border-[var(--border)] px-4 sm:max-w-xs"
          />
          <input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-[48px] flex-1 rounded-lg border border-[var(--border)] px-4 sm:max-w-xs"
          />
          <button type="submit" className="btn btn-primary btn-sm px-6">
            Subscribe
          </button>
        </form>
        {msg ? (
          <p className="mt-4 text-sm font-semibold text-[var(--primary-dark)]">
            {msg}
          </p>
        ) : null}
      </div>
    </section>
  );
}
