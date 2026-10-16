/*
 * Calendar provider contract for consultations. Business code (availability, booking, the sync
 * worker) depends on this interface only; Microsoft 365 is one implementation
 * (./microsoft-graph.ts), selected by CONSULTATION_CALENDAR_PROVIDER. "none" (the default)
 * means no calendar: availability comes from Drylake's own bookings alone and no events are
 * written, which is how the site runs until the Microsoft 365 app is configured.
 */

import type { MeetingMethod, Representative } from "../representatives.ts";

/** Busy time on a representative's calendar, epoch milliseconds, half-open [start, end). */
export type BusyInterval = { start: number; end: number };

/**
 * Busy intervals per representative email (lower-case). A representative whose calendar could
 * not be read is ABSENT from the map: callers must treat them as unavailable, never as free.
 */
export type BusyMap = Map<string, BusyInterval[]>;

export type ConsultationEventInput = {
  bookingId: string;
  /** Changes whenever a NEW event must be created for the booking (reassignment). */
  transactionId: string;
  reference: string;
  start: Date;
  end: Date;
  method: MeetingMethod;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
};

export type CalendarEvent = { id: string; joinUrl: string | null; start: number | null };

export interface CalendarProvider {
  readonly name: string;
  getBusy(representatives: readonly Representative[], from: Date, to: Date): Promise<BusyMap>;
  /** Every live event tagged with this booking id in the representative's calendar. */
  findEvents(representative: Representative, bookingId: string): Promise<CalendarEvent[]>;
  /** One event by id, or null when it no longer exists (deleted in Outlook, already cancelled). */
  getEvent(representative: Representative, eventId: string): Promise<CalendarEvent | null>;
  createEvent(representative: Representative, input: ConsultationEventInput): Promise<CalendarEvent>;
  /**
   * Moves the event; changes start/end ONLY, so a Teams meeting is never stripped from the body.
   * Throws CalendarEventMissingError when the event no longer exists.
   */
  moveEvent(representative: Representative, eventId: string, start: Date, end: Date): Promise<void>;
  /** Cancels and notifies attendees. An event that no longer exists counts as cancelled. */
  cancelEvent(representative: Representative, eventId: string, comment: string): Promise<void>;
  /**
   * Cheap sign-in probe (token request only, no calendar data touched). Lets /api/health report an
   * expired client secret before a customer hits it. Never throws.
   */
  checkCredentials(): Promise<"ok" | CalendarFailureKind>;
}

/** The event to move is gone (deleted in Outlook). The sync worker creates a new one instead. */
export class CalendarEventMissingError extends Error {
  constructor() {
    super("Calendar event no longer exists");
    this.name = "CalendarEventMissingError";
  }
}

/**
 * Why a calendar call failed. Drives retry timing, the admin status and the alert email:
 *   credential_expired  the client secret is expired or wrong (AADSTS7000222, invalid_client)
 *   auth                sign-in refused, or Graph answered 401 after a token refresh / 403
 *                       (consent or the Exchange RBAC assignment removed)
 *   mailbox             404 on the representative mailbox (wrong address, no licence, out of scope)
 *   throttled           429, honouring Retry-After
 *   unavailable         5xx, timeout, network, anything else
 */
export type CalendarFailureKind = "credential_expired" | "auth" | "mailbox" | "throttled" | "unavailable";

export const CALENDAR_FAILURE_KINDS: readonly CalendarFailureKind[] = ["credential_expired", "auth", "mailbox", "throttled", "unavailable"];

/** Kinds that need a person to fix something in Microsoft 365 or Vercel: retrying cannot help. */
export const isAuthFailure = (kind: CalendarFailureKind | null | undefined) => kind === "credential_expired" || kind === "auth";

/**
 * The calendar could not be checked or written. Callers fail safe: no unverified times.
 * The message starts with "[kind]" so the classification survives being stored as text in
 * consultation_bookings.calendar_last_error (see classifyStoredError); it never carries a secret.
 */
export class CalendarUnavailableError extends Error {
  readonly kind: CalendarFailureKind;
  readonly status: number | null;
  readonly retryAfterSeconds: number | null;
  constructor(message: string, options: { kind?: CalendarFailureKind; status?: number | null; retryAfterSeconds?: number | null } = {}) {
    const kind = options.kind ?? "unavailable";
    super(`[${kind}] ${message}`);
    this.name = "CalendarUnavailableError";
    this.kind = kind;
    this.status = options.status ?? null;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }
}

/** The failure kind recorded at the start of a stored error text, or null for older/unknown text. */
export function classifyStoredError(text: string | null | undefined): CalendarFailureKind | null {
  const match = /^\[(credential_expired|auth|mailbox|throttled|unavailable)\]/.exec(text ?? "");
  return match ? (match[1] as CalendarFailureKind) : null;
}
