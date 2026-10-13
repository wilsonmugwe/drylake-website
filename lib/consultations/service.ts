import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { FOUNDER_NOTIFICATION_EMAILS, newBookingReference } from "./config";
import { describeOutcome } from "./outcomes";
import {
  HORIZON_DAYS,
  MAX_UPCOMING_PER_EMAIL,
  MIN_NOTICE_MINUTES,
  REMINDER_MIN_GAP_MINUTES,
  buildAvailability,
  consultationEnd,
} from "./rules";
import { deriveManageToken, hashManageToken, isWellFormedToken } from "./token";
import type { BookingFields } from "./validate";

/*
 * Server-side consultation operations. Every function takes the service-role client from its
 * caller (only app/api and app/admin may create it) and goes through the SQL functions in the
 * consultation migration, which own every invariant: overlap, slot rules, notice, limits,
 * versioning, audit events and the email outbox. Nothing here decides a booking is valid on
 * its own.
 */

const SQL_ARGS = {
  p_min_notice: `${MIN_NOTICE_MINUTES} minutes`,
  p_horizon: `${HORIZON_DAYS + 1} days`,
  p_reminder_min_gap: `${REMINDER_MIN_GAP_MINUTES} minutes`,
};

const FOUNDERS = [...FOUNDER_NOTIFICATION_EMAILS];

export type ConsultationStatus = "CONFIRMED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED";

export type ConsultationRecord = {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  business_name: string | null;
  project_description: string;
  start_time: string;
  end_time: string;
  timezone: string;
  status: ConsultationStatus;
  version: number;
  reschedule_count: number;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by_type: string | null;
  completed_at: string | null;
  completed_by_clerk_user_id: string | null;
  management_token_expires_at: string;
  created_at: string;
  updated_at: string;
};

export const CONSULTATION_COLUMNS =
  "id, reference, customer_name, customer_email, customer_phone, business_name, project_description, start_time, end_time, timezone, status, version, reschedule_count, cancellation_reason, cancelled_at, cancelled_by_type, completed_at, completed_by_clerk_user_id, management_token_expires_at, created_at, updated_at";

export class ConsultationStoreError extends Error {
  constructor(operation: string, error: { code?: string; message?: string }) {
    super(`${operation}: ${error.code ?? ""} ${error.message ?? ""}`.trim());
    this.name = "ConsultationStoreError";
  }
}

export const isActive = (status: string) => status === "CONFIRMED" || status === "RESCHEDULED";

/** Free slots by Perth date. Exposes start times only, never who booked them. */
export async function loadAvailability(supabase: SupabaseClient, now = new Date()) {
  const to = new Date(now.getTime() + (HORIZON_DAYS + 2) * 86_400_000);
  const { data, error } = await supabase.rpc("consultation_busy_slots", { p_from: now.toISOString(), p_to: to.toISOString() });
  if (error) throw new ConsultationStoreError("busy slots", error);
  const busy = ((data ?? []) as Array<{ start_time: string }>).map((row) => row.start_time);
  return buildAvailability(now, busy);
}

type CreateRow = { outcome: string; booking_id: string | null; reference: string | null; start_time: string | null; end_time: string | null };

export async function createConsultation(supabase: SupabaseClient, fields: BookingFields, secret: string) {
  // A reference collision (1 in ~887 million per pair) is retried with a fresh one.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = randomUUID();
    const { data, error } = await supabase.rpc("consultation_create_booking", {
      p_booking_id: id,
      p_idempotency_key: fields.idempotencyKey,
      p_reference: newBookingReference(),
      p_name: fields.name,
      p_email: fields.email,
      p_phone: fields.phone || null,
      p_business: fields.businessName || null,
      p_description: fields.description,
      p_start: fields.start.toISOString(),
      p_token_hash: hashManageToken(deriveManageToken(secret, id, 1)),
      p_founder_emails: FOUNDERS,
      p_max_active: MAX_UPCOMING_PER_EMAIL,
      ...SQL_ARGS,
    });

    if (error?.code === "23505" && /reference/.test(error.message ?? "")) continue;
    if (error) throw new ConsultationStoreError("create booking", error);

    const row = ((data ?? []) as CreateRow[])[0];
    if (!row) throw new Error("create booking: no result row");
    return row;
  }
  throw new Error("create booking: could not allocate a booking reference");
}

/** The booking a management token opens, or null (unknown, malformed or expired token). */
export async function findByManageToken(supabase: SupabaseClient, token: unknown, now = new Date()): Promise<ConsultationRecord | null> {
  if (!isWellFormedToken(token)) return null;
  const { data, error } = await supabase
    .from("consultation_bookings")
    .select(CONSULTATION_COLUMNS)
    .eq("management_token_hash", hashManageToken(token))
    .maybeSingle();
  if (error) throw new ConsultationStoreError("token lookup", error);
  if (!data) return null;
  const record = data as unknown as ConsultationRecord;
  return new Date(record.management_token_expires_at).getTime() > now.getTime() ? record : null;
}

export async function findById(supabase: SupabaseClient, id: string): Promise<ConsultationRecord | null> {
  const { data, error } = await supabase.from("consultation_bookings").select(CONSULTATION_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new ConsultationStoreError("booking lookup", error);
  return (data as unknown as ConsultationRecord) ?? null;
}

type Actor = { type: "CUSTOMER" | "ADMIN"; clerkUserId: string | null };

export async function rescheduleConsultation(
  supabase: SupabaseClient,
  input: { id: string; expectedVersion: number; newStart: Date; actor: Actor; secret: string }
) {
  const { data, error } = await supabase.rpc("consultation_reschedule_booking", {
    p_booking_id: input.id,
    p_expected_version: input.expectedVersion,
    p_new_start: input.newStart.toISOString(),
    p_actor_type: input.actor.type,
    p_actor_clerk_user_id: input.actor.clerkUserId,
    // The link for the NEXT version: older links stop working the moment this commits.
    p_new_token_hash: hashManageToken(deriveManageToken(input.secret, input.id, input.expectedVersion + 1)),
    p_founder_emails: FOUNDERS,
    ...SQL_ARGS,
  });
  if (error) throw new ConsultationStoreError("reschedule booking", error);
  const row = ((data ?? []) as Array<{ outcome: string; version: number | null }>)[0];
  if (!row) throw new Error("reschedule booking: no result row");
  return {
    outcome: row.outcome,
    version: row.version,
    // Only for the customer who just moved their own booking: lets the page keep working.
    newToken: row.outcome === "rescheduled" ? deriveManageToken(input.secret, input.id, input.expectedVersion + 1) : null,
  };
}

export async function cancelConsultation(
  supabase: SupabaseClient,
  input: { id: string; expectedVersion: number; actor: Actor; reason: string | null }
) {
  const { data, error } = await supabase.rpc("consultation_cancel_booking", {
    p_booking_id: input.id,
    p_expected_version: input.expectedVersion,
    p_actor_type: input.actor.type,
    p_actor_clerk_user_id: input.actor.clerkUserId,
    p_reason: input.reason,
    p_founder_emails: FOUNDERS,
  });
  if (error) throw new ConsultationStoreError("cancel booking", error);
  const row = ((data ?? []) as Array<{ outcome: string; version: number | null }>)[0];
  if (!row) throw new Error("cancel booking: no result row");
  return row;
}

export async function completeConsultation(supabase: SupabaseClient, input: { id: string; expectedVersion: number; clerkUserId: string }) {
  const { data, error } = await supabase.rpc("consultation_complete_booking", {
    p_booking_id: input.id,
    p_expected_version: input.expectedVersion,
    p_actor_clerk_user_id: input.clerkUserId,
  });
  if (error) throw new ConsultationStoreError("complete booking", error);
  const row = ((data ?? []) as Array<{ outcome: string; version: number | null }>)[0];
  if (!row) throw new Error("complete booking: no result row");
  return row;
}

/** What a customer sees on the management page: their own booking only, no internal ids. */
export function customerView(record: ConsultationRecord, now = new Date()) {
  const start = new Date(record.start_time);
  return {
    reference: record.reference,
    name: record.customer_name,
    // Normalised: PostgREST returns "...+00:00", availability slots are "...000Z", and the
    // reschedule picker compares the two as strings to leave out the current appointment.
    start: start.toISOString(),
    end: consultationEnd(start).toISOString(),
    status: record.status,
    version: record.version,
    canChange: isActive(record.status) && start.getTime() > now.getTime(),
    cancelledByDrylake: record.status === "CANCELLED" && record.cancelled_by_type === "ADMIN",
  };
}

export type CustomerConsultationView = ReturnType<typeof customerView>;

export { describeOutcome };
