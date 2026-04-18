export function isPrismaEngineError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  return (
    name === "PrismaClientInitializationError" ||
    name === "PrismaClientRustPanicError" ||
    msg.includes("query_engine") ||
    msg.includes("Query Engine") ||
    msg.includes("Could not locate the Query Engine") ||
    msg.includes("not a valid Win32 application") ||
    msg.includes("Incompatible") ||
    msg.includes("Unable to require") ||
    msg.includes("Unable to establish a connection to query-engine") ||
    (msg.includes("arm64") && msg.includes("not supported"))
  );
}

function prismaErrorCode(err: unknown): string | null {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code?: unknown }).code;
    return typeof c === "string" ? c : null;
  }
  return null;
}

/** P#### from Prisma errors for logs/response headers (no credentials). */
export function prismaDiagnosticCode(err: unknown): string | null {
  const fromField = prismaErrorCode(err);
  if (fromField && /^P\d{4}$/.test(fromField)) return fromField;
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/\b(P\d{4})\b/);
  return m?.[1] ?? null;
}

/** True when the database layer is unreachable (engine, file, or connection). */
export function isDatabaseUnavailableError(err: unknown): boolean {
  if (isPrismaEngineError(err)) return true;
  const code = prismaErrorCode(err);
  if (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1017" ||
    code === "P2024"
  ) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Can't reach database server") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("P1001") ||
    msg.includes("P1002") ||
    msg.includes("P1017") ||
    msg.includes("P2024") ||
    msg.includes("SQLITE_CANTOPEN") ||
    msg.includes("unable to open database file")
  );
}

export async function safeDb<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!isDatabaseUnavailableError(err)) throw err;
    if (process.env.NODE_ENV === "development") {
      if (isPrismaEngineError(err)) {
        console.warn(
          "[mrk] Database engine unavailable (common on Windows on ARM). Using built-in menu fallback. For full DB: use x64 Node, WSL2, or set PRISMA_CLIENT_FORCE_WASM=true and run npx prisma generate."
        );
      } else {
        console.warn(
          "[mrk] Database unreachable — using fallback data. Check DATABASE_URL (e.g. Neon pooled URL on Vercel)."
        );
      }
    } else {
      console.warn("[mrk] Database unreachable — using fallback data.");
    }
    return fallback;
  }
}

const VERCEL_DB_CHECKLIST =
  "1) Vercel → your project → Settings → Environment Variables → ensure DATABASE_URL exists for Production (and Preview if you use preview URLs). " +
  "2) Paste the same pooled Postgres URL you use locally (Neon: Connection string → “Pooled”, often contains pooler…neon.tech). " +
  "3) Append ?sslmode=require if the string does not already include sslmode=. " +
  "4) Save variables, then redeploy (Deployments → … → Redeploy).";

/**
 * Safe copy for admin UI when Prisma fails (no secrets). Logs should capture full `err`.
 */
export function userFacingAdminDatabaseError(err: unknown): string {
  const code = prismaDiagnosticCode(err);
  const msg = err instanceof Error ? err.message : String(err);

  if (
    code === "P2021" ||
    (msg.includes("does not exist") &&
      (msg.includes("relation") || msg.includes("table")))
  ) {
    return (
      `Database tables are missing (schema not applied${code ? `, ${code}` : ""}). ` +
      `On your computer, put the production DATABASE_URL in .env.local and run: npm run db:migrate`
    );
  }

  /** Column exists in Prisma schema but not in the DB — migrations not applied (or wrong database). */
  if (code === "P2022") {
    let detail = "";
    if (err && typeof err === "object" && "meta" in err) {
      const col = (err as { meta?: { column?: unknown } }).meta?.column;
      if (typeof col === "string") detail = ` Prisma reported: ${col}`;
    }
    return (
      `Production database is missing a column your code expects (P2022).${detail}\n\n` +
      `This is almost always “migrations never ran on this Neon database,” not a bad password.\n\n` +
      `Fix:\n` +
      `1) In Vercel, copy the Production DATABASE_URL (same as Neon pooled URL).\n` +
      `2) On your PC, put it in .env.local as DATABASE_URL=...\n` +
      `3) From this repo run: npm run db:migrate (loads .env.local so Prisma sees production DATABASE_URL)\n` +
      `4) Redeploy the site (or just refresh the dashboard).\n\n` +
      `If migrate deploy says everything is applied but P2022 persists, the Vercel DATABASE_URL may point at a different Neon branch/database than the one you migrated.`
    );
  }

  if (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1017" ||
    code === "P2024" ||
    isDatabaseUnavailableError(err)
  ) {
    return (
      `Cannot reach the database server${code ? ` (${code})` : ""}. ` +
      VERCEL_DB_CHECKLIST
    );
  }

  return (
    `Database error${code ? ` (${code})` : ""}. ${VERCEL_DB_CHECKLIST} ` +
    `Also open Vercel → this deployment → Logs and search for “prisma” or “admin/dashboard” for the full error.`
  );
}
