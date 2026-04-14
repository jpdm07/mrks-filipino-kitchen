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
