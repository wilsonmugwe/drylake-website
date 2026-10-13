/*
 * Admin presentation rules for consultations: filters, sort orders, status labels, history
 * wording and the Perth week used by the dashboard summary. PURE (unit-tested in tests/consultation-admin.test.mjs).
 */

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
    case "RESCHEDULED":
      return `Rescheduled by ${who.toLowerCase()}`;
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

/** Start and end of the current Perth week (Monday 00:00 to next Monday 00:00), as instants. */
export function perthWeekBounds(now: Date): { from: Date; to: Date } {
  const p = perthParts(now);
  const monday = perthToInstant(p.year, p.month, p.day - (p.isoWeekday - 1), 0, 0);
  const mp = perthParts(monday);
  return { from: monday, to: perthToInstant(mp.year, mp.month, mp.day + 7, 0, 0) };
}
