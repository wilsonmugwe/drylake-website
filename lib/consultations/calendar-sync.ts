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

import { type CalendarEvent, CalendarEventMissingError, type CalendarProvider } from "./calendar/types.ts";
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
  /* The lease this worker holds; passed back to finish as a fence. */
  calendar_lease_until: string | null;
};

export type SyncResult = { eventId: string | null; owner: string | null; joinUrl: string | null };

export type CalendarSyncDeps = {
  /** Lease at most ONE due booking (or the given one); [] when nothing is due. */
  claimOne(bookingId: string | null): Promise<SyncRow[]>;
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

type Found = { rep: Representative; event: CalendarEvent };

/*
 * Every live event for the booking, in every representative's calendar: found by booking tag,
 * plus the recorded event id read directly in case the tag search misses it. The recorded id is
 * a HINT, never trusted on its own: it can be stale after a crash mid-reassignment, or deleted in
 * Outlook. Searching every time is what makes a retry safe (no duplicate invitations).
 */
async function liveEvents(provider: CalendarProvider, row: SyncRow): Promise<Found[]> {
  const found: Found[] = [];
  for (const rep of REPRESENTATIVES) {
    for (const event of await provider.findEvents(rep, row.id)) found.push({ rep, event });
  }
  const owner = representativeByKey(row.calendar_event_owner);
  if (row.calendar_event_id && owner && !found.some((f) => f.event.id === row.calendar_event_id)) {
    const event = await provider.getEvent(owner, row.calendar_event_id);
    if (event) found.push({ rep: owner, event });
  }
  return found;
}

/** Bring one booking's calendar in line with the booking. Throws on any provider failure. */
export async function reconcileBooking(provider: CalendarProvider, row: SyncRow): Promise<SyncResult> {
  const start = new Date(row.start_time);
  const end = new Date(row.end_time);
  const assigned = representativeByKey(row.assigned_representative);
  const events = await liveEvents(provider, row);

  if (!ACTIVE.has(row.status) || !assigned) {
    for (const { rep, event } of events) await provider.cancelEvent(rep, event.id, CANCEL_COMMENT);
    return { eventId: null, owner: null, joinUrl: null };
  }

  // Keep one event in the assigned calendar (the recorded one when it is there); cancel the rest.
  const mine = events.filter((f) => f.rep.key === assigned.key);
  let keep: Found | null = mine.find((f) => f.event.id === row.calendar_event_id) ?? mine[0] ?? null;
  for (const candidate of events) {
    if (candidate !== keep) await provider.cancelEvent(candidate.rep, candidate.event.id, candidate.rep.key === assigned.key ? CANCEL_COMMENT : MOVED_COMMENT);
  }

  if (keep && keep.event.start !== start.getTime()) {
    try {
      await provider.moveEvent(assigned, keep.event.id, start, end);
    } catch (error) {
      if (!(error instanceof CalendarEventMissingError)) throw error;
      keep = null; // deleted in Outlook between the lookup and the move: create a fresh one
    }
  }
  if (keep) return { eventId: keep.event.id, owner: assigned.key, joinUrl: keep.event.joinUrl };

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

/*
 * Claims and syncs ONE booking at a time, up to `limit`, so each lease only has to outlast one
 * booking's Graph calls (at most a handful, each with an 8 s timeout), never a whole batch.
 */
export async function runCalendarSyncPass(deps: CalendarSyncDeps, options: { limit?: number; bookingId?: string | null } = {}): Promise<CalendarSyncSummary> {
  const limit = options.bookingId ? 1 : options.limit ?? 10;
  const summary: CalendarSyncSummary = { claimed: 0, synced: 0, retried: 0 };

  for (let i = 0; i < limit; i += 1) {
    const [row] = await deps.claimOne(options.bookingId ?? null);
    if (!row) break;
    summary.claimed += 1;
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
