import { MailSetupClient } from "@/components/admin/MailSetupClient";

export default function MailSetupPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--text)]">Mail &amp; new-order email</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        See what the <strong>production server</strong> thinks is configured (not your laptop
        <code className="mx-1 rounded bg-[var(--card)] px-1">.env.local</code>). Send a test
        message to the same inbox as new-order notifications.
      </p>
      <MailSetupClient />
    </div>
  );
}
