/*
 * Browser-side calls to the consultation API. No secrets, no server imports: safe in client
 * components. Every function resolves (never throws) with either data or a message that is
 * safe to show, and treats any non-JSON body (a platform error page) as a failure.
 */

import type { DaySlots } from "./rules";

export type ApiResult<T> = { ok: true; data: T; status: number } | { ok: false; status: number; message: string; code?: string; data?: T };

const NETWORK = "We couldn't reach Drylake. Please check your connection and try again.";

async function call<T>(input: string, init: RequestInit, fallback: string): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  } catch {
    return { ok: false, status: 0, message: NETWORK };
  }

  let body: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = await response.json();
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    body = null;
  }

  if (response.ok && body && body.error === undefined) return { ok: true, data: body as T, status: response.status };

  return {
    ok: false,
    status: response.status,
    message: typeof body?.error === "string" ? body.error : fallback,
    code: typeof body?.code === "string" ? body.code : undefined,
    data: (body ?? undefined) as T | undefined,
  };
}

export function fetchAvailability() {
  return call<{ timezone: string; days: DaySlots[] }>(
    "/api/consultations/availability",
    { method: "GET" },
    "Consultation times could not be loaded right now. Please try again shortly."
  );
}

export type BookingRequest = {
  idempotencyKey: string;
  start: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  description: string;
  method: "TEAMS" | "PHONE";
  turnstileToken: string;
};

export type BookingConfirmation = { success: true; booking: { reference: string; start: string; end: string } };

export function requestBooking(payload: BookingRequest) {
  return call<BookingConfirmation>(
    "/api/consultations",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    "We couldn't complete your booking. Please try again."
  );
}

export type ManagedBooking = {
  reference: string;
  name: string;
  start: string;
  end: string;
  status: "CONFIRMED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED";
  version: number;
  canChange: boolean;
  changeWindowClosed: boolean;
  cancelledByDrylake: boolean;
  method: "TEAMS" | "PHONE";
  representative: string;
  phone: string | null;
  joinUrl: string | null;
};

export type ManageResponse = { success: true; booking: ManagedBooking | null; message?: string; token?: string };

export function manageBooking(body: { token: string; action: "view" | "cancel" | "reschedule"; version?: number; newStart?: string }) {
  return call<ManageResponse & { booking?: ManagedBooking | null }>(
    "/api/consultations/manage",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    "We couldn't update your appointment. Please try again."
  );
}

/** A fresh idempotency key per booking attempt (crypto.randomUUID is in every supported browser). */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
