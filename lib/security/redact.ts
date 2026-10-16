/*
 * Redaction for provider and library error text that is logged or stored (outbox last_error,
 * calendar sync errors, Vercel logs). PURE (unit-tested).
 *
 * Why: Resend, Microsoft Graph and Postgres sometimes echo part of the request in an error
 * ("invalid recipient jane@example.com"). Log retention on Vercel is short but not zero, and
 * the outbox keeps the text in the database, so personal data must not ride along. This is
 * defence in depth on top of the rule "never log the enquiry, recipient or body".
 *
 * Contract: always returns a single line of at most MAX_LENGTH characters; never throws.
 */

const MAX_LENGTH = 300;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
/* 7 or more digits with optional separators or a leading plus: a phone number, not a status code. */
const PHONE = /\+?\d[\d\s().-]{5,}\d/g;
/* Long unbroken token-like strings (API keys, JWT segments, signed URLs' secrets). */
const TOKEN = /[A-Za-z0-9_-]{32,}/g;

export function redactSensitive(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return "unknown error";
  }

  const cleaned = value
    .replace(BEARER, "Bearer [token]")
    .replace(EMAIL, "[email]")
    .replace(PHONE, (match) => (match.replace(/\D/g, "").length >= 8 ? "[number]" : match))
    .replace(TOKEN, "[token]")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > MAX_LENGTH ? cleaned.slice(0, MAX_LENGTH) : cleaned;
}
