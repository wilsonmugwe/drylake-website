import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { calendarSetting } from "./calendar/provider";
import {
  type ConsultationHealth,
  type ConsultationHealthUnavailable,
  type ProbeResult,
  summariseConsultationHealth,
} from "./health";

const QUERY_BUDGET_MS = 3_000;
/* The sign-in probe talks to Microsoft: at most one per instance per five minutes, however often monitors poll. */
const PROBE_TTL_MS = 5 * 60_000;

let probeCache: { at: number; key: string; result: ProbeResult } | null = null;

async function credentialProbe(env: Record<string, string | undefined>): Promise<ProbeResult> {
  const setting = calendarSetting(env);
  if (setting.mode !== "microsoft") return "skipped";

  const key = `${env.MS_GRAPH_TENANT_ID}|${env.MS_GRAPH_CLIENT_ID}`;
  if (probeCache && probeCache.key === key && Date.now() - probeCache.at < PROBE_TTL_MS) return probeCache.result;

  const result = await Promise.race<ProbeResult>([
    setting.provider.checkCredentials(),
    new Promise<ProbeResult>((resolve) => setTimeout(() => resolve("skipped"), QUERY_BUDGET_MS)),
  ]);
  // A timeout says nothing about the secret: do not cache it, ask again next time.
  if (result !== "skipped") probeCache = { at: Date.now(), key, result };
  return result;
}

/*
 * Consultation dispatch liveness and Microsoft 365 credential status for /api/health, read with
 * the service-role client the ROUTE created. Selects timestamps, counts and the calendar error
 * text only (which is classified, then dropped by summariseConsultationHealth); never a name,
 * email or booking id. Never throws: a database or Microsoft outage reports { available: false }
 * and must not take the health endpoint itself down.
 */
export async function loadConsultationHealth(
  supabase: SupabaseClient,
  env: Record<string, string | undefined>,
  now: Date = new Date()
): Promise<ConsultationHealth | ConsultationHealthUnavailable> {
  try {
    const nowIso = now.toISOString();
    const notifications = () => supabase.from("consultation_notifications");

    const work = Promise.all([
      notifications().select("sent_at").eq("status", "SENT").not("sent_at", "is", null).order("sent_at", { ascending: false }).limit(1),
      notifications().select("last_attempt_at").not("last_attempt_at", "is", null).order("last_attempt_at", { ascending: false }).limit(1),
      notifications().select("send_after").eq("status", "PENDING").lte("send_after", nowIso).order("send_after", { ascending: true }).limit(1),
      notifications().select("id", { count: "exact", head: true }).eq("status", "FAILED"),
      supabase.from("consultation_bookings").select("calendar_last_error").in("calendar_sync_state", ["PENDING", "FAILED"]).not("calendar_last_error", "is", null).limit(20),
      credentialProbe(env),
    ]);
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), QUERY_BUDGET_MS));
    const results = await Promise.race([work, timeout]);
    if (!results) return { available: false };

    const [sent, attempt, due, failed, calendarErrors, probe] = results;
    if (sent.error || attempt.error || due.error || failed.error || calendarErrors.error) return { available: false };

    return summariseConsultationHealth(
      {
        provider: calendarSetting(env).mode,
        lastSentAt: (sent.data?.[0] as { sent_at?: string } | undefined)?.sent_at ?? null,
        lastAttemptAt: (attempt.data?.[0] as { last_attempt_at?: string } | undefined)?.last_attempt_at ?? null,
        oldestDueSendAfter: (due.data?.[0] as { send_after?: string } | undefined)?.send_after ?? null,
        failedNotifications: failed.count ?? 0,
        unresolvedCalendarErrors: ((calendarErrors.data ?? []) as Array<{ calendar_last_error: string | null }>).map((r) => r.calendar_last_error),
        probe,
      },
      now
    );
  } catch {
    return { available: false };
  }
}
