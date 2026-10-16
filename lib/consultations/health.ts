/*
 * Consultation liveness for GET /api/health. PURE (tests/consultation-health.test.mjs); the
 * database and sign-in reads live in health-server.ts.
 *
 * Public endpoint, so the output is counts, ages, timestamps and status words only: no booking
 * ids, names, emails, references, error text or variable names.
 *
 * What can and cannot be derived from the database (honest limits, repeated in the runbook):
 *  - Last successful dispatch: the newest sent_at in the outbox. Quiet periods are normal, so an
 *    old value alone is not a fault.
 *  - Oldest pending age: how long the oldest DUE, unsent email has waited. This is the fault
 *    signal: with the minute trigger running it stays under about two minutes.
 *  - Minute trigger: "running" when any outbox attempt happened in the last 10 minutes; "stalled"
 *    when due email has waited longer than that with no attempt; otherwise "unknown", because an
 *    idle outbox gives pg_cron nothing to leave a trace of. Whether the pg_cron job exists is only
 *    visible in Supabase (cron.job_run_details), which the runbook checks by SQL.
 */

import { type CalendarFailureKind, classifyStoredError } from "./calendar/types.ts";

export const TRIGGER_WINDOW_MINUTES = 10;

export type ProbeResult = "ok" | CalendarFailureKind | "skipped";

export type ConsultationHealthInput = {
  provider: "none" | "microsoft" | "misconfigured";
  lastSentAt: string | null;
  lastAttemptAt: string | null;
  /** send_after of the oldest PENDING email that is already due; null when nothing is waiting. */
  oldestDueSendAfter: string | null;
  failedNotifications: number;
  /** calendar_last_error text of bookings whose calendar update is still unresolved. */
  unresolvedCalendarErrors: ReadonlyArray<string | null>;
  probe: ProbeResult;
};

export type CredentialStatus = "not_connected" | "ok" | "expired" | "auth_failed" | "unknown";

export type ConsultationHealth = {
  available: true;
  dispatch: {
    lastSuccessfulAt: string | null;
    oldestPendingAgeSeconds: number | null;
    lastAttemptAt: string | null;
    minuteTrigger: "running" | "stalled" | "unknown";
    failedNotifications: number;
  };
  calendar: {
    provider: "none" | "microsoft" | "misconfigured";
    credentials: CredentialStatus;
    unresolvedSyncFailures: number;
  };
};

export type ConsultationHealthUnavailable = { available: false };

const ageSeconds = (iso: string | null, now: Date): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.max(0, Math.round((now.getTime() - t) / 1000));
};

export function credentialStatus(input: Pick<ConsultationHealthInput, "provider" | "probe" | "unresolvedCalendarErrors">): CredentialStatus {
  if (input.provider === "none") return "not_connected";
  if (input.provider === "misconfigured") return "auth_failed";

  const kinds = input.unresolvedCalendarErrors.map(classifyStoredError);
  const storedExpired = kinds.includes("credential_expired");
  const storedAuth = kinds.includes("auth");

  // The live sign-in probe is the freshest word on the secret itself.
  if (input.probe === "credential_expired") return "expired";
  if (input.probe === "auth") return "auth_failed";
  // Sign-in works but Graph refused (RBAC removed): only stored errors can show that.
  if (storedAuth) return "auth_failed";
  if (input.probe === "ok") return "ok";
  if (storedExpired) return "expired";
  return "unknown";
}

export function summariseConsultationHealth(input: ConsultationHealthInput, now: Date = new Date()): ConsultationHealth {
  const oldestPendingAgeSeconds = ageSeconds(input.oldestDueSendAfter, now);
  const sinceAttempt = ageSeconds(input.lastAttemptAt, now);
  const window = TRIGGER_WINDOW_MINUTES * 60;

  const minuteTrigger =
    sinceAttempt !== null && sinceAttempt <= window
      ? "running"
      : oldestPendingAgeSeconds !== null && oldestPendingAgeSeconds > window
        ? "stalled"
        : "unknown";

  return {
    available: true,
    dispatch: {
      lastSuccessfulAt: input.lastSentAt,
      oldestPendingAgeSeconds,
      lastAttemptAt: input.lastAttemptAt,
      minuteTrigger,
      failedNotifications: input.failedNotifications,
    },
    calendar: {
      provider: input.provider,
      credentials: credentialStatus(input),
      unresolvedSyncFailures: input.unresolvedCalendarErrors.length,
    },
  };
}

/**
 * True when the report should turn the health endpoint "degraded" (HTTP 503) so an uptime monitor
 * alerts: Microsoft refusing the credentials means customers cannot book. A stalled minute
 * trigger is reported but does not degrade: until pg_cron is scheduled (a manual step), due
 * reminders legitimately wait for the daily backstop, and a permanent 503 would train people to
 * ignore the monitor.
 */
export function consultationNeedsAttention(health: ConsultationHealth | ConsultationHealthUnavailable): boolean {
  if (!health.available) return false;
  return health.calendar.credentials === "expired" || health.calendar.credentials === "auth_failed";
}
