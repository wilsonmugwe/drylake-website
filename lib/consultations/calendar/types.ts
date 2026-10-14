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
  /** The event tagged with this booking id in the representative's calendar, if one exists. */
  findEvent(representative: Representative, bookingId: string): Promise<CalendarEvent | null>;
  createEvent(representative: Representative, input: ConsultationEventInput): Promise<CalendarEvent>;
  /** Moves the event; changes start/end ONLY, so a Teams meeting is never stripped from the body. */
  moveEvent(representative: Representative, eventId: string, start: Date, end: Date): Promise<void>;
  /** Cancels and notifies attendees. An event that no longer exists counts as cancelled. */
  cancelEvent(representative: Representative, eventId: string, comment: string): Promise<void>;
}

/** The calendar could not be checked or written. Callers fail safe: no unverified times. */
export class CalendarUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarUnavailableError";
  }
}
