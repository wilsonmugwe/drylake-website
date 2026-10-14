/*
 * Consultation request input rules. PURE: unit-tested in tests/consultation-booking.test.mjs and
 * applied by the API routes before Turnstile, rate limits or the database.
 *
 * Contract: returns trimmed fields only when every rule passes; otherwise a user-safe message
 * with an HTTP status and, where useful, the field it concerns. Never logs or echoes input.
 * Field limits match the CHECK constraints in the consultation migration.
 */

import { type MeetingMethod, isMeetingMethod } from "./representatives.ts";
import { isUuid } from "../validation/uuid.ts";

export const MAX_BOOKING_REQUEST_BYTES = 8_000;

export const BOOKING_LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  businessName: 160,
  description: 2000,
} as const;

export type BookingFields = {
  idempotencyKey: string;
  start: Date;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  description: string;
  method: MeetingMethod;
  turnstileToken: string;
};

export type BookingField = "start" | "method" | "name" | "email" | "phone" | "businessName" | "description";

export type Validation<T> =
  | { ok: true; fields: T }
  | { ok: false; status: number; message: string; field?: BookingField };

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const LINE_BREAK = /[\r\n\u0085\u2028\u2029]/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/* Digits, spaces, +, (, ), - and . only: a phone number, not free text. */
const PHONE = /^[0-9+()\-. ]{6,40}$/;
/* A number we can actually ring: 8 to 15 digits once spaces and punctuation are removed. */
export function isCallablePhone(phone: string): boolean {
  if (!PHONE.test(phone)) return false;
  const digits = phone.replace(/\D/g, "").length;
  return digits >= 8 && digits <= 15;
}
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** A start time as sent by our own UI: an ISO UTC instant. */
export function parseStart(value: unknown): Date | null {
  const text = str(value);
  if (!ISO_INSTANT.test(text)) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateBookingRequest(body: unknown): Validation<BookingFields> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, message: "Invalid request." };
  }

  const raw = body as Record<string, unknown>;
  const idempotencyKey = str(raw.idempotencyKey).toLowerCase();
  const start = parseStart(raw.start);
  const fields = {
    name: str(raw.name),
    email: str(raw.email).toLowerCase(),
    phone: str(raw.phone),
    businessName: str(raw.businessName),
    description: str(raw.description),
  };

  if (!isUuid(idempotencyKey)) return { ok: false, status: 400, message: "Invalid request." };
  if (!start) return { ok: false, status: 400, message: "Please choose a consultation time.", field: "start" };
  const method = str(raw.method).toUpperCase();
  if (!isMeetingMethod(method)) {
    return { ok: false, status: 400, message: "Please choose Microsoft Teams or a phone call.", field: "method" };
  }
  if (!fields.name) return { ok: false, status: 400, message: "Please enter your full name.", field: "name" };
  if (!fields.email) return { ok: false, status: 400, message: "Please enter your email address.", field: "email" };
  if (!fields.description) {
    return { ok: false, status: 400, message: "Please tell us a little about your business or project.", field: "description" };
  }

  for (const key of Object.keys(BOOKING_LIMITS) as Array<keyof typeof BOOKING_LIMITS>) {
    if (fields[key].length > BOOKING_LIMITS[key]) {
      return { ok: false, status: 400, message: "One or more fields are too long.", field: key };
    }
  }

  if (!EMAIL.test(fields.email)) return { ok: false, status: 400, message: "Please enter a valid email address.", field: "email" };
  if (method === "PHONE" && !fields.phone) {
    return { ok: false, status: 400, message: "Please enter the phone number we should call.", field: "phone" };
  }
  if (fields.phone && !isCallablePhone(fields.phone)) {
    return {
      ok: false,
      status: 400,
      message: method === "PHONE" ? "Please enter a valid phone number we can call." : "Please enter a valid phone number, or leave it blank.",
      field: "phone",
    };
  }

  const singleLine = [fields.name, fields.email, fields.phone, fields.businessName];
  if ([...singleLine, fields.description].some((v) => CONTROL.test(v)) || singleLine.some((v) => LINE_BREAK.test(v))) {
    return { ok: false, status: 400, message: "Invalid characters detected." };
  }

  return { ok: true, fields: { idempotencyKey, start, ...fields, method, turnstileToken: str(raw.turnstileToken) } };
}

export type ManageAction = "view" | "cancel" | "reschedule";

export type ManageFields = { token: string; action: ManageAction; version: number; newStart: Date | null };

export function validateManageRequest(body: unknown): Validation<ManageFields> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, message: "Invalid request." };
  }
  const raw = body as Record<string, unknown>;
  const action = str(raw.action) as ManageAction;
  if (!["view", "cancel", "reschedule"].includes(action)) return { ok: false, status: 400, message: "Invalid request." };

  const version = typeof raw.version === "number" && Number.isInteger(raw.version) && raw.version > 0 ? raw.version : 0;
  if (action !== "view" && version === 0) return { ok: false, status: 400, message: "Invalid request." };

  const newStart = action === "reschedule" ? parseStart(raw.newStart) : null;
  if (action === "reschedule" && !newStart) {
    return { ok: false, status: 400, message: "Please choose a new consultation time.", field: "start" };
  }

  return { ok: true, fields: { token: str(raw.token), action, version, newStart } };
}
