import twilio from "twilio";

export function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

function toE164Us(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

/** Twilio `from` is either a US phone (normalized) or a Messaging Service SID. */
function normalizeTwilioFrom(raw: string): string | null {
  const t = raw.trim();
  if (t.startsWith("MG")) return t;
  return toE164Us(t);
}

/** Returns true if Twilio accepted the message; false if skipped or failed. */
export async function sendOwnerSms(body: string): Promise<boolean> {
  const client = getTwilioClient();
  const fromRaw = process.env.TWILIO_FROM_PHONE;
  const ownerRaw = process.env.OWNER_PHONE;
  const from = fromRaw ? normalizeTwilioFrom(fromRaw) : null;
  const to = ownerRaw ? toE164Us(ownerRaw) : null;
  if (!client || !from || !to) {
    console.warn(
      "[Twilio] Owner SMS skipped: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE, and OWNER_PHONE (US number ok, e.g. 9797033827 or +19797033827)."
    );
    return false;
  }
  try {
    await client.messages.create({ from, to, body });
    return true;
  } catch (e) {
    console.error("[Twilio] Owner SMS failed:", e);
    return false;
  }
}

/** SMS to the customer (pickup / payment notices). */
export async function sendCustomerSms(
  customerPhone: string,
  body: string
): Promise<void> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_FROM_PHONE;
  const to = toE164Us(customerPhone);
  if (!client || !from || !to) {
    console.warn("Twilio not configured; skipping customer SMS");
    return;
  }
  await client.messages.create({ from, to, body });
}
