/*
 * Consultation management links. PURE apart from node:crypto (unit-tested).
 *
 * token = base64url( HMAC-SHA256( CONSULTATION_TOKEN_SECRET, "consultation-manage:v1:<id>:<version>" ) )
 *
 *  - Unguessable without the server secret, and bound to ONE booking id.
 *  - The database stores only SHA-256(token) (consultation_bookings.management_token_hash), so a
 *    database leak exposes no working link.
 *  - Revocation: every reschedule bumps the booking version and stores the new hash, so links
 *    in older emails stop working. Rotating the secret revokes every link at once.
 *  - The server can re-derive the current link for the 24-hour reminder without ever storing
 *    the raw token.
 *
 * The token travels in the URL FRAGMENT (/consultation/manage#t=...), which browsers never send
 * to a server, so it cannot appear in access logs, analytics or a Referer header. Never log it.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const MANAGE_PATH = "/consultation/manage";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** The configured secret, or throws (booking then fails closed with a 503). */
export function tokenSecret(env: Record<string, string | undefined>): string {
  const secret = env.CONSULTATION_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("Missing CONSULTATION_TOKEN_SECRET (32+ characters)");
  }
  return secret;
}

export function deriveManageToken(secret: string, bookingId: string, version: number): string {
  return createHmac("sha256", secret).update(`consultation-manage:v1:${bookingId.toLowerCase()}:${version}`).digest("base64url");
}

export function hashManageToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Shape check before any database lookup (rejects junk cheaply). */
export function isWellFormedToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

/** Does `token` belong to this booking at this version? Constant-time. */
export function tokenMatches(secret: string, token: string, bookingId: string, version: number): boolean {
  const expected = Buffer.from(deriveManageToken(secret, bookingId, version));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function manageUrl(baseUrl: string, token: string): string {
  return `${new URL(MANAGE_PATH, baseUrl).toString()}#t=${token}`;
}
