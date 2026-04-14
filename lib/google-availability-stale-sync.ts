import {
  addCalendarDaysYMD,
  getTodayInPickupTimezoneYMD,
} from "@/lib/pickup-lead-time";
import { syncGoogleCalendarAvailabilityToDatabase } from "@/lib/availability-google-sync";

type SyncState = {
  inFlight: Promise<void> | null;
  lastAttemptAt: number;
};

const GLOBAL_KEY = "__mrkGoogleAvailabilityPublicSync";

function syncState(): SyncState {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: SyncState };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { inFlight: null, lastAttemptAt: 0 };
  }
  return g[GLOBAL_KEY];
}

function syncIntervalMs(): number {
  const raw = process.env.GOOGLE_AVAILABILITY_SYNC_MINUTES;
  const n = raw != null && raw.trim() !== "" ? Number(raw) : 5;
  const minutes = Number.isFinite(n) && n > 0 ? Math.min(n, 120) : 5;
  return minutes * 60 * 1000;
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_PRIVATE_KEY?.trim() &&
      process.env.GOOGLE_CALENDAR_ID?.trim()
  );
}

export function getGoogleAvailabilitySyncEnvSummary(): {
  autoSyncEnabled: boolean;
  calendarConfigured: boolean;
} {
  return {
    autoSyncEnabled: process.env.GOOGLE_AVAILABILITY_AUTO_SYNC !== "false",
    calendarConfigured: isGoogleCalendarConfigured(),
  };
}

/**
 * Throttled Google Calendar → DB sync that does **not** block the caller.
 * Public routes should call this and then read the database immediately so
 * admin panel saves appear on the storefront without waiting on Google’s API.
 */
export function kickGoogleAvailabilityBackgroundSync(): void {
  if (process.env.GOOGLE_AVAILABILITY_AUTO_SYNC === "false") return;
  if (!isGoogleCalendarConfigured()) return;

  const intervalMs = syncIntervalMs();
  const state = syncState();
  const now = Date.now();

  if (state.inFlight) return;
  if (now - state.lastAttemptAt < intervalMs) return;

  const run = (async () => {
    try {
      const t = getTodayInPickupTimezoneYMD();
      const to = addCalendarDaysYMD(t, 120);
      await syncGoogleCalendarAvailabilityToDatabase(t, to, {
        closeMissingInRange: false,
      });
    } catch (e) {
      console.warn("[mrk] Google availability background sync failed:", e);
    } finally {
      state.inFlight = null;
    }
  })();

  state.inFlight = run;
  state.lastAttemptAt = Date.now();
}

/**
 * @deprecated Prefer {@link kickGoogleAvailabilityBackgroundSync} on public routes
 * so availability JSON is not delayed by Google. Kept for any code that must await.
 */
export async function maybeSyncGoogleAvailabilityFromPublicRequest(): Promise<void> {
  if (process.env.GOOGLE_AVAILABILITY_AUTO_SYNC === "false") return;
  if (!isGoogleCalendarConfigured()) return;

  const intervalMs = syncIntervalMs();
  const state = syncState();
  const now = Date.now();

  if (state.inFlight) {
    await state.inFlight;
    return;
  }
  if (now - state.lastAttemptAt < intervalMs) return;

  const run = (async () => {
    try {
      const t = getTodayInPickupTimezoneYMD();
      const to = addCalendarDaysYMD(t, 120);
      await syncGoogleCalendarAvailabilityToDatabase(t, to, {
        closeMissingInRange: false,
      });
    } catch (e) {
      console.warn("[mrk] Google availability sync failed:", e);
    } finally {
      state.inFlight = null;
    }
  })();

  state.inFlight = run;
  state.lastAttemptAt = Date.now();
  await run;
}
