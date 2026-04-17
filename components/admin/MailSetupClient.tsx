"use client";

import { useCallback, useEffect, useState } from "react";

type Status = {
  usesResend: boolean;
  resendFromSet: boolean;
  smtpUserSet: boolean;
  smtpPasswordSet: boolean;
  smtpHostEffective: string;
  recipientSet: boolean;
  recipientUsesOwnerOrderEmail: boolean;
  transportReady: boolean;
  issues: string[];
};

export function MailSetupClient() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadErr(null);
    const r = await fetch("/api/admin/mail-setup", { credentials: "include" });
    if (r.status === 401) {
      setLoadErr("Sign in to admin first.");
      return;
    }
    if (!r.ok) {
      setLoadErr("Could not load mail status.");
      return;
    }
    setStatus((await r.json()) as Status);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sendTest = async () => {
    setTestMsg(null);
    setBusy(true);
    try {
      const r = await fetch("/api/admin/mail-setup", {
        method: "POST",
        credentials: "include",
      });
      const j = (await r.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!r.ok) {
        setTestMsg(j.error ?? "Test send failed.");
        return;
      }
      setTestMsg(j.message ?? "Sent.");
    } catch {
      setTestMsg("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {loadErr ? (
        <p className="text-sm font-medium text-[var(--accent)]">{loadErr}</p>
      ) : null}
      {!status && !loadErr ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : null}
      {status ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
          <ul className="space-y-2 text-[var(--text)]">
            <li>
              <strong>Path:</strong>{" "}
              {status.usesResend ? "Resend API" : "SMTP (Nodemailer)"}
            </li>
            {status.usesResend ? (
              <li>
                <strong>RESEND_FROM_EMAIL:</strong>{" "}
                {status.resendFromSet ? "set" : "missing"}
              </li>
            ) : (
              <>
                <li>
                  <strong>EMAIL_USER:</strong> {status.smtpUserSet ? "set" : "missing"}
                </li>
                <li>
                  <strong>EMAIL_PASSWORD:</strong>{" "}
                  {status.smtpPasswordSet ? "set" : "missing"}
                </li>
                <li>
                  <strong>SMTP host (effective):</strong> {status.smtpHostEffective}
                </li>
              </>
            )}
            <li>
              <strong>New-order recipient:</strong>{" "}
              {status.recipientSet
                ? status.recipientUsesOwnerOrderEmail
                  ? "OWNER_ORDER_EMAIL"
                  : "EMAIL_USER (OWNER_ORDER_EMAIL not set)"
                : "not configured"}
            </li>
            <li>
              <strong>Transport ready:</strong>{" "}
              {status.transportReady ? "yes" : "no"}
            </li>
          </ul>
          {status.issues.length > 0 ? (
            <ul className="mt-4 list-disc space-y-2 border-t border-[var(--border)] pt-4 pl-5 text-[var(--accent)]">
              {status.issues.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 border-t border-[var(--border)] pt-4 text-[var(--text-muted)]">
              No obvious configuration gaps. If mail still does not arrive, check spam and
              Vercel function logs for <code className="text-xs">[mailer]</code> or{" "}
              <code className="text-xs">[orders]</code>.
            </p>
          )}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          onClick={() => void sendTest()}
        >
          {busy ? "Sending…" : "Send test email"}
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold"
          onClick={() => void load()}
        >
          Refresh status
        </button>
      </div>
      {testMsg ? (
        <p className="text-sm font-medium text-[var(--text)]" role="status">
          {testMsg}
        </p>
      ) : null}
    </div>
  );
}
