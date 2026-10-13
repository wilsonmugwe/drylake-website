/*
 * Consultation email outbox worker. PURE: every dependency is injected (tests use fakes;
 * lib/consultations/dispatch-server.ts wires Supabase + Resend).
 *
 * Contract:
 *   1. Lease due rows (consultation_claim_notifications: FOR UPDATE SKIP LOCKED, so concurrent
 *      runs never take the same row).
 *   2. Render each from the booking as it is NOW plus the row's snapshot (times at the moment
 *      of the change), and send with the row's event_key as the provider idempotency key, so a
 *      crash between "sent" and "recorded" cannot produce a second email.
 *   3. Record the outcome (consultation_finish_notification): sent, retry with exponential
 *      backoff, or skipped. After max attempts the row is FAILED and visible in the admin history.
 *
 * A reminder is re-checked against the live booking at send time and skipped unless the booking
 * is still active and still at the time the reminder was queued for.
 * Never logs names, addresses, the manage token or the email body.
 */

import { type ConsultationEmailKind, CUSTOMER_KINDS, renderConsultationEmail } from "../email/consultation-emails.ts";
import { deriveManageToken, hashManageToken, manageUrl } from "./token.ts";

export type OutboxRow = {
  id: string;
  booking_id: string;
  event_key: string;
  kind: ConsultationEmailKind;
  recipient: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

export type BookingRow = {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  business_name: string | null;
  project_description: string;
  start_time: string;
  status: string;
  version: number;
  cancellation_reason: string | null;
  management_token_hash: string;
};

export type OutgoingEmail = {
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

export type DispatchDeps = {
  claim(limit: number): Promise<OutboxRow[]>;
  loadBookings(ids: string[]): Promise<BookingRow[]>;
  finish(id: string, outcome: "sent" | "retry" | "skipped", providerId: string | null, error: string | null, retryAfterMinutes: number): Promise<void>;
  send(email: OutgoingEmail): Promise<{ id: string | null }>;
  tokenSecret(): string;
  baseUrl: string;
  replyTo: string;
  now(): Date;
};

export type DispatchSummary = { claimed: number; sent: number; retried: number; skipped: number };

const ACTIVE = new Set(["CONFIRMED", "RESCHEDULED"]);

/* 2, 4, 8 ... minutes, capped at 6 hours. */
export function retryDelayMinutes(attempts: number): number {
  return Math.min(2 ** Math.max(1, attempts), 360);
}

const asDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/*
 * Customer emails that describe an appointment as current. If the booking has moved on since the
 * row was queued (cancelled, or rescheduled again while this email waited out a provider outage),
 * sending it would contradict a later email the customer may already have, so it is skipped.
 * Founder notices and cancellation notices are history and always go.
 */
const DESCRIBES_CURRENT = new Set(["CUSTOMER_CONFIRMATION", "CUSTOMER_RESCHEDULED", "CUSTOMER_REMINDER"]);

/** Why a queued email must not go out any more, or null when it should be sent. */
export function skipReason(row: OutboxRow, booking: BookingRow | undefined, now: Date): string | null {
  if (!booking) return "booking not found";
  if (!DESCRIBES_CURRENT.has(row.kind)) return null;

  const queuedFor = asDate(row.payload.start_time);
  const start = new Date(booking.start_time);
  if (!ACTIVE.has(booking.status)) return "booking no longer active";
  if (!queuedFor || queuedFor.getTime() !== start.getTime()) return "booking changed since this email was queued";
  if (row.kind === "CUSTOMER_REMINDER" && start.getTime() <= now.getTime()) return "appointment already started";
  return null;
}

export async function dispatchConsultationNotifications(deps: DispatchDeps, limit = 25): Promise<DispatchSummary> {
  const rows = await deps.claim(limit);
  const summary: DispatchSummary = { claimed: rows.length, sent: 0, retried: 0, skipped: 0 };
  if (rows.length === 0) return summary;

  const bookings = new Map((await deps.loadBookings([...new Set(rows.map((r) => r.booking_id))])).map((b) => [b.id, b]));
  const now = deps.now();

  for (const row of rows) {
    const booking = bookings.get(row.booking_id);
    const skip = skipReason(row, booking, now);

    if (skip || !booking) {
      await deps.finish(row.id, "skipped", null, skip ?? "booking not found", 0);
      summary.skipped += 1;
      continue;
    }

    try {
      const isCustomer = CUSTOMER_KINDS.includes(row.kind);
      const start = asDate(row.payload.start_time) ?? new Date(booking.start_time);
      const active = ACTIVE.has(booking.status) && new Date(booking.start_time).getTime() > now.getTime();
      const token = isCustomer && active && row.kind !== "CUSTOMER_CANCELLED"
        ? deriveManageToken(deps.tokenSecret(), booking.id, booking.version)
        : null;
      // Only a link the database will accept: after a secret rotation (or from a deployment with a
      // different secret) the derived token no longer matches the stored hash, and a dead link is
      // worse than none. The email still carries the reply-to and contact address.
      const link = token && hashManageToken(token) === booking.management_token_hash ? manageUrl(deps.baseUrl, token) : null;
      if (token && !link) {
        console.error("Consultation email: manage link omitted: the link secret changed after this booking was issued");
      }

      const rendered = renderConsultationEmail({
        kind: row.kind,
        reference: booking.reference,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        customerPhone: booking.customer_phone,
        businessName: booking.business_name,
        projectDescription: booking.project_description,
        start,
        previousStart: asDate(row.payload.previous_start_time),
        actor: (row.payload.actor_type as "CUSTOMER" | "ADMIN" | undefined) ?? "CUSTOMER",
        cancellationReason: booking.cancellation_reason,
        manageUrl: link,
        assetOrigin: deps.baseUrl,
      });

      const result = await deps.send({
        to: row.recipient,
        replyTo: isCustomer ? deps.replyTo : booking.customer_email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: row.event_key,
      });

      await deps.finish(row.id, "sent", result.id, null, 0);
      summary.sent += 1;
    } catch (error) {
      // Provider or configuration message only (never the recipient or the body).
      const message = error instanceof Error ? error.message : "unknown error";
      console.error("Consultation email failed:", row.kind, `attempt ${row.attempts}/${row.max_attempts}:`, message);
      await deps.finish(row.id, "retry", null, message, retryDelayMinutes(row.attempts));
      summary.retried += 1;
    }
  }

  return summary;
}
