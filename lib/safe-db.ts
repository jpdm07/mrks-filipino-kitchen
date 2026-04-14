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

/** True when the database layer is unreachable (engine, file, or connection). */
export function isDatabaseUnavailableError(err: unknown): boolean {
  if (isPrismaEngineError(err)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Can't reach database server") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("P1001") ||
    msg.includes("SQLITE_CANTOPEN") ||
    msg.includes("unable to open database file")
  );
}

export async function safeDb<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isPrismaEngineError(err)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[mrk] Database engine unavailable (common on Windows on ARM). Using built-in menu fallback. For full DB: use x64 Node, WSL2, or set PRISMA_CLIENT_FORCE_WASM=true and run npx prisma generate."
        );
      }
      return fallback;
    }
    throw err;
  }
}
