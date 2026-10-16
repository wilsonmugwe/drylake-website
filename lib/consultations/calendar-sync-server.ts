import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { alertCalendarAuthFailure } from "./calendar-alert-server";
import { type CalendarSyncSummary, type SyncRow, runCalendarSyncPass } from "./calendar-sync";
import { calendarSetting } from "./calendar/provider";
import { FOUNDER_NOTIFICATION_EMAILS } from "./config";

/*
 * One calendar sync pass with the service-role client the CALLER created (route handlers only).
 * Does nothing (returns null) while CONSULTATION_CALENDAR_PROVIDER is "none": bookings stay
 * queued and are synced once Microsoft 365 is connected. Never throws: callers run this after
 * the response (after()) or from the cron, and the queue is durable.
 */
export async function runCalendarSync(
  supabase: SupabaseClient,
  options: { bookingId?: string | null; limit?: number } = {}
): Promise<CalendarSyncSummary | null> {
  const setting = calendarSetting(process.env);
  if (setting.mode !== "microsoft") {
    if (setting.mode === "misconfigured") console.error("Consultation calendar sync skipped:", setting.reason);
    return null;
  }

  try {
    return await runCalendarSyncPass(
      {
        provider: setting.provider,
        alertAuthFailure: alertCalendarAuthFailure,
        async claimOne(bookingId) {
          const { data, error } = await supabase.rpc("consultation_claim_calendar_sync", {
            p_limit: 1,
            p_lease: "5 minutes",
            p_booking_id: bookingId,
            p_founder_emails: [...FOUNDER_NOTIFICATION_EMAILS],
          });
          if (error) throw new Error(`calendar claim failed: ${error.code ?? ""} ${error.message}`);
          return (data ?? []) as SyncRow[];
        },
        async finish(row, outcome, result, message, retryAfterMinutes) {
          const { error } = await supabase.rpc("consultation_finish_calendar_sync", {
            p_booking_id: row.id,
            p_version: row.version,
            p_lease_until: row.calendar_lease_until,
            p_outcome: outcome,
            p_event_id: result?.eventId ?? null,
            p_event_owner: result?.owner ?? null,
            p_join_url: result?.joinUrl ?? null,
            p_error: message,
            p_retry_after: `${retryAfterMinutes} minutes`,
            p_founder_emails: [...FOUNDER_NOTIFICATION_EMAILS],
          });
          // The lease expires and the booking is retried; every attempt searches by booking tag
          // first, so a retry adopts or cancels what an earlier attempt created.
          if (error) console.error("Consultation calendar sync: finish failed:", error.code ?? "", error.message);
        },
      },
      options
    );
  } catch (error) {
    console.error("Consultation calendar sync pass failed:", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}
