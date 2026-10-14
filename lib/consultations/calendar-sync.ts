/*
 * Consultation calendar sync worker. PURE: every dependency is injected (tests use fakes;
 * lib/consultations/calendar-sync-server.ts wires Supabase + the configured provider).
 *
 * Desired state: for each booking, the representative's Outlook calendar holds exactly one live
 * event at the booking's time while it is active, and none once it is cancelled. The database
 * queues a booking whenever that may not hold (created, moved, reassigned, cancelled); this worker:
 *   1. leases due bookings (consultation_claim_calendar_sync, SKIP LOCKED),
 *   2. reconciles each one with the provider (idempotent: looks events up by booking tag before
 *      creating, so a crash between "created" and "recorded" never leaves a duplicate),
 *   3. records the outcome for the booking VERSION it acted on (consultation_finish_calendar_sync);
 *      a booking changed mid-sync stays queued; failures back off and, after the attempt budget,
 *      become FAILED and email both founders.
 * Never logs customer names, addresses or meeting links.
 */

import { type CalendarEvent, type CalendarProvider } from "./calendar/types.ts";
import { type MeetingMethod, REPRESENTATIVES, type Representative, representativeByKey } from "./representatives.ts";

export type SyncRow = {
  id: string;
  reference: string;
  version: number;
  status: string;
  start_time: string;
  end_time: string;
  assigned_representative: string;
  meeting_method: MeetingMethod;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  calendar_event_id: string | null;
  calendar_event_owner: string | null;
  calendar_join_url: string | null;
  calendar_sync_attempts: number;
};

export type SyncResult = { eventId: string | null; owner: string | null; joinUrl: string | null };

export type CalendarSyncDeps = {
  claim(limit: number, bookingId: string | null): Promise<SyncRow[]>;
  finish(row: SyncRow, outcome: "synced" | "retry", result: SyncResult | null, error: string | null, retryAfterMinutes: number): Promise<void>;
  provider: CalendarProvider;
};

export type CalendarSyncSummary = { claimed: number; synced: number; retried: number };

const ACTIVE = new Set(["CONFIRMED", "RESCHEDULED"]);

/* 1, 2, 4 ... minutes, capped at one hour (ten attempts span roughly five hours). */
export function calendarRetryMinutes(attempts: number): number {
  return Math.min(2 ** Math.max(0, attempts - 1), 60);
}

const CANCEL_COMMENT = "This Drylake consultation has been cancelled. Your confirmation email from Drylake has the details.";
const MOVED_COMMENT = "This Drylake consultation has moved to another Drylake representative. A new invitation follows.";

/** Every live event for the booking, in any representative's calendar. */
async function findAll(provider: CalendarProvider, bookingId: string): Promise<Array<{ rep: Representative; event: CalendarEvent }>> {
  const found: Array<{ rep: Representative; event: CalendarEvent }> = [];
  for (const rep of REPRESENTATIVES) {
    const event = await provider.findEvent(rep, bookingId);
    if (event) found.push({ rep, event });
  }
  return found;
}

/** Bring one booking's calendar in line with the booking. Throws on any provider failure. */
export async function reconcileBooking(provider: CalendarProvider, row: SyncRow): Promise<SyncResult> {
  const start = new Date(row.start_time);
  const end = new Date(row.end_time);
  const assigned = representativeByKey(row.assigned_representative);
  const owner = representativeByKey(row.calendar_event_owner);

  // Known events first; with no recorded id, search by booking tag (crash recovery, races).
  const events = row.calendar_event_id && owner ? [{ rep: owner, event: { id: row.calendar_event_id, joinUrl: row.calendar_join_url, start: null } }] : await findAll(provider, row.id);

  if (!ACTIVE.has(row.status) || !assigned) {
    for (const { rep, event } of events) await provider.cancelEvent(rep, event.id, CANCEL_COMMENT);
    return { eventId: null, owner: null, joinUrl: null };
  }

  let keep: { rep: Representative; event: CalendarEvent } | null = null;
  for (const candidate of events) {
    if (!keep && candidate.rep.key === assigned.key) keep = candidate;
    else await provider.cancelEvent(candidate.rep, candidate.event.id, MOVED_COMMENT);
  }

  if (keep) {
    if (keep.event.start !== start.getTime()) await provider.moveEvent(assigned, keep.event.id, start, end);
    return { eventId: keep.event.id, owner: assigned.key, joinUrl: keep.event.joinUrl };
  }

  const created = await provider.createEvent(assigned, {
    bookingId: row.id,
    transactionId: `${row.id}:${assigned.key}:${row.version}`,
    reference: row.reference,
    start,
    end,
    method: row.meeting_method,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
  });
  return { eventId: created.id, owner: assigned.key, joinUrl: created.joinUrl };
}

export async function runCalendarSyncPass(deps: CalendarSyncDeps, options: { limit?: number; bookingId?: string | null } = {}): Promise<CalendarSyncSummary> {
  const rows = await deps.claim(options.limit ?? 10, options.bookingId ?? null);
  const summary: CalendarSyncSummary = { claimed: rows.length, synced: 0, retried: 0 };

  for (const row of rows) {
    try {
      const result = await reconcileBooking(deps.provider, row);
      await deps.finish(row, "synced", result, null, 0);
      summary.synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error("Consultation calendar sync failed:", row.reference, `attempt ${row.calendar_sync_attempts}:`, message);
      await deps.finish(row, "retry", null, message, calendarRetryMinutes(row.calendar_sync_attempts));
      summary.retried += 1;
    }
  }
  return summary;
}
