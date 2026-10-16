/*
 * Admin presentation rules for consultations: filters, sort orders, status labels, history
 * wording and the Perth week used by the dashboard summary. PURE (unit-tested in tests/consultation-admin.test.mjs).
 */

import { type CalendarFailureKind, classifyStoredError } from "./calendar/types.ts";
import { REPRESENTATIVES } from "./representatives.ts";
import { perthParts, perthToInstant } from "./rules.ts";

export const CONSULTATION_FILTERS = ["UPCOMING", "CONFIRMED", "RESCHEDULED", "CANCELLED", "COMPLETED"] as const;
export type ConsultationFilter = (typeof CONSULTATION_FILTERS)[number];

export const CONSULTATION_FILTER_OPTIONS: Array<{ value: ConsultationFilter; label: string }> = [
  { value: "UPCOMING", label: "Upcoming" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "RESCHEDULED", label: "Rescheduled" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "COMPLETED", label: "Completed" },
];

export const CONSULTATION_SORTS = ["SOONEST", "LATEST", "NEWEST"] as const;
export type ConsultationSort = (typeof CONSULTATION_SORTS)[number];

export const CONSULTATION_SORT_OPTIONS: Array<{ value: ConsultationSort; label: string }> = [
  { value: "SOONEST", label: "Appointment: soonest first" },
  { value: "LATEST", label: "Appointment: latest first" },
  { value: "NEWEST", label: "Booked: newest first" },
];

export const CONSULTATION_REPRESENTATIVE_OPTIONS: Array<{ value: string; label: string }> = REPRESENTATIVES.map((r) => ({
  value: r.key,
  label: r.name,
}));

export const CONSULTATION_DATE_RANGES = ["TODAY", "THIS_WEEK", "NEXT_7_DAYS", "NEXT_30_DAYS", "PAST_30_DAYS"] as const;
export type ConsultationDateRange = (typeof CONSULTATION_DATE_RANGES)[number];

export const CONSULTATION_DATE_OPTIONS: Array<{ value: ConsultationDateRange; label: string }> = [
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "NEXT_7_DAYS", label: "Next 7 days" },
  { value: "NEXT_30_DAYS", label: "Next 30 days" },
  { value: "PAST_30_DAYS", label: "Past 30 days" },
];

/** Appointment-time bounds for a date filter, in Perth days, as instants [from, to). */
export function dateRangeBounds(range: ConsultationDateRange, now: Date): { from: Date; to: Date } {
  const p = perthParts(now);
  const day = (offset: number) => perthToInstant(p.year, p.month, p.day + offset, 0, 0);
  switch (range) {
    case "TODAY":
      return { from: day(0), to: day(1) };
    case "THIS_WEEK":
      return perthWeekBounds(now);
    case "NEXT_7_DAYS":
      return { from: now, to: day(8) };
    case "NEXT_30_DAYS":
      return { from: now, to: day(31) };
    case "PAST_30_DAYS":
      return { from: day(-30), to: now };
  }
}

export const METHOD_SHORT: Record<string, string> = { TEAMS: "Teams", PHONE: "Phone" };

export const CALENDAR_STATE_LABELS: Record<string, string> = {
  PENDING: "Calendar update pending",
  SYNCED: "In calendar",
  FAILED: "Calendar sync failed",
};

/* Plain-words reason a calendar update is stuck, keyed by the failure kind stored with the error. */
export const CALENDAR_FAILURE_LABELS: Record<CalendarFailureKind, string> = {
  credential_expired: "Microsoft 365 credential expired or invalid",
  auth: "Microsoft 365 refused access",
  mailbox: "Mailbox not reachable",
  throttled: "Microsoft 365 is throttling requests",
  unavailable: "Microsoft 365 unavailable",
};

/** The stored error text without its "[kind] " tag, for display. */
export const calendarErrorText = (text: string | null | undefined): string => (text ?? "").replace(/^\[[a-z_]+\]\s*/, "");

/**
 * What the admin sees for one booking's calendar: a label, and whether it needs a person.
 * `reconciliation` is the plain reconciliation status (in sync, pending retry, gave up).
 */
export function calendarStatusView(input: {
  mode: "none" | "microsoft" | "misconfigured";
  state: string;
  version: number;
  syncedVersion: number;
  lastError: string | null;
  attempts: number;
}): { label: string; reconciliation: "off" | "in_sync" | "retrying" | "gave_up"; kind: CalendarFailureKind | null; needsAttention: boolean } {
  if (input.mode === "none") return { label: "Calendar integration is off. Add this consultation to the calendar by hand.", reconciliation: "off", kind: null, needsAttention: false };
  if (input.mode === "misconfigured") {
    return { label: "Calendar integration is misconfigured. Check the Microsoft 365 settings.", reconciliation: "off", kind: null, needsAttention: true };
  }
  if (input.state === "SYNCED" && input.syncedVersion >= input.version) {
    return { label: CALENDAR_STATE_LABELS.SYNCED, reconciliation: "in_sync", kind: null, needsAttention: false };
  }
  const kind = classifyStoredError(input.lastError);
  const failed = input.state === "FAILED";
  const base = CALENDAR_STATE_LABELS[input.state] ?? input.state;
  // A refused credential is the one failure retrying cannot fix: name it, whatever the retry state.
  const label = kind === "credential_expired" || kind === "auth" ? `${base}: ${CALENDAR_FAILURE_LABELS[kind]}` : base;
  return {
    label,
    reconciliation: failed ? "gave_up" : "retrying",
    kind,
    needsAttention: failed || kind === "credential_expired" || kind === "auth",
  };
}

/** Short flag for the list view; null when nothing needs the admin's eye. */
export function calendarListFlag(state: string, lastError: string | null): string | null {
  const kind = classifyStoredError(lastError);
  if (kind === "credential_expired") return CALENDAR_FAILURE_LABELS.credential_expired;
  if (kind === "auth") return CALENDAR_FAILURE_LABELS.auth;
  return state === "FAILED" ? CALENDAR_STATE_LABELS.FAILED : null;
}

export const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmed",
  RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

/* Badge classes (text + background meet 4.5:1). */
export const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  RESCHEDULED: "bg-amber-50 text-amber-900 ring-amber-200",
  CANCELLED: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  COMPLETED: "bg-sky-50 text-sky-900 ring-sky-200",
};

const ACTOR: Record<string, string> = { CUSTOMER: "Customer", ADMIN: "Drylake admin", SYSTEM: "System" };

const KIND: Record<string, string> = {
  CUSTOMER_CONFIRMATION: "customer confirmation",
  FOUNDER_NEW_BOOKING: "founder booking notice",
  CUSTOMER_RESCHEDULED: "customer reschedule notice",
  FOUNDER_RESCHEDULED: "founder reschedule notice",
  CUSTOMER_CANCELLED: "customer cancellation notice",
  FOUNDER_CANCELLED: "founder cancellation notice",
  CUSTOMER_REMINDER: "24-hour reminder",
  FOUNDER_CALENDAR_FAILED: "founder calendar-failure alert",
};

export type ConsultationEvent = {
  id: number;
  action: string;
  actor_type: string;
  actor_clerk_user_id: string | null;
  previous: Record<string, unknown> | null;
  next: Record<string, unknown> | null;
  created_at: string;
};

/** One line of history, e.g. "Rescheduled by Drylake admin". Times are formatted by the caller. */
export function describeEvent(event: ConsultationEvent): string {
  const who = ACTOR[event.actor_type] ?? event.actor_type;
  const kind = typeof event.next?.kind === "string" ? KIND[event.next.kind] ?? event.next.kind : "email";
  switch (event.action) {
    case "CREATED":
      return `Booked by ${who.toLowerCase()}`;
    case "RESCHEDULED": {
      const from = typeof event.previous?.representative === "string" ? event.previous.representative : null;
      const to = typeof event.next?.representative === "string" ? event.next.representative : null;
      const moved = from && to && from !== to ? ` (reassigned from ${capitalise(from)} to ${capitalise(to)})` : "";
      return `Rescheduled by ${who.toLowerCase()}${moved}`;
    }
    case "CALENDAR_SYNCED":
      return event.next?.has_event ? "Microsoft 365 calendar updated" : "Microsoft 365 event removed";
    case "CALENDAR_RETRY_REQUESTED":
      return `Calendar sync retried by ${who.toLowerCase()}`;
    case "CALENDAR_SYNC_FAILED":
      return `Microsoft 365 calendar update failed${event.next?.final ? " (gave up, founders alerted)" : " (will retry)"}`;
    case "CANCELLED":
      return `Cancelled by ${who.toLowerCase()}${event.next?.reason_given ? " (reason given)" : ""}`;
    case "COMPLETED":
      return `Marked completed by ${who.toLowerCase()}`;
    case "REMINDER_QUEUED":
      return "24-hour reminder scheduled";
    case "REMINDER_CANCELLED":
      return "Pending reminder withdrawn";
    case "NOTIFICATION_SENT":
      return `Email sent: ${kind}`;
    case "NOTIFICATION_FAILED":
      return `Email delivery failed: ${kind}${event.next?.final ? " (gave up after retries)" : " (will retry)"}`;
    default:
      return event.action;
  }
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Start and end of the current Perth week (Monday 00:00 to next Monday 00:00), as instants. */
export function perthWeekBounds(now: Date): { from: Date; to: Date } {
  const p = perthParts(now);
  const monday = perthToInstant(p.year, p.month, p.day - (p.isoWeekday - 1), 0, 0);
  const mp = perthParts(monday);
  return { from: monday, to: perthToInstant(mp.year, mp.month, mp.day + 7, 0, 0) };
}
