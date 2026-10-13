/*
 * Who is told about consultation bookings, and the booking reference format. PURE.
 *
 * Both founders receive every booking, reschedule and cancellation notice (brief, 2026-10-13).
 * One outbox row per founder, so a bounce for one address never blocks the other.
 */

import { randomInt } from "node:crypto";

export const FOUNDER_NOTIFICATION_EMAILS: readonly string[] = [
  "wilson@drylake.com.au",
  "benedict@drylake.com.au",
];

/* No 0/O/1/I/L: references are read aloud on calls. */
const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** "DL-7KQ2MX": shown to the customer and admins; never used as a credential. */
export function newBookingReference(): string {
  let out = "";
  for (let i = 0; i < 6; i += 1) out += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `DL-${out}`;
}

export const BOOKING_REFERENCE_PATTERN = /^DL-[A-Z2-9]{6}$/;
