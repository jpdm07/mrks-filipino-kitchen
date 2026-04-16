"use client";

import { useState } from "react";
import type { AdminOrderClientRow } from "@/lib/admin-order-client";
import {
  downloadAdminReceiptHtmlFile,
  openAdminReceiptPrintWindow,
} from "@/lib/admin-receipt-html";

type Props = {
  order: AdminOrderClientRow;
  onNotice?: (n: { type: "success" | "error"; text: string }) => void;
};

export function AdminOrderReceiptActions({ order, onNotice }: Props) {
  const [emailBusy, setEmailBusy] = useState(false);

  const emailReceipt = async () => {
    setEmailBusy(true);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.id)}/email-receipt`,
        { method: "POST", credentials: "same-origin" }
      );
      const data = (await res.json()) as {
        error?: string;
        emailedTo?: string;
        message?: string;
      };
      if (!res.ok) {
        const msg =
          data.error ??
          "Could not send the receipt email. Check server env: EMAIL_USER + EMAIL_PASSWORD (SMTP), or Resend when you add it.";
        if (onNotice) onNotice({ type: "error", text: msg });
        else window.alert(msg);
        return;
      }
      const okMsg =
        data.message ??
        `Receipt emailed to ${data.emailedTo ?? order.email}. Check spam if it does not arrive.`;
      if (onNotice) onNotice({ type: "success", text: okMsg });
      else window.alert(okMsg);
    } catch {
      const msg = "Could not send the receipt email. Try again.";
      if (onNotice) onNotice({ type: "error", text: msg });
      else window.alert(msg);
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded border border-[var(--primary)] bg-[var(--gold-light)] px-4 py-2 text-sm font-bold text-[var(--primary)]"
        onClick={() => openAdminReceiptPrintWindow(order)}
      >
        Print receipt
      </button>
      <button
        type="button"
        className="rounded border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--text)]"
        onClick={() => downloadAdminReceiptHtmlFile(order)}
      >
        Save receipt
      </button>
      <button
        type="button"
        disabled={emailBusy}
        className="rounded border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        onClick={() => void emailReceipt()}
      >
        {emailBusy ? "Sending…" : "Email receipt"}
      </button>
    </div>
  );
}
