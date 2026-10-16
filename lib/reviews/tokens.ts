/*
 * Feedback and unsubscribe tokens. PURE apart from node:crypto (unit-tested).
 *
 * A token is 32 random bytes, base64url (43 characters). The database stores only SHA-256(token)
 * (review_requests.token_hash / unsubscribe_token_hash), so a leaked table exposes no working link,
 * and the token cannot be re-derived: a lost link is replaced by a fresh request, never recovered.
 *
 * The feedback token travels in the URL FRAGMENT (/feedback#t=...), which browsers never send to a
 * server, so it cannot appear in access logs, analytics or a Referer header. Never log a token.
 */

import { createHash, randomBytes } from "node:crypto";

export const REVIEW_TOKEN_TTL_DAYS = 30;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type IssuedToken = { token: string; hash: string };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function issueToken(): IssuedToken {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

/* Shape check before any database lookup: rejects junk cheaply and never echoes it. */
export function isTokenShape(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function tokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + REVIEW_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export const FEEDBACK_PATH = "/feedback";
export const UNSUBSCRIBE_PATH = "/feedback/unsubscribe";

export function feedbackUrl(origin: string, token: string): string {
  return `${origin}${FEEDBACK_PATH}#t=${token}`;
}

export function unsubscribePageUrl(origin: string, token: string): string {
  return `${origin}${UNSUBSCRIBE_PATH}#t=${token}`;
}

/* One-click unsubscribe endpoint named in the List-Unsubscribe header (RFC 8058). POST only. */
export function unsubscribeApiUrl(origin: string, token: string): string {
  return `${origin}/api/feedback/unsubscribe?t=${token}`;
}
