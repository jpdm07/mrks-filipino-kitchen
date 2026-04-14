import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE_NAME = "mrk_admin_session";
const MAX_AGE_SEC = 60 * 60 * 24;

function secret(): string {
  const raw =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD ||
    "dev-insecure";
  return raw.trim();
}

/** HTTPS on Vercel (including previews); local dev is usually HTTP. */
function cookieSecure(): boolean {
  if (process.env.VERCEL === "1") return true;
  return process.env.NODE_ENV === "production";
}

/** New signed token for Set-Cookie (use with `NextResponse.cookies.set` in Route Handlers). */
export function newAdminSessionToken(): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  return signAdminSession(exp);
}

export function adminSessionCookieSettings(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

export function signAdminSession(expMs: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: expMs }), "utf8").toString(
    "base64url"
  );
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export async function setAdminCookie(): Promise<void> {
  cookies().set(
    ADMIN_COOKIE_NAME,
    newAdminSessionToken(),
    adminSessionCookieSettings()
  );
}

export async function clearAdminCookie(): Promise<void> {
  cookies().set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Match `adminSessionCookieSettings` when clearing so the browser drops the session cookie in production. */
export function adminSessionClearCookieSettings(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };
}

export function getAdminTokenFromRequest(
  cookieHeader: string | null
): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function requireAdmin(): Promise<void> {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminToken(token)) redirect("/admin");
}

export async function isAdminSession(): Promise<boolean> {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminToken(token);
}
