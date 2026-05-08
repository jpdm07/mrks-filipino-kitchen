"use client";

import { useState } from "react";
import type { AdminOrderClientRow } from "@/lib/admin-order-client";

type Props = {
  order: AdminOrderClientRow;
  onNotice?: (n: { type: "success" | "error"; text: string }) => void;
};

export function AdminOrderConfirmationActions({
  order,
  onNotice,
}: Props) {
  const [busy, setBusy] = useState(false);

  const sendConfirmation = async () => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.id)}/email-confirmation`,
        { method: "POST", credentials: "same-origin" }
      );

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        emailedTo?: string;
        message?: string;
      };

      if (!res.ok) {
        const msg =
          data.error ??
          "Could not send the order confirmation email. Check server mail env (SMTP or Resend).";
        if (onNotice) onNotice({ type: "error", text: msg });
        else window.alert(msg);
        return;
      }

      const okMsg =
        data.message ??
        `Order confirmation emailed to ${data.emailedTo ?? order.email}.`;
      if (onNotice) onNotice({ type: "success", text: okMsg });
      else window.alert(okMsg);
    } catch {
      const msg = "Could not send the order confirmation email. Try again.";
      if (onNotice) onNotice({ type: "error", text: msg });
      else window.alert(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      className="rounded border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      onClick={() => void sendConfirmation()}
    >
      {busy ? "Sending…" : "Email order confirmation"}
    </button>
  );
}

