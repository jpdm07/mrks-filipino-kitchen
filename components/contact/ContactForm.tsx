"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { FacebookIcon } from "@/components/ui/FacebookIcon";
import Link from "next/link";
import { SITE } from "@/lib/config";

function FormInner() {
  const sp = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Custom Order Inquiry");
  const [message, setMessage] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const s = sp.get("subject");
    const item = sp.get("item");
    if (s === "custom") setSubject("Custom Order Inquiry");
    else if (s === "inquiry" && item)
      setSubject(`Question about: ${item}`);
    else if (s) setSubject(s.replace(/-/g, " "));
  }, [sp]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, subject, message }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("Message sent! We will get back to you soon.");
      setMessage("");
    } else setMsg(data.error ?? "Could not send.");
  };

  return (
    <form
      onSubmit={submit}
      className="mt-8 space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)]"
    >
      {msg ? (
        <p className="rounded-lg bg-[var(--gold-light)] p-3 text-sm font-semibold text-[var(--primary-dark)]">
          {msg}
        </p>
      ) : null}
      <label className="block text-sm font-semibold">
        Name *
        <input
          required
          className="mt-1 w-full min-h-[48px] rounded-lg border border-[var(--border)] px-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold">
        Email *
        <input
          required
          type="email"
          className="mt-1 w-full min-h-[48px] rounded-lg border border-[var(--border)] px-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold">
        Phone *
        <input
          required
          type="tel"
          className="mt-1 w-full min-h-[48px] rounded-lg border border-[var(--border)] px-3"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold">
        Subject
        <input
          className="mt-1 w-full min-h-[48px] rounded-lg border border-[var(--border)] px-3"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold">
        Message *
        <textarea
          required
          rows={5}
          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <button
        type="submit"
        className="btn btn-primary btn-block"
      >
        Send message
      </button>
    </form>
  );
}

export function ContactForm() {
  return (
    <Suspense fallback={<div className="py-8 text-sm text-[var(--text-muted)]">Loading form…</div>}>
      <FormInner />
    </Suspense>
  );
}

export function ContactHero() {
  return (
    <section className="border-b border-[var(--border)] bg-[var(--bg-section)] py-12">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text)]">
          Contact
        </h1>
        <div className="mt-6 space-y-3 text-left text-[var(--text)] md:text-center">
          <p>
            📞{" "}
            <a href={SITE.phoneTel} className="font-bold text-[var(--primary)]">
              {SITE.phoneDisplay}
            </a>
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Preferred method of contact. If no answer, please leave a voicemail.
          </p>
          <p>
            📧{" "}
            <a href={`mailto:${SITE.email}`} className="text-[var(--primary)]">
              {SITE.email}
            </a>
          </p>
          <p>📍 {SITE.location}</p>
          <p className="font-semibold text-[var(--accent)]">
            🚗 Pickup Only: No Delivery
          </p>
        </div>
        <div className="mt-8">
          <FacebookIcon size={48} className="mx-auto text-[#1877F2]" />
          <p className="mt-2 font-semibold">Find us on Facebook</p>
          <Link
            href={SITE.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-facebook mt-4 px-6"
          >
            Visit Our Facebook Page
          </Link>
        </div>
      </div>
    </section>
  );
}
